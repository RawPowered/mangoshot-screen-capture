const api=globalThis.chrome??globalThis.browser;
const base=document.querySelector('#base'),ink=document.querySelector('#ink');
const ctx=base.getContext('2d'),pen=ink.getContext('2d');
const status=document.querySelector('#status'),wrap=document.querySelector('#canvas-wrap'),workspace=document.querySelector('#workspace');
const tool=document.querySelector('#tool'),size=document.querySelector('#size'),color=document.querySelector('#color');
const params=new URLSearchParams(location.search),source=Number(params.get('source'));
const mode=params.get('mode')==='full'?'full':'visible',captureId=crypto.randomUUID();
const stored=params.get('stored'),captureError=params.get('capture_error');
const call=(fn,...args)=>new Promise((resolve,reject)=>{
  try{fn(...args,value=>{const error=api.runtime.lastError;error?reject(new Error(error.message)):resolve(value);});}
  catch(error){reject(error);}
});
let meta,frames=[],ready=false,drawing=false,active=null,strokes=[],renderPending=false,history=[],redoHistory=[];
const editorCore=globalThis.MangoImageEditorCore;
const selectedBox=document.getElementById('text-selection-box'),inline=document.getElementById('text-inline'),
 inlineInput=document.getElementById('text-inline-input'),contextMenu=document.getElementById('image-context-menu');
const textFontSize=document.getElementById('text-font-size'),textFontFamily=document.getElementById('text-font-family'),
 textContent=document.getElementById('text-content');
let selectedText=-1,textDraft=null,dragText=null,textPreset='plain';
function label(message){status.textContent=message;}
function activate(){call(api.tabs.getCurrent.bind(api.tabs)).then(tab=>
  tab?.id&&call(api.tabs.update.bind(api.tabs),tab.id,{active:true})).catch(()=>{});}
function setReady(value){
 ready=value;
 for(const id of ['png','pdf','clear','copy-image']){const button=document.getElementById(id);if(button)button.disabled=!value;}
 document.getElementById('undo').disabled=!value||!history.length;
 const redo=document.getElementById('redo');if(redo)redo.disabled=!value||!redoHistory.length;
 renderStrokeList();updateEditorControls();
}
function image(dataUrl){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Screenshot image failed to decode.'));img.src=dataUrl;});}
function zoom(){if(!base.width)return;const selected=document.querySelector('#zoom').value;
  const factor=selected==='fit'?Math.min(1,(workspace.clientWidth-44)/base.width):Number(selected);
  wrap.style.width=Math.max(1,Math.round(base.width*factor))+'px';const zoomInfo=document.getElementById('img-zoom-readout');if(zoomInfo)zoomInfo.textContent=selected==='fit'?'Fit · '+Math.round(factor*100)+'%':Math.round(factor*100)+'%';
}
document.querySelector('#zoom').addEventListener('change',zoom);
window.addEventListener('resize',()=>{if(document.querySelector('#zoom').value==='fit')zoom();});
async function assemble(){
  if(!meta || frames.length!==meta.frames || frames.some(f=>!f?.dataUrl))throw new Error('Missing screenshot frames.');
  const first=await image(frames[0].dataUrl),scale=first.naturalWidth/meta.width;
  const width=first.naturalWidth,height=Math.round(meta.pageHeight*scale);
  if(width>16384||height>30000||width*height>48000000)throw new Error('Screenshot is too large to edit safely.');
  base.width=ink.width=width;base.height=ink.height=height;
  for(const frame of frames.sort((a,b)=>a.index-b.index)){
    const bitmap=await image(frame.dataUrl),top=Math.round((meta.full?frame.scrollY:0)*scale);
    const available=Math.min(bitmap.height,height-top);
    if(available>0)ctx.drawImage(bitmap,0,0,bitmap.width,available,0,top,width,available);
  }
  frames=[];setReady(true);zoom();label('Ready · '+width+' × '+height+' · ink and exports enabled');const info=document.getElementById('image-meta');if(info)info.textContent=width+' × '+height+' px · original preserved';activate();
}
api.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.captureId!==captureId)return;
  if(message.type==='MANGO_EDITOR_START'){meta=message.meta;frames=[];label('Capturing '+meta.frames+' frame(s)…');reply({ok:true});return;}
  if(message.type==='MANGO_EDITOR_FRAME'){
    if(!meta || !Number.isInteger(message.index) || message.index<0 || message.index>=meta.frames ||
      frames[message.index] || typeof message.dataUrl!=='string' || !message.dataUrl.startsWith('data:image/png;base64,')){
      reply({ok:false,error:'Invalid or duplicate frame delivery.'});return;
    }
    frames[message.index]={index:message.index,scrollY:message.scrollY,dataUrl:message.dataUrl};
    label('Frame '+frames.filter(Boolean).length+' / '+meta.frames);reply({ok:true});return;
  }
  if(message.type==='MANGO_EDITOR_DONE'){
    if(!meta || frames.length!==meta.frames || frames.some(f=>!f?.dataUrl)){
      reply({ok:false,error:'Capture finished with missing image frames.'});
      label('Capture failed: frame delivery was incomplete. Try again.');activate();return;
    }
    reply({ok:true});assemble().catch(e=>{label('Capture failed: '+e.message);activate();});return;
  }
  if(message.type==='MANGO_EDITOR_ERROR'){reply({ok:true});label('Capture failed: '+message.error);activate();}
});
async function begin(){
  try{
    if(captureError){label('Capture failed: '+captureError);return;}
    if(!stored)throw new Error('No completed capture was provided. Open MangoShot from a webpage.');
    label('Loading screenshot from private local storage…');
    const bundle=await globalThis.MangoCaptureStore.load(stored);
    if(!bundle?.meta||!bundle.frames?.length)
      throw new Error('Saved screenshot was not found. Try capturing again.');
    meta=bundle.meta;frames=bundle.frames;
    await assemble();
    // Do not leave sensitive screenshot copies in the transfer database after
    // they have been successfully assembled in Image Studio.
    await globalThis.MangoCaptureStore.remove(stored).catch(()=>{});
  }catch(error){label('Capture failed: '+error.message);}
}

