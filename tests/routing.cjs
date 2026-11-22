/* End-to-end worker routing for popup-started full-page screenshot.
   No inactive editor is required to receive a large screenshot message. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let worker,removed,active=true,framesTaken=0,stored=null,opened=[];
const tab={id:23,active:true,windowId:9,url:'https://example.test/long'};
const png='data:image/png;base64,'+'A'.repeat(160);
const store={valid:id=>/^[a-zA-Z0-9_-]{8,100}$/.test(id),png:d=>typeof d==='string'&&d.startsWith('data:image/png;base64,')&&d.length>100,
 async save(id,meta,frames){stored={id,meta,frames};}};
const api={runtime:{id:'mango',lastError:null,getURL:x=>'chrome-extension://mango/'+x,onMessage:{addListener:fn=>worker=fn}},
 tabs:{onRemoved:{addListener:fn=>removed=fn},get(id,cb){assert.equal(id,23);cb({...tab,active})},
 captureVisibleTab(w,opt,cb){assert.equal(w,9);assert.equal(opt.format,'png');framesTaken++;cb(png)},
 create(opt,cb){opened.push(opt);cb({id:100});}}};
vm.runInNewContext(read('background.js'),{globalThis:{chrome:api,MangoCaptureStore:store},Date,Number,Map,Promise,Error,URLSearchParams,setTimeout});
const popup={id:'mango',url:'chrome-extension://mango/popup.html'};
const source={id:'mango',tab};
function send(message,sender){return new Promise((resolve,reject)=>{const ret=worker(message,sender,resolve);if(ret!==true&&message.type!=='MANGO_SETUP')reject(new Error('No response handler for '+message.type));});}
(async()=>{
 const id='capture-123456';
 assert.equal((await send({type:'MANGO_POPUP_INIT',mode:'full',source:23,captureId:id},popup)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},source)).captureId,id);
 const meta={width:800,height:600,pageHeight:1200,frames:2,full:true};
 assert.equal((await send({type:'MANGO_SOURCE_START',captureId:id,meta},source)).ok,true);
 for(const [index,scrollY] of [[0,0],[1,600]])assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:id,index,scrollY},source)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_DONE',captureId:id},source)).ok,true);
 assert.equal(framesTaken,2);assert.equal(stored.id,id);assert.equal(stored.frames.length,2);
 assert.equal(opened.length,1);assert.match(opened[0].url,/editor.html\?stored=capture-123456/);
 assert.equal((await send({type:'MANGO_SETUP'},source)).ok,false);
 assert.equal((await send({type:'MANGO_POPUP_INIT',mode:'full',source:23,captureId:'capture-234567'},popup)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_START',captureId:'capture-234567',meta:{...meta,frames:1}},source)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:'capture-234567',index:1,scrollY:0},source)).ok,false,'reject out-of-order frame');
 assert.equal((await send({type:'MANGO_SOURCE_ERROR',captureId:'capture-234567',error:'Page denied capture'},source)).ok,true);
 assert.match(opened.at(-1).url,/capture_error=Page\+denied\+capture/);
 removed(23);
 console.log('PASS: popup-initiated capture, PNG frames, saved bundle, editor handoff and errors');
})().catch(e=>{console.error(e);process.exitCode=1});
