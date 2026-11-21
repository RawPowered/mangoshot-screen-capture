/* Explicit, local-only capture coordination. No persistent image storage. */
const api=globalThis.chrome??globalThis.browser;
const sessions=new Map();
const asPromise=(fn,...args)=>new Promise((resolve,reject)=>{
 try{fn(...args,result=>{const error=globalThis.chrome?.runtime?.lastError;if(error)reject(new Error(error.message));else resolve(result);});}
 catch(error){reject(error);}
});
api.runtime.onMessage.addListener((message,sender,sendResponse)=>{
 if(message?.type==="MANGO_INIT"){
  (async()=>{
   if(sender.id!==api.runtime.id||!sender.url?.startsWith(api.runtime.getURL("editor.html")))throw new Error("Only the MangoShot editor may initialize capture.");
   const tab=await asPromise(api.tabs.get.bind(api.tabs),message.source);
   if(!tab?.active||!/^https?:/.test(tab.url??""))throw new Error("Source is not an active webpage.");
   sessions.set(tab.id,{id:message.captureId,mode:message.mode,windowId:tab.windowId});
   return {ok:true};
  })().then(sendResponse).catch(e=>sendResponse({ok:false,error:e.message}));
  return true;
 }
 if(message?.type==="MANGO_SETUP"){
  const entry=sender.tab && sessions.get(sender.tab.id);
  sendResponse(entry?{ok:true,captureId:entry.id,mode:entry.mode,tabId:sender.tab.id}:{ok:false,error:"No authorized capture session."});
  return;
 }
 if(message?.type==="MANGO_CAPTURE_FRAME"){
  (async()=>{
   const entry=sender.tab&&sessions.get(sender.tab.id);
   if(!entry||sender.tab.id!==message.tabId||!sender.tab.active)throw new Error("Source tab is no longer active.");
   const dataUrl=await asPromise(api.tabs.captureVisibleTab.bind(api.tabs),entry.windowId,{format:"png"});
   return {ok:true,dataUrl};
  })().then(sendResponse).catch(e=>sendResponse({ok:false,error:e.message}));
  return true;
 }
 if(message?.type==="MANGO_DONE"||message?.type==="MANGO_ERROR"){
   if(sender.tab?.id&&sessions.get(sender.tab.id)?.id===message.captureId)sessions.delete(sender.tab.id);
 }
});
