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
function renderStrokeList(){const list=document.getElementById('stroke-list');if(!list||typeof document.createElement!=='function'||typeof list.replaceChildren!=='function')return;list.replaceChildren();if(!strokes.length){list.textContent='No annotations yet';return;}
  strokes.forEach((stroke,i)=>{const row=document.createElement('div');row.className='stroke-entry';const title=document.createElement('span');title.textContent=String(i+1).padStart(2,'0')+' · '+stroke.type;const remove=document.createElement('button');remove.textContent='Remove';remove.title='Remove annotation '+(i+1);remove.onclick=()=>{snapshot();strokes.splice(i,1);redraw();setReady(ready);};row.append(title,remove);list.appendChild(row);});}
const toolButtons=[...(document.querySelectorAll?.('[data-studio-tool]')||[])];function syncTool(){for(const button of toolButtons){const selected=button.dataset.studioTool===tool.value;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));}}
tool.addEventListener('change',syncTool);for(const button of toolButtons)button.addEventListener('click',()=>{tool.value=button.dataset.studioTool;syncTool();});syncTool();
function scheduleRedraw(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;redraw();});}
ink.addEventListener('pointerdown',event=>{
  if(!ready||event.button!==0)return;
  event.preventDefault();ink.setPointerCapture(event.pointerId);
  const p=point(event),type=tool.value;
  active={type,points:[p],size:Number(size.value)*(ink.width/ink.getBoundingClientRect().width),color:color.value,
    text:document.querySelector('#text-value').value};
  drawing=true;
  if(type==='text'){snapshot();strokes.push(active);active=null;drawing=false;redraw();setReady(true);}
  else scheduleRedraw();
});
ink.addEventListener('pointermove',event=>{
  if(!drawing||!active)return;
  const p=point(event);
  if(['rectangle','arrow','redact'].includes(active.type))active.points=[active.points[0],p];
  else active.points.push(p);
  scheduleRedraw();event.preventDefault();
});
function finishStroke(){if(!drawing)return;drawing=false;
  if(active){snapshot();strokes.push(active);active=null;redraw();setReady(true);}
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(event,finishStroke);
document.querySelector('#undo').addEventListener('click',undo);document.getElementById('redo')?.addEventListener('click',redo);
document.querySelector('#clear').addEventListener('click',()=>{if(strokes.length){snapshot();strokes=[];redraw();setReady(true);}});
window.addEventListener('keydown',event=>{if(!ready||!event.ctrlKey||event.target?.matches?.('input,textarea,select,[contenteditable]'))return;
 if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}
 else if(event.key.toLowerCase()==='y'){event.preventDefault();redo();}
},true);
function flatten(){const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
  const merged=canvas.getContext('2d');merged.drawImage(base,0,0);merged.drawImage(ink,0,0);return canvas;}
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportFile(type){if(!ready)return;document.querySelector('#png').disabled=true;document.querySelector('#pdf').disabled=true;
  try{label('Preparing '+type.toUpperCase()+'…');const canvas=flatten();
    if(type==='png'){
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed.')),'image/png'));
      download(blob,'png');
    }else download(await MangoPDF.fromCanvas(canvas),'pdf');
    label(type.toUpperCase()+' exported locally.');
  }catch(error){label('Export failed: '+error.message);}
  finally{setReady(true);}
}
document.querySelector('#png').addEventListener('click',()=>exportFile('png'));
document.querySelector('#pdf').addEventListener('click',()=>exportFile('pdf'));
begin();
