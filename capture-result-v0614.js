/* Quick Copy page: attempts one-click capture->clipboard under clipboardWrite permission.
 * Always shows an explicit copy fallback. Never reads clipboard or contacts a server. */
(function(){'use strict';
 const api=globalThis.chrome??globalThis.browser;
 const byId=id=>document.getElementById(id),status=byId('qc-status');
 const params=new URLSearchParams(location.search),id=params.get('stored');
 const error=params.get('capture_error');
 const output=globalThis.MangoCaptureOutputV0614,store=globalThis.MangoCaptureStore;
 let result=null,copied=false;
 const label=value=>status.textContent=value;
 function target(name,query){return api.runtime.getURL(name)+(query||'');}
 function open(url){api.tabs?.create?.({url,active:true});}
 async function copy(){
  if(!result)return false;
  const button=byId('qc-copy');button.disabled=true;
  label('Copying full-resolution PNG to clipboard…');
  try{
   await output.write(output.toBlob(result));
   copied=true;byId('qc-copy-status').textContent='Copied';
   label('Copied '+result.width+' × '+result.height+' PNG to clipboard. Paste anywhere, or open the editor.');
   button.textContent='Copy again';return true;
  }catch(error){
   byId('qc-copy-status').textContent='Manual copy available';
   label('Automatic copy was blocked: '+error.message+' Select Copy screenshot or Save PNG.');
   return false;
  }finally{button.disabled=false;}
 }
 async function save(){
  if(!result)return;
  const blob=await output.toBlob(result),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='MangoShot-'+Date.now()+'.png';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function showPreview(source){
  const preview=byId('qc-preview'),maxW=900,maxH=520;
  const factor=Math.min(1,maxW/source.width,maxH/source.height);
  preview.width=Math.max(1,Math.round(source.width*factor));
  preview.height=Math.max(1,Math.round(source.height*factor));
  preview.getContext('2d').drawImage(source,0,0,preview.width,preview.height);
 }
 byId('qc-copy').addEventListener('click',()=>{void copy();});
 byId('qc-save').addEventListener('click',()=>{void save();});
 byId('qc-edit').addEventListener('click',()=>{if(id)open(target('editor.html','?stored='+encodeURIComponent(id)));});
 byId('qc-edit-clipboard').addEventListener('click',()=>open(target('editor.html','?clipboard=1')));
 async function start(){
  if(error){label('Capture failed: '+error);byId('qc-copy-status').textContent='Failed';return;}
  if(!id||!store.valid(id)){label('This screenshot link is invalid. Capture a new image.');return;}
  try{
   const bundle=await store.load(id);
   if(!bundle?.meta||!bundle.frames?.length)throw Error('Screenshot data could not be found.');
   result=await output.compose(bundle.meta,bundle.frames);
   byId('qc-meta').textContent=result.width+' × '+result.height+' px · original quality · local capture';
   showPreview(result);
   byId('qc-copy').disabled=false;byId('qc-edit').disabled=false;byId('qc-save').disabled=false;
   await copy();
  }catch(err){label('Could not prepare screenshot: '+err.message);byId('qc-copy-status').textContent='Failed';}
 }
 void start();
})();