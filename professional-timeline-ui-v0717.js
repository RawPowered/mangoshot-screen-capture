/* Direct timeline gestures: real source-in/out trims, cross-track placement,
 * snapping, keyboard edit controls and graphic keyframe timing markers. */
(function(root){'use strict';
 const V=root.MangoClipView,P=root.MangoProfessionalTimelineV0717,M=root.MangoMultitrackV0716,B=root.MangoMediaBin,d=root.document;if(!V||!P||!M||!B)return;
 const by=id=>d.getElementById(id),inner=by('timeline-inner'),primary=by('timeline');if(!inner||!primary)return;
 const visual=d.createElement('div'),audio=d.createElement('div');visual.id='pt-visual-tracks-v0717';audio.id='pt-audio-tracks-v0717';visual.className=audio.className='pt-tracks-v0717';primary.before(visual);(by('v061-voice-track')||primary).after(audio);
 const tracks=['V3','V2','A2'];let selected=null,gesture=null,keyCancel=null,committing=false,signature=null;
 const n=(tag,cls,text)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x;};
 const fmt=t=>Number(t).toFixed(2)+'s',name=c=>B.registry.get(c.assetId)?.name||'Missing local media';
 const stop=e=>{e.preventDefault();e.stopPropagation();};
 const current=()=>V.automationCapture();
 const unlocked=(c,m)=>!c.locked&&!m.tracks[c.track].locked;
 function openClip(id){root.MangoMultitrackUIV0716?.open(id);}
 function choose(id){selected=id;for(const el of d.querySelectorAll('.pt-media-clip-v0717')){const yes=el.dataset.clip===id;el.setAttribute('aria-pressed',String(yes));el.classList.toggle('is-selected',yes);}}
 function anchors(c){let at=0;const a=[V.sequencePosition(),...(root.MangoClipTimeline?.markers?.()||[]).map(m=>m.time)];for(const x of V.segments()){at+=x.end-x.start;a.push(at);}for(const x of V.layers())a.push(x.start,x.end);return a.filter(Number.isFinite);}
 function snapOn(e){const b=by('graphics-snap');return !e.altKey&&!/OFF/i.test(b?.textContent||'');}
 function targetTrack(y,from,model){if(from==='A2')return from;for(const t of ['V2','V3']){const r=by('pt-rail-'+t)?.getBoundingClientRect();if(r&&y>=r.top-3&&y<=r.bottom+3)return t;}return from;}
 function layout(el,c,length){el.style.left=(100*c.start/length)+'%';el.style.width=(100*(c.end-c.start)/length)+'%';}
 function release(cancel=false){
  const g=gesture;if(!g)return;gesture=null;g.ghost?.remove();g.tile.classList.remove('is-dragging');
  try{if(g.tile.hasPointerCapture?.(g.pointer))g.tile.releasePointerCapture(g.pointer);}catch{}
  if(cancel||!g.moved)return;if(g.error){V.message(g.error);return;}if(P.eq(g.c,g.next))return;void commit(g.c.id,g.next,g.stamp);
 }
 async function commit(id,next,stamp){if(committing)return;committing=true;try{V.message('Applying secondary timeline edit…');await V.commitSecondaryTimeline(id,next,stamp);selected=next?id:null;}catch(err){V.message('Timeline edit rejected: '+err.message);}finally{committing=false;signature=null;refresh();}}
 function start(e,c,tile){
  if(e.button!==0||gesture||committing)return;stop(e);choose(c.id);
  const s=current(),model=V.multitrack();if(!s.ready||!unlocked(c,model)){V.message('Select an unlocked clip while playback and export are stopped.');return;}
  const ghost=n('div','pt-ghost-v0717');ghost.textContent=name(c);by('pt-rail-'+c.track).appendChild(ghost);layout(ghost,c,V.outputDuration());
  gesture={tile,ghost,c,model,stamp:s.stamp,pointer:e.pointerId,x:e.clientX,y:e.clientY,kind:e.target.dataset.edge||'move',next:c,moved:false,error:null};
  tile.setPointerCapture?.(e.pointerId);
 }
 function move(e){const g=gesture;if(!g||e.pointerId!==g.pointer)return;if(!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<3)return;stop(e);g.moved=true;g.tile.classList.add('is-dragging');
  const length=V.outputDuration(),width=Math.max(1,inner.getBoundingClientRect().width),delta=(e.clientX-g.x)/width*length,target=g.kind==='move'?targetTrack(e.clientY,g.c.track,g.model):g.c.track;
  try{const next=P.snap(g.c,g.kind,delta,g.model,B.registry.get(g.c.assetId),length,target,anchors(g.c),snapOn(e)?Math.min(.35,9*length/width):0);g.next=next;const rail=by('pt-rail-'+next.track);if(rail&&g.ghost.parentNode!==rail)rail.appendChild(g.ghost);layout(g.ghost,next,length);g.ghost.textContent=next.track+' · '+fmt(next.start)+' – '+fmt(next.end);M.check(P.change(g.model,g.c.id,next),B.registry.get,length);g.error=null;g.ghost.classList.remove('is-invalid');}
  catch(err){g.error=err.message;g.ghost.classList.add('is-invalid');g.ghost.textContent=err.message;}
 }
 function tileFor(c,m,length){const tile=n('div','pt-media-clip-v0717'+(c.track==='A2'?' is-audio':'')+(!unlocked(c,m)?' is-locked':'')+(!c.visible||(c.track==='A2'?m.tracks.A2.muted:!m.tracks[c.track].visible)?' is-hidden':''));
  tile.id='pt-clip-'+c.id;tile.dataset.clip=c.id;tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label',c.track+' '+name(c)+' '+fmt(c.start)+' to '+fmt(c.end));tile.setAttribute('aria-pressed',String(selected===c.id));tile.classList.toggle('is-selected',selected===c.id);tile.title='Drag to move, edges to trim, double-click or Enter to edit, Arrow keys to nudge. Shift: 1 second. Alt: bypass snap.';layout(tile,c,length);
  tile.append(n('span','pt-clip-name-v0717',(c.track==='A2'?'♫ ':'')+name(c)));
  for(const edge of ['start','end']){const h=n('span','pt-trim-v0717 '+edge);h.dataset.edge=edge;h.title=edge==='start'?'Trim source in':'Trim source out';tile.append(h);}
  tile.addEventListener('pointerdown',e=>start(e,c,tile));tile.addEventListener('pointermove',move);tile.addEventListener('pointerup',e=>{if(gesture?.pointer===e.pointerId){stop(e);release();}});for(const ev of ['pointercancel','lostpointercapture'])tile.addEventListener(ev,()=>{if(gesture?.tile===tile)release(true);});
  tile.addEventListener('click',e=>{e.stopPropagation();choose(c.id);});tile.addEventListener('dblclick',e=>{stop(e);openClip(c.id);});
  tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){stop(e);openClip(c.id);return;}if(e.ctrlKey||e.metaKey||committing||!current().ready||!unlocked(c,m))return;
   if(['ArrowLeft','ArrowRight','Delete','Backspace'].includes(e.key)){stop(e);try{const next=e.key==='Delete'||e.key==='Backspace'?null:P.transform(c,'move',(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:1/30),m,B.registry.get(c.assetId),V.outputDuration());void commit(c.id,next,current().stamp);}catch(err){V.message(err.message);}}
  });return tile;
 }
 function refresh(){if(gesture||committing)return;const m=V.multitrack(),length=V.outputDuration(),stamp=JSON.stringify([m,length]);if(signature===stamp)return;signature=stamp;
  visual.replaceChildren();audio.replaceChildren();visual.hidden=!m.clips.some(c=>c.track!=='A2');audio.hidden=!m.clips.some(c=>c.track==='A2');if(!length)return;
  for(const t of tracks){if(t==='A2'&&audio.hidden||t!=='A2'&&visual.hidden)continue;const ts=m.tracks[t],rail=n('div','pt-rail-v0717'+(ts.locked?' is-locked':''));rail.id='pt-rail-'+t;rail.dataset.track=t;
   const tag=n('span','pt-track-name-v0717',t+(ts.locked?' · LOCK':'')+(t==='A2'?ts.muted?' · MUTED':'':ts.visible?'':' · HIDDEN'));tag.setAttribute('aria-hidden','true');rail.append(tag);
   for(const c of m.clips.filter(x=>x.track===t))rail.append(tileFor(c,m,length));
   (t==='A2'?audio:visual).append(rail);
  }
 }
 function attachKeys(chip,layer){
  if(!layer.keyframes?.length)return;const lane=n('div','pt-key-lane-v0717');lane.setAttribute('aria-label','Graphic animation keyframes');chip.append(lane);
  for(const [index,k] of layer.keyframes.entries()){
   const mark=n('button','pt-key-marker-v0717');mark.type='button';mark.style.left=(100*k.t)+'%';mark.dataset.keyIndex=String(index);mark.title='Keyframe '+(index+1)+' · '+fmt(layer.start+(layer.end-layer.start)*k.t)+' · drag to retime, Enter to edit';mark.setAttribute('aria-label',mark.title);lane.append(mark);
   let down=null;
   mark.addEventListener('pointerdown',e=>{stop(e);if(layer.locked||!current().ready)return;down={id:e.pointerId,x:e.clientX,stamp:current().stamp,value:k.t,moved:false};keyCancel=cancel;mark.setPointerCapture?.(e.pointerId);});
   mark.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id)return;stop(e);if(Math.abs(e.clientX-down.x)<2&&!down.moved)return;down.moved=true;const px=Math.max(1,lane.getBoundingClientRect().width);let t=k.t+(e.clientX-down.x)/Math.max(1,px);
    if(snapOn(e)){const play=(V.sequencePosition()-layer.start)/(layer.end-layer.start);if(Math.abs(t-play)*px<=8)t=play;}
    try{down.value=P.keyTime(layer.keyframes,index,t)[index].t;mark.style.left=(100*down.value)+'%';}catch{}
   });
   const cancel=()=>{const g=down;down=null;if(keyCancel===cancel)keyCancel=null;mark.style.left=(100*k.t)+'%';try{if(g&&mark.hasPointerCapture?.(g.id))mark.releasePointerCapture(g.id);}catch{}};
   mark.addEventListener('pointercancel',cancel);mark.addEventListener('lostpointercapture',cancel);
   mark.addEventListener('pointerup',e=>{stop(e);const g=down;down=null;if(keyCancel===cancel)keyCancel=null;if(!g)return;if(!g.moved){V.selectLayer(layer.id,true);V.seekOutput(layer.start+(layer.end-layer.start)*k.t);return;}try{V.commitGraphicKeyTime(layer.id,index,g.value,g.stamp);}catch(err){mark.style.left=(100*k.t)+'%';V.message(err.message);}});
   mark.addEventListener('click',e=>e.stopPropagation());mark.addEventListener('dblclick',e=>{stop(e);if(!root.MangoMotionStudioV0750?.openAtKeyframe(layer.id,k.t))root.MangoCompositorUIV0714?.openAtKeyframe(layer.id,k.t);});
   mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){stop(e);if(!root.MangoMotionStudioV0750?.openAtKeyframe(layer.id,k.t))root.MangoCompositorUIV0714?.openAtKeyframe(layer.id,k.t);return;}if(['ArrowLeft','ArrowRight'].includes(e.key)&&!layer.locked){stop(e);try{V.commitGraphicKeyTime(layer.id,index,k.t+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:1/30)/(layer.end-layer.start),current().stamp);}catch(err){V.message(err.message);}}});
  }
 }
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&(gesture||keyCancel)){stop(e);e.stopImmediatePropagation();release(true);keyCancel?.();}},true);
 root.addEventListener('blur',()=>{release(true);keyCancel?.();});
 root.MangoProfessionalTimelineUIV0717=Object.freeze({refresh,attachKeys});refresh();root.MangoLayerUI?.render?.();
})(typeof globalThis!=='undefined'?globalThis:this);
