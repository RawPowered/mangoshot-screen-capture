/* All captures begin under a real toolbar click so activeTab is granted. */
const api=globalThis.chrome??globalThis.browser;
const status=document.querySelector('#status');
const call=(fn,...args)=>new Promise((resolve,reject)=>{
  try{fn(...args,value=>{const err=api.runtime.lastError;
    err?reject(new Error(err.message)):resolve(value);});}
  catch(error){reject(error);}
});
let busy=false;
async function capture(mode){
  if(busy)return;busy=true;
  const buttons=['visible','full'].map(id=>document.getElementById(id));
  buttons.forEach(button=>button.disabled=true);
  status.textContent=mode==='visible'?'Capturing visible tab…':'Capturing full webpage. Keep this tab selected…';
  let tab,id,registered=false;
  try{
    [tab]=await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
    if(!tab?.id||!/^https?:/.test(tab.url||''))
      throw new Error('Open an ordinary http(s) webpage before using MangoShot.');
    id=globalThis.crypto.randomUUID();
    if(mode==='visible'){
      // Capture directly in the user's toolbar gesture. No inactive editor,
      // service-worker frame forwarding or tab activation race.
      const dataUrl=await call(api.tabs.captureVisibleTab.bind(api.tabs),tab.windowId,{format:'png'});
      if(!MangoCaptureStore.png(dataUrl))throw new Error('The browser did not return screenshot image data.');
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('The screenshot PNG could not be decoded.'));img.src=dataUrl;});
      if(!img.naturalWidth||!img.naturalHeight)throw new Error('The captured screenshot was empty.');
      await MangoCaptureStore.save(id,{width:img.naturalWidth,height:img.naturalHeight,
        pageHeight:img.naturalHeight,dpr:1,frames:1,full:false},
        [{index:0,scrollY:0,dataUrl}]);
      await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('editor.html')+'?stored='+encodeURIComponent(id),active:true});
    }else{
      const init=await call(api.runtime.sendMessage.bind(api.runtime),
        {type:'MANGO_POPUP_INIT',source:tab.id,mode:'full',captureId:id});
      if(!init?.ok)throw new Error(init?.error||'Could not initialize full-page capture.');
      registered=true;
      await call(api.scripting.executeScript.bind(api.scripting),{target:{tabId:tab.id},files:['content.js']});
      // The background coordinator finishes the capture before opening Image Studio.
    }
    window.close();
  }catch(error){
    if(registered)await call(api.runtime.sendMessage.bind(api.runtime),
      {type:'MANGO_POPUP_ABORT',captureId:id,source:tab.id}).catch(()=>{});
    status.textContent='Capture failed: '+error.message;
    buttons.forEach(button=>button.disabled=false);busy=false;
  }
}
document.querySelector('#visible').addEventListener('click',()=>capture('visible'));
document.querySelector('#full').addEventListener('click',()=>capture('full'));
document.querySelector('#record').addEventListener('click',async()=>{
  try{const [tab]=await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
    const source=tab?.id&&/^https?:/.test(tab.url||'')?'?source='+tab.id:'';
    await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('recorder.html')+source});window.close();}
  catch(error){status.textContent=error.message;}
});
document.querySelector('#clip-studio').addEventListener('click',async()=>{
  try{await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('clip-studio.html')});window.close();}
  catch(error){status.textContent=error.message;}
});
