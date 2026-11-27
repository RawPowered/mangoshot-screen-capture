/* MangoShot G2/G3 graphics: direct timeline timing, stack order, monitor dragging.
 * Pointer events support Wacom pens, mouse and touch; no HTML5 DnD dependency.
 * State commits are made once on release so each gesture is a single Undo step. */
(() => {
 const el=id=>document.getElementById(id),current=()=>globalThis.MangoClipView;
 const minimum=MangoLayerOps.MIN;
 let movingCanvas=null,dragTimeline=null,dragList=null,snapping=true;
 const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
 const fields={
  'graphic-text':['text',String], 'graphic-track':['track',Number],
  'graphic-x':['x',v=>Number(v)/100], 'graphic-y':['y',v=>Number(v)/100],
  'graphic-width':['width',v=>Number(v)/100], 'graphic-font':['font',String],
  'graphic-weight':['weight',String], 'graphic-size':['fontSize',Number],
  'graphic-align':['align',String], 'graphic-color':['color',String],
  'graphic-bg':['background',String], 'graphic-fade-in':['fadeIn',Number],
  'graphic-fade-out':['fadeOut',Number], 'graphic-opacity':['opacity',v=>Number(v)/100],
  'graphic-outline':['outline',String], 'graphic-outline-width':['outlineWidth',Number],
  'graphic-shadow':['shadow',Number], 'graphic-tail-x':['tailX',v=>Number(v)/100],
  'graphic-tail-length':['tailLength',Number], 'graphic-in':['start',Number], 'graphic-out':['end',Number]
 };
 const rootShape=()=>globalThis.MangoClipShapesV0742;
 const activeLayer=()=>{const st=current(),id=st?.selectedLayer?.();return st?.layers?.().find(l=>l.id===id)||null;};
 function button(text,title,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;b.addEventListener('click',action);return b;}
 function fmt(s){s=Math.max(0,s);return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${String(Math.round((s%1)*100)).padStart(2,'0')}`;}
 function select(id,quiet=false){current()?.selectLayer?.(id,quiet);}
 function rowAt(y,rows){for(const row of rows.children){const b=row.getBoundingClientRect();if(y>=b.top&&y<=b.bottom)return row;}return null;}
 function listGrip(layer,row,rows){const grip=button('⠿','Drag to place above another layer, or use Alt + Up/Down to change stacking order',()=>{});
  grip.className='layer-grip';grip.setAttribute('aria-label','Drag to reorder '+layer.name);row.prepend(grip);
  grip.addEventListener('pointerdown',e=>{if(e.button!==0||layer.locked||current()?.exporting())return;
   e.preventDefault();e.stopPropagation();dragList={id:layer.id,source:row,target:null,grip};
   grip.setPointerCapture?.(e.pointerId);row.classList.add('is-dragging');select(layer.id,true);
  });
  grip.addEventListener('pointermove',e=>{if(!dragList||dragList.id!==layer.id)return;
   for(const item of rows.children)item.classList?.remove('is-drop-target');
   const candidate=rowAt(e.clientY,rows);
   if(candidate&&candidate.dataset.id!==layer.id){candidate.classList.add('is-drop-target');dragList.target=candidate.dataset.id;}
   else dragList.target=null;
  });
  const finish=()=>{if(!dragList||dragList.id!==layer.id)return;
   const target=dragList.target;dragList=null;
   if(target)current()?.placeLayerAbove?.(layer.id,target);
   else current()?.selectLayer?.(layer.id);
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(name,finish);
 }
 function trackFromY(y,defaultTrack){for(const n of [3,2]){
  const rect=el('graphic-track-'+n).getBoundingClientRect();
  if(y>=rect.top-5&&y<=rect.bottom+5)return n;
 }return defaultTrack;}
 function timelineWidth(){return Math.max(1,el('timeline-inner').getBoundingClientRect().width);}
 function dragCandidate(down,e){const total=current().outputDuration(),delta=(e.clientX-down.x)/timelineWidth()*total;
  const track=down.kind==='move'?trackFromY(e.clientY,down.origin.track):down.origin.track;
  const playhead=current().outputAt(current().video().currentTime);
  return MangoLayerOps.snapTransform(down.origin,down.kind,delta,total,current().layers(),playhead,
   9/timelineWidth()*total,snapping&&!e.altKey,track);
 }
 function ghostPos(ghost,candidate){const inner=el('timeline-inner').getBoundingClientRect(),total=current().outputDuration();
  const track=el('graphic-track-'+candidate.track).getBoundingClientRect();
  ghost.style.left=100*candidate.start/total+'%';ghost.style.width=Math.max(0.6,100*(candidate.end-candidate.start)/total)+'%';
  ghost.style.top=(track.top-inner.top+2)+'px';ghost.style.height=Math.max(20,track.height-4)+'px';
  ghost.textContent=`G${candidate.track}  ${fmt(candidate.start)} – ${fmt(candidate.end)}`;
 }
 function startTimelineGesture(e,layer,chip){if(e.button!==0||current()?.exporting())return;
  e.preventDefault();e.stopPropagation();
  if(layer.locked){select(layer.id);return;}
  const kind=e.target?.dataset?.edge||'move';const ghost=document.createElement('div');
  ghost.className='graphic-timeline-ghost';el('timeline-inner').appendChild(ghost);
  dragTimeline={id:layer.id,origin:{...layer},kind,x:e.clientX,y:e.clientY,chip,ghost,candidate:{...layer},moved:false};
  ghostPos(ghost,layer);chip.classList.add('is-dragging');
  chip.setPointerCapture?.(e.pointerId);select(layer.id,true);
 }
 function updateTimelineGesture(e){const d=dragTimeline;if(!d)return;
  if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<2&&!d.moved)return;
  e.preventDefault?.();d.moved=true;d.candidate=dragCandidate(d,e);ghostPos(d.ghost,d.candidate);
  for(const track of [2,3])el('graphic-track-'+track).parentElement?.classList?.toggle('is-drop-track',track===d.candidate.track&&track!==d.origin.track);
  d.chip.style.opacity='.3';
 }
 function finishTimelineGesture(){const d=dragTimeline;if(!d)return;dragTimeline=null;
  d.ghost.remove();d.chip.style.opacity='';for(const track of [2,3])el('graphic-track-'+track).parentElement?.classList?.remove('is-drop-track');
  if(d.moved&&MangoLayerOps.changed(d.origin,d.candidate))current()?.commitLayerTimeline?.(d.id,d.candidate);
  else current()?.selectLayer?.(d.id);
 }
 function graphicChip(layer,total){const chip=document.createElement('div');chip.className='graphic-timeline-clip'+(!layer.visible?' is-hidden':'')+(layer.locked?' is-locked':'')+
  (current().selectedLayer()===layer.id?' is-selected':'');chip.tabIndex=0;chip.role='button';chip.dataset.layerId=layer.id;
  chip.title=`G${layer.track}: ${layer.name} · ${fmt(layer.start)}–${fmt(layer.end)} · drag to move or resize ends`;
  chip.style.left=100*layer.start/total+'%';chip.style.width=Math.max(.6,100*(layer.end-layer.start)/total)+'%';
  const label=document.createElement('span');label.className='graphic-chip-label';label.textContent=(layer.kind==='shape'?'◇ ':layer.kind==='callout'?'◆ ':'T ')+layer.name;
  chip.appendChild(label);
  for(const edge of ['start','end']){
   const h=document.createElement('span');h.className='graphic-clip-handle handle-'+edge;h.dataset.edge=edge;
   h.title='Drag to trim '+(edge==='start'?'In':'Out')+' point';chip.appendChild(h);
  }
  globalThis.MangoProfessionalTimelineUIV0717?.attachKeys(chip,layer);
  chip.addEventListener('pointerdown',e=>startTimelineGesture(e,layer,chip));
  chip.addEventListener('pointermove',updateTimelineGesture);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])chip.addEventListener(type,finishTimelineGesture);
  chip.addEventListener('keydown',e=>{
   if(current().exporting()||layer.locked)return;
   if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key==='Delete'||e.key==='Backspace')){
    e.preventDefault();e.stopPropagation();current()?.deleteLayer?.(layer.id);return;
   }
   if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();current().reorderLayer(layer.id,e.key==='ArrowUp'?1:-1);return;
   }
   if(['ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();const sign=e.key==='ArrowLeft'?-1:1;
    const draft=MangoLayerOps.transform(layer,'move',sign*(e.shiftKey?1:1/30),current().outputDuration());
    current().commitLayerTimeline(layer.id,draft);
   }
  });
  return chip;
 }
 function render(){const st=current();if(!st)return;
  const loaded=st.outputDuration()>0,disabled=!loaded||st.exporting();
  el('add-text').disabled=disabled;el('add-callout').disabled=disabled;el('ripple-delete').disabled=disabled;
  const rows=el('layer-list');rows.replaceChildren();
  const items=st.layers();const ordered=items.slice().sort((a,b)=>b.track-a.track||items.indexOf(b)-items.indexOf(a));
  for(const layer of ordered){
   const row=document.createElement('div');row.className='layer-entry'+(st.selectedLayer()===layer.id?' selected':'');row.dataset.id=layer.id;
   row.tabIndex=0;row.setAttribute('role','group');row.setAttribute('aria-label',layer.name+' graphic layer');
   row.addEventListener('focus',()=>select(layer.id,true));
   row.addEventListener('keydown',e=>{
    if((e.key==='Delete'||e.key==='Backspace')&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
     e.preventDefault();e.stopPropagation();st.deleteLayer(layer.id);
    }
   });
   listGrip(layer,row,rows);
   const choose=button((layer.kind==='shape'?'◇ ':layer.kind==='callout'?'◆ ':'T ')+layer.name,'Select '+layer.name,()=>select(layer.id));
   choose.className='layer-entry-select';row.appendChild(choose);
   const timing=document.createElement('span');timing.className='layer-entry-time';timing.textContent=`G${layer.track} · ${fmt(layer.start)}–${fmt(layer.end)}`;row.appendChild(timing);
   row.appendChild(button(layer.visible?'◉':'○',layer.visible?'Hide layer':'Show layer',()=>st.setLayerHidden(layer.id,layer.visible)));
   row.appendChild(button(layer.locked?'🔒':'▢',layer.locked?'Unlock layer':'Lock layer',()=>st.setLayerLocked(layer.id,!layer.locked)));
   const remove=button('×','Delete '+layer.name+' (Ctrl+Z to undo)',()=>st.deleteLayer(layer.id));
   remove.className='layer-remove';remove.setAttribute('aria-label','Delete '+layer.name);
   remove.disabled=disabled||layer.locked;row.appendChild(remove);
   rows.appendChild(row);
  }
  if(!items.length)rows.textContent='No graphics yet. Add a title, callout or shape overlay.';
  const layer=activeLayer(),properties=el('graphic-inspector');properties.hidden=!layer;properties.dataset.kind=layer?.kind||'';
  if(layer){
   for(const [id,[field]] of Object.entries(fields)){
    const input=el(id);if(!input)continue;const value=layer[field];
    input.value=['x','y','width','opacity','tailX'].includes(field)?Math.round(value*100):value;
    input.disabled=layer.locked||st.exporting()||(layer.kind==='shape'&&['text','font','weight','fontSize','align','tailX','tailLength','color'].includes(field));
   }
   for(const [id,value] of [['graphic-shape-height',layer.shape?.height*100],['graphic-shape-rotation',layer.shape?.rotation],['graphic-shape-fill-opacity',layer.kind==='shape'?rootShape().fillOpacity(layer.background):0]]){const n=el(id);if(n){n.disabled=layer.kind!=='shape'||layer.locked||st.exporting();n.value=Number.isFinite(value)?String(Math.round(value*100)/100):'0';}}
   const weightField=el('graphic-weight'),font=globalThis.MangoCreativeV079?.font(layer.font);for(const option of Array.from(weightField.options||[]))option.disabled=font?Number(option.value)<font.min||Number(option.value)>font.max:!['400','500','600','700','800'].includes(option.value);
   el('graphic-preset').value=layer.preset;el('graphic-preset').disabled=layer.locked||st.exporting()||layer.kind==='shape';
   el('graphic-duplicate').disabled=st.exporting();el('graphic-delete').disabled=st.exporting()||layer.locked;
   el('graphic-duration').textContent=`G${layer.track} · In ${fmt(layer.start)} · Out ${fmt(layer.end)} · Duration ${fmt(layer.end-layer.start)}`;
  }
  for(const track of [2,3])el('graphic-track-'+track).replaceChildren();
  const total=st.outputDuration();if(total){for(const item of items)el('graphic-track-'+item.track).appendChild(graphicChip(item,total));}
  globalThis.MangoTypeHUD?.sync?.();globalThis.MangoMotionUI?.sync?.();
 }
 function selectionOutline(ctx,seconds,w,h,draft=null){const selected=draft||activeLayer();
  if(!selected||selected.locked||!selected.visible||seconds===null||seconds<selected.start||seconds>=selected.end)return;
  const r=MangoGraphics.animatedBounds?.(selected,w,h,ctx,seconds)||MangoGraphics.bounds(selected,w,h,ctx);ctx.save();ctx.globalAlpha=1;ctx.setLineDash([9,5]);
  ctx.lineWidth=Math.max(1.5,h/450);ctx.strokeStyle='#aee3fa';if(selected.kind==='shape'&&!selected.keyframes?.length){const g=rootShape().geometry(selected,w,h),size=Math.max(5,h/120);ctx.beginPath();for(const [i,p] of g.corners.entries())i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);ctx.closePath();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(g.top.x,g.top.y);ctx.lineTo(g.rotate.x,g.rotate.y);ctx.stroke();ctx.fillStyle='#aee3fa';ctx.beginPath();ctx.arc(g.rotate.x,g.rotate.y,size,0,Math.PI*2);ctx.fill();ctx.fillRect(g.resize.x-size,g.resize.y-size,size*2,size*2);}else{ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.setLineDash([]);if(!selected.keyframes?.length){ctx.fillStyle='#aee3fa';ctx.fillRect(r.x+r.w-9,r.y+r.h-9,16,16);}}ctx.restore();
 }
 function propertyChange(e){const layer=activeLayer(),st=current();if(!layer||!st||layer.locked)return;
  const [field,coerce]=fields[e.currentTarget.id],value=coerce(e.currentTarget.value);
  if(typeof value==='number'&&!Number.isFinite(value))return st.message('Invalid graphic property.');
  if(field==='background'&&!(/^transparent$/i.test(value)||/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)))return st.message('Background must be transparent or #RRGGBB / #RRGGBBAA.');
  if(field==='start'&&(value<0||value>=layer.end-minimum))return st.message('Layer In must be before Out.');
  if(field==='end'&&(value<=layer.start+minimum||value>st.outputDuration()+.001))return st.message('Layer Out must remain within the sequence.');
  if(['x','y','width','opacity','tailX'].includes(field)&&(value<0||value>1))return;
  if(field==='outline'&&!/^#[0-9a-f]{6}$/i.test(value))return;
  if(field==='outlineWidth'&&(value<0||value>12))return;
  if(field==='shadow'&&(value<0||value>40))return;
  if(field==='tailLength'&&(value<0||value>200))return;
  if(field==='track'&&![2,3].includes(value))return;
  if(field==='fontSize'&&(value<12||value>220))return;
  if(field==='font'||field==='weight'){
   const nextFont=field==='font'?value:layer.font,nextWeight=field==='weight'?value:layer.weight;
   const c=globalThis.MangoCreativeV079,validLegacy=['400','500','600','700','800'];
   const weight=c?.font(nextFont)?c.weight(nextFont,nextWeight):validLegacy.includes(String(nextWeight))?String(nextWeight):String(Math.max(400,Math.min(800,Math.round(Number(nextWeight)/100)*100)));
   st.updateLayer(layer.id,{font:nextFont,weight,preset:'none'});return;
  }
  st.updateLayer(layer.id,['start','end','track'].includes(field)?{[field]:value}:{[field]:value,preset:'none'});
 }
 for(const id of Object.keys(fields))el(id).addEventListener('change',propertyChange);
 for(const [id,key] of [['graphic-shape-height','height'],['graphic-shape-rotation','rotation'],['graphic-shape-fill-opacity','fillOpacity']])el(id)?.addEventListener('change',e=>{const st=current(),l=activeLayer(),v=e.currentTarget.valueAsNumber;if(!l||l.kind!=='shape'||l.locked||st.exporting()||!Number.isFinite(v))return;try{const S=rootShape();const patch=key==='fillOpacity'?{background:S.withFillOpacity(l.background,l.outline,v)}:{shape:S.check({...l.shape,[key]:key==='height'?v/100:v})};st.updateLayer(l.id,patch);}catch(err){st.message(err.message);render();}});
 el('graphic-preset').addEventListener('change',()=>{const l=activeLayer();if(l)current().styleLayer(l.id,el('graphic-preset').value);});
 el('add-text').addEventListener('click',()=>current()?.addLayer('text',el('create-preset').value));
 el('add-callout').addEventListener('click',()=>current()?.addLayer('callout',el('create-preset').value));
 el('graphic-delete').addEventListener('click',()=>{const l=activeLayer();if(l)current().deleteLayer(l.id);});
 el('graphic-duplicate').addEventListener('click',()=>{const l=activeLayer();if(l)current().duplicateLayer(l.id);});
 for(const [id,delta] of [['graphic-front',1],['graphic-back',-1]])el(id).addEventListener('click',()=>{const l=activeLayer();if(l)current().reorderLayer(l.id,delta);});
 el('graphics-snap').addEventListener('click',()=>{snapping=!snapping;
  el('graphics-snap').setAttribute('aria-pressed',String(snapping));if(globalThis.MangoIconsV079?.has('magnet'))el('graphics-snap').replaceChildren(globalThis.MangoIconsV079.svg('magnet',16),document.createTextNode(' Snap: '+(snapping?'ON':'OFF')));else el('graphics-snap').textContent='🧲 Snap: '+(snapping?'ON':'OFF');
 });
 const canvas=el('graphics-preview');
 function canvasPoint(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height};}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const st=current(),now=st?.motionPosition?.()??st?.outputAt(st.video().currentTime);
  if(!st||now===null)return;
  const p=canvasPoint(e),w=canvas.width,h=canvas.height;
  const visible=MangoGraphics.at(st.layers(),now).reverse();
  const primary=activeLayer(),S=rootShape(),g=primary?.kind==='shape'&&!primary.keyframes?.length&&!primary.locked&&visible.some(l=>l.id===primary.id)?S.geometry(primary,w,h):null,px=p.x*w,py=p.y*h,near=q=>Math.hypot(px-q.x,py-q.y)<Math.max(10,h/65),handle=g?(near(g.rotate)?'rotate':near(g.resize)?'resize':null):null;
  const clicked=handle?primary:visible.find(l=>{if(l.locked)return false;if(l.kind==='shape'&&!l.keyframes?.length)return S.hit(l,w,h,px,py,Math.max(4,h/140));const r=MangoGraphics.animatedBounds?.(l,w,h,canvas.getContext?.('2d'),now)||MangoGraphics.bounds(l,w,h,canvas.getContext?.('2d'));
   return p.x>=r.x/w-.018&&p.x<=(r.x+r.w)/w+.018&&p.y>=r.y/h-.025&&p.y<=(r.y+r.h)/h+.025;});
  if(!clicked){return;}e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
  select(clicked.id,true);
  if(clicked.keyframes?.length){
   const M=globalThis.MangoMotionCoreV0750,s=st.automationCapture(),t=M?.snap(clicked,now);
   if(!M||!s.ready||t==null){st.message('Pause playback and place the playhead inside the animated layer.');try{canvas.releasePointerCapture?.(e.pointerId);}catch{}return;}
   movingCanvas={id:clicked.id,pointerId:e.pointerId,startX:p.x,startY:p.y,animated:true,keys:clicked.keyframes.map(k=>({...k})),t,at:now,expected:s,moved:false,draft:null};
   return;
  }
  const box=MangoGraphics.bounds(clicked,w,h),size=20;
  const onHandle=st.selectedLayer()===clicked.id&&Math.abs(p.x*w-(box.x+box.w))<size&&Math.abs(p.y*h-(box.y+box.h))<size;
  movingCanvas={id:clicked.id,startX:p.x,startY:p.y,x:clicked.x,y:clicked.y,width:clicked.width,
   size:clicked.fontSize,height:clicked.shape?.height,shape:clicked.kind==='shape'?MangoGraphics.clone(clicked):null,mode:handle||(onHandle?'resize':'move'),moved:false};
 });
 canvas.addEventListener('pointermove',e=>{if(!movingCanvas)return;
  const st=current(),l=st.layers().find(x=>x.id===movingCanvas.id);if(!l)return;
  const p=canvasPoint(e),dx=p.x-movingCanvas.startX,dy=p.y-movingCanvas.startY;
  if(movingCanvas.animated){
   const g=movingCanvas;if(e.pointerId!==g.pointerId)return;
   const stationary=Math.hypot(dx*canvas.width,dy*canvas.height)<2;if(stationary&&!g.moved)return;
   try{const next=stationary?g.keys:globalThis.MangoMotionCoreV0750.move(g.keys,g.t,dx,dy);st.previewGraphicMotion(g.id,next,g.expected);g.draft=next;g.moved=true;}
   catch(err){movingCanvas=null;st.cancelGraphicMotion(g.id);st.message(err.message);try{canvas.releasePointerCapture?.(g.pointerId);}catch{}}
   return;
  }
  if(movingCanvas.shape&&['rotate','resize'].includes(movingCanvas.mode)){const o=movingCanvas.shape,w=canvas.width,h=canvas.height,S=rootShape(),next=movingCanvas.mode==='rotate'?{shape:{...o.shape,rotation:S.rotateTo(o,w,h,p.x*w,p.y*h,e.shiftKey)}}:S.resizeFrom(o,w,h,dx*w,dy*h,e.shiftKey);if(JSON.stringify({x:l.x,y:l.y,width:l.width,shape:l.shape})===JSON.stringify({x:next.x??l.x,y:next.y??l.y,width:next.width??l.width,shape:next.shape}))return;if(!movingCanvas.moved){st.beginLayerMove(l.id);movingCanvas.moved=true;}st.moveShapeGeometry(l.id,next);return;}
  if(movingCanvas.mode==='resize'){
   const width=Math.max(.1,Math.min(1-l.x,movingCanvas.width+dx));
   const fontSize=e.shiftKey?Math.max(12,Math.min(220,movingCanvas.size*(1+dy*2))):movingCanvas.size;
   const height=l.kind==='shape'?Math.max(.03,Math.min(1-l.y,movingCanvas.height+dy)):null;
   if(Math.abs(width-l.width)+(height===null?Math.abs(fontSize-l.fontSize)/200:Math.abs(height-l.shape.height))<.0005)return;
   if(!movingCanvas.moved){st.beginLayerMove(l.id);movingCanvas.moved=true;}
   st.resizeLayer(l.id,width,fontSize,height);
  }else{
   const x=Math.max(0,Math.min(1-l.width,movingCanvas.x+dx));
   const y=Math.max(0,Math.min(l.kind==='shape'?Math.max(0,1-l.shape.height):.94,movingCanvas.y+dy));
   if(Math.abs(x-l.x)+Math.abs(y-l.y)<.0005)return;
   if(!movingCanvas.moved){st.beginLayerMove(l.id);movingCanvas.moved=true;}
   st.moveLayer(l.id,x,y);
  }
 });
 function endCanvas(event){if(!movingCanvas)return;
  const g=movingCanvas;
  if(g.animated){
   if(event?.pointerId!=null&&event.pointerId!==g.pointerId)return;
   movingCanvas=null;const st=current();
   try{if(event?.type==='pointerup'&&g.moved&&g.draft){if(!Number.isFinite(st.motionPosition())||Math.abs(st.motionPosition()-g.at)>.02)throw Error('Playhead changed during gesture.');st.commitGraphicMotion(g.id,g.draft,g.expected);}else{st.cancelGraphicMotion(g.id);if(event?.type==='pointerup')st.selectLayer(g.id);}}
   catch(err){st.cancelGraphicMotion(g.id);st.message(err.message);}
   try{if(canvas.hasPointerCapture?.(g.pointerId))canvas.releasePointerCapture(g.pointerId);}catch{}return;
  }
  if(g.moved)current()?.endLayerMove();else current()?.selectLayer(g.id);
  movingCanvas=null;
 }
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,endCanvas);
 globalThis.addEventListener('keydown',e=>{if(e.key==='Escape'&&movingCanvas?.animated){e.preventDefault();e.stopImmediatePropagation();endCanvas({type:'cancel'});}},true);
 globalThis.addEventListener('blur',()=>{if(movingCanvas?.animated)endCanvas({type:'cancel'});});
 globalThis.MangoLayerUI={render,selectionOutline};render();
})();
