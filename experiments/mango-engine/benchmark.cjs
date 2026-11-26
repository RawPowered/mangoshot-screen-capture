// Compare a byte-identical RGBA kernel including JS/Wasm buffer copies.
// Node runtime feasibility, not an extension or GPU certification.
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
function jsGray(a){for(let i=0;i<a.length;i+=4){const y=(77*a[i]+150*a[i+1]+29*a[i+2]+128)>>8;a[i]=y;a[i+1]=y;a[i+2]=y;}return a;}
(async()=>{
 const {instance}=await WebAssembly.instantiate(fs.readFileSync(process.argv[2]),{}),e=instance.exports;
 assert.equal(e.mango_prepare(3),0);assert.equal(e.mango_prepare(64*1024*1024+4),0);
 function wasmGray(a){const ptr=e.mango_prepare(a.length);assert.ok(ptr>0);new Uint8Array(e.memory.buffer,ptr,a.length).set(a);assert.equal(e.mango_grayscale(a.length),1);return new Uint8Array(e.memory.buffer,ptr,a.length).slice();}
 for(const [w,h] of [[1920,1080],[3840,2160]]){
  const src=new Uint8Array(w*h*4);let x=0x3456789;for(let i=0;i<src.length;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;src[i]=x>>>24;}
  const expect=jsGray(src.slice());assert.deepEqual(wasmGray(src),expect);
  const times={js:[],wasm:[]};for(let i=0;i<6;i++){let t=performance.now();jsGray(src.slice());times.js.push(performance.now()-t);t=performance.now();wasmGray(src);times.wasm.push(performance.now()-t);}
  const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
  console.log(JSON.stringify({width:w,height:h,jsMs:median(times.js),wasmMs:median(times.wasm),copyInclusive:true,parity:true}));
 }
 e.mango_clear();assert.equal(e.mango_grayscale(16),0);
})().catch(e=>{console.error(e);process.exitCode=1;});
