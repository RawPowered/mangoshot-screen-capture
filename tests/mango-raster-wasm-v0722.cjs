const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../mango-raster-core-v0722.js');
(async()=>{const {instance}=await WebAssembly.instantiate(fs.readFileSync(process.argv[2]||'mango-engine-v0722.wasm'),{}),e=instance.exports;assert.equal(e.mango_abi(),1);
 assert.equal(e.mango_prepare(64000004),0);
 for(const [w,h] of [[1,1],[13,7],[256,128],[1920,1080]]){const src=new Uint8ClampedArray(w*h*4);let x=17;for(let i=0;i<src.length;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;src[i]=x>>>24;}
  for(const op of Object.keys(C.OPS))for(const amount of [0,37,100]){const ptr=e.mango_prepare(src.length);assert.ok(ptr);new Uint8Array(e.memory.buffer,ptr,src.length).set(src);assert.equal(e.mango_filter(w,h,C.OPS[op],amount),1);assert.deepEqual(new Uint8ClampedArray(e.memory.buffer,ptr,src.length).slice(),C.process(src,w,h,op,amount),op+' '+amount+' '+w+'x'+h);}
 }
 e.mango_clear();console.log('Wasm/JS exact RGBA parity for all three effects passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
