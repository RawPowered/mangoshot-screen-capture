/* MangoShot v0.6.3 interactive camera framing HUD.
   The rectangle uses the same transform-origin geometry as MangoCreativeZoom.
   No media leaves the browser; frame samples are drawn from the local <video>. */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const compute=(scale,x,y)=>{
  const s=clamp(Number(scale),1,5),fraction=1/s,k=1-fraction;
  return {left:clamp(Number(x),0,1)*k,top:clamp(Number(y),0,1)*k,
    width:fraction,height:fraction,scale:s};
 };
 const toFocus=(left,top,scale)=>{
  const s=clamp(Number(scale),1,5),k=1-1/s;
  return k<.000001?{x:.5,y:.5}:{x:clamp(Number(left),0,k)/k,y:clamp(Number(top),0,k)/k};
 };
 const drag=(rect,point,offset={x:rect.width/2,y:rect.height/2})=>{
  const left=clamp(point.x-offset.x,0,1-rect.width),top=clamp(point.y-offset.y,0,1-rect.height);
  return toFocus(left,top,rect.scale);
 };
 // Corner resize uses a square viewport in normalized source coordinates, so
 // the selection preserves the video's aspect ratio at every zoom scale.
 function resize(rect,corner,dx,dy){
  if(!['nw','ne','sw','se'].includes(corner))throw Error('Invalid resize corner');
  const sx=corner.includes('e')?1:-1,sy=corner.includes('s')?1:-1;
  const anchorX=sx===1?rect.left:rect.left+rect.width;
  const anchorY=sy===1?rect.top:rect.top+rect.height;
  const availableX=sx===1?1-anchorX:anchorX,availableY=sy===1?1-anchorY:anchorY;
  const maxFraction=Math.min(1,availableX,availableY);
  const fraction=clamp(rect.width+(dx*sx+dy*sy)/2,Math.min(.2,maxFraction),maxFraction);
  const left=sx===1?anchorX:anchorX-fraction,top=sy===1?anchorY:anchorY-fraction;
  return {scale:1/fraction,...toFocus(left,top,1/fraction),left,top,width:fraction,height:fraction};
 }
 function paintFrame(media,canvas){
  if(!media||!media.videoWidth||!media.videoHeight||media.readyState<2)
   return {ok:false,reason:'Frame loading · play or seek to display the current video'};
  const width=320,height=Math.max(80,Math.round(width*media.videoHeight/media.videoWidth));
  // Canvas dimension assignment clears its bitmap. Resize only on a change,
  // BEFORE drawing. Never change canvas dimensions in the UI refresh function.
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  try{
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)return {ok:false,reason:'Canvas preview unavailable in this browser'};
   ctx.drawImage(media,0,0,width,height);
   return {ok:true,width,height};
  }catch(error){
   return {ok:false,reason:'Could not draw this frame: '+(error?.message||'unknown video decoding error')};
  }
 }
 root.MangoZoomHUDMath={compute,toFocus,drag,resize,paintFrame};
 if(typeof document==='undefined')return;
 const el=id=>document.getElementById(id),view=()=>root.MangoClipView;
 const cameraPanel=el('v062-camera-panel'),controlPanel=el('v061-camera-panel'),video=el('video');
 if(!cameraPanel||!controlPanel||!video)return;
 const box=document.createElement('section');box.className='v063-zoom-hud';
 box.setAttribute('aria-label','Zoom and pan framing preview');
 const heading=document.createElement('div');heading.className='v063-hud-heading';heading.textContent='FRAME VIEW · DRAG TO POSITION';
 const frame=document.createElement('div');frame.className='v063-hud-frame';frame.tabIndex=0;
 frame.setAttribute('role','group');frame.setAttribute('aria-label','Camera framing preview');
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;canvas.className='v063-hud-canvas';
 const active=document.createElement('div');active.className='v063-hud-active';active.tabIndex=0;
 active.setAttribute('role','slider');active.setAttribute('aria-label','Drag zoom region to position frame');
 active.setAttribute('aria-valuemin','0');active.setAttribute('aria-valuemax','100');
 const playing=document.createElement('div');playing.className='v063-hud-live';playing.setAttribute('aria-hidden','true');
 const fallback=document.createElement('div');fallback.className='v064-frame-status';fallback.setAttribute('role','status');
 fallback.textContent='Import a recording to preview its current frame';
 const cross=document.createElement('span');cross.className='v063-hud-cross';cross.textContent='+';
 active.append(cross);
 for(const corner of ['nw','ne','sw','se']){
  const handle=document.createElement('span');
  handle.className='v064-resize-handle v064-handle-'+corner;
  handle.dataset.corner=corner;handle.title='Drag to zoom in or out';
  handle.setAttribute('aria-hidden','true');active.append(handle);
 }
 frame.append(canvas,fallback,playing,active);
 const legend=document.createElement('div');legend.className='v063-hud-legend';
 const hint=document.createElement('span');hint.textContent='Lime = draft zoom · dashed = playing view';
 const percent=document.createElement('output');percent.id='v063-focus-readout';percent.textContent='X 50% · Y 50%';
 legend.append(hint,percent);
 const timing=document.createElement('div');timing.className='v063-hud-range';
 const inLabel=document.createElement('label');inLabel.textContent='Zoom In (s) ';
 const start=document.createElement('input');start.id='v063-zoom-in';start.type='number';start.min='0';start.step='.05';start.value='0';start.setAttribute('aria-label','Zoom In sequence time');inLabel.append(start);
 const outLabel=document.createElement('label');outLabel.textContent='Zoom Out (s) ';
 const end=document.createElement('input');end.id='v063-zoom-out';end.type='number';end.min='0';end.step='.05';end.value='3';end.setAttribute('aria-label','Zoom Out sequence time');outLabel.append(end);
 const range=document.createElement('button');range.type='button';range.id='v063-add-range';range.textContent='Apply In → Out';range.title='Add zoom-in and return-to-fit as one undoable camera edit';
 timing.append(inLabel,outLabel,range);
 const selected=document.createElement('div');selected.className='v063-hud-selection';
 const selectedLabel=document.createElement('span');selectedLabel.id='v063-edit-label';selectedLabel.textContent='Select an existing camera keyframe to edit';
 const save=document.createElement('button');save.type='button';save.id='v063-save-keyframe';save.textContent='Update selected';save.disabled=true;
 selected.append(selectedLabel,save);
 box.append(heading,frame,legend,timing,selected);
 const first=controlPanel.querySelector('.v061-creative-row');if(first)controlPanel.insertBefore(box,first);else controlPanel.append(box);
 let selectedId=null,dragOffset=null,dragging=false,animation=null,lastFrame=0,initialized=false,resizeState=null;
 const number=(id,div=1)=>Number(el(id)?.value)/div;
 const mode=()=>({scale:clamp(number('v061-zoom-scale'),1,5),
   x:clamp(number('v061-zoom-x',100),0,1),y:clamp(number('v061-zoom-y',100),0,1)});
 const pos=()=>view()?.sequencePosition?.()||0;
 function setScale(value){
  const select=el('v061-zoom-scale'),rounded=Math.max(1,Math.min(5,Math.round(value*100)/100));
  let option=[...select.options].find(o=>Math.abs(Number(o.value)-rounded)<.0001);
  if(!option){
   for(const old of [...select.options].filter(o=>o.dataset.dynamic==='true'))old.remove();
   option=document.createElement('option');option.value=String(rounded);
   option.textContent=Math.round(rounded*100)+'%';option.dataset.dynamic='true';select.append(option);
  }
  select.value=option.value;
 }
 const setNumeric=(x,y)=>{el('v061-zoom-x').value=String(Math.round(clamp(x,0,1)*100));
   el('v061-zoom-y').value=String(Math.round(clamp(y,0,1)*100));refresh();};
 function place(box,rect){box.style.left=(rect.left*100)+'%';box.style.top=(rect.top*100)+'%';
  box.style.width=(rect.width*100)+'%';box.style.height=(rect.height*100)+'%';}
 function refresh(){
  const draft=mode(),current=root.MangoCreativeZoom?.at?.(view()?.zoomFrames?.()||[],pos())||{scale:1,x:.5,y:.5};
  place(active,compute(draft.scale,draft.x,draft.y));place(playing,compute(current.scale,current.x,current.y));
  percent.textContent='X '+Math.round(draft.x*100)+'% · Y '+Math.round(draft.y*100)+'%';
  active.setAttribute('aria-valuenow',String(Math.round(draft.x*100)));
  active.setAttribute('aria-valuetext','Horizontal '+Math.round(draft.x*100)+' percent, vertical '+Math.round(draft.y*100)+' percent');
  if(!initialized&&view()?.original?.()){start.value=pos().toFixed(2);end.value=Math.min(view().outputDuration(),pos()+3).toFixed(2);initialized=true;}
  const key=view()?.zoomFrames?.()?.find(z=>z.id===selectedId);
  if(selectedId&&!key)selectedId=null;
  save.disabled=!selectedId||!!view()?.exporting?.();
  selectedLabel.textContent=selectedId?'Editing keyframe '+(key?.start.toFixed(2)||'')+'s':'Select a keyframe below to edit its framing';
  const ratio=video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9;
  frame.style.aspectRatio=String(ratio);
  // IMPORTANT: don't assign canvas.width/height here — it erases the image.
  active.dataset.scale=Math.round(draft.scale*100)+'%';
 }
 function frameDraw(){
  if(cameraPanel.hidden)return;
  const result=paintFrame(video,canvas);
  fallback.hidden=!!result.ok;
  fallback.textContent=result.reason||'';
  refresh();
 }
 function sample(t){if(!cameraPanel.hidden&&t-lastFrame>=110){lastFrame=t;frameDraw();}
  if(!video.paused&&!cameraPanel.hidden)animation=root.requestAnimationFrame(sample);else animation=null;
 }
 function schedule(){if(!animation&&!video.paused&&!cameraPanel.hidden&&root.requestAnimationFrame)animation=root.requestAnimationFrame(sample);}
 video.addEventListener('loadedmetadata',()=>{initialized=false;frameDraw();});
 for(const event of ['seeked','timeupdate','loadeddata','canplay','pause'])video.addEventListener(event,frameDraw);
 if(typeof video.requestVideoFrameCallback==='function'){
  let waiting=false;
  const nextFrame=()=>{waiting=false;if(!cameraPanel.hidden)frameDraw();
   if(!video.paused)queue();};
  const queue=()=>{if(!waiting&&!video.paused){waiting=true;video.requestVideoFrameCallback(nextFrame);}};
  video.addEventListener('play',queue);
 }
 video.addEventListener('play',schedule);
 document.querySelector('[data-v062-tab="camera"]')?.addEventListener('click',()=>{frameDraw();schedule();});
 for(const id of ['v061-zoom-x','v061-zoom-y','v061-zoom-scale']){
  el(id)?.addEventListener('input',refresh);el(id)?.addEventListener('change',refresh);
 }
 const point=e=>{const bounds=frame.getBoundingClientRect();return {
   x:clamp((e.clientX-bounds.left)/Math.max(1,bounds.width),0,1),
   y:clamp((e.clientY-bounds.top)/Math.max(1,bounds.height),0,1)};};
 const onDown=e=>{if(e.button!==0||!view()?.original?.()||view()?.exporting?.())return;
  e.preventDefault();const p=point(e),r=compute(mode().scale,mode().x,mode().y);
  const corner=e.target?.dataset?.corner;
  resizeState=corner?{corner,point:p,rect:r}:null;
  if(!corner){
   const inside=p.x>=r.left&&p.x<=r.left+r.width&&p.y>=r.top&&p.y<=r.top+r.height;
   dragOffset=inside?{x:p.x-r.left,y:p.y-r.top}:{x:r.width/2,y:r.height/2};
  }
  dragging=true;frame.setPointerCapture?.(e.pointerId);move(e);
 };
 const move=e=>{if(!dragging)return;
  if(resizeState){
   const p=point(e),d=resizeState;
   const next=resize(d.rect,d.corner,p.x-d.point.x,p.y-d.point.y);
   setScale(next.scale);setNumeric(next.x,next.y);return;
  }
  const r=compute(mode().scale,mode().x,mode().y);
  const next=drag(r,point(e),dragOffset);setNumeric(next.x,next.y);
 };
 frame.addEventListener('pointerdown',onDown);
 frame.addEventListener('pointermove',move);
 const stop=()=>{dragging=false;dragOffset=null;resizeState=null;};
 for(const e of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(e,stop);
 active.addEventListener('keydown',e=>{
  const d=e.shiftKey?.05:.01;let m=mode();
  if(e.key==='ArrowLeft')m.x-=d;else if(e.key==='ArrowRight')m.x+=d;
  else if(e.key==='ArrowUp')m.y-=d;else if(e.key==='ArrowDown')m.y+=d;else return;
  e.preventDefault();setNumeric(m.x,m.y);
 });
 range.addEventListener('click',()=>{
  const m=mode(),at=Number(start.value),until=Number(end.value),ease=Number(el('v061-zoom-duration').value);
  if(!view()?.original?.()||view()?.exporting?.())return;
  if(!Number.isFinite(at)||!Number.isFinite(until)||at<0||until<=at+ease||until>view().outputDuration()+.001){
   const status=el('status');if(status)status.textContent='Zoom Out must be after Zoom In + transition and inside the sequence.';return;
  }
  try{view().addZoomRange(at,until,m.scale,m.x,m.y,ease);refresh();}
  catch(e){const status=el('status');if(status)status.textContent=e.message;}
 });
 const list=el('v061-zoom-events');
 list?.addEventListener('click',e=>{
  if(e.target.closest('button'))return;
  const row=e.target.closest('[data-zoom-id]');if(!row)return;
  const z=view()?.zoomFrames?.()?.find(k=>k.id===row.dataset.zoomId);if(!z)return;
  selectedId=z.id;start.value=z.start.toFixed(2);
  el('v061-zoom-scale').value=String(z.scale);
  if(el('v061-zoom-scale').value!==String(z.scale)){
   const select=el('v061-zoom-scale');const o=document.createElement('option');
   o.value=String(z.scale);o.textContent=Math.round(z.scale*100)+'%';select.append(o);select.value=o.value;
  }
  el('v061-zoom-duration').value=String(z.duration);
  el('v061-zoom-x').value=Math.round(z.x*100);el('v061-zoom-y').value=Math.round(z.y*100);
  refresh();list.querySelectorAll('[data-zoom-id]').forEach(n=>n.classList.toggle('v063-zoom-selected',n.dataset.zoomId===selectedId));
 });
 save.addEventListener('click',()=>{
  if(!selectedId||!view()?.original?.())return;
  const m=mode(),at=Number(start.value),duration=Number(el('v061-zoom-duration').value);
  try{view().updateZoomKeyframe(selectedId,{start:at,duration,scale:m.scale,x:m.x,y:m.y});refresh();}
  catch(e){const s=el('status');if(s)s.textContent=e.message;}
 });
 root.MangoZoomHUD={refresh,frameDraw,setScale,math:root.MangoZoomHUDMath};
 refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
