/* Executed only after the user initiates a capture. */
(async () => {
  const api = globalThis.browser ?? globalThis.chrome;
  if (globalThis.__mangoCaptureBusy) return;
  globalThis.__mangoCaptureBusy = true;
  const pause = ms => new Promise(r=>setTimeout(r,ms));
  const send = message => new Promise((resolve,reject)=>{
    api.runtime.sendMessage(message, reply=>{
      const error=globalThis.chrome?.runtime?.lastError;
      if(error)reject(new Error(error.message));else resolve(reply);
    });
  });
  const original={x:scrollX,y:scrollY,behavior:document.documentElement.style.scrollBehavior};
  let captureId;
  try {
    const setup=await send({type:"MANGO_SETUP"});
    if (!setup?.ok) throw new Error(setup?.error??"Capture cancelled");
    captureId=setup.captureId;
    const full=setup.mode==="full";
    const width=window.innerWidth,height=window.innerHeight,dpr=window.devicePixelRatio||1;
    const doc=document.documentElement;
    const pageWidth=Math.max(doc.scrollWidth,document.body?.scrollWidth||0,width);
    const pageHeight=Math.max(doc.scrollHeight,document.body?.scrollHeight||0,height);
    const maxHeight=full?pageHeight:height;
    // Full-page capture is vertical scrolling with a fixed viewport width.
    // Hard bounds prevent unbounded memory use or frozen tabs.
    if(pageWidth>width+2) throw new Error("Horizontal overflow is not supported in this capture mode.");
    if(maxHeight*dpr>30000||width*dpr>16000||Math.ceil(maxHeight/height)>40)
      throw new Error("Page exceeds safe capture limits (30,000 px high / 40 frames).");
    document.documentElement.style.scrollBehavior="auto";
    const positions=full?Array.from({length:Math.ceil(Math.max(0,maxHeight-height)/height)+1},(_,i)=>Math.min(i*height,Math.max(0,maxHeight-height))):[scrollY];
    const unique=[...new Set(positions)];
    await send({type:"MANGO_START",captureId,meta:{width,height,pageHeight:maxHeight,dpr,frames:unique.length,full}});
    for(let i=0;i<unique.length;i++){
      if(full)window.scrollTo(0,unique[i]);
      await pause(260);
      const shot=await send({type:"MANGO_CAPTURE_FRAME",tabId:setup.tabId});
      if(!shot?.ok) throw new Error(shot?.error||"Frame capture failed");
      await send({type:"MANGO_FRAME",captureId,index:i,scrollY:unique[i],dataUrl:shot.dataUrl});
    }
    await send({type:"MANGO_DONE",captureId});
  }catch(error){await send({type:"MANGO_ERROR",captureId,error:error.message}).catch(()=>{});}
  finally {window.scrollTo(original.x,original.y);document.documentElement.style.scrollBehavior=original.behavior;globalThis.__mangoCaptureBusy=false;}
})();
