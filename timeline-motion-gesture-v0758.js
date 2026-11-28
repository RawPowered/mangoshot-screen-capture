/* Shared draft-only pointer and keyboard timing gestures for camera and cursor lanes. */
(function(root){'use strict';
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let activeCancel=null;
 function bind(button,options){
  const {view,lane,initial,total,limits,commit,activate}=options;let gesture=null,suppress=false;
  const position=()=>{const [a,b]=limits();return finite(a)&&finite(b)&&a<=b?[a,b]:null;};
  function show(value){button.style.left=(100*value/total)+'%';}
  function cancel(){const g=gesture;gesture=null;if(activeCancel===cancel)activeCancel=null;show(initial);if(g){suppress=g.moved;try{if(button.hasPointerCapture?.(g.id))button.releasePointerCapture(g.id);}catch{}}}
  function perform(value,stamp){try{if(Math.abs(value-initial)<1e-8){show(initial);return false;}const changed=commit(value,stamp);if(!changed)show(initial);return changed;}catch(e){show(initial);view.message(e.message);return false;}}
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();suppress=false;const s=view.automationCapture(),bounds=position();if(!s.ready||!bounds){return;}activeCancel?.();gesture={id:e.pointerId,x:e.clientX,stamp:s.stamp,value:initial,moved:false,bounds};activeCancel=cancel;try{button.setPointerCapture(e.pointerId);}catch{cancel();}});
  button.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x;if(Math.abs(dx)<3&&!g.moved)return;e.preventDefault();e.stopPropagation();g.moved=true;let value=initial+dx/Math.max(1,lane.getBoundingClientRect().width)*total;if(!e.altKey){const frame=Math.round(value*30)/30,play=view.sequencePosition();value=finite(play)&&Math.abs(play-value)/total*lane.getBoundingClientRect().width<=7?play:frame;}g.value=clamp(value,...g.bounds);show(g.value);});
  button.addEventListener('pointerup',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;e.stopPropagation();gesture=null;if(activeCancel===cancel)activeCancel=null;suppress=g.moved;if(g.moved){e.preventDefault();perform(g.value,g.stamp);}});
  for(const type of ['pointercancel','lostpointercapture'])button.addEventListener(type,cancel);
  button.addEventListener('click',e=>{e.stopPropagation();if(suppress){e.preventDefault();suppress=false;return;}activate?.();});
  button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey)return;e.preventDefault();e.stopPropagation();const s=view.automationCapture(),bounds=position();if(!s.ready||!bounds){view.message('Pause playback or use the inspector to edit this timing.');return;}perform(clamp(initial+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:1/30),...bounds),s.stamp);});
 }
 root.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&activeCancel){e.preventDefault();e.stopImmediatePropagation();activeCancel();}},true);
 root.addEventListener?.('blur',()=>activeCancel?.());
 root.MangoTimelineMotionGestureV0758=Object.freeze({bind});
})(globalThis);
