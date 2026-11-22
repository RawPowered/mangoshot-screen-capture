/* Compact professional workspace commands and resizable panels. Preserves legacy controls. */
(function(){
 'use strict';
 if(!document.body?.classList.contains('studio-clip'))return;
 const q=s=>document.querySelector(s),root=document.body;
 function doCommand(target){const el=document.getElementById(target);
  if(!el)return false;
  if(el.tagName==='INPUT'&&el.type==='file'){el.click();return true;}
  if(el.disabled){q('#status').textContent='Load or select appropriate media to use this command.';return false;}
  el.click();return true;
 }
 for(const button of document.querySelectorAll('[data-command]'))button.addEventListener('click',event=>{
  const target=button.dataset.command;if(doCommand(target)){
   const menu=button.closest('details');if(menu)menu.open=false;
  }
 });
 for(const button of document.querySelectorAll('[data-v06-tool]'))button.addEventListener('click',()=>{
  const target=button.dataset.v06Tool;if(doCommand(target)){
   for(const tool of document.querySelectorAll('[data-v06-tool]'))tool.setAttribute('aria-pressed',String(tool===button));
  }
 });
 for(const side of ['left','right']){
  const handle=q(`[data-resizer="${side}"]`);if(!handle)continue;
  let active=null;
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;
   event.preventDefault();active={x:event.clientX,start:Number(getComputedStyle(root).getPropertyValue(side==='left'?'--v06-bin-width':'--v06-properties-width').replace('px',''))||(side==='left'?240:280)};
   handle.setPointerCapture?.(event.pointerId);
  });
  handle.addEventListener('pointermove',event=>{if(!active)return;
   const diff=(event.clientX-active.x)*(side==='left'?1:-1);
   const value=Math.max(185,Math.min(420,active.start+diff));
   root.style.setProperty(side==='left'?'--v06-bin-width':'--v06-properties-width',value+'px');
  });
  const stop=()=>{active=null;};for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,stop);
 }
 for(const button of document.querySelectorAll('[data-panel-toggle]'))button.addEventListener('click',()=>{
  const pane=document.querySelector(button.dataset.panelToggle);if(!pane)return;
  const hidden=pane.classList.toggle('v06-collapsed');button.setAttribute('aria-pressed',String(!hidden));
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')for(const menu of document.querySelectorAll('.v06-menu[open]'))menu.open=false;
 },true);
})();
