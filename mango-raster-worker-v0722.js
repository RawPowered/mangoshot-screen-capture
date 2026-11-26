/* Bundled worker: no network requests except locally packaged Wasm. */
'use strict';
importScripts('mango-raster-core-v0722.js');
const C=self.MangoRasterCoreV0722;let engine=null,failed=false,busy=false;
async function load(){
 if(failed)return null;if(engine)return engine;
 try{const res=await fetch('mango-engine-v0722.wasm');if(!res.ok)throw Error('Wasm not packaged');const {instance}=await WebAssembly.instantiate(await res.arrayBuffer(),{});const e=instance.exports;if(e.mango_abi()!==1||!e.memory)throw Error('Unsupported raster ABI');engine=e;return e;}
 catch{failed=true;return null;}
}
self.onmessage=async({data:d})=>{
 if(busy){self.postMessage({id:d?.id,error:'Worker busy'});return;}busy=true;
 try{
  const {id,width:w,height:h,op,amount,backend,buffer}=d;
  if(!(buffer instanceof ArrayBuffer)||!['auto','js'].includes(backend))throw Error('Invalid worker request');
  C.validate(w,h,op,amount,buffer.byteLength);
  const started=performance.now(),src=new Uint8ClampedArray(buffer);let result=null,used='JS worker';
  const e=backend==='auto'?await load():null;
  if(e){try{const ptr=e.mango_prepare(src.length);if(!ptr)throw Error('Allocation failed');
    new Uint8Array(e.memory.buffer,ptr,src.length).set(src);
    if(e.mango_filter(w,h,C.OPS[op],amount)!==1)throw Error('Kernel rejected');
    result=new Uint8ClampedArray(e.memory.buffer,ptr,src.length).slice();used='Rust / Wasm worker';
   }catch{failed=true;engine=null;}finally{try{e.mango_clear();}catch{}}}
  if(!result)result=C.process(src,w,h,op,amount);
  self.postMessage({id,backend:used,ms:performance.now()-started,buffer:result.buffer},[result.buffer]);
 }catch(e){self.postMessage({id:d?.id,error:String(e.message||e)});}finally{busy=false;}
};