function point(event){const rect=ink.getBoundingClientRect();return {x:(event.clientX-rect.left)*ink.width/rect.width,
  y:(event.clientY-rect.top)*ink.height/rect.height,p:event.pointerType==='pen'?Math.max(.2,event.pressure||.5):1};}
function drawStroke(stroke){
  if(!stroke)return;
  const [start,...rest]=stroke.points,finish=stroke.points.at(-1)||start;
  if(!start)return;
  pen.save();pen.lineCap='round';pen.lineJoin='round';pen.strokeStyle=stroke.color;
  pen.lineWidth=stroke.size*(stroke.type==='highlighter'?5:stroke.type==='eraser'?5:1);
  pen.globalAlpha=stroke.type==='highlighter'?.27:1;
  if(stroke.type==='eraser')pen.globalCompositeOperation='destination-out';
  if(['pen','highlighter','eraser'].includes(stroke.type)){
    const factor=stroke.type==='highlighter'||stroke.type==='eraser'?5:1;
    let previous=start;
    if(!rest.length){
      pen.lineWidth=stroke.size*factor*(start.p||1);
      pen.beginPath();pen.moveTo(start.x,start.y);pen.lineTo(start.x+.01,start.y+.01);pen.stroke();
    }
    for(const next of rest){
      pen.lineWidth=stroke.size*factor*Math.max(.2,((previous.p||1)+(next.p||1))/2);
      pen.beginPath();pen.moveTo(previous.x,previous.y);pen.lineTo(next.x,next.y);pen.stroke();
      previous=next;
    }
  }else if(stroke.type==='rectangle'||stroke.type==='redact'){
    const x=Math.min(start.x,finish.x),y=Math.min(start.y,finish.y),w=Math.abs(finish.x-start.x),h=Math.abs(finish.y-start.y);
    if(stroke.type==='redact'){pen.globalAlpha=1;pen.fillStyle='#111';pen.fillRect(x,y,w,h);}
    else pen.strokeRect(x,y,w,h);
  }else if(stroke.type==='arrow'){
    const angle=Math.atan2(finish.y-start.y,finish.x-start.x),head=Math.max(12,stroke.size*4);
    pen.beginPath();pen.moveTo(start.x,start.y);pen.lineTo(finish.x,finish.y);
    pen.moveTo(finish.x,finish.y);pen.lineTo(finish.x-head*Math.cos(angle-.55),finish.y-head*Math.sin(angle-.55));
    pen.moveTo(finish.x,finish.y);pen.lineTo(finish.x-head*Math.cos(angle+.55),finish.y-head*Math.sin(angle+.55));pen.stroke();
  }else if(stroke.type==='text'){
    if(editorCore?.drawText)editorCore.drawText(pen,stroke);
    else{pen.globalAlpha=1;pen.fillStyle=stroke.color;pen.font='bold '+Math.max(14,stroke.size*5)+'px system-ui';
      pen.fillText(stroke.text||'Note',start.x,start.y);}
  }
  pen.restore();
}
function redraw(){
 pen.clearRect(0,0,ink.width,ink.height);
 for(const stroke of strokes)drawStroke(stroke);
 drawStroke(active);updateSelectionBox();
}
function cloneStrokes(value){return JSON.parse(JSON.stringify(value));}
function snapshot(){history.push(cloneStrokes(strokes));if(history.length>80)history.shift();redoHistory=[];}
function undo(){if(!history.length)return;redoHistory.push(cloneStrokes(strokes));strokes=history.pop();
 selectedText=Math.min(selectedText,strokes.length-1);redraw();setReady(ready);syncSelectedText();}
