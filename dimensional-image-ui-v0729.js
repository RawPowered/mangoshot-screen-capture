(function(root){'use strict';
 const d=root.document,H=root.MangoDimensionalImageV0729,M=root.MangoDimensionalV0729,U=root.MangoMotionCalloutControlsV0729;if(!d?.body.classList.contains('studio-image')||!H||!M||!U)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const btn=(id,t,f)=>{const n=el('button','ci-action-v0720',t);n.id=id;n.type='button';n.onclick=f;return n;};
 const modal=el('dialog','mc-dialog-v0729');modal.id='mc-image-dialog';modal.setAttribute('aria-label','3D Callout Studio');
 const head=el('header'),body=el('div','mc-body-v0729'),foot=el('footer'),status=el('span','mc-note-v0729');status.setAttribute('role','status');
 let session=null,control=null,focus=null,editId=null;
 const apply=btn('mc-image-apply','Insert shape',()=>{try{H.apply(control.value(),session.stamp,editId);modal.close();}catch(e){status.textContent=e.message;}});
 const heading=el('strong','','CALLOUT STUDIO');head.append(heading,btn('mc-image-close','Close ×',()=>modal.close()));foot.append(status,apply);modal.append(head,body,foot);d.body.append(modal);
 function open(spatial=false){const s=H.state();if(!s.ready||d.querySelector('dialog[open]'))return false;
  if(spatial||s.selected?.value.mode==='spatial'){spatial=true;try{root.MangoSpatialRendererV0730.requireRenderer();}catch(e){root.alert(e.message);return false;}}
  session=s;editId=s.selected&&(spatial===(s.selected.value.mode==='spatial'))?s.selected.id:null;focus=d.activeElement;body.replaceChildren();heading.textContent=spatial?'SPATIAL 3D ARROW STUDIO':'LEGACY EXTRUDED CALLOUT';status.textContent=editId?'Editable shape layer · draft only':'Create a new editable shape layer';apply.textContent=editId?'Apply geometry':'Insert shape';
  const build=(initial)=>{let opts={prefix:'mc-image'};if(spatial){const r=H.reference(editId);opts={prefix:'sa-image',reference:r.canvas,aspect:r.aspect};}control=U.shapeEditor(body,initial,opts);};
  const fresh=()=>spatial?root.MangoSpatialArrowV0730.defaults():M.defaults();
  if(editId)body.append(btn('mc-image-new','Create another shape instead',()=>{editId=null;body.replaceChildren();build(fresh());apply.textContent='Insert shape';}));
  build(editId?s.selected.value:fresh());modal.showModal();return true;
 }
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);modal.addEventListener('close',()=>{session=null;focus?.focus?.();focus=null;});
 const launch=btn('mc-image-open','Legacy extrusions…',()=>open(false)),spatialLaunch=btn('sa-image-open','Spatial 3D arrow…',()=>open(true));(d.querySelector('.ci-studios-v0720')||d.querySelector('.v070-quick-actions'))?.append(spatialLaunch,launch);
 let queued=false;function refresh(){launch.disabled=spatialLaunch.disabled=!H.state().ready;}function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}for(const k of ['click','input','change','pointerup'])d.addEventListener(k,queue,true);const n=d.getElementById('status');if(n)new MutationObserver(queue).observe(n,{childList:true});refresh();
 root.MangoDimensionalImageUIV0729=Object.freeze({open,refresh});
})(typeof globalThis!=='undefined'?globalThis:this);
