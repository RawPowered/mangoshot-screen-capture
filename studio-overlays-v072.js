/* Shared editor overlay coordinator. Keep original DOM ownership and listeners.
 * Manual native popovers escape clipping/stacking contexts; a fixed CSS fallback
 * remains available for non-supporting browsers. Native dialogs own modal focus. */
(function(root){'use strict';
 const doc=root.document,core=root.MangoStudioLayoutV072;
 if(!doc?.body||!core||!doc.body.matches('.studio-image,.studio-clip'))return;
 const defs=[
  {host:'.v06-menu',panel:'.v06-menu-pop',trigger:'summary',kind:'menu',mode:'down',width:280},
  {host:'.v070-settings',panel:'.v070-settings-menu',trigger:'summary',kind:'menu',mode:'down',align:'end',width:300},
  {host:'.v066-layout-menu',panel:'.v066-layout-options',trigger:'summary',kind:'menu',mode:'down',align:'end',width:235},
  {host:'.editor-shortcuts',panel:'div',trigger:'summary',kind:'menu',mode:'down',align:'end',width:320},
  {host:'.v071-tool-slot',panel:'.v071-tool-flyout',trigger:'.v071-tool-more',kind:'tool',mode:'right',width:184}
 ];
 let active=null,inline=null,pending=false,contextPoint=null,contextFocus=null;
 const rectPoint=(x,y)=>({left:x,right:x,top:y,bottom:y});
 const viewport=()=>{const v=root.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||doc.documentElement.clientWidth,height:v?.height||doc.documentElement.clientHeight};};
 const modal=()=>!!doc.querySelector('dialog[open]');
 const isOpen=r=>r.panel.isConnected&&(r.kind==='context'||r.kind==='tool'||r.kind==='inline'?!r.panel.hidden:r.host.open);
 const focus=(el)=>{if(el?.isConnected&&el.getClientRects().length)el.focus?.({preventScroll:true});};
 function nativeShow(r){
  if(typeof r.panel.showPopover!=='function')return false;
  const old=doc.activeElement;
  try{
   r.panel.setAttribute('popover','manual');
   r.panel.showPopover();
   if(old!==doc.activeElement&&r.panel.contains(old))focus(old);
   return true;
  }catch{r.panel.removeAttribute('popover');return false;}
 }
 function release(r){
  if(!r)return;
  if(r.native){try{r.panel.hidePopover();}catch{}r.panel.removeAttribute('popover');}
  r.panel.removeAttribute('data-mango-overlay');
  r.panel.removeAttribute('data-mango-side');
  for(const key of ['left','top','width','height'])r.panel.style.removeProperty('--mango-overlay-'+key);
  r.native=false;
 }
 function close(r,restore=false){
  if(!r)return;
  // Use the original flyout close function to retain its remembered tool and ARIA state.
  if(r.kind==='tool'){
   root.MangoToolGroupsV071?.close?.();
   r.panel.hidden=true;r.trigger?.setAttribute('aria-expanded','false');
  }else if(r.kind==='context')r.panel.hidden=true;
  else if(r.kind!=='inline')r.host.open=false;
  release(r);
  if(active?.panel===r.panel)active=null;
  if(restore)focus(r.trigger);
 }
 function candidates(){
  const out=[];
  for(const d of defs)for(const host of doc.querySelectorAll(d.host)){
   const panel=host.querySelector(':scope > '+d.panel),trigger=host.querySelector(':scope > '+d.trigger);
   if(!panel||!trigger)continue;
   const r={...d,host,panel,trigger};
   if(isOpen(r))out.push(r);
  }
  const menu=doc.getElementById('image-context-menu');
  if(menu&&!menu.hidden)out.push({host:menu,panel:menu,trigger:contextFocus,kind:'context',mode:'point',width:265});
  return out;
 }
 function pointFor(r){
  if(r.kind==='context')return contextPoint||rectPoint(parseFloat(r.panel.style.left)||8,parseFloat(r.panel.style.top)||8);
  if(r.kind==='inline'){
   const canvas=doc.getElementById('ink')?.getBoundingClientRect();
   if(!canvas)return null;
   return rectPoint(canvas.left+(parseFloat(r.panel.style.left)||0)*canvas.width/100,
                    canvas.top+(parseFloat(r.panel.style.top)||0)*canvas.height/100);
  }
  if(!r.trigger?.getClientRects().length)return null;
  const a=r.trigger.getBoundingClientRect(),v=viewport();
  if(a.right<=v.left||a.left>=v.left+v.width||a.bottom<=v.top||a.top>=v.top+v.height)return null;
  return a;
 }
 function position(r){
  const a=pointFor(r);if(!a)return false;
  const v=viewport(),p=r.panel;
  // Set width first so wrapping is included in scrollHeight, even if the old
  // max-height is still active. Preserve the original inline left/top values.
  const width=Math.max(1,Math.min(r.width,v.width-16));
  p.style.setProperty('--mango-overlay-width',width+'px');
  const natural=p.scrollHeight+Math.max(0,p.offsetHeight-p.clientHeight);
  const g=core.place(a,{width,height:Math.max(1,natural)},v,r.mode,{align:r.align});
  p.style.setProperty('--mango-overlay-left',g.left+'px');
  p.style.setProperty('--mango-overlay-top',g.top+'px');
  p.style.setProperty('--mango-overlay-height',g.maxHeight+'px');
  p.dataset.mangoSide=g.side;
  return true;
 }
 function mount(r){
  r.panel.dataset.mangoOverlay=r.kind;
  // Initial coordinates before top-layer promotion; recompute after promotion.
  if(!position(r)){release(r);return false;}
  r.native=nativeShow(r);
  if(r.kind==='inline'&&!r.native){release(r);return false;}
  return position(r);
 }
 function sync(){
  pending=false;
  const open=candidates(),prompt=doc.getElementById('text-inline'),blocked=modal();
  // Text drafts are persistent, not transient menus: never cancel an edit
  // because another panel opens. Suspend only its top-layer presentation.
  if(inline&&(blocked||!isOpen(inline))){release(inline);inline=null;}
  if(!blocked&&prompt&&!prompt.hidden){
   if(!inline){
    const r={host:prompt,panel:prompt,kind:'inline',mode:'free',width:340};
    if(mount(r))inline=r;
   }else position(inline);
  }
  if(blocked){for(const r of open)close(active?.panel===r.panel?active:r);if(active){release(active);active=null;}return;}
  if(active&&!isOpen(active)){release(active);active=null;}
  // Last newly opened overlay wins; never allow two transient menus to fight
  // for pointer or keyboard focus.
  const next=open.filter(r=>r.panel!==active?.panel).at(-1);
  if(next){
   if(active)close(active);
   for(const r of open)if(r.panel!==next.panel&&isOpen(r))close(r);
   if(mount(next))active=next;else close(next);
  }else if(active&&!position(active))close(active);
 }
 function schedule(){if(!pending){pending=true;root.requestAnimationFrame(sync);}}
 // Mutation delivery is before paint; only react to visibility changes, not
 // timeline updates or our own geometry styles.
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.target.matches?.('details,.v071-tool-flyout,#image-context-menu,#text-inline,dialog')))sync();
 });
 observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 doc.addEventListener('pointerdown',e=>{
  if(active&&!active.host.contains(e.target))close(active);
 },true);
 doc.addEventListener('contextmenu',e=>{
  contextPoint=rectPoint(e.clientX,e.clientY);contextFocus=doc.activeElement;
  // Original context handler runs after capture, and may reopen an existing menu.
  schedule();
 },true);
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&active&&!modal()){
   e.preventDefault();e.stopPropagation();close(active,true);
  }
 },true);
 for(const event of ['resize','scroll'])root.addEventListener(event,schedule,true);
 for(const event of ['click','input','change','pointerup','wheel','toggle','close'])doc.addEventListener(event,schedule,true);
 root.visualViewport?.addEventListener('resize',schedule);
 root.visualViewport?.addEventListener('scroll',schedule);
 const canvas=doc.getElementById('canvas-wrap');
 if(canvas)new MutationObserver(()=>{if(inline)schedule();}).observe(canvas,{attributes:true,attributeFilter:['style']});
 // Read-only diagnostics for visual QA; this is not an automation/MCP endpoint.
 root.MangoStudioOverlaysV072=Object.freeze({refresh:schedule,state:()=>({active:active?.kind||null,side:active?.panel.dataset.mangoSide||null,native:!!active?.native,inline:!!inline,modal:modal()})});
 sync();
})(typeof globalThis!=='undefined'?globalThis:this);
