/* Validate the actual IndexedDB local screenshot handoff contract. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const mem=new Map();let seeded=false;
function open(){
 const db={
  objectStoreNames:{contains:()=>seeded},
  createObjectStore(){seeded=true;},
  transaction(){
   const tx={oncomplete:null,onerror:null,onabort:null};
   tx.objectStore=()=>({
    put(value,key){mem.set(key,value);queueMicrotask(()=>tx.oncomplete?.());},
    get(key){const req={result:mem.get(key)};queueMicrotask(()=>{req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return req;},
    delete(key){mem.delete(key);queueMicrotask(()=>tx.oncomplete?.());}
   });
   return tx;
  },
  close(){}
 };
 const req={result:db};
 queueMicrotask(()=>{if(!seeded)req.onupgradeneeded?.();req.onsuccess?.();});
 return req;
}

const ctx={indexedDB:{open},Date,Promise,Error};ctx.globalThis=ctx;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','capture-store.js'),'utf8'),ctx);
(async()=>{
 const store=ctx.MangoCaptureStore,png='data:image/png;base64,'+'A'.repeat(160);
 assert.equal(store.png(png),true);assert.equal(store.png('data:image/png;base64,'),false);
 const meta={width:800,height:600,pageHeight:600,frames:1,full:false},frames=[{index:0,scrollY:0,dataUrl:png}];
 await store.save('capture_12345',meta,frames);
 const data=await store.load('capture_12345');assert.equal(data.frames[0].dataUrl,png);
 await assert.rejects(()=>store.save('capture_23456',meta,[]),/Incomplete screenshot/);
 await store.remove('capture_12345');assert.equal(await store.load('capture_12345'),null);
 console.log('PASS: store PNG bundle, read once, guard incomplete data and purge sensitive captures');
})().catch(e=>{console.error(e);process.exitCode=1});
