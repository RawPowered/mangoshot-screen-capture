/* MangoShot capture coordinator. Capture occurs on the currently selected source
   tab; completed frames are stored locally BEFORE opening Image Studio. */
if(typeof importScripts==='function'&&typeof globalThis.MangoCaptureStore==='undefined')
  importScripts('capture-store.js');
const api=globalThis.chrome??globalThis.browser;
const sessions=new Map();
const exec=(fn,...args)=>new Promise((resolve,reject)=>{
  try{fn(...args,value=>{const error=api.runtime.lastError;
    error?reject(new Error(error.message)):resolve(value);});}
  catch(error){reject(error);}
});
const reply=(work,sendResponse)=>{
  work.then(value=>sendResponse({ok:true,...(value||{})}))
      .catch(error=>sendResponse({ok:false,error:error.message}));
  return true;
};
const fromPopup=sender=>sender.id===api.runtime.id&&
  sender.url?.startsWith(api.runtime.getURL('popup.html'));
const validSource=(sender,entry)=>!!entry&&sender.tab?.id===entry.source;
function editorURL(id,error){
  const params=new URLSearchParams();params.set('stored',id);
  if(error)params.set('capture_error',String(error).slice(0,400));
  return api.runtime.getURL('editor.html')+'?'+params.toString();
}
function resultURL(id,error){
 const params=new URLSearchParams();params.set('stored',id);
 if(error)params.set('capture_error',String(error).slice(0,400));
 return api.runtime.getURL('capture-result.html')+'?'+params.toString();
}
async function complete(entry,error){
  if(sessions.get(entry.source)!==entry)return;
  sessions.delete(entry.source);
  if(!error){
    if(!entry.meta||entry.frames.length!==entry.meta.frames||
       entry.frames.some((f,i)=>!f||f.index!==i))
      error='Capture ended before all screenshot frames arrived.';
    else{
      try{await globalThis.MangoCaptureStore.save(entry.id,entry.meta,entry.frames);}
      catch(e){error='Could not save screenshot locally: '+e.message;}
    }
  }
  await exec(api.tabs.create.bind(api.tabs),{url:entry.intent==='copy'?resultURL(entry.id,error):editorURL(entry.id,error),active:true});
}
api.runtime.onMessage.addListener((message,sender,respond)=>{
  if(!message||typeof message.type!=='string')return;
  if(message.type==='MANGO_POPUP_INIT'){
    // Reply synchronously: startup must not depend on a transient MV3 async port.
    // The trusted popup supplies the tab it just queried under the activeTab gesture.
    if(!fromPopup(sender))respond({ok:false,error:'Start capture with the MangoShot toolbar.'});
    else if(!['full','area'].includes(message.mode)||!globalThis.MangoCaptureStore.valid(message.captureId)||
       !Number.isInteger(message.source)||message.source<1||
       !Number.isInteger(message.windowId)||message.windowId<0||
       (message.intent!=null&&!['copy','edit'].includes(message.intent)))
      respond({ok:false,error:'Invalid capture session.'});
    else if(sessions.has(message.source)){
      const existing=sessions.get(message.source);
      // Retrying an uncertain INIT response must never create a second session.
      respond(existing.id===message.captureId?{ok:true,captureId:existing.id}:
        {ok:false,error:'A screenshot is already running on this tab.'});
    }
    else{
      sessions.set(message.source,{id:message.captureId,source:message.source,windowId:message.windowId,
        mode:message.mode,intent:message.intent==='copy'?'copy':'edit',
        started:Date.now(),nextIndex:0,meta:null,frames:[],lastFrame:0});
      respond({ok:true,captureId:message.captureId});
    }
    return false;
  }
  if(message.type==='MANGO_POPUP_ABORT')return reply((async()=>{
    if(!fromPopup(sender))throw new Error('Unauthorized capture cancellation.');
    const entry=sessions.get(message.source);
    if(entry&&entry.id===message.captureId) sessions.delete(entry.source);
  })(),respond);
  if(message.type==='MANGO_SETUP'){
    const entry=sessions.get(sender.tab?.id);
    respond(validSource(sender,entry)?{ok:true,captureId:entry.id,mode:entry.mode||'full'}:
      {ok:false,error:'Capture session expired. Try starting again from the toolbar.'});
    return false;
  }
  if(message.type==='MANGO_SOURCE_START'){
    const entry=sessions.get(sender.tab?.id),m=message.meta;
    if(!validSource(sender,entry)||entry.id!==message.captureId)
      respond({ok:false,error:'Capture session expired. Restart from the MangoShot toolbar.'});
    else if(Date.now()-entry.started>180000)
      respond({ok:false,error:'Screenshot capture timed out. Start again.'});
    else if(entry.mode==='area'||entry.meta||!m||!Number.isFinite(m.width)||!Number.isFinite(m.height)||
        !Number.isFinite(m.dpr)||m.dpr<=0||!Number.isInteger(m.frames)||
        m.width<1||m.height<1||m.frames<1||m.frames>40||
        !Number.isFinite(m.pageHeight)||m.pageHeight<1||m.pageHeight>30000||m.width*m.pageHeight*m.dpr*m.dpr>48000000)
      respond({ok:false,error:'Screenshot dimensions exceed the supported limit.'});
    else {entry.meta=m;respond({ok:true,frames:m.frames});}
    return false;
  }
  if(message.type==='MANGO_AREA_CANCEL'){
    const entry=sessions.get(sender.tab?.id);
    if(validSource(sender,entry)&&entry.id===message.captureId&&entry.mode==='area'){
      sessions.delete(entry.source);respond({ok:true});
    }else respond({ok:false,error:'Selection capture session expired.'});
    return false;
  }
  if(message.type==='MANGO_AREA_COMMIT')return reply((async()=>{
    const entry=sessions.get(sender.tab?.id),r=message.rect,v=message.viewport;
    if(!validSource(sender,entry)||entry.id!==message.captureId||entry.mode!=='area'||entry.meta)
      throw Error('Selection session expired or was already completed.');
    if(Date.now()-entry.started>120000)throw Error('Area selection timed out.');
    if(!r||!v||[r.x,r.y,r.width,r.height,v.width,v.height,v.dpr].some(x=>!Number.isFinite(x))||
      v.width<1||v.height<1||v.dpr<=0||v.width>16000||v.height>16000||
      r.x<0||r.y<0||r.width<6||r.height<6||
      r.x+r.width>v.width+1||r.y+r.height>v.height+1||
      r.width*r.height*v.dpr*v.dpr>48000000)
      throw Error('The selection is invalid or too large.');
    const tab=await exec(api.tabs.get.bind(api.tabs),entry.source);
    if(!tab.active||tab.windowId!==entry.windowId)
      throw Error('Keep the source page active until selection capture completes.');
    const dataUrl=await exec(api.tabs.captureVisibleTab.bind(api.tabs),entry.windowId,{format:'png'});
    if(!globalThis.MangoCaptureStore.png(dataUrl))throw Error('Browser returned an invalid selection screenshot.');
    entry.meta={width:v.width,height:v.height,pageHeight:v.height,dpr:v.dpr,frames:1,full:false,
      selection:{x:r.x,y:r.y,width:r.width,height:r.height}};
    entry.frames=[{index:0,scrollY:0,dataUrl}];entry.nextIndex=1;
    await complete(entry);return {captured:true};
  })(),respond);
  if(['MANGO_SOURCE_FRAME','MANGO_SOURCE_DONE','MANGO_SOURCE_ERROR'].includes(message.type)){
    return reply((async()=>{
      const entry=sessions.get(sender.tab?.id);
      if(!validSource(sender,entry)||entry.id!==message.captureId)
        throw new Error('Capture session expired.');
      if(Date.now()-entry.started>180000){
        await complete(entry,'Screenshot timed out.');
        throw new Error('Screenshot timed out.');
      }

      if(message.type==='MANGO_SOURCE_FRAME'){
        if(!entry.meta||message.index!==entry.nextIndex||message.index>=entry.meta.frames||
          !Number.isFinite(message.scrollY))throw new Error('Invalid screenshot frame order.');
        const delay=Math.max(0,550-(Date.now()-entry.lastFrame));
        if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
        const tab=await exec(api.tabs.get.bind(api.tabs),entry.source);
        if(!tab.active||tab.windowId!==entry.windowId)
          throw new Error('Keep the source webpage active until capture finishes.');
        const dataUrl=await exec(api.tabs.captureVisibleTab.bind(api.tabs),entry.windowId,{format:'png'});
        if(!globalThis.MangoCaptureStore.png(dataUrl))throw new Error('Browser did not return a valid PNG screenshot.');
        entry.frames.push({index:message.index,scrollY:message.scrollY,dataUrl});
        entry.nextIndex++;entry.lastFrame=Date.now();
        return {received:entry.nextIndex};
      }
      if(message.type==='MANGO_SOURCE_ERROR'){
        await complete(entry,message.error||'Screenshot capture failed.');return {};
      }
      if(entry.nextIndex!==entry.meta?.frames)
        throw new Error('Screenshot stopped with missing frames.');
      await complete(entry);return {};
    })(),respond);
  }
});
api.tabs.onRemoved.addListener(tabId=>{
  for(const [source,entry] of sessions) if(source===tabId)sessions.delete(source);
});
