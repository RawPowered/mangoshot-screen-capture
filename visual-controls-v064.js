/* MangoShot v0.6.4: visual-first camera and clip inspector.
 * The original editor buttons and fields are MOVED, not cloned, preserving
 * their event listeners, keyboard shortcuts, timeline contract, and undo. */
(function(root){'use strict';
 const el=id=>document.getElementById(id);
 const view=()=>root.MangoClipView;
 const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function button(text,title,action,cls){const b=mk('button',cls,text);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',action);return b;}
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(x)?x:a));
 const time=t=>{const seconds=Math.max(0,Number(t)||0);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+(seconds%60).toFixed(2).padStart(5,'0');};
 const notice=text=>{if(el('status'))el('status').textContent=text;};
 function camera(){
  const panel=el('v062-camera-panel'),hud=panel?.querySelector('.v063-zoom-hud'),controls=el('v061-camera-panel');
  if(!panel||!hud||!controls||!root.MangoZoomHUD)return;
  const heading=hud.querySelector('.v063-hud-heading');if(heading)heading.textContent='DRAG TO PAN · DRAG CORNERS TO ZOOM';
  const presets=mk('div','v064-camera-presets');presets.setAttribute('role','group');presets.setAttribute('aria-label','Quick camera zoom levels');
  for(const scale of [1,1.5,2,3]){
   const b=button((scale*100)+'%','Fit to '+(scale*100)+'% zoom',()=>{
    root.MangoZoomHUD.setScale(scale);root.MangoZoomHUD.refresh();sync();
   },'v064-zoom-chip');b.dataset.scale=String(scale);presets.append(b);
  }
  hud.querySelector('.v063-hud-frame')?.after(presets);
  const times=mk('div','v064-zoom-markers');
  const inItem=mk('div','v064-time-item'),outItem=mk('div','v064-time-item');
  const inValue=mk('output','v064-time-value','00:00.00'),outValue=mk('output','v064-time-value','00:03.00');
  inValue.id='v064-zoom-in-value';outValue.id='v064-zoom-out-value';
  const inButton=button('◀ Set In','Set zoom start at current playhead',()=>setMarker('v063-zoom-in',inValue),'v064-mark-button');
  const outButton=button('Set Out ▶','Set zoom return time at current playhead',()=>setMarker('v063-zoom-out',outValue),'v064-mark-button');
  inItem.append(mk('span','v064-time-caption','ZOOM IN'),inValue,inButton);
  outItem.append(mk('span','v064-time-caption','RETURN TO FIT'),outValue,outButton);
  times.append(inItem,outItem);
  const apply=el('v063-add-range');if(apply){apply.textContent='✓ Apply camera move';apply.classList.add('v064-primary');}
  const startInput=el('v063-zoom-in'),endInput=el('v063-zoom-out');
  const updateTimes=()=>{inValue.textContent=time(Number(startInput?.value));outValue.textContent=time(Number(endInput?.value));};
  function setMarker(id,output){
   const position=view()?.sequencePosition?.(),duration=view()?.outputDuration?.()||0;
   if(!view()?.original?.()||view()?.exporting?.())return notice('Import a recording to set camera timing.');
   const value=clamp(position??0,0,duration);el(id).value=value.toFixed(2);output.textContent=time(value);
  }
  startInput?.addEventListener('change',updateTimes);endInput?.addEventListener('change',updateTimes);
  const advanced=mk('details','v064-tech-details');advanced.id='v064-camera-advanced';
  advanced.append(mk('summary','','Advanced · Precise zoom, coordinates and easing'));
  const advancedBody=mk('div','v064-tech-body');
  const existingRange=hud.querySelector('.v063-hud-range');
  const controlsRow=controls.querySelector(':scope > .v061-creative-row');
  const actions=mk('div','v064-camera-actions');
  for(const id of ['v061-zoom-add','v061-zoom-reset']){const b=el(id);if(b){b.classList.add('v064-camera-action');actions.append(b);}}
  if(controlsRow)advancedBody.append(controlsRow);
  if(existingRange)advancedBody.append(existingRange);
  const oldOutput=el('v063-focus-readout');if(oldOutput){const row=mk('div','v064-coordinates');row.append(mk('span','','Current focus:'),oldOutput);advancedBody.append(row);}
  advanced.append(advancedBody);
  const legend=hud.querySelector('.v063-hud-legend');
  if(legend)legend.firstElementChild.textContent='Lime = proposed zoom · Dashed = playback';
  if(legend)legend.after(times);
  if(apply)times.after(apply);
  times.after(actions);
  hud.append(advanced);
  function sync(){
   const scale=Number(el('v061-zoom-scale')?.value||1);
   for(const b of presets.children)b.setAttribute('aria-pressed',String(Math.abs(Number(b.dataset.scale)-scale)<.01));
   updateTimes();
  }
  el('v061-zoom-scale')?.addEventListener('change',sync);
  const refresh=root.MangoZoomHUD.refresh;
  root.MangoZoomHUD.refresh=()=>{refresh();sync();};
  sync();
 }
 function clip(){
  const panel=el('v062-clip-panel'),source=el('source-format'),inInput=el('in'),outInput=el('out');
  const rail=document.querySelector('.v06-rail'),menu=[...document.querySelectorAll('.v06-menu')].find(n=>n.querySelector('summary')?.textContent.trim()==='Edit')?.querySelector('.v06-menu-pop');
  if(!panel||!inInput||!outInput||!rail)return;
  const selectionSection=inInput.closest('.inspector-section');
  const sourceSection=source?.closest('.inspector-section');
  const actionSection=el('trim')?.closest('.inspector-section');
  const block=mk('section','v064-clip-visual');
  block.id='v064-clip-visual';
  const head=mk('div','v064-clip-heading');
  const label=mk('strong','','V1 + A1 · Linked Video & Audio');
  const detail=mk('span','','Use the handles to set a clip range');
  head.append(label,detail);
  const preview=mk('div','v064-clip-preview');preview.tabIndex=0;preview.setAttribute('role','group');
  preview.setAttribute('aria-label','Miniature visual source timeline with draggable In and Out handles');
  const frames=mk('div','v064-clip-frames'),shade=mk('div','v064-clip-mask');
  const selected=mk('div','v064-clip-selection');
  const gripIn=mk('span','v064-grip v064-grip-in');gripIn.dataset.edge='in';gripIn.title='Drag the beginning of the selected range';
  const gripOut=mk('span','v064-grip v064-grip-out');gripOut.dataset.edge='out';gripOut.title='Drag the end of the selected range';
  selected.append(gripIn,gripOut);
  const playhead=mk('div','v064-clip-playhead');preview.append(frames,shade,selected,playhead);
  const markerRow=mk('div','v064-clip-markers');
  const inItem=mk('div','v064-clip-marker'),outItem=mk('div','v064-clip-marker');
  const inTime=mk('output','v064-clip-time','00:00.00'),outTime=mk('output','v064-clip-time','00:00.00');
  const inButton=el('mark-in'),outButton=el('mark-out');
  inButton.textContent='◀ Set In';outButton.textContent='Set Out ▶';
  inButton.classList.add('v064-marker-button');outButton.classList.add('v064-marker-button');
  inItem.append(mk('span','','IN'),inTime,inButton);
  outItem.append(mk('span','','OUT'),outTime,outButton);
  markerRow.append(inItem,outItem);
  const info=mk('div','v064-clip-info','Generate thumbnails to see source frames; the main timeline retains the full linked waveform.');
  const advanced=mk('details','v064-tech-details');advanced.id='v064-clip-advanced';
  advanced.append(mk('summary','','Advanced · Exact times and source information'));
  const body=mk('div','v064-tech-body');
  for(const input of [inInput,outInput]){const label=input.closest('label');if(label)body.append(label);}
  if(sourceSection)body.append(sourceSection);
  advanced.append(body);
  block.append(head,preview,markerRow,info,advanced);
  if(selectionSection)selectionSection.replaceWith(block);
  else panel.prepend(block);
  const actions=mk('div','v064-rail-actions');actions.setAttribute('role','group');actions.setAttribute('aria-label','Clip editing actions');
  const names={
   split:['✂','Split at playhead · C'],cut:['▧','Ripple Delete selected clip/range'],trim:['◫','Trim to selection'],
   undo:['↶','Undo · Ctrl+Z'],redo:['↷','Redo · Ctrl+Shift+Z']};
  for(const [id,[icon,title]] of Object.entries(names)){
   const b=el(id);if(!b)continue;
   b.textContent=icon;b.title=title;b.setAttribute('aria-label',title);b.classList.add('v064-rail-button');actions.append(b);
  }
  rail.append(mk('div','v06-rail-divider'),actions);
  if(menu){
   menu.append(button('Trim to selected range','Trim to selected range',()=>el('trim')?.click(),'v062-menu-command'));
   const existingReset=menu.querySelector('[data-command="reset"]');existingReset?.remove();
   for(const [id,title] of [['play-edited','Play edited sequence'],['reset','Restore full source (Undo available)']]){
    const b=el(id);if(!b)continue;b.textContent=title;b.title=title;b.classList.add('v062-menu-command');menu.append(b);
   }
  }
  actionSection?.remove();
  const thumbStrip=el('thumbnail-strip');
  let dragging=null,draft=null;
  const rangeNow=()=>{
   const total=view()?.outputDuration?.()||0;
   const r=view()?.range?.(),idx=view()?.selectedClip?.();
   if(r?.active)return {a:clamp(r.start,0,total),b:clamp(r.end,0,total)};
   if(Number.isInteger(idx)){
    const parts=view()?.segments?.()||[];let sum=0;
    for(let i=0;i<parts.length;i++){const d=parts[i].end-parts[i].start;
     if(i===idx)return {a:sum,b:sum+d};sum+=d;}
   }
   return {a:clamp(Number(inInput.value)||0,0,total),b:clamp(Number(outInput.value)||total,0,total)};
  };
  function renderRange(a,b,total){
   const length=Math.max(total,.01);
   selected.style.left=(100*a/length)+'%';selected.style.width=(100*Math.max(0,b-a)/length)+'%';
   shade.style.background='linear-gradient(to right,rgba(5,12,12,.54) 0%,rgba(5,12,12,.54) '+(100*a/length)+'%,transparent '+(100*a/length)+'%,transparent '+(100*b/length)+'%,rgba(5,12,12,.54) '+(100*b/length)+'%)';
   inTime.textContent=time(a);outTime.textContent=time(b);
  }
  function framesUpdate(){
   if(!thumbStrip)return;
   const thumbs=[...thumbStrip.children].filter(n=>n.classList?.contains('frame-thumb')).slice(0,12);
   frames.replaceChildren();
   if(!thumbs.length){frames.append(mk('span','v064-no-frames','Generate thumbnails to preview your edits'));return;}
   for(const node of thumbs){const block=mk('span','v064-frame');block.style.backgroundImage=node.style.backgroundImage;
    if(!node.style.backgroundImage)block.classList.add('v064-frame-pending');frames.append(block);}
  }
  function refresh(){
   const total=view()?.outputDuration?.()||0;
   const current=draft||rangeNow();
   renderRange(current.a,current.b,total);
   playhead.style.left=(100*clamp(view()?.sequencePosition?.()||0,0,total)/Math.max(total,.01))+'%';
   label.textContent=view()?.selectedClip?.()!=null?'V1/A1 · Selected Clip '+(view().selectedClip()+1):'V1 + A1 · Linked Video & Audio';
   for(const b of [inButton,outButton])b.disabled=!view()?.original?.()||!!view()?.exporting?.();
  }
  function point(e){const r=preview.getBoundingClientRect();return clamp((e.clientX-r.left)/Math.max(1,r.width),0,1);}
  preview.addEventListener('pointerdown',e=>{
   if(e.button!==0||!view()?.original?.()||view()?.exporting?.())return;
   const edge=e.target?.dataset?.edge;
   if(edge){
    e.preventDefault();const d=rangeNow();
    dragging={edge,total:view().outputDuration(),a:d.a,b:d.b,id:e.pointerId};
    draft={a:d.a,b:d.b};preview.setPointerCapture?.(e.pointerId);
   }else{view()?.seekOutput?.(point(e)*view().outputDuration());refresh();}
  });
  preview.addEventListener('pointermove',e=>{
   if(!dragging||e.pointerId!==dragging.id)return;
   const next=point(e)*dragging.total,min=.05;
   if(dragging.edge==='in')draft.a=clamp(next,0,dragging.b-min);
   else draft.b=clamp(next,dragging.a+min,dragging.total);
   renderRange(draft.a,draft.b,dragging.total);
  });
  function end(e){if(!dragging||e.pointerId!==dragging.id)return;
   const was=dragging;dragging=null;
   if(e.type!=='pointercancel'&&draft&&draft.b-draft.a>=.05)view()?.setRange?.(draft.a,draft.b);
   draft=null;refresh();
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(name,end);
  inButton.addEventListener('click',()=>{draft=null;root.requestAnimationFrame?.(refresh);});
  outButton.addEventListener('click',()=>{draft=null;root.requestAnimationFrame?.(refresh);});
  for(const input of [inInput,outInput])input.addEventListener('change',()=>root.requestAnimationFrame?.(refresh));
  if(thumbStrip&&typeof MutationObserver==='function'){
   const obs=new MutationObserver(()=>{framesUpdate();refresh();});
   obs.observe(thumbStrip,{childList:true});
  }
  const video=el('video');
  for(const event of ['seeked','timeupdate','loadeddata'])video?.addEventListener(event,refresh);
  framesUpdate();refresh();
  root.MangoVisualClip={refresh,rangeNow};
 }
 camera();clip();
})(typeof globalThis!=='undefined'?globalThis:this);
