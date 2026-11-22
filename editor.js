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
const layerCore=globalThis.MangoImageLayersV0612;
const typeEffects=globalThis.MangoImageTypeV0613;
const selectedBox=document.getElementById('text-selection-box'),inline=document.getElementById('text-inline'),
 inlineInput=document.getElementById('text-inline-input'),contextMenu=document.getElementById('image-context-menu');
const textFontSize=document.getElementById('text-font-size'),textFontFamily=document.getElementById('text-font-family'),
 textContent=document.getElementById('text-content');
let selectedText=-1,textDraft=null,dragText=null,textPreset='plain';
let selectedImage=-1,selectedObject=-1,dragImage=null,maskDraw=null,inspectorTab='layers';
let resizeDrag=null;
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
  if(!stroke||stroke.visible===false)return;
  if(stroke.type==='image'){layerCore?.paint(pen,stroke);return;}
  const [start,...rest]=stroke.points,finish=stroke.points.at(-1)||start;
  if(!start)return;
  pen.save();pen.lineCap='round';pen.lineJoin='round';pen.strokeStyle=stroke.color;
  pen.lineWidth=stroke.size*(stroke.type==='highlighter'?5:stroke.type==='eraser'?5:1);
  pen.globalAlpha=(stroke.type==='highlighter'?.27:1)*Math.max(0,Math.min(1,stroke.opacity??1));
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
    if(typeEffects?.draw)typeEffects.draw(pen,stroke);
    else if(editorCore?.drawText)editorCore.drawText(pen,stroke);
    else{pen.globalAlpha=Math.max(0,Math.min(1,stroke.opacity??1));pen.fillStyle=stroke.color;pen.font='bold '+Math.max(14,stroke.size*5)+'px system-ui';
      pen.fillText(stroke.text||'Note',start.x,start.y);}
  }
  pen.restore();
}
function redraw(){
 pen.clearRect(0,0,ink.width,ink.height);
 for(const stroke of strokes)drawStroke(stroke);
 drawStroke(active);updateSelectionBox();updateImageSelectionBox();
}
function cloneStrokes(value){return JSON.parse(JSON.stringify(value));}
function snapshot(){history.push(cloneStrokes(strokes));if(history.length>80)history.shift();redoHistory=[];}
function undo(){if(!history.length)return;redoHistory.push(cloneStrokes(strokes));strokes=history.pop();
 selectedText=Math.min(selectedText,strokes.length-1);selectedImage=Math.min(selectedImage,strokes.length-1);
 selectedObject=Math.min(selectedObject,strokes.length-1);redraw();setReady(ready);syncSelectedText();syncLayerProperties();}
function redo(){if(!redoHistory.length)return;history.push(cloneStrokes(strokes));strokes=redoHistory.pop();
 selectedText=Math.min(selectedText,strokes.length-1);selectedImage=Math.min(selectedImage,strokes.length-1);
 selectedObject=Math.min(selectedObject,strokes.length-1);redraw();setReady(ready);syncSelectedText();syncLayerProperties();}
function selectedStroke(){return selectedText>=0&&strokes[selectedText]?.type==='text'?strokes[selectedText]:null;}
function selectedImageStroke(){return selectedImage>=0&&strokes[selectedImage]?.type==='image'?strokes[selectedImage]:null;}
function selectedAnyIndex(){return selectedImage>=0?selectedImage:selectedText>=0?selectedText:selectedObject;}
function selectedAnyStroke(){return strokes[selectedAnyIndex()]||null;}
function selectObject(index){
 selectedText=-1;selectedImage=-1;
 selectedObject=index>=0&&strokes[index]&& !['text','image'].includes(strokes[index].type)?index:-1;
 syncSelectedText();renderStrokeList();syncLayerProperties();
}
function updateImageSelectionBox(){
 const box=document.getElementById('image-layer-selection-box'),l=selectedImageStroke();
 if(!box)return;
 if(!ready||!l||l.visible===false||!layerCore||!ink.width||!ink.height||textDraft){box.hidden=true;return;}
 const b=layerCore.bounds(l);
 box.style.left=100*b.x/ink.width+'%';box.style.top=100*b.y/ink.height+'%';
 box.style.width=100*b.width/ink.width+'%';box.style.height=100*b.height/ink.height+'%';
 box.hidden=false;
}
function selectImage(index){
 if(index<0||strokes[index]?.type!=='image'){selectedImage=-1;updateImageSelectionBox();return;}
 selectedImage=index;selectedText=-1;selectedObject=-1;syncSelectedText();renderStrokeList();
 updateImageSelectionBox();syncLayerProperties();
}

