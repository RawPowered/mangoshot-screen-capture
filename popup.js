/* Toolbar capture modes: one-step Quick Copy with edit alternatives.
 * activeTab is granted by toolbar interaction; screenshots stay local.
 */
const api=globalThis.chrome??globalThis.browser;
const status=document.querySelector('#status');
const call=(fn,...args)=>new Promise((resolve,reject)=>{
 try{fn(...args,value=>{
  const err=api.runtime.lastError;err?reject(Error(err.message)):resolve(value);
 });}catch(error){reject(error);}
});
let busy=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function transientPortError(error){
 return /message port closed|receiving end does not exist|could not establish connection|no response/i.test(String(error?.message||error));
}
async function initializeCapture(tab,captureId,mode,intent){
 const init={type:'MANGO_POPUP_INIT',source:tab.id,windowId:tab.windowId,mode,captureId,intent};
 for(let attempt=0;attempt<2;attempt++){
  try{return await call(api.runtime.sendMessage.bind(api.runtime),init);}
  catch(error){
   if(!transientPortError(error))throw error;
   if(attempt===1)throw Error('The MangoShot capture service is not responding. Reload the extension from your browser extensions page and try again.');
   await pause(180);
  }
 }
}
const captureButtons=['visible','visible-edit','full','full-edit','area','area-edit'];
async function capture(mode,intent='copy'){
 if(busy)return;busy=true;
 const buttons=captureButtons.map(id=>document.getElementById(id)).filter(Boolean);
 buttons.forEach(b=>b.disabled=true);
 const short=mode==='full'?'full webpage':mode==='area'?'selected area':'visible screen';
 status.textContent='Preparing '+short+(intent==='copy'?' for quick copy…':' for Image Studio…');
 let tab,id,registered=false;
 try{
  [tab]=await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
  if(!tab?.id||!/^https?:/.test(tab.url||''))throw Error('Open a regular http(s) webpage before capturing.');
  id=globalThis.crypto.randomUUID();
  if(mode==='visible'){
   // Visible capture runs directly after toolbar gesture; no background tab activation race.
   const dataUrl=await call(api.tabs.captureVisibleTab.bind(api.tabs),tab.windowId,{format:'png'});
   if(!globalThis.MangoCaptureStore.png(dataUrl))throw Error('Browser did not return screenshot PNG data.');
   const img=new Image();
   await new Promise((resolve,reject)=>{
    img.onload=resolve;img.onerror=()=>reject(Error('Captured screenshot could not be decoded.'));
    img.src=dataUrl;
   });
   if(!img.naturalWidth||!img.naturalHeight)throw Error('The screenshot was empty.');
   await globalThis.MangoCaptureStore.save(id,{
    width:img.naturalWidth,height:img.naturalHeight,pageHeight:img.naturalHeight,dpr:1,frames:1,full:false
   },[{index:0,scrollY:0,dataUrl}]);
   const route=intent==='copy'?'capture-result.html':'editor.html';
   await call(api.tabs.create.bind(api.tabs),{
    url:api.runtime.getURL(route)+'?stored='+encodeURIComponent(id),active:true
   });
  }else{
   const init=await initializeCapture(tab,id,mode,intent);
   if(!init?.ok)throw Error(init?.error||'Capture could not start.');
   registered=true;
   await call(api.scripting.executeScript.bind(api.scripting),{
    target:{tabId:tab.id},files:[mode==='area'?'selection-v0614.js':'content.js']
   });
  }
  window.close();
 }catch(error){
  if(registered)await call(api.runtime.sendMessage.bind(api.runtime),
   {type:'MANGO_POPUP_ABORT',captureId:id,source:tab.id}).catch(()=>{});
  status.textContent='Capture failed: '+error.message;
  buttons.forEach(b=>b.disabled=false);busy=false;
 }
}
const bind=(id,mode,intent)=>document.getElementById(id)?.addEventListener?.('click',()=>capture(mode,intent));
bind('visible','visible','copy');bind('visible-edit','visible','edit');
bind('full','full','copy');bind('full-edit','full','edit');
bind('area','area','copy');bind('area-edit','area','edit');
document.getElementById('clipboard-edit')?.addEventListener?.('click',async()=>{
 try{
  await call(api.tabs.create.bind(api.tabs),{
   url:api.runtime.getURL('editor.html')+'?clipboard=1',active:true
  });window.close();
 }catch(error){status.textContent='Could not open Image Studio: '+error.message;}
});
document.querySelector('#record').addEventListener('click',async()=>{
 try{const [tab]=await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
  const source=tab?.id&&/^https?:/.test(tab.url||'')?'?source='+tab.id:'';
  await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('recorder.html')+source});window.close();
 }catch(error){status.textContent=error.message;}
});
document.querySelector('#clip-studio').addEventListener('click',async()=>{
 try{await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('clip-studio.html')});window.close();}
 catch(error){status.textContent=error.message;}
});
