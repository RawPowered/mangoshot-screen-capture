const api=globalThis.chrome??globalThis.browser;
const base=document.querySelector('#base'),ink=document.querySelector('#ink');
const ctx=base.getContext('2d'),pen=ink.getContext('2d');
const status=document.querySelector('#status'),wrap=document.querySelector('#canvas-wrap'),workspace=document.querySelector('#workspace');
const tool=document.querySelector('#tool'),size=document.querySelector('#size'),color=document.querySelector('#color');
const params=new URLSearchParams(location.search),source=Number(params.get('source'));
const mode=params.get('mode')==='full'?'full':'visible',captureId=crypto.randomUUID();
const stored=params.get('stored'),captureError=params.get('capture_error');
const clipboardMode=params.get('clipboard')==='1',captureOutput=globalThis.MangoCaptureOutputV0614;
const call=(fn,...args)=>new Promise((resolve,reject)=>{
  try{fn(...args,value=>{const error=api.runtime.lastError;error?reject(new Error(error.message)):resolve(value);});}
  catch(error){reject(error);}
});
let documentLoadPending=true;
const advancedComp=globalThis.MangoAdvancedCompositorV0724;
let composition={groups:[],adjustments:[]},adjustedSource=null,sourceGeneration=0,sourceKey='';
let meta,frames=[],ready=false,drawing=false,active=null,strokes=[],renderPending=false,history=[],redoHistory=[];
const editorCore=globalThis.MangoImageEditorCore;
const layerCore=globalThis.MangoImageLayersV0612;
const typeEffects=globalThis.MangoImageTypeV0613;
const vectorCore=globalThis.MangoImageVectorV0615;
const penInput=globalThis.MangoPenInputV0616;
const precisionBrush=globalThis.MangoBrushV0725,creativeEffects=globalThis.MangoCreativeEffectsV0726,rasterLayers=globalThis.MangoRasterLayerV0727,selectionCore=globalThis.MangoSelectionV0728;
let brushPreference=precisionBrush?.read().profile||null;
const layerOps=globalThis.MangoLayerOpsV0618;
const selectedBox=document.getElementById('text-selection-box'),inline=document.getElementById('text-inline'),
 inlineInput=document.getElementById('text-inline-input'),contextMenu=document.getElementById('image-context-menu');
const textFontSize=document.getElementById('text-font-size'),textFontFamily=document.getElementById('text-font-family'),
 textContent=document.getElementById('text-content');
let selectedText=-1,textDraft=null,dragText=null,textPreset='plain';
let selectedImage=-1,selectedObject=-1,dragImage=null,maskDraw=null,dragVector=null,inspectorTab='layers';
let entireErase=null,lastEraserMode='erase-brush';
let layerClipboard=null,styleClipboard=null,layerDrag=null,layerStackDrag=null,appearanceGesture=null;
let resizeDrag=null,rotationDrag=null,automationRevisionV075=0;
const rotationCore=globalThis.MangoTransformMaterialV0715;
const ts=globalThis.MangoToolStudioV0711;let batchIds=new Set(),batchAnchor=null,batchDrag=null,marqueeDrag=null,snapGuides=null;
function label(message){status.textContent=message;}
function activate(){call(api.tabs.getCurrent.bind(api.tabs)).then(tab=>
  tab?.id&&call(api.tabs.update.bind(api.tabs),tab.id,{active:true})).catch(()=>{});}
function setReady(value){
 automationRevisionV075++;ready=value;
 if(advancedComp&&composition.groups.length)composition=advancedComp.reconcile(composition,strokes);
 for(const id of ['png','pdf','clear','copy-image']){const button=document.getElementById(id);if(button)button.disabled=!value;}
 document.getElementById('undo').disabled=!value||!history.length;
 const redo=document.getElementById('redo');if(redo)redo.disabled=!value||!redoHistory.length;
 renderStrokeList();updateEditorControls();
}
function image(dataUrl){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Screenshot image failed to decode.'));img.src=dataUrl;});}
function zoom(){if(!base.width)return;const selected=document.querySelector('#zoom').value;
  // Fit the entire image inside the stationary canvas viewport. Images taller
  // than the editor are navigated by canvas panning, never document scrolling.
  const availableWidth=Math.max(24,workspace.clientWidth-24);
  const availableHeight=Math.max(24,workspace.clientHeight-24);
  const factor=selected==='fit'?Math.max(.01,Math.min(1,availableWidth/base.width,availableHeight/base.height)):
    selected==='fit-width'?Math.max(.01,Math.min(1,availableWidth/base.width)):Number(selected);
  wrap.style.width=Math.max(1,Math.round(base.width*factor))+'px';
  const zoomInfo=document.getElementById('img-zoom-readout');
  if(zoomInfo)zoomInfo.textContent=(selected==='fit'?'Fit · ':selected==='fit-width'?'Width · ':'')+Math.round(factor*100)+'%';
}
document.querySelector('#zoom').addEventListener('change',zoom);
window.addEventListener('resize',()=>{if(document.querySelector('#zoom').value==='fit')zoom();});
async function assemble(){
  if(!meta || frames.length!==meta.frames || frames.some(f=>!f?.dataUrl))throw new Error('Missing screenshot frames.');
  if(meta.selection){
    if(!captureOutput?.compose)throw Error('Selected-area compositor is not available.');
    await captureOutput.compose(meta,frames,base);
    ink.width=base.width;ink.height=base.height;
    frames=[];setReady(true);zoom();
    label('Selected screenshot ready · '+base.width+' × '+base.height+' px');
    const info=document.getElementById('image-meta');
    if(info)info.textContent=base.width+' × '+base.height+' px · original preserved';
    activate();return;
  }
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
    if(clipboardMode){
      const landing=document.getElementById('image-clipboard-landing');
      if(landing)landing.hidden=false;
      label('Open an image from your clipboard. Select Paste image or press Ctrl+V.');
      document.getElementById('clipboard-paste-zone')?.focus?.({preventScroll:true});
      return;
    }
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
  }catch(error){label('Capture failed: '+error.message);}finally{documentLoadPending=false;globalThis.MangoImageDocumentUIV0723?.refresh();}
}

/* Explicit clipboard import: never read in the background or on page load.
 * User click and Ctrl+V event are both permitted; no blanket clipboardRead permission. */
async function loadClipboardImage(blob){
 if(!captureOutput?.blobImage)throw Error('Image clipboard module is unavailable.');
 if(ready&&(strokes.length||advancedComp?.active(composition)))throw Error('Finish or export the current edited image before replacing it.');
 const next=await captureOutput.blobImage(blob);
 if(next.width*next.height>48000000)throw Error('The clipboard image is too large.');
 base.width=next.width;base.height=next.height;
 ink.width=next.width;ink.height=next.height;
 ctx.clearRect(0,0,next.width,next.height);ctx.drawImage(next,0,0);
 meta={width:next.width,height:next.height,pageHeight:next.height,dpr:1,frames:1,full:false};
 clearBatch();strokes=[];history=[];redoHistory=[];composition={groups:[],adjustments:[]};sourceGeneration++;selectedText=-1;selectedImage=-1;selectedObject=-1;
 const landing=document.getElementById('image-clipboard-landing');
 if(landing)landing.hidden=true;
 setReady(true);zoom();redraw();
 const info=document.getElementById('image-meta');
 if(info)info.textContent=next.width+' × '+next.height+' px · clipboard image';
 label('Clipboard image imported · '+next.width+' × '+next.height+' px. Start annotating.');
}
async function clipboardAction(action){
 const message=document.getElementById('clipboard-status');
 if(message)message.textContent='Reading image…';
 try{
  const blob=await action();
  await loadClipboardImage(blob);
 }catch(error){
  if(message)message.textContent=error.message+' You can also paste with Ctrl+V.';
  label('Clipboard import: '+error.message);
 }
}
document.getElementById('clipboard-read')?.addEventListener?.('click',()=>{
 void clipboardAction(()=>captureOutput.read());
});
document.getElementById('clipboard-focus')?.addEventListener?.('click',()=>{
 document.getElementById('clipboard-paste-zone')?.focus?.();
 const message=document.getElementById('clipboard-status');
 if(message)message.textContent='Press Ctrl+V to paste an image.';
});
document.getElementById('clipboard-open-file')?.addEventListener?.('click',()=>{
 document.getElementById('clipboard-file')?.click?.();
});
document.getElementById('clipboard-file')?.addEventListener?.('change',event=>{
 const blob=event.target.files?.[0];
 if(blob)void clipboardAction(()=>Promise.resolve(blob));
 event.target.value='';
});
document.addEventListener?.('paste',event=>{
 const landing=document.getElementById('image-clipboard-landing');
 if(!landing||landing.hidden||ready)return;
 const items=Array.from(event.clipboardData?.items||[]);
 const match=items.find(x=>['image/png','image/jpeg','image/webp'].includes(x.type));
 if(!match){
  const msg=document.getElementById('clipboard-status');
  if(msg)msg.textContent='Clipboard has no image. Copy an image and press Ctrl+V.';
  return;
 }
 event.preventDefault();
 const blob=match.getAsFile?.();
 if(blob)void clipboardAction(()=>Promise.resolve(blob));
});
document.getElementById('clipboard-import')?.addEventListener?.('click',()=>{
 const url=api.runtime.getURL('editor.html')+'?clipboard=1';
 void call(api.tabs.create.bind(api.tabs),{url,active:true})
   .catch(error=>label('Could not open clipboard editor: '+error.message));
});

