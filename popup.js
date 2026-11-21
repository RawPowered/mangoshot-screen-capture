const api=globalThis.chrome??globalThis.browser;
const status=document.querySelector('#status');
const call=(fn,...args)=>new Promise((resolve,reject)=>{
  try{fn(...args,value=>{const e=api.runtime.lastError;e?reject(new Error(e.message)):resolve(value);});}
  catch(e){reject(e);}
});
async function capture(mode){
  status.textContent='Preparing '+mode+' capture…';
  try{
    const [tab]=await call(api.tabs.query.bind(api.tabs),{active:true,currentWindow:true});
    if(!tab?.id||!/^https?:/.test(tab.url||''))throw new Error('Open a regular http(s) webpage first.');
    const link=api.runtime.getURL('editor.html')+'?mode='+mode+'&source='+tab.id;
    await call(api.tabs.create.bind(api.tabs),{url:link,active:false});
    window.close();
  }catch(error){status.textContent=error.message;}
}
document.querySelector('#visible').addEventListener('click',()=>capture('visible'));
document.querySelector('#full').addEventListener('click',()=>capture('full'));
document.querySelector('#record').addEventListener('click',async()=>{
  try{await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('recorder.html')});window.close();}
  catch(error){status.textContent=error.message;}
});
