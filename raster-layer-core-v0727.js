/* MangoEngine imported-image recipes. Immutable asset pixels, exact integer fallback,
 * bounded derived-canvas LRU; no asynchronous dependency in redraw/export. */
(function(root){'use strict';
 const MAX_PIXELS=9000000,MAX_CACHE_PIXELS=18000000,MAX_CACHE_ENTRIES=12,MAX_STEPS=4;
 const kinds=Object.freeze({gray:'Grayscale',blur:'Gaussian softness (3 × 3)',sharp:'Sharpen (3 × 3)'});
 const copy=v=>JSON.parse(JSON.stringify(v));
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
 const abortError=()=>new DOMException('Cancelled','AbortError');
 const cancelled=signal=>{if(signal?.aborted)throw abortError();};
 function check(stack){
  if(!Array.isArray(stack)||stack.length>MAX_STEPS)throw Error('Use at most four raster filter steps.');
  return stack.map(s=>{if(!exact(s,['op','amount','enabled'])||!Object.hasOwn(kinds,s.op)||!Number.isInteger(s.amount)||s.amount<0||s.amount>100||typeof s.enabled!=='boolean')throw Error('Invalid raster filter step.');return {op:s.op,amount:s.amount,enabled:s.enabled};});
 }
 const recipe=s=>check(s||[]).filter(x=>x.enabled&&x.amount>0).map(({op,amount})=>({op,amount}));
 const key=s=>JSON.stringify(recipe(s));
 const active=s=>recipe(s).length>0;
 function dimensions(item){if(!item||!Number.isInteger(item.width)||!Number.isInteger(item.height)||item.width<1||item.height<1||item.width*item.height>MAX_PIXELS)throw Error('Editable raster effects require a source image of at most 9 megapixels.');return item.width*item.height;}
 function requireProject(layers,lookup){
  const recipes=new Map();let total=0;
  for(const l of layers||[]){if(l.rasterFx==null)continue;if(l.type!=='image')throw Error('Raster effects are supported only on imported image layers.');
   const r=recipe(l.rasterFx);if(!r.length)continue;
   const item=lookup(l),size=dimensions(item),k=JSON.stringify([l.assetId,r]);if(!recipes.has(k)){recipes.set(k,true);total+=size;}
  }
  if(total>MAX_CACHE_PIXELS||recipes.size>MAX_CACHE_ENTRIES)throw Error('Active raster recipes exceed the 18 MP / 12 recipe cache budget.');
  return {pixels:total,recipes:recipes.size};
 }
 const ids=new WeakMap(),cache=new Map();let serial=0,pixels=0,hits=0,misses=0,evictions=0,last=null;
 function cacheKey(item,steps){if(!ids.has(item))ids.set(item,++serial);return ids.get(item)+':'+JSON.stringify(steps);}
 function get(item,steps){
  const k=cacheKey(item,steps),entry=cache.get(k);
  if(!entry){misses++;return null;}
  cache.delete(k);cache.set(k,entry);hits++;return entry;
 }
 function drop(k){const e=cache.get(k);if(!e)return;cache.delete(k);pixels-=e.pixels;e.canvas.width=e.canvas.height=1;evictions++;}
 function put(item,steps,rgba,backend,ms){
  const n=dimensions(item),k=cacheKey(item,steps);if(cache.has(k))drop(k);
  while(cache.size&&(pixels+n>MAX_CACHE_PIXELS||cache.size>=MAX_CACHE_ENTRIES))drop(cache.keys().next().value);
  const c=root.document.createElement('canvas');c.width=item.width;c.height=item.height;
  c.getContext('2d').putImageData(new ImageData(rgba,item.width,item.height),0,0);
  const entry={item,canvas:c,pixels:n,backend,ms};cache.set(k,entry);pixels+=n;last={backend,ms,width:item.width,height:item.height,steps:steps.length};return entry;
 }
 function read(item){
  dimensions(item);if(!item.image)throw Error('Missing decoded image source.');
  const c=root.document.createElement('canvas');c.width=item.width;c.height=item.height;
  try{const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(item.image,0,0,c.width,c.height);return q.getImageData(0,0,c.width,c.height).data;}
  finally{c.width=c.height=1;}
 }
 function core(){if(!root.MangoRasterCoreV0722)throw Error('MangoEngine raster core unavailable.');return root.MangoRasterCoreV0722;}
 function source(item,stack){
  const steps=recipe(stack);if(!steps.length)return item.image;dimensions(item);
  const cached=get(item,steps);if(cached)return cached.canvas;
  // Undo/reopen without warm cache, or a direct legacy API edit, must never show stale pixels.
  const start=performance.now(),C=core();let p=read(item);
  for(const s of steps)p=C.process(p,item.width,item.height,s.op,s.amount);
  return put(item,steps,p,'JS synchronous fallback',performance.now()-start).canvas;
 }
 function task(worker,src,item,step,backend,signal,id){
  return new Promise((resolve,reject)=>{
   if(signal?.aborted){reject(abortError());return;}
   let done=false,timer;
   const clean=()=>{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);worker.onmessage=worker.onerror=worker.onmessageerror=null;};
   const finish=(err,result)=>{if(done)return;done=true;clean();err?reject(err):resolve(result);};
   const onAbort=()=>finish(abortError());
   signal?.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>finish(Error('Raster worker timeout.')),30000);
   worker.onerror=e=>finish(Error(e.message||'Raster worker unavailable.'));
   worker.onmessageerror=()=>finish(Error('Raster worker message could not be decoded.'));
   worker.onmessage=e=>{const r=e.data;if(r?.id!==id)return;
    if(r.error||!(r.buffer instanceof ArrayBuffer)||r.buffer.byteLength!==src.length||!['Rust / Wasm worker','JS worker'].includes(r.backend))finish(Error(r.error||'Invalid raster worker output.'));
    else finish(null,{data:new Uint8ClampedArray(r.buffer),backend:r.backend});};
   try{const buffer=src.slice().buffer;worker.postMessage({id,width:item.width,height:item.height,op:step.op,amount:step.amount,backend,buffer},[buffer]);}catch(e){finish(e);}
  });
 }
 async function prepare(item,stack,backend='auto',signal){
  cancelled(signal);if(!['auto','js'].includes(backend))throw Error('Invalid raster backend.');
  const steps=recipe(stack);if(!steps.length)return {backend:'Original source',ms:0,cached:false,width:item.width,height:item.height,steps:0};
  dimensions(item);
  const cached=get(item,steps);
  if(cached&&(backend==='auto'||cached.backend.startsWith('JS'))){
   last={backend:cached.backend,ms:cached.ms,width:item.width,height:item.height,steps:steps.length};
   return {...last,cached:true};
  }
  const start=performance.now(),C=core();let p=read(item),worker=null;const used=new Set();
  try{
   try{worker=new Worker('mango-raster-worker-v0722.js');}catch{}
   for(const [i,s] of steps.entries()){
    cancelled(signal);
    if(worker){try{const r=await task(worker,p,item,s,backend,signal,i+1);p=r.data;used.add(r.backend);continue;}
     catch(e){worker.terminate();worker=null;if(signal?.aborted||e.name==='AbortError')throw e;}}
    p=await C.sliced(p,item.width,item.height,s.op,s.amount,signal);used.add('JS sliced fallback');
   }
   cancelled(signal);const result=[...used].join(' + ');put(item,steps,p,result,performance.now()-start);
   return {...last,cached:false};
  }finally{worker?.terminate();}
 }
 function retain(items){const set=new Set(items);for(const [k,e] of cache)if(!set.has(e.item))drop(k);}
 function stats(){return {entries:cache.size,pixels,bytes:pixels*4,hits,misses,evictions,last:last?{...last}:null};}
 // Capability probe only: no document pixels, no renderer switch, no adapter fingerprint.
 async function gpuProbe(){
  let device=null,src=null,dst=null;let abandoned=false,timer;
  const work=(async()=>{
   try{
    if(!root.navigator?.gpu)return {status:'unavailable',detail:'WebGPU is not exposed in this browser.'};
    const adapter=await root.navigator.gpu.requestAdapter();if(!adapter||abandoned)return {status:'unavailable',detail:'No WebGPU adapter available.'};
    device=await adapter.requestDevice();if(abandoned)return {status:'unavailable',detail:'Probe timed out.'};
    const flags=root.GPUBufferUsage,mode=root.GPUMapMode;
    src=device.createBuffer({size:4,usage:flags.STORAGE|flags.COPY_SRC});dst=device.createBuffer({size:4,usage:flags.COPY_DST|flags.MAP_READ});
    const shader=device.createShaderModule({code:'@group(0) @binding(0) var<storage, read_write> out: array<u32>; @compute @workgroup_size(1) fn main() { out[0] = 42u; }'});
    const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:shader,entryPoint:'main'}});if(abandoned)return {status:'unavailable',detail:'Probe timed out.'};
    const binding=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:src}}]});
    const enc=device.createCommandEncoder(),pass=enc.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,binding);pass.dispatchWorkgroups(1);pass.end();enc.copyBufferToBuffer(src,0,dst,0,4);device.queue.submit([enc.finish()]);
    await dst.mapAsync(mode.READ);const value=new Uint32Array(dst.getMappedRange())[0];dst.unmap();
    return value===42?{status:'passed',detail:'Local compute and buffer readback passed. Rendering unchanged.'}:{status:'failed',detail:'Unexpected compute output.'};
   }catch{return {status:'failed',detail:'WebGPU compute initialization or readback failed.'};}
   finally{try{src?.destroy();dst?.destroy();device?.destroy();}catch{}}
  })();
  try{return await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>{abandoned=true;try{device?.destroy();}catch{}resolve({status:'unavailable',detail:'WebGPU probe timed out.'});},8000);})]);}finally{clearTimeout(timer);}
 }
 const api=Object.freeze({MAX_PIXELS,MAX_CACHE_PIXELS,MAX_CACHE_ENTRIES,MAX_STEPS,kinds,copy,check,recipe,key,active,dimensions,requireProject,source,prepare,retain,stats,gpuProbe});
 root.MangoRasterLayerV0727=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
