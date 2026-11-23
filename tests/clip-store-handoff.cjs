const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const memory=new Map();let upgrade=false;
function mockRequest(value){const req={result:value,error:null};queueMicrotask(()=>req.onsuccess?.());return req;}
function mockDB(){return {objectStoreNames:{contains:()=>upgrade},createObjectStore(){upgrade=true;},
 transaction(_store,mode){let pending=0,finished=false;const tx={oncomplete:null,onerror:null,onabort:null};
   function req(value){pending++;const r={result:value,error:null};queueMicrotask(()=>{r.onsuccess?.();pending--;queueMicrotask(done);});return r;}
   function done(){if(!finished&&pending===0){finished=true;tx.oncomplete?.();}}
   tx.objectStore=()=>({put(value,key){memory.set(key,value);return req(key);},get(key){return req(memory.get(key));},clear(){memory.clear();return req(undefined);}});
   setTimeout(done,1);return tx;
 },close(){}};}
const context={Blob,Date,Math,Promise,setTimeout,queueMicrotask,indexedDB:{open(){const request={result:mockDB()};setTimeout(()=>{if(!upgrade)request.onupgradeneeded?.();request.onsuccess?.();},0);return request;}}};
context.globalThis=context;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','clip-store.js'),'utf8'),context);
(async()=>{
 const clips=context.MangoClips;
 const first=new Blob(['first recording'],{type:'video/webm'}),second=new Blob(['second recording'],{type:'video/mp4'});
 assert.equal(await clips.save(first,'session-A'),'session-A');
 assert.equal(await clips.save(second,'session-B'),'session-B');
 assert.equal((await clips.load('session-A')).blob,first,'Explicit session A should never be replaced by later B');
 assert.equal((await clips.load('session-B')).blob,second);
 assert.equal((await clips.load()).id,'session-B','Latest should point to most recently saved recording');
 assert.equal(await clips.load('missing'),null,'Missing explicit recording cannot silently open latest');
 await assert.rejects(()=>clips.load('../etc'),/Invalid recording ID/);
 await clips.clear();assert.equal(await clips.load(),null);
 console.log('PASS: immutable recording IDs, explicit editor handoff, latest pointer and missing-ID safety');
})().catch(error=>{console.error(error);process.exitCode=1;});