function textIndexAt(x,y){
 if(!editorCore?.hitText)return -1;
 for(let i=strokes.length-1;i>=0;i--)if(strokes[i].visible!==false&&
   (typeEffects?.hit?.(pen,strokes[i],x,y,10)??editorCore.hitText(pen,strokes[i],x,y,10)))return i;
 return -1;
}
function updateSelectionBox(){
 if(!selectedBox)return;
 const stroke=selectedStroke();
 if(!ready||!stroke||stroke.visible===false||textDraft||!ink.width||!ink.height||!editorCore?.textMetrics){selectedBox.hidden=true;return;}
 const r=(typeEffects?.bounds?.(pen,stroke))||editorCore.textMetrics(pen,stroke);
 selectedBox.style.left=100*r.x/ink.width+'%';selectedBox.style.top=100*r.y/ink.height+'%';
 selectedBox.style.width=100*r.width/ink.width+'%';selectedBox.style.height=100*r.height/ink.height+'%';
 selectedBox.hidden=false;
}
function syncSelectedText(){
 const stroke=selectedStroke();
 if(stroke){
  if(textContent)textContent.value=stroke.text||'';
  if(textFontSize)textFontSize.value=String(Math.round((stroke.fontSize||48)*(stroke.scaleY??1)));
  if(textFontFamily)textFontFamily.value=stroke.fontFamily||'sans';
  textPreset=stroke.styleId||'plain';
  color.value=stroke.color||color.value;
  const textFill=document.getElementById('text-fill-color');if(textFill)textFill.value=color.value;
 }
 for(const button of document.querySelectorAll?.('[data-text-preset]')||[])
  button.setAttribute('aria-pressed',String(button.dataset.textPreset===textPreset));
 const out=document.getElementById('text-size-readout');
 if(out&&textFontSize)out.textContent=textFontSize.value+' px';
 syncTextEffects();updateEditorControls();updateSelectionBox();
}
function syncTextEffects(){
 const layer=selectedStroke(),fx=typeEffects?.merged?.(layer?.effects);
 for(const input of document.querySelectorAll?.('[data-fx-group]')||[]){
  const group=input.dataset.fxGroup,field=input.dataset.fxField,value=fx?.[group]?.[field];
  input.disabled=!layer||!!layer.locked;
  if(value==null)continue;
  if(input.type==='checkbox')input.checked=value===true;
  else if(input.dataset.fxPercent!==undefined)input.value=String(Math.round(value*100));
  else input.value=String(value);
 }
 for(const button of document.querySelectorAll?.('[data-fx-preset]')||[]){
  button.disabled=!layer||!!layer.locked;
 }
}
function updateEditorControls(){
 const selected=selectedStroke(),textMode=tool.value==='text'||!!selected;
 const drawSettings=document.getElementById('draw-properties'),textSettings=document.getElementById('text-properties');
 if(drawSettings)drawSettings.hidden=textMode||tool.value==='select';
 if(textSettings)textSettings.hidden=!textMode;
 const hint=document.getElementById('image-hint');
 if(hint)hint.textContent=textDraft?'Type here · Enter to place · Shift+Enter new line · Esc cancels':
  tool.value==='text'?'Click on the screenshot to type. Click existing text to edit.':
  tool.value==='select'?'Select an image or text layer. Drag corners to resize proportionally; hold Shift to stretch.':
  'Right-click the screenshot to copy all pixels and annotations.';
 if(textContent){textContent.disabled=!selected;textContent.placeholder=selected?'Edit selected text':'Click screenshot to create text';}
 if(textFontSize)textFontSize.disabled=!ready;
 if(textFontFamily)textFontFamily.disabled=!ready;
 for(const button of document.querySelectorAll?.('[data-text-preset]')||[])button.disabled=!ready;
 const remove=document.querySelector?.('[data-image-action="delete"]');
 if(remove)remove.disabled=!selected;
}
function selectText(index){
 selectedImage=-1;selectedObject=-1;selectedText=index>=0&&strokes[index]?.type==='text'?index:-1;
 syncSelectedText();renderStrokeList();
}
function updateSelectedText(patch){
 const current=selectedStroke();if(!current||current.locked)return false;
 const changed=Object.entries(patch).some(([key,value])=>current[key]!==value);
 if(!changed)return false;
 snapshot();strokes[selectedText]={...current,...patch};
 redraw();setReady(ready);syncSelectedText();return true;
}
function deleteSelectedText(){return selectedStroke()?removeLayerAt(selectedText):false;}
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
 if(existing?.locked){label('Unlock this text layer to edit it.');return;}
 selectedImage=-1;selectedObject=-1;
 textDraft={index,x:pos.x,y:pos.y};
 selectedText=existing?index:-1;
 if(existing){
  textPreset=existing.styleId||'plain';
  if(textFontSize)textFontSize.value=Math.round((existing.fontSize||48)*(existing.scaleY??1));
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
 const stroke=old?{...old,text:value,fontSize:pixelSize/(old.scaleY??1),fontFamily:textFontFamily?.value||'sans',styleId:textPreset,color:color.value}:
  {type:'text',points:[{x:draft.x,y:draft.y,p:1}],size:Math.max(3,pixelSize/5),
   fontSize:pixelSize,fontFamily:textFontFamily?.value||'sans',styleId:textPreset,color:color.value,text:value,
   scaleX:1,scaleY:1,effects:typeEffects?.initial?.()};
 if(old)strokes[draft.index]=stroke;else strokes.push(stroke);
 selectedText=old?draft.index:strokes.length-1;
 textDraft=null;inline.hidden=true;
 tool.value='select';syncTool();redraw();setReady(true);syncSelectedText();
 label(old?'Text updated. Drag to reposition; double-click to edit.':'Text placed. Drag to move; double-click to edit.');
 return true;
}
function switchInspectorTab(name){
 if(!['layers','type','tools','mask'].includes(name))return;
 inspectorTab=name;
 for(const tab of document.querySelectorAll?.('[data-image-tab]')||[]){
  const active=tab.dataset.imageTab===name;tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
 }
 for(const nameKey of ['layers','type','tools','mask']){
  const panel=document.getElementById('image-panel-'+nameKey);if(panel)panel.hidden=nameKey!==name;
 }
 const inspector=document.querySelector?.('.image-inspector');if(inspector)inspector.scrollTop=0;
}
for(const tab of document.querySelectorAll?.('[data-image-tab]')||[]){
 tab.addEventListener('click',()=>switchInspectorTab(tab.dataset.imageTab));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const names=['layers','type','tools','mask'],index=names.indexOf(inspectorTab);
  const next=event.key==='Home'?0:event.key==='End'?3:
   (index+(event.key==='ArrowRight'?1:-1)+names.length)%names.length;
  event.preventDefault();switchInspectorTab(names[next]);
  document.querySelector?.('[data-image-tab="'+names[next]+'"]')?.focus?.();
 });
}
switchInspectorTab('layers');
function replaceLayer(index,patch){
 if(index<0||!strokes[index]||strokes[index].locked)return false;
 const current=strokes[index];
 if(Object.entries(patch).every(([k,v])=>current[k]===v))return false;
 snapshot();strokes[index]={...current,...patch};redraw();setReady(ready);syncSelectedText();syncLayerProperties();return true;
}
function removeLayerAt(index){
 if(index<0||!strokes[index])return false;
 if(strokes[index].locked){label('Unlock this layer before deleting it.');return false;}
 snapshot();strokes.splice(index,1);
 if(selectedText===index||selectedImage===index||selectedObject===index){selectedText=-1;selectedImage=-1;selectedObject=-1;}
 else {if(selectedText>index)selectedText--;if(selectedImage>index)selectedImage--;if(selectedObject>index)selectedObject--;}
 redraw();setReady(ready);syncSelectedText();syncLayerProperties();label('Layer deleted · Ctrl+Z to restore.');return true;
}
function moveLayerAt(index,delta){
 if(index<0||index>=strokes.length||strokes[index].locked)return false;
 const target=index+delta;if(target<0||target>=strokes.length)return false;
 snapshot();const [l]=strokes.splice(index,1);strokes.splice(target,0,l);
 if(selectedText===index)selectedText=target;else if(selectedText===target)selectedText=index;
 if(selectedImage===index)selectedImage=target;else if(selectedImage===target)selectedImage=index;
 if(selectedObject===index)selectedObject=target;else if(selectedObject===target)selectedObject=index;
 redraw();setReady(ready);syncLayerProperties();return true;
}
function duplicateSelectedLayer(){
 const i=selectedAnyIndex();if(i<0||!strokes[i]||strokes[i].locked)return false;
 snapshot();const layer=cloneStrokes([strokes[i]])[0];
 layer.id=(layer.id||'annotation')+'-copy-'+Math.floor(Math.random()*1e7);
 layer.name=(layer.name||layer.type)+' copy';
 layer.points=(layer.points||[]).map(p=>({...p,x:p.x+20,y:p.y+20}));
 strokes.splice(i+1,0,layer);
 if(layer.type==='text'){selectedText=i+1;selectedImage=-1;selectedObject=-1;}
 else if(layer.type==='image'){selectedImage=i+1;selectedText=-1;selectedObject=-1;}
 else{selectedObject=i+1;selectedText=-1;selectedImage=-1;}
 redraw();setReady(ready);syncSelectedText();syncLayerProperties();return true;
}
function syncLayerProperties(){
 const l=selectedAnyStroke(),panel=document.getElementById('image-layer-properties');
 if(panel)panel.hidden=!l;
 const name=document.getElementById('image-selected-layer-name');if(name)name.textContent=l?.name||l?.type||'';
 const opacity=document.getElementById('image-layer-opacity');
 if(opacity){opacity.value=Math.round((l?.opacity??1)*100);opacity.disabled=!l||!!l.locked;}
 const output=document.getElementById('image-opacity-readout');if(output)output.textContent=(opacity?.value||100)+'%';
 for(const [id,prop] of [['image-layer-x','x'],['image-layer-y','y'],['image-layer-width','width'],['image-layer-height','height']]){
  const el=document.getElementById(id);if(!el)continue;
  const b=l?.type==='image'?layerCore?.bounds(l):
   l?.type==='text'?(typeEffects?.bounds?.(pen,l)||editorCore?.textMetrics(pen,l)):null;
  el.value=b?.[prop]==null?'':Math.round(b[prop]);
  el.disabled=!l||!!l.locked||(!b&&['width','height'].includes(prop));
 }
 for(const id of ['image-layer-remove','image-duplicate-layer','image-layer-front','image-layer-back']){
  const el=document.getElementById(id);if(el)el.disabled=!l||!!l.locked;
 }
 const selectedImageLayer=selectedImageStroke();
 for(const id of ['image-mask-erase','image-mask-restore','image-mask-undo','image-mask-reset',
  'image-quick-cutout','image-clear-cutout','image-mask-feather']){
  const el=document.getElementById(id);if(el)el.disabled=!selectedImageLayer||selectedImageLayer.locked;
 }
 const feather=document.getElementById('image-mask-feather');
 if(feather&&selectedImageLayer)feather.value=selectedImageLayer.mask?.feather||0;
 const featherLabel=document.getElementById('image-mask-feather-readout');
 if(featherLabel&&feather)featherLabel.textContent=feather.value+' px';
 const inspectorState=document.getElementById('image-inspector-state');
 if(inspectorState)inspectorState.textContent=l?(l.type==='image'?'IMAGE LAYER':l.type==='text'?'TEXT LAYER':'ANNOTATION'):'IMAGE STUDIO';
 const lock=document.getElementById('image-keep-ratio');if(lock)lock.disabled=!l||l.locked||!['image','text'].includes(l.type);
 const ratioHint=document.getElementById('image-transform-readout');
 if(ratioHint&&!resizeDrag)ratioHint.textContent='Drag corners to resize · hold Shift to stretch';
}
async function importImages(files){
 if(!ready||!layerCore){label('Open a screenshot before importing an image.');return;}
 for(const file of Array.from(files||[]).slice(0,12)){
  try{
   label('Importing '+String(file.name||'image')+'…');
   const layer=await layerCore.importFile(file);
   const scale=Math.min(1,base.width*.65/layer.width,base.height*.65/layer.height);
   layer.width=Math.max(1,Math.round(layer.width*scale));layer.height=Math.max(1,Math.round(layer.height*scale));
   layer.points[0]={...layer.points[0],x:Math.max(0,Math.round((base.width-layer.width)/2)),
    y:Math.max(0,Math.round((base.height-layer.height)/2))};
   snapshot();strokes.push(layer);selectedImage=strokes.length-1;selectedText=-1;selectedObject=-1;
   redraw();setReady(true);switchInspectorTab('layers');syncLayerProperties();
   label('Image layer imported. Select to drag; use Mask to refine.');
  }catch(error){label('Image import failed: '+error.message);}
 }
}
document.getElementById('image-import')?.addEventListener?.('click',()=>{
 document.getElementById('image-import-file')?.click?.();
});
document.getElementById('image-add-layer')?.addEventListener?.('click',()=>{
 document.getElementById('image-import-file')?.click?.();
});
document.getElementById('image-import-file')?.addEventListener?.('change',event=>{
 void importImages(event.target?.files);event.target.value='';
});
document.getElementById('image-add-text')?.addEventListener?.('click',()=>{
 if(!ready)return;
 tool.value='text';syncTool();selectedImage=-1;selectText(-1);
 switchInspectorTab('type');
 beginInline({x:Math.max(5,Math.round(ink.width*.18)),y:Math.max(5,Math.round(ink.height*.24))});
});
document.getElementById('image-duplicate-layer')?.addEventListener?.('click',duplicateSelectedLayer);
document.getElementById('image-layer-remove')?.addEventListener?.('click',()=>removeLayerAt(selectedAnyIndex()));
document.getElementById('image-layer-front')?.addEventListener?.('click',()=>moveLayerAt(selectedAnyIndex(),1));
document.getElementById('image-layer-back')?.addEventListener?.('click',()=>moveLayerAt(selectedAnyIndex(),-1));
document.getElementById('image-layer-opacity')?.addEventListener?.('input',event=>{
 const output=document.getElementById('image-opacity-readout');
 if(output)output.textContent=event.target.value+'%';
});
document.getElementById('image-layer-opacity')?.addEventListener?.('change',event=>{
 replaceLayer(selectedAnyIndex(),{opacity:Number(event.target.value)/100});
});
for(const [id,prop] of [['image-layer-x','x'],['image-layer-y','y'],['image-layer-width','width'],['image-layer-height','height']]){
 document.getElementById(id)?.addEventListener?.('change',event=>{
  const index=selectedAnyIndex(),layer=strokes[index],v=Number(event.target.value);
  if(!layer||!Number.isFinite(v)||layer.locked)return;
  if(['width','height'].includes(prop)&&['image','text'].includes(layer.type)&&typeEffects?.applyResize){
   const b=layer.type==='image'?layerCore.bounds(layer):typeEffects.bounds(pen,layer);
   const target={...b},k=Math.max(.05,v)/b[prop],ratioLocked=
     document.getElementById('image-keep-ratio')?.checked!==false&&!event.shiftKey;
   target[prop]=Math.max(1,v);
   if(ratioLocked)target[prop==='width'?'height':'width']=
     b[prop==='width'?'height':'width']*k;
   replaceLayer(index,typeEffects.applyResize(layer,b,target));
  }
  else if(['width','height'].includes(prop)&&layer.type==='image')replaceLayer(index,{[prop]:Math.max(1,Math.round(v))});
  else if(['x','y'].includes(prop)){
   snapshot();layer.points[0]={...layer.points[0],[prop]:Math.round(v)};
   redraw();setReady(ready);syncLayerProperties();
  }
 });
}
for(const button of document.querySelectorAll?.('[data-text-size]')||[]){
 button.addEventListener('click',()=>{
  const value=Number(button.dataset.textSize);if(!Number.isFinite(value))return;
  textFontSize.value=String(value);
  const output=document.getElementById('text-size-readout');if(output)output.textContent=value+' px';
  if(selectedStroke())updateVisualFontSize(value);
 });
}
document.getElementById('text-fill-color')?.addEventListener?.('change',event=>{
 color.value=event.target.value;
 if(selectedStroke())updateSelectedText({color:event.target.value});
});