function point(event){
 const rect=ink.getBoundingClientRect();
 const enabled=document.getElementById('image-pen-pressure')?.checked!==false;
 return penInput?.localPoint?.(event,rect,ink.width,ink.height,enabled)||{
  x:(event.clientX-rect.left)*ink.width/rect.width,
  y:(event.clientY-rect.top)*ink.height/rect.height,
  p:event.pointerType==='pen'?Math.max(.04,Number(event.pressure)||.5):1};
}
function pointerSamples(event){
 const parts=penInput?.samples?.(event)||[event];
 return parts.map(part=>point(part));
}
function drawStroke(stroke){
 if(!stroke||stroke.visible===false)return;
 paintCompositorStroke(pen,stroke);
}
function rawLayerBounds(l,ctx=pen){return vectorCore?.isVector?.(l)?vectorCore.bounds(l):layerOps?.bounds?.(l,layerCore,typeEffects,ctx);}
function rotationLocal(l,p){const a=rotationCore?.rotation(l)||0;return a?rotationCore.local(p,rawLayerBounds(l),a):p;}
function paintCompositorStroke(pen,stroke,previewScale=1){
 const C=globalThis.MangoCompositorV0714,R=rotationCore,can=R?.eligible(stroke),hasCreative=can&&creativeEffects?.active(stroke.creativeFx),b=can&&(R.rotation(stroke)||R.active(stroke.material)||hasCreative)?rawLayerBounds(stroke,pen):null;
 const raw=ctx=>can?R.paintRotated(ctx,stroke,b,p=>drawStrokeRaw(stroke,p)):drawStrokeRaw(stroke,ctx);
 const material=ctx=>can&&R.active(stroke.material)?R.materialPaint(ctx,stroke.material,raw,R.aabb(b,R.rotation(stroke)),ctx.canvas.height/1080):raw(ctx);
 const filtered=target=>C?.active(stroke.effectStack)&&layerOps.mayStyle(stroke)?C.paintStack(target,stroke.effectStack,material,target.canvas.height/1080):material(target);
 if(hasCreative){creativeEffects.paint(pen,stroke,filtered,R.aabb(b,R.rotation(stroke)),previewScale,layerOps.style(stroke));return;}
 const paint=()=>filtered(pen);if(layerOps?.apply)layerOps.apply(pen,stroke,paint);else paint();
}
const imageStrokeContext=pen;
function drawStrokeRaw(stroke,pen=imageStrokeContext){
  if(!stroke||stroke.visible===false)return;
  if(stroke.type==='image'){layerCore?.paint(pen,stroke);return;}
  if(penInput?.paintEraser?.(pen,stroke))return;
  if(precisionBrush?.paint(pen,stroke))return;
  if(vectorCore?.isVector?.(stroke)){vectorCore.paint(pen,stroke);return;}
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
function draftTextLayer(){
 if(!textDraft||!inlineInput)return null;
 const existing=textDraft.index>=0?strokes[textDraft.index]:null;
 const value=String(inlineInput.value||'');
 if(!value)return null;
 const visibleSize=Math.max(12,Number(textFontSize?.value||48));
 const scale=existing?.scaleY||1;
 return existing?{...existing,text:value,fontSize:visibleSize/scale,fontFamily:textFontFamily?.value||'sans',
   styleId:textPreset,color:color.value}:
  {type:'text',text:value,points:[{x:textDraft.x,y:textDraft.y,p:1}],
   fontSize:visibleSize,scaleX:1,scaleY:1,styleId:textPreset,
   fontFamily:textFontFamily?.value||'sans',color:color.value,effects:typeEffects?.initial?.()};
}
function effectiveLayerVisible(l){return advancedComp?advancedComp.visible(composition,l):l.visible!==false;}
function composedSource(){
 if(!advancedComp||!composition.adjustments.length){if(adjustedSource){adjustedSource.hidden=true;adjustedSource.width=adjustedSource.height=1;base.style.visibility='';sourceKey='';}return base;}
 const key=sourceGeneration+':'+base.width+':'+base.height+':'+JSON.stringify(composition.adjustments);
 if(!adjustedSource){adjustedSource=document.createElement('canvas');adjustedSource.id='adjusted-source-v0724';adjustedSource.setAttribute('aria-hidden','true');base.after(adjustedSource);}
 if(key!==sourceKey){adjustedSource.width=base.width;adjustedSource.height=base.height;advancedComp.paintSource(adjustedSource.getContext('2d'),base,composition,globalThis.MangoCompositorV0714);sourceKey=key;}
 adjustedSource.hidden=false;base.style.visibility='hidden';return adjustedSource;
}
function paintComposedLayers(target,layers,comp=composition,scale=1){
 const paint=(g,l)=>{
  if(!l||l.visible===false)return;let x=l;
  if(scale!==1&&l.layerFx){const f=MangoLayerStudioV0712.appearance(l);x={...l,layerFx:{...f,blur:f.blur*scale,offsetX:f.offsetX*scale,offsetY:f.offsetY*scale}};}
  paintCompositorStroke(g,x,scale);
 };
 if(advancedComp&&comp.groups.length)advancedComp.paintLayers(target,layers,comp,paint);else{advancedComp?.clearBuffers(target);for(const l of layers)paint(target,l);}
}
function redraw(){
 pen.clearRect(0,0,ink.width,ink.height);composedSource();
 const preview=draftTextLayer();
 if(advancedComp&&composition.groups.length){
  const layers=strokes.map((l,i)=>textDraft?.index===i?(preview||{...l,visible:false}):l);
  paintComposedLayers(pen,layers);
 }else{
  advancedComp?.clearBuffers(pen);
  for(let i=0;i<strokes.length;i++){if(textDraft?.index===i){if(preview)drawStroke(preview);}else drawStroke(strokes[i]);}
 }
 if(textDraft?.index===-1&&preview)drawStroke(preview);
 drawStroke(active);updateSelectionBox();updateImageSelectionBox();updateVectorSelectionBox();updateInkRotationBox();paintBatchOverlay();
}
function cloneStrokes(value){return JSON.parse(JSON.stringify(value));}
function historyImageState(){const value=cloneStrokes(strokes);value.composition=JSON.parse(JSON.stringify(composition));return value;}
function restoreImageState(value){composition=value.composition||{groups:[],adjustments:[]};delete value.composition;strokes=value;}
function snapshot(){ensureLayerIds();automationRevisionV075++;history.push(historyImageState());if(history.length>80)history.shift();redoHistory=[];}
function undo(){if(!history.length)return;clearBatch();automationRevisionV075++;redoHistory.push(historyImageState());restoreImageState(history.pop());
 selectedText=Math.min(selectedText,strokes.length-1);selectedImage=Math.min(selectedImage,strokes.length-1);
 selectedObject=Math.min(selectedObject,strokes.length-1);redraw();setReady(ready);syncSelectedText();syncLayerProperties();}
function redo(){if(!redoHistory.length)return;clearBatch();automationRevisionV075++;history.push(historyImageState());restoreImageState(redoHistory.pop());
 selectedText=Math.min(selectedText,strokes.length-1);selectedImage=Math.min(selectedImage,strokes.length-1);
 selectedObject=Math.min(selectedObject,strokes.length-1);redraw();setReady(ready);syncSelectedText();syncLayerProperties();}
function selectedStroke(){return selectedText>=0&&strokes[selectedText]?.type==='text'?strokes[selectedText]:null;}
function selectedImageStroke(){return selectedImage>=0&&strokes[selectedImage]?.type==='image'?strokes[selectedImage]:null;}
function selectedAnyIndex(){return selectedImage>=0?selectedImage:selectedText>=0?selectedText:selectedObject;}
function selectedAnyStroke(){return strokes[selectedAnyIndex()]||null;}
function selectObject(index){
 clearBatch();
 selectedText=-1;selectedImage=-1;
 selectedObject=index>=0&&strokes[index]&&!['text','image'].includes(strokes[index].type)?index:-1;
 if(selectedObject>=0&&vectorCore?.isVector?.(strokes[selectedObject])){
  tool.value='select';syncTool();switchInspectorTab('tools');
 }
 syncSelectedText();redraw();renderStrokeList();syncLayerProperties();
}
function updateVectorSelectionBox(){
 const box=document.getElementById('vector-selection-box'),l=strokes[selectedObject];
 if(!box)return;
 if(!ready||!vectorCore?.isVector?.(l)||l.visible===false||!ink.width||!ink.height||textDraft){
  box.hidden=true;return;
 }
 const b=vectorCore.bounds(l);
 syncRotationFrame(box,l,b);
 box.style.left=100*b.x/ink.width+'%';box.style.top=100*b.y/ink.height+'%';
 box.style.width=100*b.width/ink.width+'%';box.style.height=100*b.height/ink.height+'%';
 box.hidden=false;
}
function updateImageSelectionBox(){
 const box=document.getElementById('image-layer-selection-box'),l=selectedImageStroke();
 if(!box)return;
 if(!ready||!l||l.visible===false||!layerCore||!ink.width||!ink.height||textDraft){box.hidden=true;return;}
 const b=layerCore.bounds(l);
 syncRotationFrame(box,l,b);
 box.style.left=100*b.x/ink.width+'%';box.style.top=100*b.y/ink.height+'%';
 box.style.width=100*b.width/ink.width+'%';box.style.height=100*b.height/ink.height+'%';
 box.hidden=false;
}
function selectImage(index){
 clearBatch();
 if(index<0||strokes[index]?.type!=='image'){selectedImage=-1;updateImageSelectionBox();return;}
 selectedImage=index;selectedText=-1;selectedObject=-1;syncSelectedText();renderStrokeList();
 updateImageSelectionBox();syncLayerProperties();
}

function textIndexAt(x,y){
 if(!editorCore?.hitText)return -1;
 for(let i=strokes.length-1;i>=0;i--){const l=strokes[i];if(!effectiveLayerVisible(l)||l.type!=='text')continue;const p=rotationLocal(l,{x,y});if(typeEffects?.hit?.(pen,l,p.x,p.y,10)??editorCore.hitText(pen,l,p.x,p.y,10))return i;}
 return -1;
}
function updateSelectionBox(){
 if(!selectedBox)return;
 const stroke=selectedStroke();
 if(!ready||!stroke||stroke.visible===false||textDraft||!ink.width||!ink.height||!editorCore?.textMetrics){selectedBox.hidden=true;return;}
 const r=(typeEffects?.bounds?.(pen,stroke))||editorCore.textMetrics(pen,stroke);
 syncRotationFrame(selectedBox,stroke,r);
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
 if(drawSettings)drawSettings.hidden=textMode||(tool.value==='select'&&!vectorCore?.isVector?.(selectedAnyStroke()));
 if(textSettings)textSettings.hidden=!textMode;
 const hint=document.getElementById('image-hint');
 if(hint)hint.textContent=textDraft?'Type here · Enter to place · Shift+Enter new line · Esc cancels':
  tool.value==='text'?'Click on the screenshot to type. Click existing text to edit.':
  tool.value==='erase-brush'?'Brush across annotations to erase pixels. Shift to Whole Stroke Erase to remove an entire mark.':
  tool.value==='erase-stroke'?'Drag over pen marks, shapes or text to remove complete unlocked annotations. Ctrl+Z restores them.':
  tool.value==='select'?'Select an image or text layer. Drag corners to resize proportionally; hold Shift to stretch.':
  tool.value==='marquee'?'Drag a rectangle to select layers · Shift + drag adds to selection.':'Right-click the screenshot to copy all pixels and annotations.';
 if(textContent){textContent.disabled=!selected;textContent.placeholder=selected?'Edit selected text':'Click screenshot to create text';}
 if(textFontSize)textFontSize.disabled=!ready;
 if(textFontFamily)textFontFamily.disabled=!ready;
 for(const button of document.querySelectorAll?.('[data-text-preset]')||[])button.disabled=!ready;
 const remove=document.querySelector?.('[data-image-action="delete"]');
 if(remove)remove.disabled=!selected;
}
function selectText(index){
 clearBatch();
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
 redraw();updateEditorControls();updateSelectionBox();
}
function positionInline(pointValue){
 if(!inline||!ink.width||!ink.height)return;
 // Keep the edit field NEXT to the rendered text instead of hiding its live preview.
 const screenScale=ink.getBoundingClientRect?.().width/ink.width||1;
 const nativePanelWidth=350/Math.max(.05,screenScale);
 const draft=draftTextLayer();
 const box=draft?(typeEffects?.bounds?.(pen,draft)||editorCore?.textMetrics?.(pen,draft)):null;
 const right=pointValue.x+(box?.width||80)+24/Math.max(.05,screenScale);
 const left=pointValue.x-nativePanelWidth-20/Math.max(.05,screenScale);
 let x=right+nativePanelWidth<=ink.width?right:left>=0?left:Math.max(0,pointValue.x);
 if(x+nativePanelWidth>ink.width&&ink.width>nativePanelWidth)x=ink.width-nativePanelWidth;
 inline.style.left=100*Math.max(0,x)/ink.width+'%';
 inline.style.top=100*Math.max(0,Math.min(ink.height-1,pointValue.y))/ink.height+'%';
 inlineInput.style.fontSize=Math.max(14,Math.min(24,Number(textFontSize?.value||48)*screenScale))+'px';
}
function beginInline(pos,index=-1){
 if(!ready||!inline||!inlineInput)return;
 if(textDraft)cancelInline();
 const existing=index>=0?strokes[index]:null;
 if(existing?.locked){label('Unlock this text layer to edit it.');return;}
 clearBatch();selectedImage=-1;selectedObject=-1;
 textDraft={index,x:pos.x,y:pos.y};
 selectedText=existing?index:-1;
 if(existing){
  textPreset=existing.styleId||'plain';
  if(textFontSize)textFontSize.value=Math.round((existing.fontSize||48)*(existing.scaleY??1));
  if(textFontFamily)textFontFamily.value=existing.fontFamily||'sans';
  color.value=existing.color||color.value;
 }
 inlineInput.value=existing?.text||'';
 positionInline(pos);inline.hidden=false;updateEditorControls();redraw();
 inlineInput.focus?.({preventScroll:true});
 if(existing)inlineInput.select?.();
}
function commitInline(){
 if(!textDraft)return false;
 const value=String(inlineInput?.value||'').replace(/\r\n/g,'\n').trim(),draft=textDraft;
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
 const trial=strokes.slice();const [moving]=trial.splice(index,1);trial.splice(target,0,moving);if(advancedComp&&!advancedComp.canOrder(composition,trial)){label('Move the complete isolated group or ungroup first.');return false;}
 snapshot();const [l]=strokes.splice(index,1);strokes.splice(target,0,l);
 if(selectedText===index)selectedText=target;else if(selectedText===target)selectedText=index;
 if(selectedImage===index)selectedImage=target;else if(selectedImage===target)selectedImage=index;
 if(selectedObject===index)selectedObject=target;else if(selectedObject===target)selectedObject=index;
 redraw();setReady(ready);syncLayerProperties();return true;
}
function creativeCopyAllowed(copies){try{const next=[...strokes,...copies];creativeEffects?.requireBudget(next,ink.width,ink.height);rasterLayers?.requireProject(next,l=>layerCore.asset(l));selectionCore?.requireProject(next,l=>layerCore.asset(l));return true;}catch(e){label(e.message);return false;}}
function duplicateSelectedLayer(){
 const i=selectedAnyIndex();if(i<0||!strokes[i]||strokes[i].locked)return false;
 if(!creativeCopyAllowed([strokes[i]]))return false;
 snapshot();const layer=cloneStrokes([strokes[i]])[0];
 layer.id=(layer.id||'annotation')+'-copy-'+Math.floor(Math.random()*1e7);
 layer.name=(layer.name||layer.type)+' copy';
 layer.points=(layer.points||[]).map(p=>({...p,x:p.x+20,y:p.y+20}));
 const target=advancedComp?advancedComp.afterGroup(composition,strokes,i):i+1;strokes.splice(target,0,layer);
 if(layer.type==='text'){selectedText=target;selectedImage=-1;selectedObject=-1;}
 else if(layer.type==='image'){selectedImage=target;selectedText=-1;selectedObject=-1;}
 else{selectedObject=target;selectedText=-1;selectedImage=-1;}
 redraw();setReady(ready);syncSelectedText();syncLayerProperties();return true;
}
/* Layer operations remain in the same undoable annotation model.
 * Local in-editor layer clipboard is intentionally separate from Copy Image.
 */
function selectLayerAt(index,showLayerPanel=true){
 clearBatch();
 const l=strokes[index];
 selectedText=l?.type==='text'?index:-1;
 selectedImage=l?.type==='image'?index:-1;
 selectedObject=l&&selectedText<0&&selectedImage<0?index:-1;
 if(showLayerPanel)switchInspectorTab('layers');
 redraw();syncSelectedText();renderStrokeList();syncLayerProperties();
 return !!l;
}
function copySelectedLayer(){
 const layer=selectedAnyStroke();
 if(!layer||!layerOps?.mayCopy?.(layer))return false;
 layerClipboard=layerOps.clipboardOf(layer);layerClipboardCount=0;
 label((layer.name||layer.type)+' copied to MangoShot layer clipboard.');
 syncLayerProperties();return true;
}
let layerClipboardCount=0;
function pasteCopiedLayer(){
 if(!ready||!layerClipboard||!layerOps?.cloneLayer)return false;
 // Imported image asset IDs are valid only inside this running Image Studio.
 if(layerClipboard.type==='image'&&layerCore?.asset&&!layerCore.asset(layerClipboard)){
  label('This layer image asset is unavailable in the current editor session.');return false;
 }
 layerClipboardCount++;
 const copy=layerOps.cloneLayer(layerClipboard,20*layerClipboardCount);
 if(!copy)return false;
 if(!creativeCopyAllowed([copy])){layerClipboardCount--;return false;}
 snapshot();
 const position=selectedAnyIndex();
 const index=advancedComp?advancedComp.afterGroup(composition,strokes,position):position>=0?position+1:strokes.length;
 strokes.splice(index,0,copy);
 selectLayerAt(index);setReady(true);
 label('Layer pasted · drag it to reposition · Ctrl+Z to undo.');
 return true;
}
function cutSelectedLayer(){
 if(!ready||!selectedAnyStroke()||selectedAnyStroke().locked)return false;
 if(!copySelectedLayer())return false;
 return removeLayerAt(selectedAnyIndex());
}
function copySelectedStyle(){
 const layer=selectedAnyStroke();
 if(!layer||!layerOps?.mayStyle(layer))return false;
 styleClipboard={opacity:layer.opacity??1,layerFx:layerOps.copy(layerOps.style(layer)),creativeFx:layer.creativeFx?creativeEffects.copy(layer.creativeFx):null};
 label('Layer appearance copied.');syncLayerProperties();return true;
}
function pasteCopiedStyle(){
 const layer=selectedAnyStroke(),index=selectedAnyIndex();
 if(!styleClipboard||!layer||layer.locked||!layerOps?.mayStyle(layer))return false;
 const next={...layer,opacity:styleClipboard.opacity,layerFx:layerOps.copy(styleClipboard.layerFx)};
 if(styleClipboard.creativeFx)next.creativeFx=creativeEffects.copy(styleClipboard.creativeFx);else delete next.creativeFx;
 try{if(styleClipboard.creativeFx&&!creativeEffects)throw Error('Creative Effects Studio is unavailable.');creativeEffects?.requireBudget(strokes.map((l,i)=>i===index?next:l),ink.width,ink.height);}catch(e){label(e.message);return false;}
 snapshot();strokes[index]=next;
 redraw();setReady(true);syncLayerProperties();
 label('Layer style pasted · Ctrl+Z restores the original appearance.');return true;
}
function reorderLayerTo(from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from===to||
    from<0||from>=strokes.length||to<0||to>=strokes.length)return false;
 // Reordering locked layers is allowed; locking protects their content.
 const trial=strokes.slice();const [moving]=trial.splice(from,1);trial.splice(to,0,moving);if(advancedComp&&!advancedComp.canOrder(composition,trial)){label('Move the complete isolated group or ungroup first.');return false;}
 snapshot();
 const [layer]=strokes.splice(from,1);strokes.splice(to,0,layer);
 selectLayerAt(to);setReady(true);return true;
}
function updateLayerAppearance(field,value,continuous=false){
 const i=selectedAnyIndex(),layer=strokes[i];
 if(!layer||layer.locked||!layerOps?.mayStyle(layer))return false;
 const fx={...layerOps.style(layer)};
 if(field==='opacity'){
  value=layerOps.clamp(value,0,1);
  if((layer.opacity??1)===value)return false;
 }else{
  fx[field]=value;
  const valid=layerOps.style({layerFx:fx});
  value=valid[field];fx[field]=value;
  if(layerOps.style(layer)[field]===value)return false;
 }
 if(!continuous||!appearanceGesture||appearanceGesture.index!==i||appearanceGesture.field!==field){
  snapshot();appearanceGesture={index:i,field};
 }
 strokes[i]=field==='opacity'?{...layer,opacity:value}:{...layer,layerFx:fx};
 redraw();
 if(!continuous){appearanceGesture=null;setReady(true);syncLayerProperties();}
 return true;
}
function syncLayerProperties(){
 globalThis.MangoStudioMenusV0617?.updateAvailability?.();
 const l=selectedAnyStroke(),panel=document.getElementById('image-layer-properties');
 syncRotationControls();
 if(panel)panel.hidden=!l;
 const name=document.getElementById('image-selected-layer-name');if(name)name.textContent=l?.name||l?.type||'';
 const opacity=document.getElementById('image-layer-opacity');
 if(opacity){opacity.value=Math.round((l?.opacity??1)*100);opacity.disabled=!l||!!l.locked;}
 const output=document.getElementById('image-opacity-readout');if(output)output.textContent=(opacity?.value||100)+'%';
 const stylable=!!l&&!!layerOps?.mayStyle?.(l);
 const styleBox=document.getElementById('image-layer-style-controls');
 if(styleBox){styleBox.hidden=!stylable;styleBox.setAttribute('aria-disabled',String(!stylable||!!l?.locked));}
 const fx=layerOps?.style?.(l)||{kind:'none',color:'#000000',blur:0,offsetX:0,offsetY:0,blend:'source-over'};
 for(const [id,key] of [['image-layer-fx-kind','kind'],['image-layer-fx-color','color'],
  ['image-layer-fx-blur','blur'],['image-layer-fx-x','offsetX'],['image-layer-fx-y','offsetY'],['image-layer-fx-blend','blend']]){
  const control=document.getElementById(id);
  if(control){control.value=String(fx[key]);control.disabled=!stylable||!!l?.locked;}
 }
 for(const [id,suffix] of [['image-layer-fx-blur',' px'],['image-layer-fx-x',' px'],['image-layer-fx-y',' px']]){
  const outputEl=document.getElementById(id+'-value'),inputEl=document.getElementById(id);
  if(outputEl&&inputEl)outputEl.textContent=inputEl.value+suffix;
 }
 for(const button of document.querySelectorAll?.('[data-layer-preset]')||[]){
  const preset=layerOps?.preset?.(button.dataset.layerPreset);
  const active=stylable&&preset&&Object.entries(preset).every(([key,value])=>fx[key]===value);
  button.setAttribute('aria-pressed',String(!!active));
  button.disabled=!stylable||!!l?.locked;
 }
 for(const [id,disabled] of [
  ['image-copy-layer',!l],['image-cut-layer',!l||!!l.locked],
  ['image-paste-layer',!ready||!layerClipboard],
  ['image-copy-style',!stylable],['image-paste-style',!stylable||!!l?.locked||!styleClipboard]
 ]){const el=document.getElementById(id);if(el)el.disabled=disabled;}

 for(const [id,prop] of [['image-layer-x','x'],['image-layer-y','y'],['image-layer-width','width'],['image-layer-height','height']]){
  const el=document.getElementById(id);if(!el)continue;
  const b=l?.type==='image'?layerCore?.bounds(l):
   l?.type==='text'?(typeEffects?.bounds?.(pen,l)||editorCore?.textMetrics(pen,l)):
   vectorCore?.isVector?.(l)?vectorCore.bounds(l):null;
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
 syncVectorControls();
 const inspectorState=document.getElementById('image-inspector-state');
 if(inspectorState)inspectorState.textContent=l?(l.type==='image'?'IMAGE LAYER':l.type==='text'?'TEXT LAYER':'ANNOTATION'):'IMAGE STUDIO';
 const lock=document.getElementById('image-keep-ratio');if(lock)lock.disabled=!l||l.locked||(!['image','text'].includes(l.type)&&!vectorCore?.isVector?.(l));
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
   clearBatch();snapshot();strokes.push(layer);selectedImage=strokes.length-1;selectedText=-1;selectedObject=-1;
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
 updateLayerAppearance('opacity',Number(event.target.value)/100,true);
});
document.getElementById('image-layer-opacity')?.addEventListener?.('change',event=>{
 if(appearanceGesture){appearanceGesture=null;setReady(true);syncLayerProperties();}
 else updateLayerAppearance('opacity',Number(event.target.value)/100,false);
});
for(const [id,key] of [['image-layer-fx-kind','kind'],['image-layer-fx-color','color'],
 ['image-layer-fx-blur','blur'],['image-layer-fx-x','offsetX'],['image-layer-fx-y','offsetY'],
 ['image-layer-fx-blend','blend']]){
 const field=document.getElementById(id);
 if(!field)continue;
 const value=()=>['blur','offsetX','offsetY'].includes(key)?Number(field.value):field.value;
 field.addEventListener('input',()=>{
  updateLayerAppearance(key,value(),true);
  const readout=document.getElementById(id+'-value');if(readout)readout.textContent=field.value+' px';
 });
 field.addEventListener('change',()=>{
  if(appearanceGesture){appearanceGesture=null;setReady(true);syncLayerProperties();}
  else updateLayerAppearance(key,value(),false);
 });
}
for(const button of document.querySelectorAll?.('[data-layer-preset]')||[]){
 button.addEventListener('click',()=>{
  const layer=selectedAnyStroke(),index=selectedAnyIndex();
  if(!layer||layer.locked||!layerOps?.mayStyle(layer))return;
  const next=layerOps.preset(button.dataset.layerPreset);
  if(JSON.stringify(layerOps.style(layer))===JSON.stringify(next))return;
  snapshot();strokes[index]={...layer,layerFx:next};
  redraw();setReady(true);syncLayerProperties();
  label(button.dataset.layerPreset+' layer appearance applied · Ctrl+Z to undo.');
 });
}
for(const [id,handler] of [
 ['image-copy-layer',copySelectedLayer],['image-cut-layer',cutSelectedLayer],
 ['image-paste-layer',pasteCopiedLayer],['image-copy-style',copySelectedStyle],
 ['image-paste-style',pasteCopiedStyle]
])document.getElementById(id)?.addEventListener?.('click',handler);

