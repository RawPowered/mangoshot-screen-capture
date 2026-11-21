/* MangoShot: user-initiated, in-memory capture coordination. */
const api = globalThis.chrome ?? globalThis.browser;
const sessions = new Map();
const exec = (fn, ...args) => new Promise((resolve, reject) => {
  try { fn(...args, value => {
    const error = api.runtime.lastError;
    error ? reject(new Error(error.message)) : resolve(value);
  }); } catch (error) { reject(error); }
});
const reply = (promise, sendResponse) => {
  promise.then(value => sendResponse({ok:true, ...value})).catch(error => sendResponse({ok:false,error:error.message}));
  return true;
};
const isEditor = sender => sender.id === api.runtime.id &&
  sender.url?.startsWith(api.runtime.getURL('editor.html')) && Number.isInteger(sender.tab?.id);
const isSource = (sender, entry) => entry && sender.tab?.id === entry.source && sender.tab?.active;
const forward = async (entry, message) => {
  // An editor page, not the service worker, owns the screenshot bytes.
  const response = await exec(api.runtime.sendMessage.bind(api.runtime), { ...message, captureId: entry.id });
  if (!response?.ok) throw new Error(response?.error || 'The screenshot editor is unavailable.');
  return response;
};
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return;
  if (message.type === 'MANGO_INIT') return reply((async () => {
    if (!isEditor(sender)) throw new Error('Capture must be started from the MangoShot editor.');
    if (!['visible','full'].includes(message.mode) || typeof message.captureId !== 'string')
      throw new Error('Invalid capture request.');
    const tab = await exec(api.tabs.get.bind(api.tabs), message.source);
    if (!tab.active || !/^https?:/.test(tab.url || '')) throw new Error('Select a regular, active webpage.');
    if (sessions.has(tab.id)) throw new Error('This tab already has a capture in progress.');
    sessions.set(tab.id, {id:message.captureId,source:tab.id,editor:sender.tab.id,
      mode:message.mode,windowId:tab.windowId,lastFrame:0,started:Date.now(),nextIndex:0,frames:0,captureStarted:false});
    return {};
  })(),sendResponse);
  if (message.type === 'MANGO_SETUP') {
    const entry = sessions.get(sender.tab?.id);
    sendResponse(isSource(sender,entry) ? {ok:true,captureId:entry.id,mode:entry.mode} :
      {ok:false,error:'No authorized capture for this tab.'});
    return;
  }
  if (['MANGO_SOURCE_START','MANGO_SOURCE_FRAME','MANGO_SOURCE_DONE','MANGO_SOURCE_ERROR'].includes(message.type)) {
    return reply((async () => {
      const entry = sessions.get(sender.tab?.id);
      if (!isSource(sender,entry) || entry.id !== message.captureId) throw new Error('Capture authorization expired.');
      if (Date.now()-entry.started>180000) throw new Error('Capture timed out.');
      if (message.type === 'MANGO_SOURCE_START') {
        const m = message.meta;
        if (!m || m.width<1 || m.height<1 || m.frames<1 || m.frames>40 ||
          m.pageHeight<1 || m.pageHeight>30000 || m.width*m.pageHeight>48000000)
          throw new Error('Page exceeds safe screenshot limits.');
        if(entry.captureStarted) throw new Error('Capture was already started.');
        entry.captureStarted=true;entry.frames=m.frames;
        return forward(entry,{type:'MANGO_EDITOR_START',meta:m});
      }
      if (message.type === 'MANGO_SOURCE_FRAME') {
        if (!Number.isInteger(message.index) || message.index<0 || message.index>=40 ||
            !Number.isFinite(message.scrollY)) throw new Error('Invalid screenshot frame.');
        if (!entry.captureStarted || message.index!==entry.nextIndex || message.index>=entry.frames)
          throw new Error('Screenshot frame arrived out of order.');
        const delay=Math.max(0,550-(Date.now()-entry.lastFrame));
        if(delay) await new Promise(resolve=>setTimeout(resolve,delay));
        const tab=await exec(api.tabs.get.bind(api.tabs),entry.source);
        if (!tab.active || tab.windowId!==entry.windowId) throw new Error('Keep the captured tab active.');
        const dataUrl=await exec(api.tabs.captureVisibleTab.bind(api.tabs),entry.windowId,{format:'png'});
        entry.lastFrame=Date.now();
        const result=await forward(entry,{type:'MANGO_EDITOR_FRAME',index:message.index,scrollY:message.scrollY,dataUrl});
        entry.nextIndex++;return result;
      }
      if(message.type==='MANGO_SOURCE_DONE' && entry.nextIndex!==entry.frames)
        throw new Error('Capture ended before all frames were delivered.');
      try { return await forward(entry,{type:message.type==='MANGO_SOURCE_DONE'?'MANGO_EDITOR_DONE':'MANGO_EDITOR_ERROR',error:message.error}); }
      finally {sessions.delete(entry.source);}
    })(),sendResponse);
  }
});
api.tabs.onRemoved.addListener(tabId => {
  for(const [source,entry] of sessions) if(source===tabId || entry.editor===tabId) sessions.delete(source);
});
