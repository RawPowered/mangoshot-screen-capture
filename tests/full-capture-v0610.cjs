/* Full-page capture handshake regression (MV3/Firefox event page compatible).
 * Exercises actual background.js onMessage listener and callback semantics.
 */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','background.js'),'utf8');
const opened=[],frames=[],captures=[],listeners={};
let callbackVisible=0,clock=100000;
class Clock extends Date {static now(){return clock;}}
const png='data:image/png;base64,'+'A'.repeat(160);
const runtime={
 id:'mango',lastError:null,getURL:x=>'chrome-extension://mango/'+x,
 onMessage:{addListener(fn){listeners.message=fn}},
};
const tabs={
 onRemoved:{addListener(fn){listeners.removed=fn}},
 get(tabId,cb){assert.equal(tabId,23);cb({id:23,windowId:9,active:true,url:'https://example.test/'})},
 captureVisibleTab(windowId,options,cb){assert.equal(windowId,9);captures.push(options);cb(png);},
 create(options,cb){opened.push(options);cb({id:98});}
};
const store={valid:id=>/^capture-/.test(id),png:src=>src===png,
 save:async(id,meta,received)=>{frames.push({id,meta,received});}};
const chrome={runtime,tabs};
const ctx={globalThis:{chrome,MangoCaptureStore:store},Date:Clock,URLSearchParams,Promise,Map,Number,String,Math,Error,setTimeout};
vm.runInNewContext(source,ctx,{filename:'background.js'});
const popup={id:'mango',url:'chrome-extension://mango/popup.html'};
const content={id:'mango',tab:{id:23,active:true}};
const message=(payload,sender,expectedSync=false)=>{
 return new Promise((resolve,reject)=>{
  let sync=true,hasResponded=false;
  const timeout=setTimeout(()=>reject(new Error('No capture response: '+payload.type)),2000);
  const reply=value=>{
   clearTimeout(timeout);hasResponded=true;
   if(expectedSync)assert.equal(sync,true,payload.type+' must respond synchronously to avoid port-close failure');
   resolve(value);
  };
  const keepAlive=listeners.message(payload,sender,reply);
  if(expectedSync)assert.equal(keepAlive,false,payload.type+' must not rely on an async port');
  else if(!hasResponded)assert.equal(keepAlive,true,'Long capture operations must keep the reply port open');
  sync=false;
 });
};
(async()=>{
 const initial={type:'MANGO_POPUP_INIT',captureId:'capture-12345',source:23,windowId:9,mode:'full'};
 assert.equal((await message(initial,popup,true)).ok,true);
 assert.equal((await message(initial,popup,true)).ok,true,'Same ID retry is idempotent');
 assert.equal((await message({...initial,captureId:'capture-competing'},popup,true)).ok,false,
  'A competing session must not replace the active screenshot');
 assert.equal((await message({...initial,source:44},{id:'other',url:'https://example.test'},true)).ok,false,
  'Sites cannot initialize full-page capture');
 const setup=await message({type:'MANGO_SETUP'},content,true);
 assert.equal(setup.ok,true);assert.equal(setup.captureId,initial.captureId);
 const started=await message({type:'MANGO_SOURCE_START',captureId:initial.captureId,
  meta:{width:900,height:700,pageHeight:700,dpr:1,frames:1,full:true}},content,true);
 assert.equal(started.ok,true);
 const sample=await message({type:'MANGO_SOURCE_FRAME',captureId:initial.captureId,index:0,scrollY:0},content);
 assert.equal(sample.ok,true);assert.equal(sample.received,1);
 const finished=await message({type:'MANGO_SOURCE_DONE',captureId:initial.captureId},content);
 assert.equal(finished.ok,true);
 assert.equal(captures.length,1);assert.equal(frames.length,1);
 assert.equal(frames[0].received[0].dataUrl,png);
 assert.match(opened[0].url,/editor\.html\?stored=capture-12345/);
 assert.equal(opened[0].active,true);
 const newSession=await message({...initial,captureId:'capture-second'},popup,true);
 assert.equal(newSession.ok,true,'Completion must free tab for subsequent captures');
 assert.equal((await message({type:'MANGO_POPUP_ABORT',source:23,captureId:'capture-second'},popup)).ok,true);
 console.log('PASS: synchronous MV3 startup, idempotent retry, source validation, local full-page frame and editor handoff');
})().catch(error=>{console.error(error);process.exitCode=1;});
