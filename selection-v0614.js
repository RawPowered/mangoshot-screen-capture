/* Drag-to-select screenshot, injected only after the toolbar grants activeTab.
 * The overlay is removed before captureVisibleTab, without modifying page content.
 */
(async()=>{'use strict';
 const api=globalThis.chrome??globalThis.browser;
 if(globalThis.__mangoAreaBusy)return;
 globalThis.__mangoAreaBusy=true;
 const send=value=>new Promise((resolve,reject)=>{
  api.runtime.sendMessage(value,answer=>{
   const e=api.runtime.lastError;
   e?reject(Error(e.message)):resolve(answer);
  });
 });
 let id,host=null,box=null,start=null,done=false,key=null;
 function cleanup(){
  if(key)removeEventListener('keydown',key,true);
  host?.remove();host=null;globalThis.__mangoAreaBusy=false;
 }
 async function cancel(reason){
  if(done)return;done=true;cleanup();
  if(id)await send({type:'MANGO_AREA_CANCEL',captureId:id,reason:String(reason||'cancelled')}).catch(()=>{});
 }
 function rectFor(a,b){
  const x=Math.max(0,Math.min(a.x,b.x)),y=Math.max(0,Math.min(a.y,b.y));
  const right=Math.min(innerWidth,Math.max(a.x,b.x)),bottom=Math.min(innerHeight,Math.max(a.y,b.y));
  return {x,y,width:Math.max(0,right-x),height:Math.max(0,bottom-y)};
 }
 function draw(r){
  box.style.left=r.x+'px';box.style.top=r.y+'px';
  box.style.width=r.width+'px';box.style.height=r.height+'px';box.hidden=false;
 }
 try{
  const setup=await send({type:'MANGO_SETUP'});
  if(!setup?.ok||setup.mode!=='area')throw Error(setup?.error||'Area capture session unavailable.');
  id=setup.captureId;
  host=document.createElement('div');host.id='mango-area-overlay-v0614';
  host.style.cssText='position:fixed;inset:0;z-index:2147483647;user-select:none;touch-action:none;cursor:crosshair;';
  const root=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');
  style.textContent=[
   ':host{all:initial}*{box-sizing:border-box}',
   '.shade{position:fixed;inset:0;background:#09181455;cursor:crosshair;touch-action:none}',
   '.guide{position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:13px;border:1px solid #c7fa97;border-radius:10px;background:#162923ee;color:#f0ffea;padding:11px 14px;box-shadow:0 9px 24px #000b;font:700 12px system-ui;max-width:90vw;pointer-events:auto}',
   'button{color:#eaffdc;border:1px solid #789a78;border-radius:5px;padding:6px 10px;background:#3d5746;cursor:pointer;font:750 11px system-ui}',
   '.rect{position:fixed;pointer-events:none;border:2px solid #bafa70;background:#b2ef5a20;box-shadow:0 0 0 1px #19381e,0 0 0 30000px #00000025}',
   '.rect[hidden]{display:none}'
  ].join('');
  root.appendChild(style);
  const shade=document.createElement('div');shade.className='shade';shade.tabIndex=0;
  shade.setAttribute('aria-label','Drag to select screenshot area. Escape cancels.');
  const guide=document.createElement('div');guide.className='guide';
  const msg=document.createElement('span');msg.textContent='Drag to select an area · Esc to cancel';
  const close=document.createElement('button');close.type='button';close.textContent='Cancel';
  close.addEventListener('click',e=>{e.preventDefault();void cancel('cancelled');});
  guide.append(msg,close);
  box=document.createElement('div');box.className='rect';box.hidden=true;
  root.append(shade,box,guide);
  (document.documentElement||document.body).appendChild(host);
  shade.addEventListener('pointerdown',e=>{
   if(done||e.button!==0)return;
   e.preventDefault();shade.setPointerCapture?.(e.pointerId);
   start={x:Math.max(0,Math.min(innerWidth,e.clientX)),y:Math.max(0,Math.min(innerHeight,e.clientY))};
   draw({x:start.x,y:start.y,width:0,height:0});
  });
  shade.addEventListener('pointermove',e=>{
   if(!start||done)return;e.preventDefault();
   const r=rectFor(start,{x:e.clientX,y:e.clientY});draw(r);
   msg.textContent=Math.round(r.width)+' × '+Math.round(r.height)+' · release to capture';
  });
  shade.addEventListener('pointerup',async e=>{
   if(!start||done)return;
   e.preventDefault();const r=rectFor(start,{x:e.clientX,y:e.clientY});start=null;
   if(r.width<6||r.height<6){box.hidden=true;msg.textContent='Area too small; drag again · Esc to cancel';return;}
   done=true;cleanup();
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   await new Promise(resolve=>setTimeout(resolve,80));
   const answer=await send({type:'MANGO_AREA_COMMIT',captureId:id,rect:r,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}}).catch(()=>null);
   if(!answer?.ok)await send({type:'MANGO_AREA_CANCEL',captureId:id}).catch(()=>{});
  });
  shade.addEventListener('pointercancel',()=>{start=null;box.hidden=true;msg.textContent='Drag to select an area · Esc to cancel';});
  key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();void cancel('cancelled');}};
  addEventListener('keydown',key,true);
  shade.focus?.({preventScroll:true});
 }catch(error){cleanup();if(id)await send({type:'MANGO_AREA_CANCEL',captureId:id}).catch(()=>{});}
})();
