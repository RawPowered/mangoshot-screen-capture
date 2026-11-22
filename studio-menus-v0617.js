/* MangoShot 0.6.17 — accessible application menus for both editors.
 * Native <details>/<button> interactions; no custom browser-chrome hotkeys.
 */
(function(root){'use strict';
 const menuBar=document.querySelector?.('.v06-menu-bar');
 if(!menuBar)return;
 const menus=()=>[...menuBar.querySelectorAll?.('.v06-menu')||[]];
 const items=menu=>[...menu?.querySelectorAll?.('.v06-menu-pop button:not(:disabled),.v06-menu-pop summary')||[]];
 function closeAll(except=null){
  for(const menu of menus())if(menu!==except)menu.open=false;
 }
 function focusMenu(menu,index=0){
  if(!menu)return;
  closeAll(menu);menu.open=true;
  const list=items(menu);list[Math.max(0,Math.min(list.length-1,index))]?.focus?.();
 }
 for(const menu of menus()){
  const summary=menu.querySelector?.(':scope > summary');
  if(!summary)continue;
  summary.setAttribute('aria-haspopup','true');
  summary.addEventListener('click',()=>{if(!menu.open)closeAll(menu);});
  menu.addEventListener('toggle',()=>{if(menu.open)closeAll(menu);});
  summary.addEventListener('keydown',event=>{
   const all=menus(),i=all.indexOf(menu);
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();focusMenu(menu,event.key==='ArrowDown'?0:Math.max(0,items(menu).length-1));
   }else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
    event.preventDefault();const next=all[(i+(event.key==='ArrowRight'?1:-1)+all.length)%all.length];
    closeAll(next);next.open=true;next.querySelector(':scope > summary')?.focus?.();
   }else if(event.key==='Escape'&&menu.open){event.preventDefault();menu.open=false;}
  });
  menu.querySelector?.('.v06-menu-pop')?.addEventListener?.('keydown',event=>{
   const list=items(menu),i=list.indexOf(document.activeElement);
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();list[(i+(event.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus?.();
   }else if(event.key==='Home'||event.key==='End'){
    event.preventDefault();list[event.key==='Home'?0:list.length-1]?.focus?.();
   }else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
    event.preventDefault();const all=menus(),index=all.indexOf(menu);
    const next=all[(index+(event.key==='ArrowRight'?1:-1)+all.length)%all.length];
    focusMenu(next,0);
   }else if(event.key==='Escape'){
    event.preventDefault();menu.open=false;summary.focus?.();
   }
  });
 }
 menuBar.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-studio-action]');
  if(!button)return;
  const id=button.dataset.studioAction;
  if(!id)return;
  const ok=root.MangoShortcutsV0617?.act?.(id);
  if(!ok){
   const status=document.getElementById?.('status');
   if(status)status.textContent='That command is unavailable. Load media or select a compatible layer.';
  }
  closeAll();
 });
 menuBar.addEventListener('click',event=>{
  const item=event.target?.closest?.('button[data-command]');
  if(item)closeAll();
 });
 document.addEventListener?.('pointerdown',event=>{
  if(!event.target?.closest?.('.v06-menu-bar'))closeAll();
 },true);
 root.addEventListener?.('blur',()=>closeAll());
 document.addEventListener?.('keydown',event=>{
  if(event.key==='Escape'&&!document.querySelector?.('dialog[open]')&&menus().some(x=>x.open)){
   closeAll();event.preventDefault?.();
  }
 },true);
 function refresh(keys){
  for(const el of menuBar.querySelectorAll?.('[data-key-for]')||[]){
   const id=el.dataset.keyFor,value=keys?.[id]||'';
   el.textContent=root.MangoShortcutCoreV0617?.display?.(value)||value||'—';
  }
 }
 root.MangoStudioMenusV0617={closeAll,focusMenu,refresh};
 refresh(root.MangoShortcutsV0617?.keys?.());
})(typeof globalThis!=='undefined'?globalThis:this);