for(const [id,prop] of [['image-layer-x','x'],['image-layer-y','y'],['image-layer-width','width'],['image-layer-height','height']]){
 document.getElementById(id)?.addEventListener?.('change',event=>{
  const index=selectedAnyIndex(),layer=strokes[index],v=Number(event.target.value);
  if(!layer||!Number.isFinite(v)||layer.locked)return;
  if(['width','height'].includes(prop)&&(['image','text'].includes(layer.type)||vectorCore?.isVector?.(layer))&&typeEffects?.applyResize){
   const b=layer.type==='image'?layerCore.bounds(layer):vectorCore?.isVector?.(layer)?vectorCore.bounds(layer):typeEffects.bounds(pen,layer);
   const target={...b},k=Math.max(.05,v)/b[prop],ratioLocked=
     document.getElementById('image-keep-ratio')?.checked!==false&&!event.shiftKey;
   target[prop]=Math.max(1,v);
   if(ratioLocked)target[prop==='width'?'height':'width']=
     b[prop==='width'?'height':'width']*k;
   replaceLayer(index,vectorCore?.isVector?.(layer)?vectorCore.resized(layer,b,target):typeEffects.applyResize(layer,b,target));
  }
  else if(['width','height'].includes(prop)&&layer.type==='image')replaceLayer(index,{[prop]:Math.max(1,Math.round(v))});
  else if(['x','y'].includes(prop)){
   snapshot();if(vectorCore?.isVector?.(layer)){
    const b=vectorCore.bounds(layer);strokes[index]=vectorCore.translate(layer,prop==='x'?v-b.x:0,prop==='y'?v-b.y:0);
   }else layer.points[0]={...layer.points[0],[prop]:Math.round(v)};
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

// Layer FX sliders, offsets and colors paint while being adjusted.
const fxGestures=new WeakMap();
function fxValue(input){
 return input.type==='checkbox'?input.checked:
  input.type==='color'?input.value:
  input.dataset.fxPercent!==undefined?Number(input.value)/100:Number(input.value);
}
for(const input of document.querySelectorAll?.('[data-fx-group]')||[]){
 function paintFx(live){
  const current=selectedStroke();
  if(!current||current.locked||!typeEffects)return;
  const group=input.dataset.fxGroup,field=input.dataset.fxField;
  const fx=typeEffects.merged(current.effects);
  if(!fx[group]||!(field in fx[group]))return;
  const next=fxValue(input);
  if(fx[group][field]===next){
   if(!live&&fxGestures.has(input)){fxGestures.delete(input);setReady(ready);syncTextEffects();}
   return;
  }
  fx[group][field]=next;const edited=typeEffects.merged(fx);
  if(live){
   if(!fxGestures.has(input)){snapshot();fxGestures.set(input,selectedText);}
   strokes[selectedText]={...current,effects:edited};
   scheduleRedraw();
  }else if(fxGestures.has(input)){
   fxGestures.delete(input);strokes[selectedText]={...current,effects:edited};
   redraw();setReady(ready);syncTextEffects();
  }else updateSelectedText({effects:edited});
 }
 input.addEventListener('input',()=>paintFx(true));
 input.addEventListener('change',()=>paintFx(false));
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
 chooseImageTool(mode);switchInspectorTab('mask');
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
function ensureLayerIds(){
 if(!ts)return;const seen=new Set();
 for(const l of strokes){if(typeof l.id!=='string'||!l.id||seen.has(l.id))l.id=crypto.randomUUID();seen.add(l.id);}
}
function clearBatch(){batchIds.clear();batchAnchor=null;batchDrag=null;marqueeDrag=null;snapGuides=null;}
function batchLayers(){if(!ts)return [];return strokes.filter(l=>batchIds.has(l.id));}
function tsBounds(l){const b=rawLayerBounds(l);return rotationCore?.aabb(b,rotationCore.rotation(l))||b;}
function filteredLayers(){
 const query=(document.getElementById('ts-layer-search-v0711')?.value||'').trim().toLowerCase(),kind=document.getElementById('ts-layer-kind-v0711')?.value||'all';
 return strokes.filter(l=>(kind==='all'||kind==='vector'&&vectorCore?.isVector?.(l)||kind==='ink'&&!['image','text'].includes(l.type)&&!vectorCore?.isVector?.(l)||kind===l.type)&&(!query||[l.name,l.text,l.type,vectorCore?.kindOf?.(l)].some(x=>String(x||'').toLowerCase().includes(query))));
}
function setBatch(ids,anchor=null){
 ensureLayerIds();const selected=strokes.filter(l=>ids.includes(l.id));clearBatch();
 if(selected.length===1){tool.value='select';syncTool();selectLayerAt(strokes.indexOf(selected[0]));batchAnchor=anchor||selected[0].id;return;}
 selectedText=-1;selectedImage=-1;selectedObject=-1;
 batchIds=new Set(selected.map(l=>l.id));batchAnchor=anchor||selected.at(-1)?.id||null;
 tool.value='select';syncTool();switchInspectorTab('layers');redraw();renderStrokeList();
}
function toggleBatchLayer(i,event){
 const l=strokes[i];if(!l)return;ensureLayerIds();
 const selected=batchLayers(),primary=selectedAnyStroke(),ids=new Set(selected.length?selected.map(x=>x.id):primary?[primary.id]:[]);
 const anchor=batchAnchor||primary?.id||l.id;
 if(event.shiftKey){const visible=filteredLayers().map(x=>x.id),a=visible.indexOf(anchor),b=visible.indexOf(l.id);
  if(a>=0&&b>=0)for(const id of visible.slice(Math.min(a,b),Math.max(a,b)+1))ids.add(id);else ids.add(l.id);
 }else if(ids.has(l.id))ids.delete(l.id);else ids.add(l.id);
 setBatch([...ids],anchor);
}
function paintBatchOverlay(){
 if(!ts)return;const overlay=document.getElementById('ts-selection-overlay-v0711');if(!overlay||!ink.width||!ink.height)return;
 overlay.replaceChildren();
 const box=(b,marquee=false)=>{if(!b)return;const e=document.createElement('div');e.className='ts-box-v0711';if(marquee)e.dataset.marquee='true';
  Object.assign(e.style,{left:100*b.x/ink.width+'%',top:100*b.y/ink.height+'%',width:100*b.width/ink.width+'%',height:100*b.height/ink.height+'%'});overlay.append(e);};
 for(const l of batchLayers())if(l.visible!==false)box(tsBounds(l));
 if(marqueeDrag)box(ts.rect(marqueeDrag.start,marqueeDrag.end),true);
 if(snapGuides)for(const axis of ['x','y'])if(snapGuides[axis]!=null){const e=document.createElement('div');e.className='ts-guide-v0711';e.dataset.axis=axis;e.style[axis==='x'?'left':'top']=100*snapGuides[axis]/(axis==='x'?ink.width:ink.height)+'%';overlay.append(e);}
}
function batchAllowed(){const a=batchLayers();return ready&&a.length>1&&a.every(l=>!l.locked&&effectiveLayerVisible(l)&&!!tsBounds(l)&&!['erase-brush','eraser','erase-stroke'].includes(l.type));}
function batchCommit(mode,dx=0,dy=0){
 const a=batchLayers();if(!ready||a.length<2||drawing||textDraft||layerDrag||batchDrag||resizeDrag||maskDraw)return false;
 const ids=new Set(a.map(l=>l.id));let next=strokes;
 if(mode==='lock'||mode==='visibility'){const field=mode==='lock'?'locked':'visible',value=mode==='lock'?!a.every(l=>l.locked):!a.every(l=>l.visible!==false);
  next=strokes.map(l=>ids.has(l.id)?{...l,[field]:value}:l);
 }else if(mode==='delete'){if(a.some(l=>l.locked))return false;next=strokes.filter(l=>!ids.has(l.id));}
 else if(mode==='duplicate'){if(a.some(l=>l.locked||!layerOps.mayCopy(l)))return false;const copies=a.map(l=>layerOps.cloneLayer(l,20));if(!creativeCopyAllowed(copies))return false;next=[...strokes,...copies];}
 else{
  if(!batchAllowed())return false;
  const delta=mode==='move'?a.map(l=>({id:l.id,dx,dy})):ts.align(a.map(l=>({id:l.id,bounds:tsBounds(l)})),mode);
  if(!delta.some(p=>Math.abs(p.dx)>1e-6||Math.abs(p.dy)>1e-6)){label('No alignment change needed, or not enough space to distribute.');return false;}
  const map=new Map(delta.map(x=>[x.id,x]));next=strokes.map(l=>map.has(l.id)?layerOps.translate(l,map.get(l.id).dx,map.get(l.id).dy):l);
 }
 snapshot();const copies=mode==='duplicate'?next.slice(strokes.length).map(l=>l.id):null;strokes=next;
 if(mode==='delete')clearBatch();if(copies)batchIds=new Set(copies);
 redraw();setReady(ready);syncLayerProperties();label('Layer selection updated · Ctrl+Z to undo.');return true;
}
function syncBatchPanel(){
 if(!ts)return;const a=batchLayers(),count=document.getElementById('ts-layer-count-v0711'),p=document.getElementById('ts-batch-v0711');if(!p)return;
 if(count)count.textContent=filteredLayers().length+' / '+strokes.length+' layers';
 p.hidden=a.length<2;document.getElementById('ts-selection-count-v0711').textContent=a.length+' selected';
 for(const b of p.querySelectorAll('[data-ts-batch]')){const k=b.dataset.tsBatch;
  b.disabled=k==='lock'||k==='visibility'?false:k==='delete'||k==='duplicate'?a.some(l=>l.locked):!batchAllowed()||k.startsWith('distribute')&&a.length<3;}
}
if(ts){
 for(const id of ['ts-layer-search-v0711','ts-layer-kind-v0711'])document.getElementById(id)?.addEventListener('input',renderStrokeList);
 document.getElementById('ts-select-filtered-v0711')?.addEventListener('click',()=>setBatch(filteredLayers().map(l=>l.id)));
 document.getElementById('ts-clear-selection-v0711')?.addEventListener('click',()=>setBatch([]));
 for(const b of document.querySelectorAll?.('[data-ts-batch]')||[])b.addEventListener('click',()=>batchCommit(b.dataset.tsBatch));
}
function renderStrokeList(){
 const list=document.getElementById('stroke-list');
 if(!list||typeof document.createElement!=='function'||typeof list.replaceChildren!=='function')return;
 ensureLayerIds();
 if(ts){batchIds=new Set([...batchIds].filter(id=>strokes.some(l=>l.id===id)));if(batchIds.size<2)batchIds.clear();syncBatchPanel();}
 list.replaceChildren();
 if(!strokes.length){list.textContent='No editable layers yet. Import an image, add text or draw.';syncLayerProperties();return;}
 const filtered=ts?new Set(filteredLayers()):null;
 if(filtered&&!filtered.size){list.textContent='No matching layers.';syncLayerProperties();return;}
 for(let i=strokes.length-1;i>=0;i--){
  const stroke=strokes[i];if(filtered&&!filtered.has(stroke))continue;const row=document.createElement('div');
  row.className='stroke-entry image-layer-row'+(selectedAnyIndex()===i||batchIds.has(stroke.id)?' is-selected':'');
  if(ts)row.dataset.batch=String(batchIds.has(stroke.id));
  row.setAttribute('role','group');row.setAttribute('aria-label',(stroke.name||stroke.type)+' layer');
  row.dataset.layerIndex=String(i);row.dataset.layerId=stroke.id;
  const grip=document.createElement('button');grip.type='button';grip.className='image-layer-grip';
  grip.textContent='⠿';grip.title='Drag to reorder layer';grip.setAttribute('aria-label','Drag '+(stroke.name||stroke.type)+' to reorder');
  grip.draggable=true;
  grip.addEventListener('dragstart',event=>{
   layerStackDrag=i;
   if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','MangoShotLayer:'+i);}
   row.classList.add('is-dragging');
  });
  grip.addEventListener('dragend',()=>{layerStackDrag=null;row.classList.remove('is-dragging');});
  row.addEventListener('dragover',event=>{
   if(layerStackDrag==null)return;
   event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';
  });
  row.addEventListener('drop',event=>{
   if(layerStackDrag==null)return;
   event.preventDefault();const source=layerStackDrag;layerStackDrag=null;
   reorderLayerTo(source,i);
  });
  const eye=document.createElement('button');eye.type='button';eye.className='image-layer-eye';
  eye.textContent=stroke.visible===false?'◌':'◉';eye.title=stroke.visible===false?'Show layer':'Hide layer';
  eye.setAttribute('aria-label',eye.title);eye.setAttribute('aria-pressed',String(stroke.visible!==false));
  eye.addEventListener('click',()=>{snapshot();strokes[i]={...strokes[i],visible:strokes[i].visible===false};redraw();setReady(ready);syncLayerProperties();});
  const title=document.createElement('button');title.type='button';title.className='image-object-select';
  const name=stroke.name||(stroke.type==='text'?((stroke.text||'Text').slice(0,32)):stroke.type);
  title.textContent=(stroke.type==='image'?'▣ ':stroke.type==='text'?'T ':'◇ ')+name;
  title.title='Select '+name+' layer';title.setAttribute('aria-label','Select '+name+' layer');
  title.addEventListener('click',event=>{
   if(ts&&(event.ctrlKey||event.metaKey||event.shiftKey)){toggleBatchLayer(i,event);return;}
   clearBatch();tool.value='select';syncTool();
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
  if(ts&&globalThis.MangoIconsV079){
   const icon=(node,id)=>{node.replaceChildren(MangoIconsV079.svg(id,14));};
   icon(grip,'grip');icon(eye,stroke.visible===false?'eye-off':'eye');icon(lock,stroke.locked?'lock':'unlock');icon(edit,'more');icon(remove,'trash');
   const n=document.createElement('span');n.className='ts-layer-name-v0711';n.textContent=name;title.replaceChildren(MangoIconsV079.svg(stroke.type==='image'?'image':stroke.type==='text'?'text':vectorCore?.isVector?.(stroke)?'rectangle':'pen',14),n);
  }
  row.append(grip,eye,title,lock,edit,remove);
  list.append(row);
 }
 syncLayerProperties();
}
/* Shared tool / selection property authority. Canvas strokes remain serializable, and
 * selected vector properties are editable without changing other drawing defaults. */
const imageToolNames={marquee:'Marquee selection',select:'Select / Move',pen:'Pen',highlighter:'Highlighter',
 eraser:'Legacy Eraser','erase-brush':'Brush Erase','erase-stroke':'Whole Stroke Erase',redact:'Redact',text:'Text','mask-erase':'Mask Erase',
 'mask-restore':'Mask Restore'};
const toolStyles=new Map();
const toolControlFields=[
 ['color','stroke'],['size','strokeWidth'],['image-tool-opacity','opacity'],
 ['image-shape-fill','fill'],['image-shape-fill-enabled','fillEnabled'],
 ['image-shape-line-style','lineStyle'],['image-shape-radius','cornerRadius'],
 ['image-shape-points','starPoints'],['image-shape-heads','arrowHead']
];
function currentVectorSettings(){
 const selected=selectedAnyStroke();
 if(vectorCore?.isVector?.(selected))return {...vectorCore.style(selected)};
 const stored=toolStyles.get(tool.value)||{};
 const vector=vectorCore?.defaults?.()||{};
 return {...vector,...stored,stroke:color.value,
  strokeWidth:Number(size.value)*(ink.width/(ink.getBoundingClientRect?.().width||ink.width)||1),
  opacity:Number(document.getElementById('image-tool-opacity')?.value||100)/100};
}
function syncVectorControls(){
 if(!vectorCore)return;
 const selected=selectedAnyStroke(),vSelected=vectorCore.isVector(selected)?selected:null;
 const currentTool=vSelected?vectorCore.kindOf(vSelected):tool.value;
 const isVector=vectorCore.kinds.includes(currentTool);
 const toolName=document.getElementById('image-active-tool-name');
 const toolDescription=document.getElementById('image-active-tool-desc');
 const toolStatus=document.getElementById('image-tool-status');
 const name=vectorCore.labels[currentTool]||imageToolNames[currentTool]||'Tool';
 if(toolName)toolName.textContent=vSelected?.callout3d?'Editing dimensional callout':vSelected?'Editing '+name:name;
 if(toolDescription)toolDescription.textContent=vSelected?.callout3d?'Edit geometry in 3D Callouts. Drag, resize or rotate the selected layer.':vSelected?'Editable vector layer · use controls below':
  isVector?'Drag directly on screenshot to draw · select layer to refine':
  currentTool==='select'?'Click a layer to select and edit':currentTool==='text'?'Typography and effects are in Type':
  currentTool.startsWith('mask-')?'Brush controls are in Mask':'Draw directly on the screenshot';
 if(toolStatus)toolStatus.textContent=vSelected?'VECTOR LAYER':'ACTIVE · '+name.toUpperCase();
 const gallery=document.getElementById('image-vector-library');
 if(gallery)gallery.hidden=!!vSelected?false:!isVector;
 for(const button of document.querySelectorAll?.('[data-vector-kind]')||[]){
  const active=button.dataset.vectorKind===currentTool;
  button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 }
 const styles=document.getElementById('image-shape-style');
 if(styles)styles.hidden=!isVector||!!vSelected?.callout3d;
 const settings=vSelected?vectorCore.style(vSelected):{...vectorCore.defaults(),...(toolStyles.get(tool.value)||{}),
  stroke:color.value,strokeWidth:Number(size.value),opacity:Number(document.getElementById('image-tool-opacity')?.value||100)/100};
 for(const [id,key] of toolControlFields){
  const el=document.getElementById(id);if(!el)continue;
  // Do not replace active pencil colors unless a vector object is selected.
  if(key==='strokeWidth'&&vSelected)el.value=String(Math.max(1,Math.round(settings.strokeWidth)));
  else if(key==='stroke'&&vSelected)el.value=settings.stroke;
  else if(key==='opacity')el.value=String(Math.round(settings.opacity*100));
  else if(!['stroke','strokeWidth'].includes(key)){
   el.value=el.type==='checkbox'?el.value:String(settings[key]??el.value);
   if(el.type==='checkbox')el.checked=settings[key]===true;
  }
  el.disabled=!!vSelected?.locked;
 }
 for(const option of document.querySelectorAll?.('[data-shape-option]')||[]){
  option.hidden=!isVector||!option.dataset.shapeOption?.split(',').includes(currentTool);
 }
 const sizeValue=document.getElementById('image-size-value');
 if(sizeValue)sizeValue.textContent=Math.round(Number(size.value)||4)+' px';
 const opValue=document.getElementById('image-tool-opacity-value');
 if(opValue)opValue.textContent=Math.round(Number(document.getElementById('image-tool-opacity')?.value||100))+'%';
 for(const [id,suffix] of [['image-shape-radius-value',' px'],['image-shape-points-value','']]){
  const el=document.getElementById(id),src=document.getElementById(id.replace('-value',''));
  if(el&&src)el.textContent=src.value+suffix;
 }
}
function editVectorStyle(field,value,live=false){
 const target=selectedAnyStroke(),selected=vectorCore?.isVector(target)?selectedAnyIndex():-1;
 if(selected>=0){
  if(target.locked)return;
  const old=vectorCore.style(target),vector={...(target.vector||{})};
  const patch={...target,vector};
  if(field==='stroke'){patch.color=value;vector.stroke=value;}
  else if(field==='strokeWidth'){patch.size=value;vector.strokeWidth=value;}
  else if(field==='opacity')patch.opacity=value;
  else vector[field]=value;
  const same=field==='stroke'?old.stroke===value:
   field==='opacity'?old.opacity===value:old[field]===value;
  if(same)return;
  if(!live||!vectorGesture||vectorGesture.index!==selected||vectorGesture.field!==field){
   snapshot();vectorGesture={index:selected,field};
  }
  strokes[selected]=patch;redraw();
  if(!live){vectorGesture=null;setReady(ready);}
 }else{
  const pref={...(toolStyles.get(tool.value)||{})};pref[field]=value;toolStyles.set(tool.value,pref);
 }
}
let vectorGesture=null;
for(const [id,field] of toolControlFields){
 const el=document.getElementById(id);if(!el)continue;
 const value=()=>el.type==='checkbox'?el.checked:
  ['lineStyle','arrowHead','stroke','fill'].includes(field)?el.value:
  field==='opacity'?Number(el.value)/100:Number(el.value);
 const onInput=()=>{
  if(field==='stroke')color.value=el.value;
  editVectorStyle(field,value(),true);
  if(id==='color'&&!vectorCore.isVector(selectedAnyStroke()))toolStyles.set(tool.value,{...(toolStyles.get(tool.value)||{}),stroke:el.value});
  if(id==='size'){}
  syncVectorControls();
 };
 const onChange=()=>{
  if(vectorGesture){vectorGesture=null;setReady(ready);}
  else editVectorStyle(field,value(),false);
  syncVectorControls();
 };
 el.addEventListener('input',onInput);el.addEventListener('change',onChange);
}
for(const button of document.querySelectorAll?.('[data-vector-kind]')||[]){
 button.addEventListener('click',()=>{
  if(textDraft)commitInline();
  selectedObject=-1;
  tool.value=button.dataset.vectorKind;
  syncTool();syncSelectedText();switchInspectorTab('tools');
  syncVectorControls();
 });
}
/* Eraser options synchronize the rail, Tools dropdown, selected mode and pen
 * tablet eraser override. Brush and whole-stroke controls remain in one inspector. */
const imageToolSizes=new Map([['pen',4],['highlighter',8],
 ['erase-brush',36],['erase-stroke',32],['eraser',36]]);
let currentImageTool='pen';
function syncEraserControls(){
 const erasing=['erase-brush','erase-stroke','eraser'].includes(tool.value);
 const brush=tool.value!=='erase-stroke';
 const region=document.getElementById('image-eraser-options');
 if(region)region.hidden=!erasing;
 const hardness=document.getElementById('image-eraser-hardness-row');
 if(hardness)hardness.hidden=!erasing||!brush;
 const desc=document.getElementById('image-erase-description');
 if(desc)desc.textContent=brush?
  'Brush Erase removes only the painted parts of existing annotations. Original screenshot pixels are untouched.':
  'Whole Stroke Erase removes each touched unlocked annotation, shape or text layer. Imported images use Mask instead.';
 const slider=document.getElementById('size');
 if(slider){
  slider.max=erasing?'240':'48';
  const value=document.getElementById('image-size-value');
  if(value)value.textContent=Math.round(Number(slider.value))+(erasing?' px diameter':' px');
 }
 for(const button of document.querySelectorAll?.('[data-erase-mode]')||[]){
  const selected=button.dataset.eraseMode===tool.value;
  button.classList.toggle('is-active',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
 const value=document.getElementById('image-eraser-hardness-value');
 const input=document.getElementById('image-eraser-hardness');
 if(value&&input)value.textContent=input.value+'%';
}
for(const button of document.querySelectorAll?.('[data-erase-mode]')||[]){
 button.addEventListener('click',()=>chooseImageTool(button.dataset.eraseMode));
}
document.getElementById('image-eraser-hardness')?.addEventListener?.('input',syncEraserControls);
document.getElementById('size')?.addEventListener?.('input',()=>{
 imageToolSizes.set(tool.value,Number(size.value));
 syncEraserControls();
});
const penDiagnostics=penInput?.createDiagnostic?.({
 canvas:document.getElementById('pen-test-pad'),
 fields:{
  type:document.getElementById('pen-test-type'),
  pressure:document.getElementById('pen-test-pressure'),
  range:document.getElementById('pen-test-range'),
  tilt:document.getElementById('pen-test-tilt'),
  rotation:document.getElementById('pen-test-twist'),
  eraser:document.getElementById('pen-test-eraser'),
  events:document.getElementById('pen-test-events'),
  status:document.getElementById('pen-test-status')
 },
 copyButton:document.getElementById('pen-test-copy'),
 clearButton:document.getElementById('pen-test-clear')
});
const toolButtons=[...(document.querySelectorAll?.('[data-studio-tool]')||[])];
function syncTool(){
 if(document.body?.dataset)document.body.dataset.maskPainting=String(tool.value==='mask-erase'||tool.value==='mask-restore');
 for(const button of toolButtons){
  const selected=button.dataset.studioTool===tool.value;
  button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));
 }
 if(tool.value!=='select'&&tool.value!=='marquee'){selectedObject=-1;clearBatch();}
 ink.style.cursor=tool.value==='text'?'text':tool.value==='select'?'default':'crosshair';
 updateEditorControls();syncVectorControls();syncEraserControls();
 if(tool.value==='text')switchInspectorTab('type');
 else if(tool.value.startsWith('mask-'))switchInspectorTab('mask');
 else if(tool.value==='select'){
  if(vectorCore?.isVector?.(selectedAnyStroke()))switchInspectorTab('tools');
  else if(selectedStroke())switchInspectorTab('type');
  else switchInspectorTab('layers');
 }else if(tool.value==='marquee')switchInspectorTab('layers');else switchInspectorTab('tools');
 globalThis.MangoToolGroupsV071?.sync?.();
}
function chooseImageTool(name){
 if(textDraft)commitInline();
 if(!tool.options?.length||Array.from(tool.options).some(option=>option.value===name)){
  if(name!==currentImageTool)imageToolSizes.set(currentImageTool,Number(size.value)||4);
  tool.value=name;
  if(name!==currentImageTool){
   size.value=String(imageToolSizes.get(name)??4);
   currentImageTool=name;
  }
 }
 if(name==='erase-brush'||name==='erase-stroke')lastEraserMode=name;
 if(name!=='select'&&name!=='marquee')clearBatch();
 if(name!=='select'&&name!=='text'&&name!=='marquee'&&!name.startsWith('mask-')){selectedText=-1;selectedImage=-1;selectedObject=-1;}
 if(name.startsWith('mask-')){selectedText=-1;selectedObject=-1;}
 syncTool();syncSelectedText();redraw();
}
tool.addEventListener('change',()=>chooseImageTool(tool.value));
for(const button of toolButtons)button.addEventListener('click',()=>chooseImageTool(button.dataset.studioTool));
syncTool();
for(const button of document.querySelectorAll?.('[data-text-preset]')||[]){
 button.addEventListener('click',()=>{
  textPreset=button.dataset.textPreset;
  if(selectedStroke())updateSelectedText({styleId:textPreset});
  syncSelectedText();
 });
}
let sizeGesture=null;
textFontSize?.addEventListener?.('input',()=>{
 const output=document.getElementById('text-size-readout');
 if(output)output.textContent=textFontSize.value+' px';
 if(textDraft){positionInline(textDraft);scheduleRedraw();return;}
 const selected=selectedStroke();
 if(!selected||selected.locked)return;
 if(!sizeGesture||sizeGesture.index!==selectedText){
  snapshot();
  sizeGesture={index:selectedText,base:cloneStrokes([selected])[0]};
 }
 const initial=sizeGesture.base,originalSize=Math.max(1,(initial.fontSize||48)*(initial.scaleY??1));
 const ratio=Math.max(.05,Math.min(25,Number(textFontSize.value)/originalSize));
 strokes[selectedText]={...selected,scaleX:Math.max(.08,Math.min(25,(initial.scaleX??1)*ratio)),
  scaleY:Math.max(.08,Math.min(25,(initial.scaleY??1)*ratio))};
 scheduleRedraw();
});
function updateVisualFontSize(value){
 const layer=selectedStroke();if(!layer)return false;
 const shown=Math.max(1,(layer.fontSize||48)*(layer.scaleY??1));
 const ratio=Math.max(.05,Math.min(25,Number(value)/shown));
 return updateSelectedText({scaleX:Math.max(.08,Math.min(25,(layer.scaleX??1)*ratio)),
  scaleY:Math.max(.08,Math.min(25,(layer.scaleY??1)*ratio))});
}
textFontSize?.addEventListener?.('change',()=>{
 if(textDraft){scheduleRedraw();return;}
 if(sizeGesture){sizeGesture=null;setReady(ready);syncSelectedText();}
 else if(selectedStroke())updateVisualFontSize(Number(textFontSize.value));
});
textFontFamily?.addEventListener?.('change',()=>{
 if(selectedStroke())updateSelectedText({fontFamily:textFontFamily.value});
});
// The inspector editor is live. One continuous typing session = one Undo step.
let textTyping=null;
textContent?.addEventListener?.('focus',()=>{textTyping=null;});
textContent?.addEventListener?.('input',()=>{
 const selected=selectedStroke();if(!selected||selected.locked||textDraft)return;
 if(selected.text===textContent.value)return;
 if(!textTyping||textTyping.index!==selectedText){
  snapshot();textTyping={index:selectedText,original:selected.text};
 }
 strokes[selectedText]={...selected,text:String(textContent.value).slice(0,1000)};
 scheduleRedraw();
});
textContent?.addEventListener?.('blur',()=>{
 if(!textTyping)return;
 if(textTyping.index===selectedText&&!String(textContent.value||'').trim()){
  strokes[selectedText]={...strokes[selectedText],text:textTyping.original};
  history.pop();redraw();
  label('Blank text was not saved. Use Delete to remove the text layer.');
 }
 textTyping=null;setReady(ready);syncSelectedText();
});
textContent?.addEventListener?.('change',()=>{
 // Legacy scripted change events still update content, without duplicating typed history.
 if(textTyping)return;
 const selected=selectedStroke();
 if(selected&&!selected.locked&&textContent.value.trim()&&selected.text!==textContent.value)
  updateSelectedText({text:textContent.value});
});
color.addEventListener('change',()=>{
 if(selectedStroke())updateSelectedText({color:color.value});
});
inlineInput?.addEventListener?.('input',()=>{if(textDraft){scheduleRedraw();}});
inlineInput?.addEventListener?.('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelInline();return;}
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
  event.preventDefault();event.stopPropagation();commitInline();
 }
});
document.getElementById('text-inline-place')?.addEventListener?.('click',commitInline);
document.getElementById('text-inline-cancel')?.addEventListener?.('click',cancelInline);
function scheduleRedraw(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;redraw();});}

function rotationAllowed(l){return !!rotationCore?.eligible(l)&&!!l&&!l.locked&&l.visible!==false&&!!rawLayerBounds(l);}
function rotationSelection(){const batch=batchLayers();return batch.length?batch:selectedAnyStroke()?[selectedAnyStroke()]:[];}
function syncRotationControls(){
 const control=document.getElementById('image-layer-rotation-v0715'),selection=rotationSelection(),valid=ready&&selection.length>0&&selection.every(rotationAllowed);
 if(control){control.disabled=!valid;const values=selection.map(l=>rotationCore?.rotation(l)||0);control.value=values.length&&values.every(x=>x===values[0])?String(values[0]):'';control.placeholder=values.length?'Mixed':'0';}
 for(const b of document.querySelectorAll?.('[data-rotate-action-v0715]')||[])b.disabled=!valid;
}
function syncRotationFrame(box,l,b){if(!box||!rotationCore)return;const a=rotationCore.rotation(l);box.style.transform='rotate('+a+'deg)';box.dataset.rotationActive=String(!!a);const h=box.querySelector?.('[data-rotation-handle-v0715]');if(h){h.hidden=!rotationAllowed(l);h.disabled=!rotationAllowed(l);}}
function updateInkRotationBox(){const box=document.getElementById('image-ink-rotation-box-v0715'),l=selectedAnyStroke();if(!box)return;const b=l&&rawLayerBounds(l);if(!ready||!b||!l||l.visible===false||textDraft||['text','image'].includes(l.type)||vectorCore?.isVector?.(l)||!rotationCore?.eligible(l)){box.hidden=true;return;}syncRotationFrame(box,l,b);box.style.left=100*b.x/ink.width+'%';box.style.top=100*b.y/ink.height+'%';box.style.width=100*b.width/ink.width+'%';box.style.height=100*b.height/ink.height+'%';box.hidden=false;}
function applyRotation(value,relative=false){
 if(!ready||!rotationCore||rotationDrag||drawing||textDraft||layerDrag||resizeDrag)return false;
 const selection=rotationSelection();if(!selection.length||!selection.every(rotationAllowed)){label('Select unlocked visible objects to rotate.');return false;}
 if(typeof value!=='number'||!Number.isFinite(value)){label('Enter a valid rotation angle.');syncRotationControls();return false;}
 const ids=new Set(selection.map(l=>l.id)),next=strokes.map(l=>ids.has(l.id)?{...l,rotation:rotationCore.angle(value+(relative?rotationCore.rotation(l):0))}:l);
 if(next.every((l,i)=>rotationCore.rotation(l)===rotationCore.rotation(strokes[i])))return false;
 snapshot();strokes=next;redraw();setReady(ready);syncSelectedText();syncLayerProperties();label('Object rotation applied · Ctrl+Z to undo.');return true;
}
for(const handle of document.querySelectorAll?.('[data-rotation-handle-v0715]')||[]){
 handle.addEventListener('pointerdown',e=>{
  const i=selectedAnyIndex(),l=strokes[i];if(e.button!==0||!ready||!rotationAllowed(l)||drawing||textDraft||resizeDrag||layerDrag||rotationDrag)return;
  const b=rawLayerBounds(l),c=rotationCore.center(b),p=point(e);
  e.preventDefault();e.stopPropagation();handle.setPointerCapture?.(e.pointerId);
  rotationDrag={i,id:l.id,initial:l,pointer:e.pointerId,handle,c,start:rotationCore.pointerAngle(p,c),value:rotationCore.rotation(l),moved:false};
 });
 handle.addEventListener('lostpointercapture',e=>finishRotation(e,true));
}
window.addEventListener('pointermove',e=>{
 const d=rotationDrag;if(!d||e.pointerId!==d.pointer)return;if(strokes[d.i]?.id!==d.id){finishRotation(e,true);return;}
 const shift=rotationCore.delta(d.start,rotationCore.pointerAngle(point(e),d.c)),a=rotationCore.angle(e.shiftKey?Math.round((d.value+shift)/15)*15:d.value+shift);
 if(a===rotationCore.rotation(strokes[d.i]))return;strokes[d.i]={...d.initial,rotation:a};d.moved=a!==d.value;redraw();syncRotationControls();e.preventDefault();e.stopPropagation();
});
function finishRotation(e,cancel=false){
 const d=rotationDrag;if(!d||e&&e.pointerId!==d.pointer)return;rotationDrag=null;
 const final=strokes[d.i];if(final?.id===d.id){strokes[d.i]=d.initial;if(!cancel&&d.moved){snapshot();strokes[d.i]=final;}redraw();setReady(ready);syncSelectedText();syncLayerProperties();if(!cancel&&d.moved)label('Rotated '+rotationCore.rotation(final).toFixed(1)+'° · Ctrl+Z to undo.');}
 if(d.handle.hasPointerCapture?.(d.pointer))d.handle.releasePointerCapture(d.pointer);
 e?.preventDefault?.();
}
window.addEventListener('pointerup',e=>finishRotation(e));window.addEventListener('pointercancel',e=>finishRotation(e,true));
document.getElementById('image-layer-rotation-v0715')?.addEventListener('change',e=>applyRotation(e.target.valueAsNumber));
for(const b of document.querySelectorAll?.('[data-rotate-action-v0715]')||[])b.addEventListener('click',()=>applyRotation(Number(b.dataset.rotateActionV0715),b.dataset.rotateActionV0715!=='0'));

/* Corner handles use source-pixel geometry regardless of Fit/100% zoom.
 * Preserve the opposite corner. Ratio stays locked unless Shift is held,
 * or the user explicitly disables Lock Proportions in Layers.
 * Handle UI lives outside Canvas and never appears in exported pixels. */
const transformHandles=[...(document.querySelectorAll?.('[data-resize-handle]')||[])];
for(const handle of transformHandles){
 handle.addEventListener('pointerdown',event=>{
  if(!ready||event.button!==0||!typeEffects?.resize||!typeEffects?.applyResize)return;
  const kind=handle.dataset.resizeKind,index=kind==='image'?selectedImage:kind==='vector'?selectedObject:selectedText;
  const layer=strokes[index];
  if(!layer||(kind==='vector'?!vectorCore?.isVector?.(layer):layer.type!==kind)||layer.locked||layer.visible===false)return;
  if(textDraft)commitInline();
  const bounds=kind==='image'?layerCore?.bounds(layer):kind==='vector'?vectorCore.bounds(layer):typeEffects.bounds(pen,layer);
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
 const newRect=rotationCore?.resized(d.bounds,d.corner,dx,dy,rotationCore.rotation(d.initial),free,typeEffects.resize)||typeEffects.resize(d.bounds,d.corner,dx,dy,free);
 const updated=d.kind==='vector'?vectorCore.resized(d.initial,d.bounds,newRect):typeEffects.applyResize(d.initial,d.bounds,newRect);
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
  label((d.kind==='text'?'Text':d.kind==='vector'?'Vector':'Image')+' resized · Ctrl+Z to undo.'+
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
function vectorIndexAt(x,y){
 if(!vectorCore)return -1;
 for(let i=strokes.length-1;i>=0;i--){
  const l=strokes[i];
  if(l.visible!==false&&vectorCore.isVector(l)){const p=rotationLocal(l,{x,y});if(vectorCore.hit(l,p.x,p.y,7))return i;}
 }
 return -1;
}
function topLayerAt(x,y){
 for(let i=strokes.length-1;i>=0;i--){
  const l=strokes[i];if(!effectiveLayerVisible(l))continue;
  if(layerOps?.hit?.(l,x,y,penInput,vectorCore,layerCore,typeEffects,pen))return i;
  if(l.type==='text'){const p=rotationLocal(l,{x,y});if(editorCore?.hitText?.(pen,l,p.x,p.y,8))return i;}
 }
 return -1;
}
function imageIndexAt(x,y){
 if(!layerCore)return -1;
 for(let i=strokes.length-1;i>=0;i--){
  const l=strokes[i];
  if(effectiveLayerVisible(l)&&l.type==='image'){const p=rotationLocal(l,{x,y});if(layerCore.hit(l,p.x,p.y))return i;}
 }
 return -1;
}
/* Whole Stroke Erase deletes editable annotation objects, not screenshot pixels.
 * A drag removes all touched, unlocked annotation strokes as ONE undo step.
 * Imported images retain their dedicated non-destructive image mask controls.
 */
function eraseEntireAt(p){
 if(!entireErase||!penInput)return;
 const previous=entireErase.last;
 const samples=[p];
 const rect=ink.getBoundingClientRect();
 const zoom=ink.width/Math.max(1,rect.width);
 const diameter=Number(size.value||28)*zoom;
 const radius=Math.max(3,diameter*.5*(.25+.75*(p.p??1)));
 if(previous){
  const dx=p.x-previous.x,dy=p.y-previous.y;
  const count=Math.min(320,Math.ceil(Math.hypot(dx,dy)/Math.max(2,radius*.5)));
  for(let i=1;i<count;i++){
   const t=i/count;samples.push({x:previous.x+dx*t,y:previous.y+dy*t,p:previous.p});
  }
 }
 let removed=0;
 for(const sample of samples){
  const textHit=(stroke,x,y,pad)=>typeEffects?.hit?.(pen,stroke,x,y,pad)||editorCore?.hitText?.(pen,stroke,x,y,pad);
  const matches=strokes.some(l=>rotationCore?.rotation(l))?strokes.map((l,i)=>penInput.intersectIndices([l],rotationLocal(l,sample),radius,vectorCore,textHit).length?i:-1).filter(i=>i>=0).reverse():penInput.intersectIndices(strokes,sample,radius,vectorCore,textHit);
  const visibleMatches=matches.filter(i=>effectiveLayerVisible(strokes[i]));if(!visibleMatches.length)continue;
  if(!entireErase.changed){snapshot();entireErase.changed=true;}
  for(const i of visibleMatches){strokes.splice(i,1);removed++;}
 }
 entireErase.last=p;
 if(removed){
  entireErase.removed+=removed;
  selectedText=-1;selectedImage=-1;selectedObject=-1;
  redraw();updateEditorControls();
 }
}
ink.addEventListener('pointerdown',event=>{
 const hardwareErase=penInput?.eraserTip?.(event)===true&&
  document.getElementById('image-eraser-tip')?.checked!==false;
 if(!ready||rotationDrag||(event.button!==0&&!hardwareErase))return;
 const p=point(event);
 if(textDraft)commitInline();
 const type=hardwareErase?lastEraserMode:tool.value;
 if(type==='erase-stroke'){
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);
  entireErase={pointerId:event.pointerId,last:null,changed:false,removed:0,hardware:hardwareErase};
  eraseEntireAt(p);
  return;
 }
 if(type==='erase-brush'){
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);
  active={type:'erase-brush',points:[p],
   size:Number(size.value||28)*(ink.width/Math.max(1,ink.getBoundingClientRect().width)),
   hardness:Number(document.getElementById('image-eraser-hardness')?.value||80)/100,
   opacity:Number(document.getElementById('image-tool-opacity')?.value||100)/100,
   usePressure:document.getElementById('image-pen-pressure')?.checked!==false};
  drawing=true;scheduleRedraw();
  if(hardwareErase)label('Wacom eraser tip detected · brushing annotations');
  return;
 }
 if(type==='text'){
  event.preventDefault();
  const index=textIndexAt(p.x,p.y);
  beginInline(index>=0?strokes[index].points[0]:p,index);
  return;
 }
 if(type==='mask-erase'||type==='mask-restore'){
  const l=selectedImageStroke();
  if(!l||l.locked||l.visible===false||!layerCore){label('Select a visible, unlocked imported image layer before masking.');return;}
  const local=rotationLocal(l,p);if(!layerCore.hit(l,local.x,local.y,0))return;
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);
  const brush=Number(document.getElementById('image-mask-brush')?.value||35);
  const b=layerCore.bounds(l);
  const path={mode:type==='mask-restore'?'restore':'erase',
   radius:Math.max(.001,Math.min(.5,brush/Math.min(b.width,b.height)/2)),
   points:[layerCore.normalize(l,local.x,local.y)]};
  snapshot();
  if(!l.mask)l.mask={paths:[],feather:0};
  l.mask.paths.push(path);maskDraw={index:selectedImage,path};
  scheduleRedraw();return;
 }
 if(type==='marquee'&&ts){
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);marqueeDrag={pointerId:event.pointerId,start:p,end:p,add:event.shiftKey};paintBatchOverlay();return;
 }
 if(type==='select'){
  const index=topLayerAt(p.x,p.y);
  if(ts&&index>=0&&(event.ctrlKey||event.metaKey||event.shiftKey)){event.preventDefault();toggleBatchLayer(index,event);return;}
  if(ts&&index>=0&&batchIds.has(strokes[index].id)&&!event.altKey){
   if(!batchAllowed()){label('Unlock and show all selected layers before moving the selection.');return;}
   event.preventDefault();ink.setPointerCapture?.(event.pointerId);
   const layers=batchLayers();batchDrag={pointerId:event.pointerId,start:p,originals:new Map(layers.map(l=>[l.id,cloneStrokes([l])[0]])),bounds:ts.bounds(layers.map(tsBounds)),moved:false};return;
  }
  clearBatch();
  if(index<0){
   selectedText=-1;selectedImage=-1;selectedObject=-1;
   syncSelectedText();redraw();renderStrokeList();syncLayerProperties();return;
  }
  selectLayerAt(index);
  const target=strokes[index];
  if(target.locked)return;
  event.preventDefault();ink.setPointerCapture?.(event.pointerId);
  layerDrag={
   pointerId:event.pointerId,
   sourceIndex:index,index,start:p,
   original:cloneStrokes([target])[0],
   clone:!!event.altKey,moved:false
  };
  return;
 }
 clearBatch();selectedText=-1;selectedImage=-1;selectedObject=-1;syncSelectedText();
 event.preventDefault();ink.setPointerCapture?.(event.pointerId);
 if(vectorCore?.kinds?.includes(type)){
  const opts=currentVectorSettings();
  active=vectorCore.make(type,p,p,opts);
  active.size=opts.strokeWidth;
 }else{
  active={type,points:[p],size:Number(size.value)*(ink.width/ink.getBoundingClientRect().width),
   color:color.value,text:'',opacity:Number(document.getElementById('image-tool-opacity')?.value||100)/100};
  if(brushPreference&&['pen','highlighter'].includes(type)&&base.width*base.height<=precisionBrush.MAX_PIXELS)active.brush=precisionBrush.copy(brushPreference);
 }
 drawing=true;scheduleRedraw();
});
ink.addEventListener('pointermove',event=>{
 const p=point(event);
 if(marqueeDrag){if(marqueeDrag.pointerId!==event.pointerId)return;marqueeDrag.end=p;paintBatchOverlay();event.preventDefault();return;}
 if(batchDrag){
  const d=batchDrag;if(d.pointerId!==event.pointerId)return;let dx=p.x-d.start.x,dy=p.y-d.start.y;
  if(!d.moved&&Math.hypot(dx,dy)<3)return;if(!d.moved){d.oldHistory=history.slice();d.oldRedo=redoHistory.slice();snapshot();d.moved=true;}
  if(document.getElementById('ts-snap-v0711')?.checked&&!event.altKey){
   snapGuides=ts.snap(d.bounds,dx,dy,strokes.filter(l=>!batchIds.has(l.id)&&l.visible!==false).map(tsBounds),ink.width,ink.height,6*ink.width/Math.max(1,ink.getBoundingClientRect().width));dx=snapGuides.dx;dy=snapGuides.dy;
  }else snapGuides=null;
  strokes=strokes.map(l=>d.originals.has(l.id)?layerOps.translate(d.originals.get(l.id),dx,dy):l);redraw();event.preventDefault();return;
 }
 if(layerDrag){
  const d=layerDrag;
  if(d.pointerId!=null&&event.pointerId!=null&&d.pointerId!==event.pointerId)return;
  if(!strokes[d.index])return;
  const dx=p.x-d.start.x,dy=p.y-d.start.y;
  if(!d.moved&&Math.hypot(dx,dy)<3)return;
  if(!d.moved){
   if(d.clone&&!creativeCopyAllowed([d.original])){layerDrag=null;return;}
   snapshot();d.moved=true;
   if(d.clone){
    const newLayer=layerOps.cloneLayer(d.original,0);
    if(!newLayer){layerDrag=null;return;}
    d.index=advancedComp?advancedComp.afterGroup(composition,strokes,d.sourceIndex):d.sourceIndex+1;
    strokes.splice(d.index,0,newLayer);
    d.original=cloneStrokes([newLayer])[0];
    selectLayerAt(d.index);
   }
  }
  const source=d.original;
  const bounds=tsBounds(source);
  let ox=dx,oy=dy;
  if(bounds&&['image','text'].includes(source.type)){
   ox=Math.max(-bounds.x,Math.min(ink.width-bounds.x-bounds.width,dx));
   oy=Math.max(-bounds.y,Math.min(ink.height-bounds.y-bounds.height,dy));
  }
  strokes[d.index]=layerOps.translate(source,ox,oy);
  redraw();event.preventDefault();return;
 }
 if(entireErase){
  if(entireErase.pointerId!=null&&event.pointerId!==entireErase.pointerId)return;
  for(const sample of pointerSamples(event))eraseEntireAt(sample);
  event.preventDefault();return;
 }
 if(maskDraw){
  const target=strokes[maskDraw.index];
  if(!target||target.locked||target.type!=='image')return;
  const local=rotationLocal(target,p),next=layerCore.normalize(target,local.x,local.y),last=maskDraw.path.points.at(-1);if(!last||Math.hypot(next.x-last.x,next.y-last.y)>.000001)maskDraw.path.points.push(next);
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
 if(dragVector){
  const d=dragVector,l=strokes[d.index];
  if(!l||l.locked||!vectorCore?.isVector(l))return;
  const dx=p.x-d.start.x,dy=p.y-d.start.y;
  if(!d.moved&&Math.hypot(dx,dy)<3)return;
  if(!d.moved){snapshot();d.moved=true;}
  strokes[d.index]=vectorCore.translate(d.origin,dx,dy);
  redraw();event.preventDefault();return;
 }
 if(!drawing||!active)return;
 if(vectorCore?.isVector?.(active)||['rectangle','arrow','redact'].includes(active.type))active.points=[active.points[0],p];
 else if(['pen','highlighter','eraser','erase-brush'].includes(active.type)){
  for(const sample of pointerSamples(event)){
   if(active.points.length<25000)active.points.push(sample);
  }
 }else active.points.push(p);
 scheduleRedraw();event.preventDefault();
});
function finishStroke(event){
 if(marqueeDrag){const d=marqueeDrag;if(d.pointerId!==event?.pointerId)return;marqueeDrag=null;
  if(event.type==='pointerup'){ensureLayerIds();const r=ts.rect(d.start,d.end),prior=d.add?[...batchIds,...(selectedAnyStroke()?[selectedAnyStroke().id]:[])]:[];
   setBatch([...new Set([...prior,...strokes.filter(l=>l.visible!==false&&!['eraser','erase-brush','erase-stroke'].includes(l.type)&&ts.intersects(r,tsBounds(l))).map(l=>l.id)])]);}
  paintBatchOverlay();return;
 }
 if(batchDrag){const d=batchDrag;if(d.pointerId!==event?.pointerId)return;batchDrag=null;snapGuides=null;if(d.moved){if(event.type==='pointercancel'){strokes=strokes.map(l=>d.originals.get(l.id)||l);history=d.oldHistory;redoHistory=d.oldRedo;}redraw();setReady(ready);}else paintBatchOverlay();return;}
 if(layerDrag){
  const d=layerDrag;
  if(d.pointerId!=null&&event?.pointerId!=null&&d.pointerId!==event.pointerId)return;
  layerDrag=null;
  if(d.moved){
   redraw();setReady(true);syncLayerProperties();
   label(d.clone?'Layer cloned and moved · Ctrl+Z restores original.':
    'Layer moved · Ctrl+Z restores position.');
  }
  return;
 }
 if(entireErase){
  const d=entireErase;
  if(d.pointerId!=null&&event.pointerId!=null&&d.pointerId!==event.pointerId)return;
  entireErase=null;redraw();
  if(d.changed){setReady(ready);syncLayerProperties();
   label(d.removed+' whole annotation'+(d.removed===1?'':'s')+' erased · Ctrl+Z to restore.');}
  else label('Whole Stroke Eraser · no unlocked annotation was touched.');
  return;
 }
 if(maskDraw){
  maskDraw=null;redraw();setReady(ready);
  label('Mask painted · source image preserved. Ctrl+Z restores mask stroke.');return;
 }
 if(dragVector){
  const drag=dragVector;dragVector=null;
  if(drag.moved){redraw();setReady(ready);syncVectorControls();label('Vector moved. Ctrl+Z restores its position.');}
  return;
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
 if(active){
  const last=active.points?.at(-1)||active.points?.[0],first=active.points?.[0];
  const valid=!vectorCore?.isVector?.(active)||Math.hypot((last?.x||0)-(first?.x||0),(last?.y||0)-(first?.y||0))>=2;
  if(valid){snapshot();strokes.push(active);selectedObject=strokes.length-1;}
  active=null;redraw();setReady(true);syncVectorControls();
 }
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
document.querySelector('#clear').addEventListener('click',()=>{if(strokes.length){snapshot();clearBatch();strokes=[];
 selectedText=-1;selectedImage=-1;selectedObject=-1;redraw();setReady(true);}});
function isTyping(target){return !!target?.matches?.('input,textarea,select,[contenteditable],[role="textbox"]');}
window.addEventListener('keydown',event=>{
 if(rotationDrag){if(event.key==='Escape'){finishRotation(null,true);}event.preventDefault();event.stopImmediatePropagation?.();return;}
 if(document.getElementById('automation-dialog-v075')?.open||document.querySelector?.('dialog[open]')||event.target?.closest?.('dialog[open]')||!ready)return;
 if(event.key==='Escape'){
  if(marqueeDrag){marqueeDrag=null;paintBatchOverlay();event.preventDefault();return;}
  if(batchDrag){const d=batchDrag;batchDrag=null;snapGuides=null;if(d.moved){strokes=strokes.map(l=>d.originals.get(l.id)||l);history=d.oldHistory;redoHistory=d.oldRedo;}redraw();setReady(ready);event.preventDefault();return;}
  if(batchIds.size){setBatch([]);event.preventDefault();return;}
  if(textDraft){event.preventDefault();cancelInline();return;}
  if(contextMenu&&!contextMenu.hidden){event.preventDefault();closeContextMenu();}
  return;
 }
 if(globalThis.MangoShortcutsV0617?.active)return;
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
 if(includeInk&&strokes.some(l=>l.visible!==false&&l.callout3d?.mode==='spatial'))globalThis.MangoSpatialRendererV0730.requireRenderer();
 const sourceImage=includeInk?composedSource():base;
 if(editorCore?.merge)return editorCore.merge(sourceImage,ink,includeInk);
 const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
 const merged=canvas.getContext('2d');merged.drawImage(sourceImage,0,0);
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
  if(includeInk)globalThis.MangoCreativeV079?.requireFonts(strokes.filter(l=>l.type==='text').map(l=>l.fontFamily));
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
 const layer=selectedAnyStroke();
 for(const [action,disabled] of [
  ['delete',!layer||!!layer.locked],
  ['copy-layer',!layer],
  ['paste-layer',!layerClipboard],
  ['duplicate-layer',!layer||!!layer.locked]
 ]){
  const control=contextMenu.querySelector?.('[data-image-action="'+action+'"]');
  if(control)control.disabled=disabled;
 }
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
  if(action==='copy-layer'){copySelectedLayer();return;}
  if(action==='paste-layer'){pasteCopiedLayer();return;}
  if(action==='duplicate-layer'){duplicateSelectedLayer();return;}
  if(action==='delete')removeLayerAt(selectedAnyIndex());
 });
}
document.getElementById('copy-image')?.addEventListener?.('click',()=>{void copyImage(true);});
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportFile(type){if(!ready)return;if(textDraft)commitInline();document.querySelector('#png').disabled=true;document.querySelector('#pdf').disabled=true;
  try{globalThis.MangoCreativeV079?.requireFonts(strokes.filter(l=>l.type==='text').map(l=>l.fontFamily));label('Preparing '+type.toUpperCase()+'…');const canvas=flatten();
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
/* Shared v0.6.17 menu/shortcut command dispatcher uses the same existing editor
 * operations as toolbar and context menu: no duplicate drawing implementation.
 */
const imageToolActions={
 marquee:'marquee',select:'select',pen:'pen',highlighter:'highlighter',
 brushErase:'erase-brush',strokeErase:'erase-stroke',
 arrow:'arrow',rectangle:'rectangle',ellipse:'ellipse',line:'line',star:'star',
 text:'text',maskErase:'mask-erase',maskRestore:'mask-restore'
};
function imageCommand(id){
 if(imageToolActions[id]){chooseImageTool(imageToolActions[id]);return true;}
 const button=id=>document.getElementById(id);
 const click=id=>{const b=button(id);if(!b||b.disabled)return false;b.click();return true;};
 if(id==='showShortcuts')return globalThis.MangoShortcutsV0617?.open?.()===true;
 if(id==='commandPalette')return globalThis.MangoShortcutsV0617?.openPalette?.()===true;
 if(id==='undo'){if(!history.length)return false;undo();return true;}
 if(id==='redo'||id==='redoAlternate'){if(!redoHistory.length)return false;redo();return true;}
 if(batchLayers().length>1){const actions={deleteLayer:'delete',duplicateLayer:'duplicate',layerVisibility:'visibility',layerLock:'lock'};if(actions[id])return batchCommit(actions[id]);if(['copyLayer','cutLayer','pasteLayer','copyLayerStyle','pasteLayerStyle','layerForward','layerBackward'].includes(id))return false;}
 if(id==='copyLayer')return copySelectedLayer();
 if(id==='cutLayer')return cutSelectedLayer();
 if(id==='pasteLayer')return pasteCopiedLayer();
 if(id==='copyLayerStyle')return copySelectedStyle();
 if(id==='pasteLayerStyle')return pasteCopiedStyle();
 const arrows={
  nudgeLeft:[-1,0],nudgeRight:[1,0],nudgeUp:[0,-1],nudgeDown:[0,1],
  nudgeLeftFast:[-10,0],nudgeRightFast:[10,0],
  nudgeUpFast:[0,-10],nudgeDownFast:[0,10]
 };
 if(Object.hasOwn(arrows,id)){
  if(batchLayers().length>1)return batchCommit('move',...arrows[id]);
  const index=selectedAnyIndex(),layer=strokes[index];
  if(!layer||layer.locked||!ready)return false;
  const [dx,dy]=arrows[id];snapshot();
  strokes[index]=layerOps.translate(layer,dx,dy);
  redraw();setReady(true);syncLayerProperties();return true;
 }
 if(id==='deleteLayer')return removeLayerAt(selectedAnyIndex());
 if(id==='duplicateLayer')return duplicateSelectedLayer();
 if(id==='layerForward')return moveLayerAt(selectedAnyIndex(),1);
 if(id==='layerBackward')return moveLayerAt(selectedAnyIndex(),-1);
 if(id==='layerVisibility'||id==='layerLock'){
  const index=selectedAnyIndex(),l=strokes[index];if(!l)return false;
  snapshot();strokes[index]={...l,[id==='layerLock'?'locked':'visible']:
   id==='layerLock'?!l.locked:l.visible===false};
  redraw();setReady(ready);syncLayerProperties();
  label(id==='layerLock'?(strokes[index].locked?'Layer locked.':'Layer unlocked.'):
   (strokes[index].visible?'Layer shown.':'Layer hidden.'));
  return true;
 }
 if(id==='brushSmaller'||id==='brushLarger'){
  const input=button('size');if(!input)return false;
  const next=Math.max(Number(input.min)||1,
   Math.min(Number(input.max)||240,Number(input.value||4)+(id==='brushLarger'?3:-3)));
  input.value=String(next);
  input.dispatchEvent?.(new Event('input',{bubbles:true}));
  label('Brush width: '+next+' px');return true;
 }
 if(id==='copyImage')return click('copy-image');
 if(id==='importImage')return click('image-import');
 if(id==='editClipboard')return click('clipboard-import');
 if(id==='exportPng')return click('png');
 if(id==='exportPdf')return click('pdf');
 if(id==='zoomFit'||id==='zoomActual'){
  const zoomSelect=button('zoom');if(!zoomSelect)return false;
  zoomSelect.value=id==='zoomFit'?'fit':'1';zoom();
  return true;
 }
 if(id==='penDiagnostics'){
  switchInspectorTab('tools');
  const diagnostic=button('pen-diagnostics');
  if(!diagnostic)return false;
  diagnostic.open=true;
  diagnostic.querySelector?.('summary')?.scrollIntoView?.({block:'nearest'});
  return true;
 }
 if(id==='focusCanvas'){ink.tabIndex=0;ink.focus?.();return true;}
 if(id==='clearAnnotations'){
  if(!ready||!strokes.length)return false;
  if(typeof window.confirm==='function'&&!window.confirm('Clear all annotation layers? The original screenshot will remain unchanged.'))return false;
  snapshot();clearBatch();strokes=[];selectedText=-1;selectedImage=-1;selectedObject=-1;
  redraw();setReady(true);return true;
 }
 return false;
}
globalThis.MangoImageActions={
 run:imageCommand,
 available:id=>{
  const layer=selectedAnyStroke(),index=selectedAnyIndex();
  if(['commandPalette','showShortcuts','editClipboard','penDiagnostics','focusCanvas'].includes(id))return true;
  if(imageToolActions[id])return true;
  if(id==='undo')return history.length>0;
  if(id==='redo'||id==='redoAlternate')return redoHistory.length>0;
  if(batchLayers().length>1){const a=batchLayers();if(id.startsWith('nudge'))return batchAllowed();if(id==='deleteLayer'||id==='duplicateLayer')return a.every(l=>!l.locked);if(id==='layerVisibility'||id==='layerLock')return true;if(['copyLayer','cutLayer','pasteLayer','copyLayerStyle','pasteLayerStyle','layerForward','layerBackward'].includes(id))return false;}
  if(id==='copyLayer')return !!layer&&!!layerOps?.mayCopy?.(layer);
  if(id==='cutLayer')return !!layer&&!layer.locked&&!!layerOps?.mayCopy?.(layer);
  if(id==='pasteLayer')return !!ready&&!!layerClipboard;
  if(id==='copyLayerStyle')return !!layer&&!!layerOps?.mayStyle?.(layer);
  if(id==='pasteLayerStyle')return !!layer&&!layer.locked&&!!styleClipboard&&!!layerOps?.mayStyle?.(layer);
  if(id.startsWith('nudge'))return !!ready&&!!layer&&!layer.locked;
  if(id==='deleteLayer'||id==='duplicateLayer')return !!layer&&!layer.locked;
  if(id==='layerForward')return !!layer&&!layer.locked&&index<strokes.length-1;
  if(id==='layerBackward')return !!layer&&!layer.locked&&index>0;
  if(id==='layerVisibility'||id==='layerLock')return !!layer;
  if(id==='clearAnnotations')return !!strokes.length;
  return ready;
 },
 state:()=>{
  const layer=selectedAnyStroke();
  return {ready,layerSelected:!!layer,locked:!!layer?.locked,
   visible:layer?.visible!==false,layerCount:strokes.length,selectionCount:batchLayers().length||(layer?1:0)};
 }
};
/* Local typed adapter: selection is explicit and the review token is bound
 * to the source identity and all intervening editor revisions. */
globalThis.MangoToolImageV0711=Object.freeze({state:()=>({selection:batchLayers().map(l=>l.id),layers:strokes.map(l=>({id:l.id,name:l.name||l.type,type:l.type,locked:!!l.locked,visible:l.visible!==false,bounds:tsBounds(l)})),tool:tool.value})});

/* Raster Lab reads the exact currently exported composition, never unredacted source. */
/* Portable project adapter. Validation and decoding precede document replacement. */
/* Brush profiles are captured per stroke; preferences never rewrite existing artwork. */
/* Editable raster recipes are evaluated against the immutable imported source asset.
 * Geometry, alpha masks, layer blend and outer effects are applied afterward. */
/* Pixel selections are not object marquee selection. Source-mask edits are scoped to
 * one unlocked imported asset; sharing exports always start from the normal flattened composition. */
globalThis.MangoDimensionalImageV0729=Object.freeze({
 state(){const s=globalThis.MangoLayerImageV0712.state(),l=s.selection.length===1?strokes.find(x=>x.id===s.selection[0]):null;
  return {ready:s.ready,stamp:s.stamp,selected:l?.callout3d&&!l.locked&&effectiveLayerVisible(l)?{id:l.id,value:globalThis.MangoDimensionalV0729.copy(l.callout3d)}:null};},
 reference(id=null){const l=id?strokes.find(l=>l.id===id):null,b=l?rawLayerBounds(l):{x:0,y:0,width:base.width,height:base.height},c=document.createElement('canvas'),s=Math.min(1,780/Math.max(1,b.width),420/Math.max(1,b.height));c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));const q=c.getContext('2d');q.drawImage(composedSource(),b.x,b.y,b.width,b.height,0,0,c.width,c.height);q.drawImage(ink,b.x,b.y,b.width,b.height,0,0,c.width,c.height);return {canvas:c,aspect:b.width/b.height};},
 apply(value,stamp,id=null){
  const s=this.state(),M=globalThis.MangoDimensionalV0729;if(!s.ready||s.stamp!==stamp)throw Error('Image changed; reopen 3D Callouts.');const v=M.check(value);if(v.mode==='spatial')globalThis.MangoSpatialRendererV0730.requireRenderer();
  if(id){if(s.selected?.id!==id)throw Error('Select an unlocked dimensional layer.');return replaceLayer(strokes.findIndex(l=>l.id===id),{callout3d:v});}
  const spatial=v.mode==='spatial',x=spatial?0:base.width*.21,y=spatial?0:base.height*.22,w=spatial?base.width:base.width*.58,h=spatial?base.height:base.height*.50,l=vectorCore.make('rectangle',{x,y},{x:x+w,y:y+h},{fillEnabled:true,fill:v.color,stroke:v.color});
  Object.assign(l,{id:crypto.randomUUID(),name:spatial?'Spatial 3D arrow':'3D '+(v.shape==='arrow'&&v.curve?'curved arrow':v.shape),callout3d:v,locked:false});
  clearBatch();snapshot();strokes.push(l);tool.value='select';syncTool();selectLayerAt(strokes.length-1);setReady(ready);label('Dimensional shape inserted. Ctrl+Z to undo.');return true;
 }
});
globalThis.MangoSelectionImageV0728=Object.freeze({
 state(){
  const s=globalThis.MangoLayerImageV0712.state(),l=s.selection.length===1?strokes.find(x=>x.id===s.selection[0]):null,a=l?.type==='image'?layerCore.asset(l):null;
  return {ready:s.ready,stamp:s.stamp,width:base.width,height:base.height,selected:l&&a&&!l.locked&&effectiveLayerVisible(l)?{id:l.id,name:l.name||'Imported image',width:a.width,height:a.height,mask:l.selectionMask?selectionCore.copy(l.selectionMask):null}:null};
 },
 validate(scope,id,stamp){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Image changed or is busy. Reopen Selection Studio.');
  if(scope==='composition')return {width:s.width,height:s.height};
  if(scope!=='source'||s.selected?.id!==id)throw Error('Select a visible unlocked imported image.');return s.selected;
 },
 preview(scope,id,stamp){
  const s=this.validate(scope,id,stamp),scale=Math.min(1,720/s.width,420/s.height),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(s.width*scale));c.height=Math.max(1,Math.round(s.height*scale));const q=c.getContext('2d');
  if(scope==='source'){const l=strokes.find(x=>x.id===id);q.drawImage(layerCore.asset(l).image,0,0,c.width,c.height);}
  else{q.drawImage(composedSource(),0,0,c.width,c.height);q.drawImage(ink,0,0,c.width,c.height);}
  return c;
 },
 validateMask(id,mask,stamp){
  this.validate('source',id,stamp);const m=mask===null?null:selectionCore.check(mask),next=strokes.map(l=>l.id===id?{...l,selectionMask:m}:l);
  selectionCore.requireProject(next,l=>layerCore.asset(l));return m;
 },
 previewMask(canvas,id,mask,stamp){
  const m=this.validateMask(id,mask,stamp);globalThis.MangoLayerImageV0712.preview(canvas,[id],{selectionMask:m},stamp);
 },
 applyMask(id,mask,stamp){
  const m=this.validateMask(id,mask,stamp);return globalThis.MangoLayerImageV0712.apply('effects',[id],{selectionMask:m},stamp);
 },
 exportSelection(mask,stamp){
  const s=this.validate('composition',null,stamp);selectionCore.dimensions(s.width,s.height,selectionCore.MAX_EXPORT);
  const m=selectionCore.check(mask);if(!selectionCore.active(m))throw Error('Draw and enable a pixel selection first.');
  if(m.feather&&!MangoCompositorV0714.supports())throw Error('Feathering is unavailable.');
  const c=flatten(true);selectionCore.apply(c.getContext('2d'),m,c.width,c.height);return c;
 }
});
globalThis.MangoRasterLayerImageV0727=Object.freeze({
 state(){
  const s=globalThis.MangoLayerImageV0712.state(),l=s.selection.length===1?strokes.find(x=>x.id===s.selection[0]):null,a=l?.type==='image'?layerCore.asset(l):null;
  return {ready:s.ready,stamp:s.stamp,selected:l&&a&&!l.locked&&effectiveLayerVisible(l)?{id:l.id,name:l.name||'Imported image',width:a.width,height:a.height,stack:rasterLayers.copy(l.rasterFx||[])}:null};
 },
 async prepare(id,stack,stamp,backend,signal){
  const s=this.state();if(!s.ready||s.stamp!==stamp||s.selected?.id!==id)throw Error('Image layer changed, is locked or is busy. Reopen Raster Effects.');
  const l=strokes.find(x=>x.id===id),next=rasterLayers.check(stack);
  rasterLayers.requireProject(strokes.map(x=>x.id===id?{...x,rasterFx:next}:x),x=>layerCore.asset(x));
  const result=await rasterLayers.prepare(layerCore.asset(l),next,backend,signal);
  const now=this.state();if(signal?.aborted||!now.ready||now.stamp!==stamp||now.selected?.id!==id)throw Error('Image changed while preparing raster effects.');
  return result;
 }
});
globalThis.MangoBrushImageV0725=Object.freeze({
 state(){const s=globalThis.MangoLayerImageV0712.state(),l=s.selection.length===1?strokes.find(x=>x.id===s.selection[0]):null;
  return {ready:s.ready,stamp:s.stamp,width:base.width,height:base.height,tool:tool.value,size:Number(size.value),color:color.value,opacity:Number(document.getElementById('image-tool-opacity')?.value||100)/100,preference:brushPreference?precisionBrush.copy(brushPreference):null,selected:l&&['pen','highlighter'].includes(l.type)&&!l.locked&&effectiveLayerVisible(l)?cloneStrokes([l])[0]:null};
 },
 validate(profile){if(profile==null)return null;if(base.width*base.height>precisionBrush.MAX_PIXELS)throw Error('Advanced brushes support up to 16 MP. Use the legacy pen for larger captures.');return precisionBrush.check(profile);},
 setPreference(profile){const p=this.validate(profile);brushPreference=p;return p;},
 applySelected(id,profile,stamp){
  const s=this.state();if(!s.ready||s.stamp!==stamp||s.selected?.id!==id)throw Error('Selection changed, is locked or is busy. Reopen Brush Studio.');
  const p=this.validate(profile),i=strokes.findIndex(l=>l.id===id),next={...strokes[i]};if(p)next.brush=p;else delete next.brush;
  if(JSON.stringify(next)===JSON.stringify(strokes[i]))return false;
  snapshot();strokes[i]=next;redraw();setReady(ready);syncLayerProperties();label('Brush profile updated · Ctrl+Z restores previous stroke.');return true;
 },
 preview(canvas,profile,mode,selected=null){
  const q=canvas.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,canvas.width,canvas.height);
  if(mode==='selected'&&selected){
   const l={...selected};if(profile)l.brush=profile;else delete l.brush;const b=rawLayerBounds(l,q),r=rotationCore?.aabb(b,rotationCore.rotation(l))||b;
   if(!r||!r.width||!r.height)return;
   const scale=Math.min(1,(canvas.width-24)/r.width,(canvas.height-24)/r.height);
   q.save();try{q.translate((canvas.width-r.width*scale)/2,(canvas.height-r.height*scale)/2);q.scale(scale,scale);q.translate(-r.x,-r.y);paintCompositorStroke(q,l,scale);}finally{q.restore();}return;
  }
  const points=Array.from({length:101},(_,i)=>{const t=i/100;return {x:24+(canvas.width-48)*t,y:canvas.height*.5+Math.sin(t*Math.PI*2)*canvas.height*.18,p:.08+.92*Math.sin(t*Math.PI)};});
  const l={type:tool.value==='highlighter'?'highlighter':'pen',size:Math.max(12,Math.min(40,Number(size.value)*1.4)),color:color.value,opacity:1,points};
  if(l.type==='highlighter')l.size/=2.5;
  if(profile)l.brush=profile;drawStrokeRaw(l,q);
 }
});
globalThis.MangoAdvancedImageV0724=Object.freeze({
 state(){const s=globalThis.MangoLayerImageV0712.state();return {...s,width:base.width,height:base.height,composition:advancedComp.reconcile(composition,strokes),order:strokes.map(l=>l.id)};},
 resolve(order){if(!Array.isArray(order)||order.length!==strokes.length||new Set(order).size!==order.length)throw Error('Invalid layer order.');const by=new Map(strokes.map(l=>[l.id,l]));if(order.some(id=>!by.has(id)))throw Error('Stale layer order.');return order.map(id=>by.get(id));},
 validate(c,order,stamp){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Image changed or is busy. Reopen Compositing Studio.');
  const layers=this.resolve(order),next=advancedComp.check(c,layers,base.width,base.height,globalThis.MangoCompositorV0714);
  const old=advancedComp.reconcile(composition,strokes),before=new Map(old.groups.map(g=>[g.id,g])),after=new Map(next.groups.map(g=>[g.id,g]));
  for(const id of new Set([...before.keys(),...after.keys()])){
   const a=before.get(id),b=after.get(id);if(JSON.stringify(a)===JSON.stringify(b))continue;
   const ids=new Set([...(a?.members||[]),...(b?.members||[])]);if(layers.some(l=>ids.has(l.id)&&l.locked))throw Error('Unlock group members before changing group appearance or structure.');
  }
  return {layers,next};
 },
 preview(canvas,c,order,stamp){
  const {layers,next}=this.validate(c,order,stamp),w=canvas.width,h=canvas.height,scale=Math.min(w/base.width,h/base.height),rw=Math.max(1,Math.round(base.width*scale)),rh=Math.max(1,Math.round(base.height*scale));
  const bg=document.createElement('canvas'),off=document.createElement('canvas');bg.width=off.width=rw;bg.height=off.height=rh;
  advancedComp.paintSource(bg.getContext('2d'),base,next,globalThis.MangoCompositorV0714);
  const g=off.getContext('2d');g.scale(rw/base.width,rh/base.height);paintComposedLayers(g,layers,next,scale);
  const q=canvas.getContext('2d');q.clearRect(0,0,w,h);q.fillStyle='#111315';q.fillRect(0,0,w,h);q.drawImage(bg,(w-rw)/2,(h-rh)/2);q.drawImage(off,(w-rw)/2,(h-rh)/2);advancedComp.clearBuffers(g);
 },
 apply(c,order,stamp){
  const {layers,next}=this.validate(c,order,stamp);if(JSON.stringify(next)===JSON.stringify(advancedComp.reconcile(composition,strokes))&&order.every((id,i)=>id===strokes[i].id))return false;
  snapshot();composition=next;strokes=layers;clearBatch();selectedText=selectedImage=selectedObject=-1;redraw();setReady(ready);syncSelectedText();syncLayerProperties();label('Compositing Studio applied · Ctrl+Z restores the previous composition.');return true;
 }
});
globalThis.MangoImageDocumentV0723=Object.freeze({
 state(){const s=globalThis.MangoLayerImageV0712.state();return {ready:s.ready&&!documentLoadPending,canOpen:!documentLoadPending&&(!ready||s.ready),stamp:s.stamp,width:base.width,height:base.height,hasDocument:ready,layers:s.layers};},
 cores(){return {layer:globalThis.MangoLayerStudioV0712,compositor:globalThis.MangoCompositorV0714,material:rotationCore,text:typeEffects};},
 save(stamp,name){
  const D=globalThis.MangoImageDocumentCoreV0723,s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Finish the current edit and reopen the project dialog.');
  D.dimensions(base.width,base.height);ensureLayerIds();if(strokes.length>D.MAX_LAYERS)throw Error('Project exceeds the 500-layer limit.');
  const layers=cloneStrokes(strokes),assets=[],mattes=[],assetIds=new Set(),matteIds=new Set(),registry=layerCore.projectMattes();
  let total=base.width*base.height;
  for(const l of layers)if(l.type==='image'){
   if(!assetIds.has(l.assetId)){const a=layerCore.asset(l);if(!a)throw Error('Missing image asset.');D.dimensions(a.width,a.height);total+=a.width*a.height;if(total>D.MAX_TOTAL_PIXELS)throw Error('Project exceeds decoded asset budget.');
    const c=document.createElement('canvas');c.width=a.width;c.height=a.height;c.getContext('2d').drawImage(a.image,0,0);assets.push({id:l.assetId,name:a.name,width:a.width,height:a.height,png:c.toDataURL('image/png')});c.width=c.height=1;assetIds.add(l.assetId);}
   if(l.cutoutKey&&!matteIds.has(l.cutoutKey)){const m=registry.get(l.cutoutKey);if(!m)throw Error('Missing image matte.');mattes.push({id:l.cutoutKey,width:m.width,height:m.height,alpha:D.encode(m.data)});matteIds.add(l.cutoutKey);}
  }
  const comp=advancedComp?.reconcile(composition,strokes),v2=advancedComp?.active(comp),v3=layers.some(l=>l.brush),v4=layers.some(l=>l.creativeFx),v5=layers.some(l=>Array.isArray(l.rasterFx)),v6=layers.some(l=>l.selectionMask),v7=layers.some(l=>l.callout3d),v8=layers.some(l=>l.callout3d?.mode==='spatial');
  return D.check({format:'MangoShotImage',version:v8?8:v7?7:v6?6:v5?5:v4?4:v3?3:v2?2:1,name,width:base.width,height:base.height,base:base.toDataURL('image/png'),layers,assets,mattes,...(v2||v3||v4||v5||v6||v7?{composition:comp}:{})},this.cores());
 },
 async open(raw,stamp){
  const D=globalThis.MangoImageDocumentCoreV0723,initial=this.state();if(!initial.canOpen||initial.stamp!==stamp)throw Error('Image editor is busy.');
  const p=D.check(raw,this.cores());if(p.layers.some(l=>l.callout3d?.mode==='spatial'))globalThis.MangoSpatialRendererV0730.requireRenderer();const source=await image(p.base),nextAssets=new Map(),nextMattes=new Map();
  if(source.naturalWidth!==p.width||source.naturalHeight!==p.height)throw Error('Base image decode dimensions differ.');
  for(const a of p.assets){const decoded=await image(a.png);if(decoded.naturalWidth!==a.width||decoded.naturalHeight!==a.height)throw Error('Asset decode dimensions differ.');nextAssets.set(a.id,{image:decoded,width:a.width,height:a.height,name:a.name,version:0});}
  for(const m of p.mattes)nextMattes.set(m.id,{width:m.width,height:m.height,data:D.decode(m.alpha)});
  const fontIds=p.layers.filter(l=>l.type==='text').map(l=>l.fontFamily||'sans').filter(id=>globalThis.MangoCreativeV079?.font(id));
  await globalThis.MangoCreativeV079?.ready;globalThis.MangoCreativeV079?.requireFonts(fontIds);
  if(rasterLayers)for(const l of p.layers)if(l.rasterFx&&rasterLayers.active(l.rasterFx))await rasterLayers.prepare(nextAssets.get(l.assetId),l.rasterFx);
  const now=this.state();if(!now.canOpen||now.stamp!==stamp)throw Error('Image changed while opening the project.');
  // Render staged content with its own registry. No document pixels/history are touched until successful.
  const oldAssets=new Map(layerCore.assets),oldMattes=layerCore.projectMattes(),staged=document.createElement('canvas');staged.width=p.width;staged.height=p.height;
  const nextComp=p.composition||{groups:[],adjustments:[]};
  const g=staged.getContext('2d');try{layerCore.replaceProjectRegistry(nextAssets,nextMattes);paintComposedLayers(g,p.layers,nextComp);}
  catch(e){layerCore.replaceProjectRegistry(oldAssets,oldMattes);throw e;}
  base.width=ink.width=p.width;base.height=ink.height=p.height;ctx.drawImage(source,0,0);pen.drawImage(staged,0,0);staged.width=staged.height=1;
  rasterLayers?.retain(nextAssets.values());clearBatch();strokes=p.layers;composition=nextComp;sourceGeneration++;history=[];redoHistory=[];selectedText=selectedImage=selectedObject=-1;layerClipboard=styleClipboard=null;composedSource();
  meta={width:p.width,height:p.height,pageHeight:p.height,dpr:1,frames:1,full:false};frames=[];
  const landing=document.getElementById('image-clipboard-landing');if(landing)landing.hidden=true;
  tool.value='select';syncTool();switchInspectorTab('layers');document.getElementById('zoom').value='fit';
  setReady(true);zoom();syncSelectedText();updateSelectionBox();updateImageSelectionBox();updateVectorSelectionBox();updateInkRotationBox();paintBatchOverlay();
  const info=document.getElementById('image-meta');if(info)info.textContent=p.width+' × '+p.height+' px · editable project';
  label('Project opened · '+p.layers.length+' editable layers');return {name:p.name,width:p.width,height:p.height,layers:p.layers.length};
 },
 maskThumbnail(id,canvas){
  const l=strokes.find(x=>x.id===id);if(!l||l.type!=='image'||(!l.cutoutKey&&!l.mask?.paths?.length&&!l.selectionMask))return false;
  const src=layerCore.composite(l);if(!src)return false;const q=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min(w/src.width,h/src.height),rw=Math.max(1,src.width*scale),rh=Math.max(1,src.height*scale);
  q.clearRect(0,0,w,h);q.save();try{q.drawImage(src,(w-rw)/2,(h-rh)/2,rw,rh);q.globalCompositeOperation='source-in';q.fillStyle='#ffffff';q.fillRect(0,0,w,h);q.globalCompositeOperation='destination-over';q.fillStyle='#111111';q.fillRect(0,0,w,h);}finally{q.restore();}return true;
 },
 thumbnail(id,canvas){
  const l=strokes.find(x=>x.id===id);if(!l||l.visible===false||!layerOps.mayStyle(l))return false;
  const g=canvas.getContext('2d'),b=rawLayerBounds(l,g);if(!b)return false;
  const bounds=rotationCore?.aabb(b,rotationCore.rotation(l))||b;
  if(![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite))return false;
  const w=canvas.width,h=canvas.height,pad=5,scale=Math.min(1,(w-2*pad)/Math.max(1,bounds.width),(h-2*pad)/Math.max(1,bounds.height));
  g.clearRect(0,0,w,h);g.save();try{g.translate((w-bounds.width*scale)/2,(h-bounds.height*scale)/2);g.scale(scale,scale);g.translate(-bounds.x,-bounds.y);paintCompositorStroke(g,l,scale);}finally{g.restore();}return true;
 }
});
globalThis.MangoRasterImageV0722=Object.freeze({
 state(){const s=globalThis.MangoLayerImageV0712.state();return {ready:s.ready,stamp:s.stamp,width:base.width,height:base.height};},
 capture(stamp,mode){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Image changed or is busy. Reopen Raster Lab.');
  if(!s.width||!s.height)throw Error('Open an image first.');
  if(mode==='full'){
   if(s.width*s.height>16000000)throw Error('Raster export is limited to 16 megapixels in this preview. Standard export is unchanged.');
   return flatten(true);
  }
  if(!['fit','detail'].includes(mode))throw Error('Invalid preview mode.');
  const scale=mode==='fit'?Math.min(1,840/s.width,520/s.height):1;
  const sw=mode==='detail'?Math.min(s.width,840):s.width,sh=mode==='detail'?Math.min(s.height,520):s.height;
  const sx=Math.floor((s.width-sw)/2),sy=Math.floor((s.height-sh)/2),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
  const g=c.getContext('2d');g.drawImage(composedSource(),sx,sy,sw,sh,0,0,c.width,c.height);g.drawImage(ink,sx,sy,sw,sh,0,0,c.width,c.height);
  return c;
 }
});
globalThis.MangoLayerImageV0712=Object.freeze({
 state(){
  ensureLayerIds();const C=globalThis.MangoLayerStudioV0712,primary=selectedAnyStroke(),busy=!!(drawing||active||textDraft||dragText||dragImage||maskDraw||dragVector||entireErase||layerDrag||layerStackDrag!==null||resizeDrag||rotationDrag||appearanceGesture||batchDrag||marqueeDrag);
  return {ready:ready&&!busy,reason:busy?'Finish the active gesture or text draft.':'Capture or import an image first.',stamp:automationRevisionV075,
   layers:strokes.map(l=>C.describe('image',l)),selection:batchLayers().length?batchLayers().map(l=>l.id):primary?[primary.id]:[]};
 },
 apply(command,ids,args,stamp){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Image changed or is busy. Reopen Layer Studio.');
  const r=MangoLayerStudioV0712.plan('image',strokes,ids,command,args,()=>crypto.randomUUID());
  if(!r.changed)return {changed:false,selection:r.selection};
  globalThis.MangoCompositorV0714?.requireProject(r.layers,[],ink.width,ink.height);
  rasterLayers?.requireProject(r.layers,l=>layerCore.asset(l));selectionCore?.requireProject(r.layers,l=>layerCore.asset(l));
  if(advancedComp&&!advancedComp.canOrder(composition,r.layers))throw Error('Move the complete isolated group or ungroup first.');
  snapshot();strokes=r.layers;setBatch(r.selection);redraw();setReady(ready);syncSelectedText();syncLayerProperties();label('Layer Studio edit applied. Ctrl+Z to undo.');
  return {changed:true,selection:r.selection};
 },
 select(ids){if(!this.state().ready)throw Error('Image editor is not ready.');setBatch(ids);},
 preview(canvas,ids,args,stamp){
  const s=this.state();if(!s.ready||stamp!==s.stamp)throw Error('Image changed or is busy. Reopen Layer Studio.');
  let draft=strokes;if(ids.length&&Object.keys(args).length)draft=MangoLayerStudioV0712.plan('image',strokes,ids,'effects',args).layers;
  creativeEffects?.requireBudget(draft,base.width,base.height);
  rasterLayers?.requireProject(draft,l=>layerCore.asset(l));selectionCore?.requireProject(draft,l=>layerCore.asset(l));
  const w=canvas.width,h=canvas.height,scale=Math.min(w/base.width,h/base.height),rw=Math.max(1,Math.round(base.width*scale)),rh=Math.max(1,Math.round(base.height*scale));
  const off=document.createElement('canvas');off.width=rw;off.height=rh;const p=off.getContext('2d'),out=canvas.getContext('2d');
  p.scale(rw/base.width,rh/base.height);
  paintComposedLayers(p,draft,composition,scale);
  out.clearRect(0,0,w,h);out.fillStyle='#111315';out.fillRect(0,0,w,h);const left=(w-rw)/2,top=(h-rh)/2;out.drawImage(composedSource(),left,top,rw,rh);out.drawImage(off,left,top);
 }
});

globalThis.MangoCreativeImageV079=Object.freeze({
 state(){const l=selectedStroke();return {ready:globalThis.MangoImageAutomationV075?.capture().ready===true,selected:!!l&&!l.locked,font:l?.fontFamily||'sans',weight:l?.fontWeight||'600'};},
 apply(kind,id,w){
  const c=globalThis.MangoCreativeV079,l=selectedStroke();if(!this.state().ready||!l||l.locked)throw Error('Select an unlocked text layer and finish the active gesture.');
  const p=kind==='fonts'?{fontFamily:id,fontWeight:c.weight(id,w)}:c.imagePatch(id);
  c.requireFonts([p.fontFamily]);updateSelectedText(p);switchInspectorTab('type');label('Creative style applied. Ctrl+Z to undo.');return true;
 },
 insert(kind,id,w,text){
  const c=globalThis.MangoCreativeV079;if(!this.state().ready)throw Error('Import a screenshot and finish the active gesture.');
  const p=kind==='fonts'?{fontFamily:id,fontWeight:c.weight(id,w),color:'#ffffff',styleId:'plain',effects:typeEffects.initial()}:c.imagePatch(id);c.requireFonts([p.fontFamily]);
  const l={type:'text',id:crypto.randomUUID(),name:kind==='fonts'?c.font(id).name:c.preset(id).name,points:[{x:base.width*.10,y:base.height*.24,p:1}],text:String(text).slice(0,400),fontSize:Math.max(12,Math.min(140,base.width*.065)),size:6,scaleX:1,scaleY:1,visible:true,locked:false,opacity:1,...p};
  const b=editorCore.textMetrics(pen,l);if(b.width>base.width*.8)l.fontSize=Math.max(12,Math.floor(l.fontSize*base.width*.8/b.width));
  clearBatch();snapshot();strokes.push(l);selectedText=strokes.length-1;selectedImage=-1;selectedObject=-1;tool.value='select';syncTool();redraw();setReady(true);syncSelectedText();switchInspectorTab('type');label('Editable creative text layer inserted. Ctrl+Z to undo.');return true;
 }
});
globalThis.MangoImageAutomationV075=Object.freeze({
 capture(){
  const busy=!!(drawing||active||textDraft||dragText||dragImage||maskDraw||dragVector||entireErase||layerDrag||layerStackDrag!==null||resizeDrag||rotationDrag||appearanceGesture);
  return {ready:ready&&!busy,reason:busy?'Finish the current image gesture or text draft.':'Import or capture an image first.',identity:meta,
   stamp:JSON.stringify([automationRevisionV075,selectedAnyIndex(),ready,busy,base.width,base.height])};
 },
 inspect(){const l=selectedAnyStroke();return {studio:'image',ready,width:base.width,height:base.height,layerCount:strokes.length,
  selected:l?{index:selectedAnyIndex(),id:l.id||null,type:l.type,locked:!!l.locked,visible:l.visible!==false,opacity:l.opacity??1}:null};},
 plan(command,a){
  const i=selectedAnyIndex(),l=strokes[i];
  if(!l)throw Error('Select a layer first');
  if(!layerOps?.mayStyle(l))throw Error('Automation does not modify redaction or eraser layers');
  if(l.locked&&command!=='image.layer.lock')throw Error('Selected layer is locked');
  const target={index:i,type:l.type,id:l.id||null};
  function plan(summary,change,execute){return {summary,changes:[{target,...change}],execute};}
  function patch(summary,field,value,before=l[field]){
   if(JSON.stringify(before)===JSON.stringify(value))throw Error('No change');
   return plan(summary,{property:field,from:before,to:value},()=>replaceLayer(i,{[field]:value}));
  }
  if(command==='image.layer.opacity')return patch('Set selected layer opacity','opacity',a.value,l.opacity??1);
  if(command==='image.layer.style')return patch('Apply selected layer appearance','layerFx',layerOps.preset(a.preset),layerOps.style(l));
  if(command==='image.layer.visibility')return patch('Set selected layer visibility','visible',a.visible,l.visible!==false);
  if(command==='image.layer.translate'){
   if(!a.dx&&!a.dy||!Array.isArray(l.points)||!l.points.length)throw Error('No applicable translation');
   const next=layerOps.translate(l,a.dx,a.dy);
   return plan('Move selected layer',{dx:a.dx,dy:a.dy,unit:'source pixels'},()=>replaceLayer(i,{points:next.points}));
  }
  if(command==='image.layer.duplicate')return plan('Duplicate selected layer',{operation:'duplicate'},duplicateSelectedLayer);
  if(command==='image.layer.lock'){
   if(!!l.locked===a.locked)throw Error('Lock already set');
   return plan('Set selected layer lock',{from:!!l.locked,to:a.locked},()=>{snapshot();strokes[i]={...strokes[i],locked:a.locked};redraw();setReady(ready);syncLayerProperties();return true;});
  }
  throw Error('Unsupported Image Studio command');
 }
});
begin();
globalThis.MangoCreativeV079?.ready.then(()=>{if(ready)redraw();});
