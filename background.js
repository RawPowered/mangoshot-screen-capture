/* MangoShot background: explicit capture requests, no telemetry. */
const api = globalThis.browser ?? globalThis.chrome;
const asPromise = (fn, ...args) => new Promise((resolve, reject) => {
  try {
    fn(...args, result => {
      const error = globalThis.chrome?.runtime?.lastError;
      if (error) reject(new Error(error.message)); else resolve(result);
    });
  } catch (error) { reject(error); }
});
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "MANGO_CAPTURE_FRAME") return;
  (async () => {
    // Only accept capture requests from a content script in the tab being captured.
    if (!sender.tab?.id || sender.tab.id !== message.tabId || !sender.tab.active)
      throw new Error("Capture source must be the active tab.");
    return await asPromise(api.tabs.captureVisibleTab.bind(api.tabs), sender.tab.windowId, {format:"png"});
  })().then(dataUrl => sendResponse({ok:true,dataUrl})).catch(error => sendResponse({ok:false,error:error.message}));
  return true;
});
