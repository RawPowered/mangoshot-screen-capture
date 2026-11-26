/* Raster Lab: immutable composition, local processing, full-resolution PNG copy. */
(function(root){'use strict';
 const C=root.MangoRasterCoreV0722,d=root.document,host=root.MangoRasterImageV0722;if(!d?.body.classList.contains('studio-image')||!host||!C)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const button=(id,text,fn)=>{const b=el('button','ci-action-v0720',text);b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
 const choice=(id,label,items)=>{const s=el('select');s.id=id;s.setAttribute('aria-label',label);for(const [v,t] of items){const o=el('option','',t);o.value=v;s.append(o);}return s;};
 const field=(name,input)=>{const l=el('label','mr-field-v0722');l.append(el('span','',name),input);return l;};
 let worker=null,job=null,serial=0;
 function stopWorker(){worker?.terminate();worker=null;if(job){const j=job;job=null;j.cleanup();j.reject(new DOMException('Cancelled','AbortError'));}}
 function runWorker(src,w,h,op,amount,backend,signal){
  return new Promise((resolve,reject)=>{
   if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
   if(!worker)worker=new Worker('mango-raster-worker-v0722.js');
   const current=worker,id=++serial,abort=()=>stopWorker();
   let timer=0;
   const clean=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
   const fail=e=>{if(job?.id!==id)return;job=null;clean();current.terminate();if(worker===current)worker=null;reject(e);};
   job={id,reject,cleanup:clean};signal.addEventListener('abort',abort,{once:true});
   timer=setTimeout(()=>fail(Error('Raster worker timed out')),30000);
   current.onerror=e=>fail(Error(e.message||'Raster worker unavailable'));
   current.onmessage=e=>{if(e.data?.id!==id||job?.id!==id)return;const r=e.data;if(r.error||!(r.buffer instanceof ArrayBuffer)||r.buffer.byteLength!==src.length){fail(Error(r.error||'Invalid raster result'));return;}
    job=null;clean();resolve({pixels:new Uint8ClampedArray(r.buffer),backend:r.backend,ms:r.ms});};
   try{const copy=src.slice().buffer;current.postMessage({id,width:w,height:h,op,amount,backend,buffer:copy},[copy]);}catch(e){fail(e);}
  });
 }
 async function process(src,w,h,op,amount,backend,signal){
  C.validate(w,h,op,amount,src.length);const start=performance.now();
  try{return {...await runWorker(src,w,h,op,amount,backend,signal),roundtrip:performance.now()-start};}
  catch(e){if(signal.aborted||e.name==='AbortError')throw e;const before=performance.now(),pixels=await C.sliced(src,w,h,op,amount,signal);return {pixels,backend:'JS sliced fallback',ms:performance.now()-before,roundtrip:performance.now()-start};}
 }
 const dialog=el('dialog','mr-dialog-v0722');dialog.id='mr-dialog-v0722';dialog.setAttribute('aria-labelledby','mr-title-v0722');
 const header=el('header'),heading=el('div'),title=el('strong','','MANGOENGINE / RASTER LAB');title.id='mr-title-v0722';
 heading.append(title,el('small','','Local raster processing · Export a new PNG copy'));header.append(heading,button('mr-close-v0722','Close ×',()=>dialog.close()));
 const body=el('section','mr-body-v0722'),tools=el('div','mr-tools-v0722'),op=choice('mr-op-v0722','Raster effect',[['gray','Grayscale'],['blur','Gaussian softness (3 × 3)'],['sharp','Sharpen (3 × 3)']]),backend=choice('mr-backend-v0722','Processing engine',[['auto','Auto · Rust if available'],['js','JavaScript only']]),mode=choice('mr-mode-v0722','Preview',[['detail','Actual-pixel center detail'],['fit','Fit composition']]);
 const amount=el('input');amount.id='mr-amount-v0722';amount.type='range';amount.min='0';amount.max='100';amount.value='100';
 const amountOut=el('output','','100%');amountOut.htmlFor=amount.id;
 tools.append(field('Effect',op),field('Engine',backend),field('Preview',mode),field('Intensity',amount),amountOut);
 const pair=el('div','mr-pair-v0722');function picture(name,id){const f=el('figure'),c=el('canvas');c.id=id;c.setAttribute('aria-label',name);f.append(el('figcaption','',name),c);pair.append(f);return c;}
 const before=picture('Original composition','mr-before-v0722'),after=picture('Processed draft','mr-after-v0722');
 const note=el('p','mr-note-v0722','The original image and layers stay unchanged. Redactions and annotations are included exactly as in normal image export. The 3 × 3 filters preserve existing alpha; actual-pixel preview shows the center region.');
 const footer=el('footer'),status=el('span','mr-status-v0722','Ready');status.id='mr-status-v0722';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const save=button('mr-save-v0722','Export processed PNG',()=>void exportCopy());save.classList.add('primary');save.disabled=true;
 footer.append(status,save);body.append(tools,pair,note);dialog.append(header,body,footer);d.body.append(dialog);
 let session=null,controller=null,timer=0,token=0,exporting=false,returnFocus=null;
 function abort(){clearTimeout(timer);controller?.abort();controller=null;token++;}
 function current(t){return dialog.open&&session&&token===t;}
 function controls(disabled){for(const n of [op,backend,mode,amount])n.disabled=disabled;}
 function copyCanvas(target,source){target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);}
 function put(target,pixels,w,h){target.width=w;target.height=h;target.getContext('2d').putImageData(new ImageData(pixels,w,h),0,0);}
 function format(r,w,h){return r.backend+' · '+w+' × '+h+' · '+r.roundtrip.toFixed(1)+' ms round-trip';}
 function schedule(){if(!session||exporting)return;abort();save.disabled=true;amountOut.textContent=amount.value+'%';const t=token;timer=setTimeout(()=>void preview(t),80);}
 async function preview(t){
  if(!current(t))return;controller=new AbortController();const signal=controller.signal;
  try{status.textContent='Rendering local preview…';const c=host.capture(session.stamp,mode.value),w=c.width,h=c.height;copyCanvas(before,c);
   const src=c.getContext('2d').getImageData(0,0,w,h).data;const r=await process(src,w,h,op.value,Number(amount.value),backend.value,signal);if(!current(t)||signal.aborted)return;
   put(after,r.pixels,w,h);status.textContent=format(r,w,h)+(session.width*session.height>C.MAX_PIXELS?' · Full raster export exceeds 16 MP limit':'');save.disabled=session.width*session.height>C.MAX_PIXELS;
  }catch(e){if(current(t)&&!signal.aborted)status.textContent=e.message;}
 }
 function download(blob){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='MangoShot-raster-'+Date.now()+'.png';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function exportCopy(){
  if(!session||save.disabled||exporting)return;abort();exporting=true;controls(true);save.disabled=true;controller=new AbortController();const signal=controller.signal,t=token;
  try{status.textContent='Processing full-resolution PNG…';const c=host.capture(session.stamp,'full'),w=c.width,h=c.height,src=c.getContext('2d').getImageData(0,0,w,h).data;
   const r=await process(src,w,h,op.value,Number(amount.value),backend.value,signal);if(!current(t)||signal.aborted)return;put(c,r.pixels,w,h);
   const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('PNG encode failed')),'image/png'));
   if(!current(t)||signal.aborted||host.state().stamp!==session.stamp)return;
   download(blob);status.textContent='Exported PNG · '+format(r,w,h);
  }catch(e){if(current(t)&&!signal.aborted)status.textContent=e.message;}
  finally{if(current(t)){exporting=false;controls(false);save.disabled=false;}}
 }
 function open(){
  const s=host.state();if(!s.ready||d.querySelector('dialog[open]'))return false;
  returnFocus=d.activeElement;session=s;exporting=false;controls(false);dialog.showModal();schedule();return true;
 }
 for(const n of [op,backend,mode,amount])n.addEventListener('input',schedule);
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();dialog.close();}},true);
 dialog.addEventListener('close',()=>{abort();stopWorker();session=null;exporting=false;controls(false);save.disabled=true;for(const c of [before,after]){c.width=1;c.height=1;}returnFocus?.focus?.();returnFocus=null;});
 const launch=button('mr-open-v0722','Raster Lab…',open);launch.title='Local Rust/Wasm raster processing and PNG copy';
 const studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.prepend(launch);
 function refresh(){launch.disabled=!root.MangoImageActions?.state().ready;}
 let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);
 const state=d.getElementById('status');if(state)new MutationObserver(queue).observe(state,{childList:true});
 root.addEventListener('pagehide',()=>{abort();stopWorker();});refresh();
 root.MangoRasterUIV0722=Object.freeze({open});
})(typeof globalThis!=='undefined'?globalThis:this);
