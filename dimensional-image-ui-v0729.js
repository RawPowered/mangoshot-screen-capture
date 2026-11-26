(function(root){'use strict';
 const d=root.document,H=root.MangoDimensionalImageV0729,M=root.MangoDimensionalV0729,U=root.MangoMotionCalloutControlsV0729;if(!d?.body.classList.contains('studio-image')||!H||!M||!U)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const btn=(id,t,f)=>{const n=el('button','ci-action-v0720',t);n.id=id;n.type='button';n.onclick=f;return n;};
 const modal=el('dialog','mc-dialog-v0729');modal.id='mc-image-dialog';modal.setAttribute('aria-label','3D Callout Studio');
 const head=el('header'),body=el('div','mc-body-v0729'),foot=el('footer'),status=el('span','mc-note-v0729');status.setAttribute('role','status');
 let session=null,control=null,focus=null,editId=null;
 const apply=btn('mc-image-apply','Insert shape',()=>{try{H.apply(control.value(),session.stamp,editId);modal.close();}catch(e){status.textContent=e.message;}});
 head.append(el('strong','','3D CALLOUT STUDIO'),btn('mc-image-close','Close ×',()=>modal.close()));foot.append(status,apply);modal.append(head,body,foot);d.body.append(modal);
 function open(){const s=H.state();if(!s.ready||d.querySelector('dialog[open]'))return false;session=s;editId=s.selected?.id||null;focus=d.activeElement;body.replaceChildren();status.textContent=editId?'Editable shape layer · draft only':'Create a new editable shape layer';apply.textContent=editId?'Apply geometry':'Insert shape';
  if(editId)body.append(btn('mc-image-new','Create another shape instead',()=>{editId=null;body.replaceChildren();control=U.shapeEditor(body,M.defaults(),{prefix:'mc-image'});apply.textContent='Insert shape';}));
  control=U.shapeEditor(body,s.selected?.value||M.defaults(),{prefix:'mc-image'});modal.showModal();return true;
 }
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);modal.addEventListener('close',()=>{session=null;focus?.focus?.();focus=null;});
 const launch=btn('mc-image-open','3D Callouts…',open);(d.querySelector('.ci-studios-v0720')||d.querySelector('.v070-quick-actions'))?.append(launch);
 let queued=false;function refresh(){launch.disabled=!H.state().ready;}function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}for(const k of ['click','input','change','pointerup'])d.addEventListener(k,queue,true);const n=d.getElementById('status');if(n)new MutationObserver(queue).observe(n,{childList:true});refresh();
 root.MangoDimensionalImageUIV0729=Object.freeze({open,refresh});
})(typeof globalThis!=='undefined'?globalThis:this);