for(const input of document.querySelectorAll?.('[data-fx-group]')||[]){
 input.addEventListener('change',()=>{
  const current=selectedStroke();
  if(!current||current.locked||!typeEffects)return;
  const group=input.dataset.fxGroup,field=input.dataset.fxField;
  const fx=typeEffects.merged(current.effects);
  if(!fx[group]||!(field in fx[group]))return;
  fx[group][field]=input.type==='checkbox'?input.checked:
   input.type==='color'?input.value:
   input.dataset.fxPercent!==undefined?Number(input.value)/100:Number(input.value);
  updateSelectedText({effects:typeEffects.merged(fx)});
 });
}
for(const button of document.querySelectorAll?.('[data-fx-preset]')||[]){
 button.addEventListener('click',()=>{
  const current=selectedStroke();if(!current||current.locked||!typeEffects)return;
  const p=typeEffects.preset(button.dataset.fxPreset);
  updateSelectedText({effects:p.effects,color:p.color});
  switchInspectorTab('type');
  label('Applied '+button.textContent+' text style. All effects remain editable.');
 });
}

function beginMaskTool(mode){
 if(!selectedImageStroke()){label('Select an imported image layer before masking.');switchInspectorTab('layers');return;}
 tool.value=mode;syncTool();switchInspectorTab('mask');
}
document.getElementById('image-mask-erase')?.addEventListener?.('click',()=>beginMaskTool('mask-erase'));
document.getElementById('image-mask-restore')?.addEventListener?.('click',()=>beginMaskTool('mask-restore'));
document.getElementById('image-mask-brush')?.addEventListener?.('input',event=>{
 const output=document.getElementById('image-mask-brush-readout');
 if(output)output.textContent=event.target.value+' px';
});
document.getElementById('image-mask-feather')?.addEventListener?.('input',event=>{
 const output=document.getElementById('image-mask-feather-readout');
 if(output)output.textContent=event.target.value+' px';
});
document.getElementById('image-mask-feather')?.addEventListener?.('change',event=>{
 const l=selectedImageStroke();if(!l||l.locked)return;
 const mask=cloneStrokes([l.mask||{paths:[],feather:0}])[0];
 mask.feather=Number(event.target.value);
 replaceLayer(selectedImage,{mask});
});
document.getElementById('image-mask-undo')?.addEventListener?.('click',()=>{
 const l=selectedImageStroke();if(!l||l.locked||!l.mask?.paths?.length)return;
 const mask=cloneStrokes([l.mask])[0];mask.paths.pop();replaceLayer(selectedImage,{mask});
});
document.getElementById('image-mask-reset')?.addEventListener?.('click',()=>{
 const l=selectedImageStroke();if(!l||l.locked)return;replaceLayer(selectedImage,{mask:{paths:[],feather:0}});
});
document.getElementById('image-cutout-tolerance')?.addEventListener?.('input',event=>{
 const out=document.getElementById('image-cutout-tolerance-readout');if(out)out.textContent=event.target.value;
});
document.getElementById('image-quick-cutout')?.addEventListener?.('click',()=>{
 const l=selectedImageStroke();if(!l||l.locked||!layerCore)return;
 try{
  label('Analyzing edge-connected flat background locally…');
  const result=layerCore.quickCutout(l,{tolerance:Number(document.getElementById('image-cutout-tolerance')?.value||30)});
  replaceLayer(selectedImage,{cutoutKey:result.cutoutKey});
  label('Quick Cutout removed '+result.removed+' preview pixels. Refine with mask brushes; this is not AI removal.');
 }catch(error){label('Quick Cutout: '+error.message);}
});
document.getElementById('image-clear-cutout')?.addEventListener?.('click',()=>{
 const l=selectedImageStroke();if(!l||l.locked)return;replaceLayer(selectedImage,{cutoutKey:null});
});
function renderStrokeList(){
 const list=document.getElementById('stroke-list');
 if(!list||typeof document.createElement!=='function'||typeof list.replaceChildren!=='function')return;
 list.replaceChildren();
 if(!strokes.length){list.textContent='No editable layers yet. Import an image, add text or draw.';syncLayerProperties();return;}
 for(let i=strokes.length-1;i>=0;i--){
  const stroke=strokes[i],row=document.createElement('div');
  row.className='stroke-entry image-layer-row'+(selectedAnyIndex()===i?' is-selected':'');
  row.setAttribute('role','group');row.setAttribute('aria-label',(stroke.name||stroke.type)+' layer');
  const eye=document.createElement('button');eye.type='button';eye.className='image-layer-eye';
  eye.textContent=stroke.visible===false?'◌':'◉';eye.title=stroke.visible===false?'Show layer':'Hide layer';
  eye.setAttribute('aria-label',eye.title);eye.setAttribute('aria-pressed',String(stroke.visible!==false));
  eye.addEventListener('click',()=>{snapshot();strokes[i]={...strokes[i],visible:strokes[i].visible===false};redraw();setReady(ready);syncLayerProperties();});
  const title=document.createElement('button');title.type='button';title.className='image-object-select';
  const name=stroke.name||(stroke.type==='text'?((stroke.text||'Text').slice(0,32)):stroke.type);
  title.textContent=(stroke.type==='image'?'▣ ':stroke.type==='text'?'T ':'◇ ')+name;
  title.title='Select '+name+' layer';title.setAttribute('aria-label','Select '+name+' layer');
  title.addEventListener('click',()=>{
   tool.value='select';syncTool();
   if(stroke.type==='text'){selectText(i);switchInspectorTab('type');}
   else if(stroke.type==='image'){selectImage(i);switchInspectorTab('layers');}
   else{selectObject(i);switchInspectorTab('layers');}
  });
  const lock=document.createElement('button');lock.type='button';lock.className='image-layer-lock';
  lock.textContent=stroke.locked?'🔒':'▢';lock.title=stroke.locked?'Unlock layer':'Lock layer';
  lock.setAttribute('aria-label',lock.title);
  lock.addEventListener('click',()=>{snapshot();strokes[i]={...stroke,locked:!stroke.locked};redraw();setReady(ready);});
  const edit=document.createElement('button');edit.type='button';edit.className='image-layer-edit';
  edit.textContent='⋯';edit.title=stroke.type==='text'?'Edit text':stroke.type==='image'?'Open mask controls':'Select annotation';
  edit.addEventListener('click',()=>{
   if(stroke.type==='text'){selectText(i);beginInline(stroke.points[0],i);}
   else if(stroke.type==='image'){selectImage(i);switchInspectorTab('mask');}
   else{selectObject(i);}
  });
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';
  remove.className='image-object-remove';remove.title='Delete '+name+' layer';
  remove.setAttribute('aria-label',remove.title);remove.disabled=!!stroke.locked;
  remove.addEventListener('click',()=>removeLayerAt(i));
  row.append(eye,title,lock,edit,remove);
  list.append(row);
 }
 syncLayerProperties();
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
 if(tool.value==='text')switchInspectorTab('type');
 else if(tool.value.startsWith('mask-'))switchInspectorTab('mask');
 else if(tool.value!=='select')switchInspectorTab('tools');
 if(tool.value==='text')switchInspectorTab('type');
 else if(tool.value.startsWith('mask-'))switchInspectorTab('mask');
 else if(tool.value!=='select')switchInspectorTab('tools');
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
 if(textDraft)positionInline(textDraft);
});
function updateVisualFontSize(value){
 const layer=selectedStroke();if(!layer)return false;
 const shown=Math.max(1,(layer.fontSize||48)*(layer.scaleY??1));
 const ratio=Math.max(.05,Math.min(25,Number(value)/shown));
 return updateSelectedText({scaleX:Math.max(.08,Math.min(25,(layer.scaleX??1)*ratio)),
  scaleY:Math.max(.08,Math.min(25,(layer.scaleY??1)*ratio))});
}
textFontSize?.addEventListener?.('change',()=>{
 if(selectedStroke())updateVisualFontSize(Number(textFontSize.value));
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
/* Corner handles use source-pixel geometry regardless of Fit/100% zoom.
 * Preserve the opposite corner. Ratio stays locked unless Shift is held,
 * or the user explicitly disables Lock Proportions in Layers.
 * Handle UI lives outside Canvas and never appears in exported pixels. */
const transformHandles=[...(document.querySelectorAll?.('[data-resize-handle]')||[])];
for(const handle of transformHandles){
 handle.addEventListener('pointerdown',event=>{
  if(!ready||event.button!==0||!typeEffects?.resize||!typeEffects?.applyResize)return;
  const kind=handle.dataset.resizeKind,index=kind==='image'?selectedImage:selectedText;
  const layer=strokes[index];
  if(!layer||layer.type!==kind||layer.locked||layer.visible===false)return;
  if(textDraft)commitInline();
  const bounds=kind==='image'?layerCore?.bounds(layer):typeEffects.bounds(pen,layer);
  if(!bounds?.width||!bounds?.height)return;
  event.preventDefault();event.stopPropagation();
  handle.setPointerCapture?.(event.pointerId);
  resizeDrag={pointerId:event.pointerId,handle,index,kind,corner:handle.dataset.resizeHandle,
   initial:cloneStrokes([layer])[0],bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},
   start:point(event),moved:false};
 });
}
window.addEventListener('pointermove',event=>{
 const d=resizeDrag;
 if(!d||event.pointerId!==d.pointerId)return;
 if(!strokes[d.index]||strokes[d.index].locked){resizeDrag=null;return;}
 const p=point(event),dx=p.x-d.start.x,dy=p.y-d.start.y;
 if(!d.moved&&Math.hypot(dx,dy)<2)return;
 if(!d.moved){snapshot();d.moved=true;}
 const locked=document.getElementById('image-keep-ratio')?.checked!==false;
 const free=event.shiftKey||!locked;
 const newRect=typeEffects.resize(d.bounds,d.corner,dx,dy,free);
 const updated=typeEffects.applyResize(d.initial,d.bounds,newRect);
 strokes[d.index]=updated;
 redraw();
 const readout=document.getElementById('image-transform-readout');
 if(readout)readout.textContent=Math.round(newRect.width)+' × '+Math.round(newRect.height)+
  (free?' · Free stretch':' · Ratio locked');
 event.preventDefault();event.stopPropagation();
});
function completeResize(event,cancel=false){
 const d=resizeDrag;if(!d||event.pointerId!==d.pointerId)return;
 resizeDrag=null;
 if(cancel&&d.moved){strokes[d.index]=d.initial;history.pop();redraw();}
 if(d.moved&&!cancel){
  setReady(ready);syncSelectedText();syncLayerProperties();
  label((d.kind==='text'?'Text':'Image')+' resized · Ctrl+Z to undo.'+
   (document.getElementById('image-keep-ratio')?.checked===false?' Free stretch enabled.':' Hold Shift while dragging to stretch.'));
 }
 const readout=document.getElementById('image-transform-readout');
 if(readout)readout.textContent='Drag corners to resize · hold Shift to stretch';
 d.handle.releasePointerCapture?.(event.pointerId);
 event.preventDefault?.();
}
window.addEventListener('pointerup',event=>completeResize(event,false));
window.addEventListener('pointercancel',event=>completeResize(event,true));
document.getElementById('image-keep-ratio')?.addEventListener?.('change',event=>{
 const readout=document.getElementById('image-transform-readout');
 if(readout)readout.textContent=event.target.checked?
  'Proportions locked · hold Shift to stretch':'Free stretching enabled';
});
function imageIndexAt(x,y){
 if(!layerCore)return -1;
 for(let i=strokes.length-1;i>=0;i--){
  const l=strokes[i];
  if(l.visible!==false&&l.type==='image'&&layerCore.hit(l,x,y))return i;
 }
 return -1;
}
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
 if(type==='mask-erase'||type==='mask-restore'){
  const l=selectedImageStroke();
  if(!l||l.locked||!layerCore){label('Select an unlocked imported image layer before masking.');return;}
  if(!layerCore.hit(l,p.x,p.y,0))return;
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);
  const brush=Number(document.getElementById('image-mask-brush')?.value||35);
  const b=layerCore.bounds(l);
  const path={mode:type==='mask-restore'?'restore':'erase',
   radius:Math.max(.001,Math.min(.5,brush/Math.min(b.width,b.height)/2)),
   points:[layerCore.normalize(l,p.x,p.y)]};
  snapshot();
  if(!l.mask)l.mask={paths:[],feather:0};
  l.mask.paths.push(path);maskDraw={index:selectedImage,path};
  scheduleRedraw();return;
 }
 if(type==='select'){
  const index=textIndexAt(p.x,p.y);
  if(index>=0){
   selectText(index);if(strokes[index].locked)return;
   event.preventDefault();ink.setPointerCapture?.(event.pointerId);
   const anchor=strokes[index].points[0];
   dragText={index,start:p,origin:{x:anchor.x,y:anchor.y},moved:false};
   return;
  }
  const imageIndex=imageIndexAt(p.x,p.y);
  if(imageIndex>=0){
   selectImage(imageIndex);
   if(strokes[imageIndex].locked)return;
   event.preventDefault();ink.setPointerCapture?.(event.pointerId);
   const anchor=strokes[imageIndex].points[0];
   dragImage={index:imageIndex,start:p,origin:{x:anchor.x,y:anchor.y},moved:false};
   return;
  }
  selectedText=-1;selectedImage=-1;selectedObject=-1;
  syncSelectedText();redraw();renderStrokeList();return;
 }
 selectedText=-1;selectedImage=-1;selectedObject=-1;syncSelectedText();
 event.preventDefault();ink.setPointerCapture?.(event.pointerId);
 active={type,points:[p],size:Number(size.value)*(ink.width/ink.getBoundingClientRect().width),
  color:color.value,text:''};
 drawing=true;scheduleRedraw();
});
ink.addEventListener('pointermove',event=>{
 const p=point(event);
 if(maskDraw){
  const target=strokes[maskDraw.index];
  if(!target||target.locked||target.type!=='image')return;
  maskDraw.path.points.push(layerCore.normalize(target,p.x,p.y));
  scheduleRedraw();event.preventDefault();return;
 }
 if(dragImage){
  const drag=dragImage,l=strokes[drag.index];
  if(!l||l.type!=='image'||l.locked)return;
  const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  if(!drag.moved&&Math.hypot(dx,dy)<3)return;
  if(!drag.moved){snapshot();drag.moved=true;}
  const b=layerCore.bounds(l);
  l.points[0]={...l.points[0],
   x:Math.max(0,Math.min(ink.width-b.width,drag.origin.x+dx)),
   y:Math.max(0,Math.min(ink.height-b.height,drag.origin.y+dy))};
  redraw();event.preventDefault();return;
 }
 if(dragText){
  const drag=dragText,stroke=strokes[drag.index];
  if(!stroke||stroke.type!=='text'||stroke.locked)return;
  const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  if(!drag.moved&&Math.hypot(dx,dy)<3)return;
  if(!drag.moved){snapshot();drag.moved=true;}
  const shape=typeEffects?.bounds?.(pen,stroke)||editorCore?.textMetrics?.(pen,stroke),w=shape?.width||0,h=shape?.height||0;
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
 if(maskDraw){
  maskDraw=null;redraw();setReady(ready);
  label('Mask painted · source image preserved. Ctrl+Z restores mask stroke.');return;
 }
 if(dragImage){
  const drag=dragImage;dragImage=null;
  if(drag.moved){redraw();setReady(ready);label('Image layer moved. Ctrl+Z restores position.');}
  return;
 }
 if(dragText){
  const drag=dragText;dragText=null;
  if(drag.moved){redraw();setReady(ready);label('Text moved. Ctrl+Z restores its position.');}
  return;
 }
 if(!drawing)return;
 drawing=false;
 if(active){snapshot();strokes.push(active);selectedObject=strokes.length-1;active=null;redraw();setReady(true);}
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(event,finishStroke);
ink.addEventListener('dblclick',event=>{
 if(!ready||event.button!==0||textDraft)return;
 const p=point(event),index=textIndexAt(p.x,p.y);
 if(index>=0){event.preventDefault();beginInline(strokes[index].points[0],index);}
 else{const imageIndex=imageIndexAt(p.x,p.y);
  if(imageIndex>=0){selectImage(imageIndex);switchInspectorTab('mask');}}
});
document.querySelector('#undo').addEventListener('click',undo);document.getElementById('redo')?.addEventListener('click',redo);
document.querySelector('#clear').addEventListener('click',()=>{if(strokes.length){snapshot();strokes=[];
 selectedText=-1;selectedImage=-1;selectedObject=-1;redraw();setReady(true);}});
function isTyping(target){return !!target?.matches?.('input,textarea,select,[contenteditable],[role="textbox"]');}
window.addEventListener('keydown',event=>{
 if(!ready)return;
 if(event.key==='Escape'){
  if(textDraft){event.preventDefault();cancelInline();return;}
  if(contextMenu&&!contextMenu.hidden){event.preventDefault();closeContextMenu();}
  return;
 }
 if(isTyping(event.target))return;
 if((event.key==='Delete'||event.key==='Backspace')&&selectedAnyStroke()&&!event.ctrlKey&&!event.metaKey){
  event.preventDefault();removeLayerAt(selectedAnyIndex());return;
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
 if(textDraft)commitInline();
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
 if(!ready||!contextMenu||event.target?.closest?.('.image-text-inline'))return;
 event.preventDefault();event.stopPropagation();
 const maxX=window.innerWidth||1000,maxY=window.innerHeight||800;
 contextMenu.hidden=false;
 const width=contextMenu.offsetWidth||260,height=contextMenu.offsetHeight||290;
 contextMenu.style.left=Math.max(6,Math.min(maxX-width-8,event.clientX))+'px';
 contextMenu.style.top=Math.max(6,Math.min(maxY-height-8,event.clientY))+'px';
 const deleteButton=contextMenu.querySelector?.('[data-image-action="delete"]');
 if(deleteButton)deleteButton.disabled=!selectedAnyStroke()||!!selectedAnyStroke()?.locked;
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
  if(action==='delete')removeLayerAt(selectedAnyIndex());
 });
}
document.getElementById('copy-image')?.addEventListener?.('click',()=>{void copyImage(true);});
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportFile(type){if(!ready)return;if(textDraft)commitInline();document.querySelector('#png').disabled=true;document.querySelector('#pdf').disabled=true;
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
