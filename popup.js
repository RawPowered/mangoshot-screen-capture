const api = globalThis.browser ?? globalThis.chrome;
const status = document.querySelector("#status");
const call = (fn,...args) => new Promise((resolve,reject) => { try { fn(...args,result=>{const err=globalThis.chrome?.runtime?.lastError;if(err)reject(new Error(err.message));else resolve(result);}); } catch(e){reject(e);} });
async function capture(mode) {
  status.textContent = "Preparing capture…";
  try {
    const [tab] = await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
    if (!tab?.id || !/^https?:/.test(tab.url ?? "")) throw new Error("Open a regular http(s) webpage to capture.");
    // Load receiver in background; leave the source tab active for captureVisibleTab.
    const editor = await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL("editor.html")+"?mode="+mode+"&source="+tab.id,active:false});
    // Background tab initialization can take time; editor will initiate when ready.
    status.textContent = "Capture workspace prepared.";
    window.close();
  } catch(e) {status.textContent=e.message;}
}
document.querySelector("#visible").addEventListener("click",()=>capture("visible"));
document.querySelector("#full").addEventListener("click",()=>capture("full"));
document.querySelector("#record").addEventListener("click",async()=>{await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL("recorder.html")});window.close();});
