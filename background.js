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
const validSource=(sender,entry)=>entry&&sender.tab?.id===entry.source&&sender.tab?.active;
function editorURL(id,error){
  const params=new URLSearchParams();params.set('stored',id);
  if(error)params.set('capture_error',String(error).slice(0,400));
  return api.runtime.getURL('editor.html')+'?'+params.toString();
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
  await exec(api.tabs.create.bind(api.tabs),{url:editorURL(entry.id,error),active:true});
}
api.runtime.onMessage.addListener((message,sender,respond)=>{
  if(!message||typeof message.type!=='string')return;
  if(message.type==='MANGO_POPUP_INIT')return reply((async()=>{
    if(!fromPopup(sender))throw new Error('Start capture with the MangoShot toolbar.');
    if(message.mode!=='full'||!globalThis.MangoCaptureStore.valid(message.captureId))
      throw new Error('Invalid capture session.');
    const tab=await exec(api.tabs.get.bind(api.tabs),message.source);
    if(!tab?.active||!/^https?:/.test(tab.url||''))
      throw new Error('Open a regular, active webpage to capture.');
    if(sessions.has(tab.id))throw new Error('A screenshot is already running on this tab.');
    sessions.set(tab.id,{id:message.captureId,source:tab.id,windowId:tab.windowId,
      started:Date.now(),nextIndex:0,meta:null,frames:[],lastFrame:0});
  })(),respond);
  if(message.type==='MANGO_POPUP_ABORT')return reply((async()=>{
    if(!fromPopup(sender))throw new Error('Unauthorized capture cancellation.');
    const entry=sessions.get(message.source);
    if(entry&&entry.id===message.captureId) sessions.delete(entry.source);
  })(),respond);
  if(message.type==='MANGO_SETUP'){
    const entry=sessions.get(sender.tab?.id);
    respond(validSource(sender,entry)?{ok:true,captureId:entry.id,mode:'full'}:
      {ok:false,error:'Capture session expired. Try starting again from the toolbar.'});
    return;
  }
  if(['MANGO_SOURCE_START','MANGO_SOURCE_FRAME','MANGO_SOURCE_DONE','MANGO_SOURCE_ERROR'].includes(message.type)){
    return reply((async()=>{
      const entry=sessions.get(sender.tab?.id);
      if(!validSource(sender,entry)||entry.id!==message.captureId)
        throw new Error('Capture session expired.');
      if(Date.now()-entry.started>180000){
        await complete(entry,'Screenshot timed out.');
        throw new Error('Screenshot timed out.');
      }
      if(message.type==='MANGO_SOURCE_START'){
        const m=message.meta;
        if(entry.meta||!m||m.width<1||m.height<1||m.frames<1||m.frames>40||
           m.pageHeight<1||m.pageHeight>30000||m.width*m.pageHeight>48000000)
          throw new Error('Screenshot dimensions exceed the supported limit.');
        entry.meta=m;return {frames:m.frames};
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
