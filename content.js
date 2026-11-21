/* Only injected after MangoShot's toolbar action grants activeTab. */
(async () => {
  const api=globalThis.chrome ?? globalThis.browser;
  if(globalThis.__mangoCaptureBusy) return;
  globalThis.__mangoCaptureBusy=true;
  const send=message=>new Promise((resolve,reject)=>api.runtime.sendMessage(message,answer=>{
    const error=api.runtime.lastError;
    error?reject(new Error(error.message)):resolve(answer);
  }));
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const root=document.documentElement;
  const old={x:scrollX,y:scrollY,behavior:root.style.scrollBehavior};
  let captureId,modified=[],style;
  try {
    const setup=await send({type:'MANGO_SETUP'});
    if(!setup?.ok) throw new Error(setup?.error || 'No capture session.');
    captureId=setup.captureId;
    const full=setup.mode==='full';
    const width=innerWidth,height=innerHeight,dpr=devicePixelRatio||1;
    if(width<1||height<1) throw new Error('Page is not visible.');
    const pageHeight=full?Math.max(root.scrollHeight,document.body?.scrollHeight||0,height):height;
    if(Math.max(root.scrollWidth,document.body?.scrollWidth||0,width)>width+2)
      throw new Error('This page has horizontal scrolling; use visible capture for now.');
    if(pageHeight*dpr>30000||width*dpr>16000||width*dpr*pageHeight*dpr>48000000)
      throw new Error('Page is too large for safe capture (48 megapixels maximum).');
    const maxScroll=Math.max(0,pageHeight-height);
    const ys=full?[...new Set(Array.from({length:Math.ceil(maxScroll/height)+1},(_,i)=>Math.min(maxScroll,i*height)))]:[scrollY];
    if(ys.length>40) throw new Error('Page is too long (40 captured frames maximum).');
    const meta={width,height,pageHeight,dpr,frames:ys.length,full};
    let answer=await send({type:'MANGO_SOURCE_START',captureId,meta});
    if(!answer?.ok) throw new Error(answer?.error || 'Cannot prepare editor.');
    if(full){
      root.style.scrollBehavior='auto';
      style=document.createElement('style');
      style.textContent='*,*::before,*::after{scroll-behavior:auto!important;animation-play-state:paused!important;caret-color:transparent!important}';
      (document.head||root).appendChild(style);
    }
    for(let i=0;i<ys.length;i++){
      if(full) window.scrollTo(0,ys[i]);
      await pause(full?190:55);
      if(full && i===1){
        // Preserve document flow, but hide fixed or sticky duplicate headers in later frames.
        for(const element of document.querySelectorAll('body *')){
          if(modified.length>=150)break;
          const position=getComputedStyle(element).position;
          if(position==='fixed'||position==='sticky'){
            modified.push([element,element.style.visibility]);
            element.style.visibility='hidden';
          }
        }
      }
      answer=await send({type:'MANGO_SOURCE_FRAME',captureId,index:i,scrollY:full?scrollY:0});
      if(!answer?.ok)throw new Error(answer?.error || 'Screenshot frame failed.');
    }
    const completed=await send({type:'MANGO_SOURCE_DONE',captureId});
    if(!completed?.ok)throw new Error(completed?.error||'Editor could not finish capture.');
  }catch(error){
    if(captureId) await send({type:'MANGO_SOURCE_ERROR',captureId,error:error.message}).catch(()=>{});
  }finally{
    for(const [element,value] of modified)element.style.visibility=value;
    style?.remove();root.style.scrollBehavior=old.behavior;window.scrollTo(old.x,old.y);
    globalThis.__mangoCaptureBusy=false;
  }
})();
