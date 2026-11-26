/* Professional pixel selection studio, with explicit source and composition scopes.
 * Raw source preview is local/private; export always uses the flattened composition. */
(function(root){'use strict';
 const d=root.document,S=root.MangoSelectionV0728,H=root.MangoSelectionImageV0728;
 if(!d?.body.classList.contains('studio-image')||!S||!H)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,txt,fn)=>{const b=el('button','ci-action-v0720',txt);b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 const input=(id,type)=>{const n=el('input');n.id=id;n.type=type;return n;};
 const field=(label,node)=>{const l=el('label','ps-field-v0728');l.append(el('span','',label),node);return l;};
 const modal=el('dialog','ps-dialog-v0728');modal.id='ps-dialog-v0728';modal.setAttribute('aria-labelledby','ps-title-v0728');
 const head=el('header'),headerText=el('div'),title=el('strong','','PIXEL SELECTION & MASK STUDIO'),subtitle=el('small');title.id='ps-title-v0728';headerText.append(title,subtitle);head.append(headerText,button('ps-close-v0728','Close ×',()=>modal.close()));
 const body=el('div','ps-body-v0728'),top=el('div','ps-controls-v0728');
 const scope=select('ps-scope-v0728',[['composition','Flattened composition · PNG selection'],['source','Imported image · editable mask']]),combine=select('ps-combine-v0728',[['replace','Replace'],['add','Add'],['subtract','Subtract'],['intersect','Intersect']]);
 const feather=input('ps-feather-v0728','range'),featherNumber=input('ps-feather-number-v0728','number'),featherRow=el('div','ps-feather-row-v0728');
 for(const n of [feather,featherNumber]){n.min='0';n.max='64';n.step='1';}feather.setAttribute('aria-label','Feather radius in source pixels');featherRow.append(feather,featherNumber);
 const invert=input('ps-invert-v0728','checkbox'),enabled=input('ps-enabled-v0728','checkbox');
 top.append(field('Target',scope),field('Selection operation',combine),field('Feather (source px)',featherRow),field('Invert result',invert),field('Enabled',enabled));
 const toolRow=el('div','ps-buttons-v0728'),toolButtons=new Map();let kind='rectangle';
 for(const [k,label] of [['rectangle','Rectangle'],['ellipse','Ellipse'],['polygon','Polygon'],['lasso','Freehand lasso']]){const b=button('ps-tool-'+k+'-v0728',label,()=>{kind=k;gesture=null;sync();schedule();});b.setAttribute('aria-pressed','false');toolRow.append(b);toolButtons.set(k,b);}
 const finish=button('ps-finish-v0728','Close polygon',()=>finishPolygon()),undoRegion=button('ps-undo-v0728','Undo selection step',()=>{if(!undo.length)return;draft=undo.pop();gesture=null;sync();schedule();}),all=button('ps-all-v0728','Select all',()=>edit(()=>S.add(draft,{kind:'rectangle',op:'replace',points:[{x:0,y:0},{x:1,y:1}]}))),clear=button('ps-clear-v0728','Deselect / remove mask',()=>edit(()=>S.empty()));
 toolRow.append(finish,undoRegion,all,clear);
 const pair=el('div','ps-pair-v0728'),left=el('figure'),right=el('figure'),leftLabel=el('figcaption','','Draw pixel selection'),rightLabel=el('figcaption','','Selection preview');
 const view=el('canvas');view.id='ps-view-v0728';view.setAttribute('aria-label','Draw selection on source or flattened image');view.tabIndex=0;
 const result=el('canvas');result.id='ps-result-v0728';result.setAttribute('aria-label','Selected pixels or draft composition preview');
 left.append(leftLabel,view);right.append(rightLabel,result);pair.append(left,right);
 const note=el('p','ps-note-v0728'),row=el('div','ps-buttons-v0728'),compositionPreview=button('ps-preview-composition-v0728','Preview applied mask on composition',()=>showComposition());
 row.append(compositionPreview);
 body.append(top,toolRow,pair,row,note);
 const footer=el('footer'),status=el('span','ps-note-v0728');status.id='ps-status-v0728';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const action=button('ps-apply-v0728','Apply mask',()=>void commit());action.classList.add('primary');footer.append(status,action);modal.append(head,body,footer);d.body.append(modal);
 let session=null,source=null,target=null,draft=S.empty(),gesture=null,undo=[],frame=0,focus=null,working=false,revision=0;
 const currentMask=()=>draft.regions.length?S.check(draft):null;
 const previousMask=()=>scope.value==='source'?session?.selected?.mask:null;
 const changed=()=>JSON.stringify(currentMask())!==JSON.stringify(previousMask());
 function sync(){
  for(const [k,b] of toolButtons)b.setAttribute('aria-pressed',String(kind===k));
  finish.disabled=gesture?.kind!=='polygon'||gesture.points.length<3;undoRegion.disabled=!undo.length;invert.checked=draft.inverted;enabled.checked=draft.enabled;
  feather.value=featherNumber.value=String(draft.feather);invert.disabled=enabled.disabled=feather.disabled=featherNumber.disabled=!draft.regions.length;
  compositionPreview.hidden=scope.value!=='source';action.textContent=scope.value==='source'?'Apply selection mask':'Export selection PNG';
  action.disabled=working||!target||(scope.value==='source'?!changed():!S.active(draft));
 }
 function edit(fn){
  if(!session||working)return;const old=S.copy(draft);try{const next=S.check(fn(),true);if(JSON.stringify(old)===JSON.stringify(next))return;undo.push(old);if(undo.length>24)undo.shift();draft=next;gesture=null;sync();schedule();}catch(e){status.textContent=e.message;}
 }
 function release(){if(source){source.width=source.height=1;source=null;}}
 function load(){
  release();gesture=null;undo=[];revision++;working=false;
  try{const id=scope.value==='source'?session.selected?.id:null;target=H.validate(scope.value,id,session.stamp);source=H.preview(scope.value,id,session.stamp);
   draft=scope.value==='source'&&session.selected.mask?S.copy(session.selected.mask):S.empty();
   view.width=result.width=source.width;view.height=result.height=source.height;
   subtitle.textContent=target.width+' × '+target.height+' pixels · '+(scope.value==='source'?'Source-space selection':'Flattened composition');
   note.textContent=scope.value==='source'?'Private source view: underlying imported pixels may be visible. This mask intersects existing brush masks and cutout mattes. Apply retains source pixels. For sharing, switch to flattened composition.':'Selection PNG preserves the full canvas dimensions, with transparent pixels outside the selection. It uses the normal combined export including visible redactions and annotations.';
   sync();schedule();
  }catch(e){target=null;status.textContent=e.message;sync();}
 }
 const point=e=>{const r=view.getBoundingClientRect();return {x:S.clamp((e.clientX-r.left)/r.width,0,1),y:S.clamp((e.clientY-r.top)/r.height,0,1)};};
 function shape(g){return {kind:g.kind,op:g.op,points:g.points};}
 function draftForPreview(){if(!gesture)return draft;try{return S.add(draft,shape(gesture));}catch{return draft;}}
 function render(){
  frame=0;if(!modal.open||!session||!source)return;
  const q=view.getContext('2d'),r=result.getContext('2d'),w=view.width,h=view.height,v=draftForPreview();
  q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,w,h);q.drawImage(source,0,0);
  r.setTransform(1,0,0,1,0,0);r.globalCompositeOperation='source-over';r.clearRect(0,0,w,h);r.drawImage(source,0,0);rightLabel.textContent='Selected pixels · scaled preview';
  if(S.active(v)){
   const mask=S.render(v,w,h,target.width,target.height);
   r.globalCompositeOperation='destination-in';r.drawImage(mask,0,0);r.globalCompositeOperation='source-over';
   const dim=el('canvas');dim.width=w;dim.height=h;const g=dim.getContext('2d');g.fillStyle='#080b10b8';g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-out';g.drawImage(mask,0,0);q.drawImage(dim,0,0);dim.width=dim.height=mask.width=mask.height=1;
  }
  const contours=[...draft.regions];if(gesture&&gesture.points.length>=2)contours.push(shape(gesture));
  q.save();try{for(const a of contours){
   try{if(a.kind==='polygon'&&a.points.length===2){q.beginPath();q.moveTo(a.points[0].x*w,a.points[0].y*h);q.lineTo(a.points[1].x*w,a.points[1].y*h);}else S.path(q,a,w,h);q.lineWidth=2;q.strokeStyle='#161a1e';q.setLineDash([]);q.stroke();q.lineWidth=1;q.strokeStyle='#f0f4f8';q.setLineDash([4,4]);q.stroke();}catch{}
  }}finally{q.restore();}
  if(!working){status.textContent=draft.regions.length?draft.regions.length+' selection region'+(draft.regions.length===1?'':'s')+' · '+draft.feather+' px feather'+(draft.inverted?' · inverted':''):'Draw a region or select all.';}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{try{render();}catch(e){status.textContent=e.message;action.disabled=true;}});}
 function begin(e){
  if(e.button!==0||working||!target)return;e.preventDefault();view.focus();const p=point(e);
  if(kind==='polygon'){
   if(gesture?.kind!=='polygon')gesture={kind,op:combine.value,points:[]};
   if(gesture.points.length<S.MAX_VERTICES)gesture.points.push(p);sync();schedule();return;
  }
  gesture={kind,op:combine.value,points:kind==='lasso'?[p]:[p,p],id:e.pointerId};view.setPointerCapture?.(e.pointerId);sync();schedule();
 }
 function update(e){
  if(!gesture||gesture.id!==e.pointerId)return;
  const p=point(e);
  if(gesture.kind==='lasso'){const last=gesture.points.at(-1);if(gesture.points.length<S.MAX_VERTICES&&Math.hypot((p.x-last.x)*view.width,(p.y-last.y)*view.height)>=1.5)gesture.points.push(p);}
  else gesture.points[1]=p;schedule();
 }
 function complete(e){
  if(!gesture||gesture.id!==e.pointerId)return;update(e);const a=shape(gesture);gesture=null;
  edit(()=>S.add(draft,a));sync();schedule();
 }
 function finishPolygon(){if(gesture?.kind!=='polygon'||gesture.points.length<3)return;const a=shape(gesture);gesture=null;edit(()=>S.add(draft,a));sync();schedule();}
 view.addEventListener('pointerdown',begin);view.addEventListener('pointermove',update);view.addEventListener('pointerup',complete);
 for(const t of ['pointercancel','lostpointercapture'])view.addEventListener(t,e=>{if(gesture?.id===e.pointerId){gesture=null;sync();schedule();}});
 view.addEventListener('dblclick',e=>{if(kind==='polygon'&&gesture){e.preventDefault();const a=gesture.points;if(a.length>3&&Math.hypot(a.at(-1).x-a.at(-2).x,a.at(-1).y-a.at(-2).y)<.005)a.pop();finishPolygon();}});
 scope.addEventListener('change',load);combine.addEventListener('change',()=>{gesture=null;sync();schedule();});
 invert.addEventListener('change',()=>edit(()=>({...draft,inverted:invert.checked})));enabled.addEventListener('change',()=>edit(()=>({...draft,enabled:enabled.checked})));
 feather.addEventListener('input',()=>{if(!session||working)return;draft.feather=Number(feather.value);featherNumber.value=feather.value;sync();schedule();});
 feather.addEventListener('pointerdown',()=>{undo.push(S.copy(draft));if(undo.length>24)undo.shift();});
 featherNumber.addEventListener('change',()=>edit(()=>({...draft,feather:featherNumber.valueAsNumber})));
 function showComposition(){
  if(scope.value!=='source'||!session)return;
  try{result.width=480;result.height=270;H.previewMask(result,session.selected.id,currentMask(),session.stamp);rightLabel.textContent='Draft composition · actual layer renderer';status.textContent='Composition preview ready.';}catch(e){status.textContent=e.message;}
 }
 function download(blob){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='MangoShot-selection-'+Date.now()+'.png';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function commit(){
  if(action.disabled||!session||working)return;
  if(gesture){status.textContent='Finish or cancel the current selection gesture first.';return;}
  const active=session,token=++revision;
  try{
   if(scope.value==='source'){H.applyMask(active.selected.id,currentMask(),active.stamp);modal.close();return;}
   working=true;sync();status.textContent='Rendering full-resolution transparent PNG…';
   await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
   if(session!==active||revision!==token||!modal.open)return;
   const c=H.exportSelection(currentMask(),active.stamp);let blob;
   try{blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('PNG encoding failed.')),'image/png'));}finally{c.width=c.height=1;}
   if(session!==active||revision!==token||!modal.open)return;H.validate('composition',null,active.stamp);download(blob);status.textContent='Exported selection PNG locally.';
  }catch(e){if(session===active&&revision===token)status.textContent=e.message;}
  finally{if(session===active&&revision===token){working=false;sync();}}
 }
 function open(){
  const s=H.state();if(!s.ready||d.querySelector('dialog[open]'))return false;session=s;focus=d.activeElement;kind='rectangle';combine.value='replace';
  scope.querySelector('[value=source]').disabled=!s.selected;scope.value=s.selected?'source':'composition';modal.showModal();load();return true;
 }
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();if(gesture){gesture=null;sync();schedule();}else modal.close();}else if(e.key==='Enter'&&e.target===view&&gesture?.kind==='polygon'){e.preventDefault();finishPolygon();}},true);
 modal.addEventListener('close',()=>{revision++;if(frame)cancelAnimationFrame(frame);frame=0;session=target=gesture=null;working=false;release();view.width=view.height=result.width=result.height=1;focus?.focus?.();focus=null;});
 const launch=button('ps-open-v0728','Pixel Selection…',open),studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.append(launch);
 let queued=false;function refresh(){launch.disabled=!H.state().ready;}
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);
 const list=d.getElementById('stroke-list'),statusNode=d.getElementById('status');if(list)new MutationObserver(queue).observe(list,{childList:true});if(statusNode)new MutationObserver(queue).observe(statusNode,{childList:true});
 root.MangoSelectionStudioV0728=Object.freeze({open,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