function redo(){if(!redoHistory.length)return;history.push(cloneStrokes(strokes));strokes=redoHistory.pop();
 selectedText=Math.min(selectedText,strokes.length-1);redraw();setReady(ready);syncSelectedText();}
function selectedStroke(){return selectedText>=0&&strokes[selectedText]?.type==='text'?strokes[selectedText]:null;}
function textIndexAt(x,y){
 if(!editorCore?.hitText)return -1;
 for(let i=strokes.length-1;i>=0;i--)if(editorCore.hitText(pen,strokes[i],x,y,10))return i;
 return -1;
}
function updateSelectionBox(){
 if(!selectedBox)return;
 const stroke=selectedStroke();
 if(!ready||!stroke||textDraft||!ink.width||!ink.height||!editorCore?.textMetrics){selectedBox.hidden=true;return;}
 const r=editorCore.textMetrics(pen,stroke);
 selectedBox.style.left=100*r.x/ink.width+'%';selectedBox.style.top=100*r.y/ink.height+'%';
 selectedBox.style.width=100*r.width/ink.width+'%';selectedBox.style.height=100*r.height/ink.height+'%';
 selectedBox.hidden=false;
}
function syncSelectedText(){
 const stroke=selectedStroke();
 if(stroke){
  if(textContent)textContent.value=stroke.text||'';
  if(textFontSize)textFontSize.value=String(Math.round(stroke.fontSize||48));
  if(textFontFamily)textFontFamily.value=stroke.fontFamily||'sans';
  textPreset=stroke.styleId||'plain';
  color.value=stroke.color||color.value;
 }
 for(const button of document.querySelectorAll?.('[data-text-preset]')||[])
  button.setAttribute('aria-pressed',String(button.dataset.textPreset===textPreset));
 const out=document.getElementById('text-size-readout');
 if(out&&textFontSize)out.textContent=textFontSize.value+' px';
 updateEditorControls();updateSelectionBox();
}
function updateEditorControls(){
 const selected=selectedStroke(),textMode=tool.value==='text'||!!selected;
 const drawSettings=document.getElementById('draw-properties'),textSettings=document.getElementById('text-properties');
 if(drawSettings)drawSettings.hidden=textMode||tool.value==='select';
 if(textSettings)textSettings.hidden=!textMode;
 const hint=document.getElementById('image-hint');
 if(hint)hint.textContent=textDraft?'Type here · Enter to place · Shift+Enter new line · Esc cancels':
  tool.value==='text'?'Click on the screenshot to type. Click existing text to edit.':
  tool.value==='select'?'Click text to select, drag to reposition, or double-click to edit.':
  'Right-click the screenshot to copy all pixels and annotations.';
 if(textContent){textContent.disabled=!selected;textContent.placeholder=selected?'Edit selected text':'Click screenshot to create text';}
 if(textFontSize)textFontSize.disabled=!ready;
 if(textFontFamily)textFontFamily.disabled=!ready;
 for(const button of document.querySelectorAll?.('[data-text-preset]')||[])button.disabled=!ready;
 const remove=document.querySelector?.('[data-image-action="delete"]');
 if(remove)remove.disabled=!selected;
}
function selectText(index){
 selectedText=index>=0&&strokes[index]?.type==='text'?index:-1;
 syncSelectedText();renderStrokeList();
}
function updateSelectedText(patch){
 const current=selectedStroke();if(!current)return false;
 const changed=Object.entries(patch).some(([key,value])=>current[key]!==value);
 if(!changed)return false;
 snapshot();strokes[selectedText]={...current,...patch};
 redraw();setReady(ready);syncSelectedText();return true;
}
function deleteSelectedText(){
 if(!selectedStroke())return false;
 snapshot();strokes.splice(selectedText,1);selectedText=-1;
 redraw();setReady(ready);label('Text annotation removed. Ctrl+Z restores it.');return true;
}
function cancelInline(){
 textDraft=null;if(inline)inline.hidden=true;
 updateEditorControls();updateSelectionBox();
}
function positionInline(pointValue){
 if(!inline||!ink.width||!ink.height)return;
 inline.style.left=100*Math.max(0,Math.min(ink.width,pointValue.x))/ink.width+'%';
 inline.style.top=100*Math.max(0,Math.min(ink.height,pointValue.y))/ink.height+'%';
 const screenScale=ink.getBoundingClientRect?.().width/ink.width||1;
 const textPx=Math.max(16,Number(textFontSize?.value||48)*screenScale);
 inlineInput.style.fontSize=textPx+'px';
}
function beginInline(pos,index=-1){
 if(!ready||!inline||!inlineInput)return;
 if(textDraft)cancelInline();
 const existing=index>=0?strokes[index]:null;
 textDraft={index,x:pos.x,y:pos.y};
 selectedText=existing?index:-1;
 if(existing){
  textPreset=existing.styleId||'plain';
  if(textFontSize)textFontSize.value=Math.round(existing.fontSize||48);
  if(textFontFamily)textFontFamily.value=existing.fontFamily||'sans';
  color.value=existing.color||color.value;
 }
 inlineInput.value=existing?.text||'';
 positionInline(pos);inline.hidden=false;updateEditorControls();updateSelectionBox();
 inlineInput.focus?.({preventScroll:true});
 if(existing)inlineInput.select?.();
}
function commitInline(){
 if(!textDraft)return false;
 const value=(inlineInput?.value||'').trim(),draft=textDraft;
 if(!value){cancelInline();label('Empty text was not added.');return false;}
 const old=draft.index>=0?strokes[draft.index]:null;
 snapshot();
 const pixelSize=Number(textFontSize?.value)||48;
 const stroke=old?{...old,text:value,fontSize:pixelSize,fontFamily:textFontFamily?.value||'sans',styleId:textPreset,color:color.value}:
  {type:'text',points:[{x:draft.x,y:draft.y,p:1}],size:Math.max(3,pixelSize/5),
   fontSize:pixelSize,fontFamily:textFontFamily?.value||'sans',styleId:textPreset,color:color.value,text:value};
 if(old)strokes[draft.index]=stroke;else strokes.push(stroke);
 selectedText=old?draft.index:strokes.length-1;
 textDraft=null;inline.hidden=true;
 tool.value='select';syncTool();redraw();setReady(true);syncSelectedText();
 label(old?'Text updated. Drag to reposition; double-click to edit.':'Text placed. Drag to move; double-click to edit.');
 return true;
}
function renderStrokeList(){
 const list=document.getElementById('stroke-list');
 if(!list||typeof document.createElement!=='function'||typeof list.replaceChildren!=='function')return;
 list.replaceChildren();
 if(!strokes.length){list.textContent='No annotations yet';return;}
 strokes.forEach((stroke,i)=>{
  const row=document.createElement('div');row.className='stroke-entry'+(selectedText===i?' is-selected':'');
  const title=document.createElement('button');title.type='button';title.className='image-object-select';
  title.textContent=String(i+1).padStart(2,'0')+' · '+(stroke.type==='text'?(stroke.text||'Text').slice(0,28):stroke.type);
  title.title='Select '+stroke.type+' annotation';title.setAttribute('aria-label','Select annotation '+(i+1));
  title.addEventListener('click',()=>{
   if(stroke.type==='text'){tool.value='select';syncTool();selectText(i);}
   else selectText(-1);
  });
  row.append(title);
  if(stroke.type==='text'){
   const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';
   edit.title='Edit text';edit.addEventListener('click',()=>beginInline(stroke.points[0],i));
   row.append(edit);
  }
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.className='image-object-remove';
  remove.title='Delete annotation '+(i+1)+' (Undo restores it)';
  remove.setAttribute('aria-label','Delete annotation '+(i+1));
  remove.addEventListener('click',()=>{
   snapshot();strokes.splice(i,1);
   if(selectedText===i)selectedText=-1;else if(selectedText>i)selectedText--;
   redraw();setReady(ready);syncSelectedText();
  });
  row.append(remove);list.append(row);
 });
}
const toolButtons=[...(document.querySelectorAll?.('[data-studio-tool]')||[])];
function syncTool(){
 for(const button of toolButtons){
  const selected=button.dataset.studioTool===tool.value;
  button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));
 }
 ink.style.cursor=tool.value==='text'?'text':tool.value==='select'?'default':'crosshair';
 updateEditorControls();
}
tool.addEventListener('change',()=>{
 if(textDraft)commitInline();
 if(tool.value!=='select'&&tool.value!=='text')selectedText=-1;
 syncTool();syncSelectedText();
});
for(const button of toolButtons)button.addEventListener('click',()=>{
 if(textDraft)commitInline();
 tool.value=button.dataset.studioTool;
 if(tool.value!=='select'&&tool.value!=='text')selectedText=-1;
 syncTool();syncSelectedText();
});
syncTool();
for(const button of document.querySelectorAll?.('[data-text-preset]')||[]){
 button.addEventListener('click',()=>{
  textPreset=button.dataset.textPreset;
  if(selectedStroke())updateSelectedText({styleId:textPreset});
  syncSelectedText();
 });
}
textFontSize?.addEventListener?.('input',()=>{
 const output=document.getElementById('text-size-readout');
 if(output)output.textContent=textFontSize.value+' px';
});
textFontSize?.addEventListener?.('change',()=>{
 if(selectedStroke())updateSelectedText({fontSize:Number(textFontSize.value)});
});
textFontFamily?.addEventListener?.('change',()=>{
 if(selectedStroke())updateSelectedText({fontFamily:textFontFamily.value});
});
textContent?.addEventListener?.('change',()=>{
 if(selectedStroke()&&textContent.value.trim())updateSelectedText({text:textContent.value.trim()});
});
color.addEventListener('change',()=>{
 if(selectedStroke())updateSelectedText({color:color.value});
});
inlineInput?.addEventListener?.('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelInline();return;}
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
  event.preventDefault();event.stopPropagation();commitInline();
 }
});
document.getElementById('text-inline-place')?.addEventListener?.('click',commitInline);
document.getElementById('text-inline-cancel')?.addEventListener?.('click',cancelInline);
function scheduleRedraw(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;redraw();});}
ink.addEventListener('pointerdown',event=>{
 if(!ready||event.button!==0)return;
 const p=point(event);
 if(textDraft)commitInline();
 const type=tool.value;
 if(type==='text'){
  event.preventDefault();
  const index=textIndexAt(p.x,p.y);
  beginInline(index>=0?strokes[index].points[0]:p,index);
  return;
 }
 if(type==='select'){
  const index=textIndexAt(p.x,p.y);
  selectText(index);
  if(index<0)return;
  event.preventDefault();
  ink.setPointerCapture?.(event.pointerId);
  const anchor=strokes[index].points[0];
  dragText={index,start:p,origin:{x:anchor.x,y:anchor.y},moved:false};
  return;
 }
 selectedText=-1;syncSelectedText();
 event.preventDefault();ink.setPointerCapture?.(event.pointerId);
 active={type,points:[p],size:Number(size.value)*(ink.width/ink.getBoundingClientRect().width),
  color:color.value,text:''};
 drawing=true;scheduleRedraw();
});
ink.addEventListener('pointermove',event=>{
 const p=point(event);
 if(dragText){
  const drag=dragText,stroke=strokes[drag.index];
  if(!stroke||stroke.type!=='text')return;
  const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  if(!drag.moved&&Math.hypot(dx,dy)<3)return;
  if(!drag.moved){snapshot();drag.moved=true;}
  const shape=editorCore?.textMetrics?.(pen,stroke),w=shape?.width||0,h=shape?.height||0;
  stroke.points[0]={...stroke.points[0],x:Math.max(0,Math.min(ink.width-w,drag.origin.x+dx)),
   y:Math.max(0,Math.min(ink.height-h,drag.origin.y+dy))};
  redraw();event.preventDefault();return;
 }
 if(!drawing||!active)return;
 if(['rectangle','arrow','redact'].includes(active.type))active.points=[active.points[0],p];
 else active.points.push(p);
 scheduleRedraw();event.preventDefault();
});
function finishStroke(event){
 if(dragText){
  const drag=dragText;dragText=null;
  if(drag.moved){redraw();setReady(ready);label('Text moved. Ctrl+Z restores its position.');}
  return;
 }
 if(!drawing)return;
 drawing=false;
 if(active){
  snapshot();strokes.push(active);active=null;redraw();setReady(true);
 }
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(event,finishStroke);
ink.addEventListener('dblclick',event=>{
 if(!ready||event.button!==0||textDraft)return;
 const p=point(event),index=textIndexAt(p.x,p.y);
 if(index>=0){event.preventDefault();beginInline(strokes[index].points[0],index);}
});
document.querySelector('#undo').addEventListener('click',undo);document.getElementById('redo')?.addEventListener('click',redo);
document.querySelector('#clear').addEventListener('click',()=>{if(strokes.length){snapshot();strokes=[];redraw();setReady(true);}});
function isTyping(target){return !!target?.matches?.('input,textarea,select,[contenteditable],[role="textbox"]');}
window.addEventListener('keydown',event=>{
 if(!ready)return;
 if(event.key==='Escape'){
  if(textDraft){event.preventDefault();cancelInline();return;}
  if(contextMenu&&!contextMenu.hidden){event.preventDefault();closeContextMenu();}
  return;
 }
 if(isTyping(event.target))return;
 if((event.key==='Delete'||event.key==='Backspace')&&selectedStroke()&&!event.ctrlKey&&!event.metaKey){
  event.preventDefault();deleteSelectedText();return;
 }
 if(!event.ctrlKey&&!event.metaKey&&!event.altKey){
  const key=event.key.toLowerCase();
  if(key==='v'){event.preventDefault();tool.value='select';syncTool();return;}
  if(key==='t'){event.preventDefault();tool.value='text';syncTool();return;}
 }
 if(!event.ctrlKey&&!event.metaKey)return;
 if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}
 else if(event.key.toLowerCase()==='y'){event.preventDefault();redo();}
},true);
function flatten(includeInk=true){
 if(editorCore?.merge)return editorCore.merge(base,ink,includeInk);
 const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
 const merged=canvas.getContext('2d');merged.drawImage(base,0,0);
 if(includeInk)merged.drawImage(ink,0,0);
 return canvas;
}
function toPng(canvas){
 if(editorCore?.toPng)return editorCore.toPng(canvas);
 return new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):
  reject(new Error('PNG encoding failed.')),'image/png'));
}
async function copyImage(includeInk=true){
 if(!ready)return false;
 // This is always invoked by a user click, preserving clipboard transient activation.
 if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined'){
  label('Copy image is not available in this browser. Use Export PNG to save the annotated image.');
  return false;
 }
 try{
  const composed=flatten(includeInk);
  // Promise-backed PNG keeps the clipboard.write call inside the click gesture,
  // even for large full-page screenshots that take time to encode.
  const png=toPng(composed);
  await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);
  label((includeInk?'Annotated screenshot':'Original screenshot')+' copied · '+base.width+' × '+base.height+' px. Paste into another application.');
  return true;
 }catch(error){
  label('Image copy failed: '+error.message+'. Use Export PNG if clipboard image access is blocked.');
  return false;
 }
}
function closeContextMenu(){if(contextMenu)contextMenu.hidden=true;}
function openContextMenu(event){
 if(!ready||!contextMenu)return;
 event.preventDefault();event.stopPropagation();
 const maxX=window.innerWidth||1000,maxY=window.innerHeight||800;
 contextMenu.hidden=false;
 const width=contextMenu.offsetWidth||260,height=contextMenu.offsetHeight||290;
 contextMenu.style.left=Math.max(6,Math.min(maxX-width-8,event.clientX))+'px';
 contextMenu.style.top=Math.max(6,Math.min(maxY-height-8,event.clientY))+'px';
 const deleteButton=contextMenu.querySelector?.('[data-image-action="delete"]');
 if(deleteButton)deleteButton.disabled=!selectedStroke();
 contextMenu.querySelector?.('[role="menuitem"]:not(:disabled)')?.focus?.();
}
wrap.addEventListener('contextmenu',openContextMenu);
document.addEventListener?.('pointerdown',event=>{
 if(contextMenu&&!contextMenu.hidden&&!contextMenu.contains?.(event.target))closeContextMenu();
},true);
window.addEventListener('scroll',closeContextMenu,true);
window.addEventListener('blur',closeContextMenu);
contextMenu?.addEventListener?.('keydown',event=>{
 const items=[...(contextMenu.querySelectorAll?.('[role="menuitem"]:not(:disabled)')||[])];
 const index=items.indexOf(document.activeElement);
 if(event.key==='Escape'){event.preventDefault();closeContextMenu();ink.focus?.();return;}
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){
  event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length]?.focus?.();
 }
});
for(const button of document.querySelectorAll?.('[data-image-action]')||[]){
 button.addEventListener('click',()=>{
  const action=button.dataset.imageAction;
  closeContextMenu();
  if(action==='copy'){void copyImage(true);return;}
  if(action==='copy-original'){void copyImage(false);return;}
  if(action==='png'||action==='pdf'){void exportFile(action);return;}
  if(action==='undo'){undo();return;}
  if(action==='redo'){redo();return;}
  if(action==='delete')deleteSelectedText();
 });
}
document.getElementById('copy-image')?.addEventListener?.('click',()=>{void copyImage(true);});
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportFile(type){if(!ready)return;document.querySelector('#png').disabled=true;document.querySelector('#pdf').disabled=true;
  try{label('Preparing '+type.toUpperCase()+'…');const canvas=flatten();
    if(type==='png'){
      const blob=await toPng(canvas);
      download(blob,'png');
    }else download(await MangoPDF.fromCanvas(canvas),'pdf');
    label(type.toUpperCase()+' exported locally.');
  }catch(error){label('Export failed: '+error.message);}
  finally{setReady(true);}
}
document.querySelector('#png').addEventListener('click',()=>exportFile('png'));
document.querySelector('#pdf').addEventListener('click',()=>exportFile('pdf'));
begin();
