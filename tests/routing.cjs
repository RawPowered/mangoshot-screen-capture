/* Regression for the actual v0.2 bug: browser runtime messages broadcast to
   extension pages twice when the background forwards them. The editor MUST
   never see source commands as screenshot deliveries. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let bgListener,editorListener,closedListener;
let active=true,framesTaken=0;
const srcTab={id:23,active:true,windowId:9,url:'https://example.test/'};
const delivery=[];
const api={
 runtime:{id:'test-ext',lastError:null,getURL:f=>'chrome-extension://test-ext/'+f,
 onMessage:{addListener:fn=>{bgListener=fn}},
 sendMessage(msg,cb){
   // Simulate broadcast: every runtime message is observed by the editor.
   delivery.push(msg);editorListener?.(msg,{id:'test-ext'},()=>{});cb({ok:true});
 }},
 tabs:{onRemoved:{addListener:fn=>closedListener=fn},get(id,cb){assert.equal(id,23);cb(srcTab)},
 captureVisibleTab(win,opts,cb){assert.equal(win,9);framesTaken++;cb('data:image/png;base64,AAA')}}
};
vm.runInNewContext(read('background.js'),{globalThis:{chrome:api},Map,Date,Number,Error,Promise,setTimeout});
const accepted=[];
editorListener=(msg,sender,respond)=>{
 if(!/^MANGO_EDITOR_/.test(msg.type))return;
 if(msg.type==='MANGO_EDITOR_FRAME')accepted.push(msg);
 respond({ok:true});
};
function send(msg,sender){return new Promise(resolve=>{
  // Deliver original source request to editor as the real browser does.
  editorListener(msg,sender,()=>{});
  bgListener(msg,sender,resolve);
 });}
(async()=>{
 const editor={id:'test-ext',url:'chrome-extension://test-ext/editor.html?source=23',tab:{id:42}};
 const source={tab:srcTab};
 assert.equal((await send({type:'MANGO_INIT',source:23,mode:'full',captureId:'c1'},editor)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},source)).captureId,'c1');
 assert.equal((await send({type:'MANGO_SOURCE_START',captureId:'c1',meta:{width:800,height:600,pageHeight:1200,frames:2}},source)).ok,true);
 for(const [i,y] of [[0,0],[1,600]]){
  assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:'c1',index:i,scrollY:y},source)).ok,true);
 }
 assert.equal((await send({type:'MANGO_SOURCE_DONE',captureId:'c1'},source)).ok,true);
 assert.equal(framesTaken,2);
 assert.equal(accepted.length,2,'Editor must get exactly one image per frame');
 assert.ok(accepted.every((m,i)=>m.index===i && m.dataUrl.startsWith('data:image/png;base64,')));
 assert.equal((await send({type:'MANGO_SETUP'},source)).ok,false);
 assert.equal((await send({type:'MANGO_INIT',source:23,mode:'visible',captureId:'c2'},editor)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_START',captureId:'c2',meta:{width:800,height:600,pageHeight:600,frames:1}},source)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:'c2',index:1,scrollY:0},source)).ok,false,'Reject out-of-order frames');
 assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:'c2',index:0,scrollY:0},source)).ok,true);
 assert.equal((await send({type:'MANGO_SOURCE_FRAME',captureId:'c2',index:0,scrollY:0},source)).ok,false,'Reject duplicate frames');
 closedListener(42);
 assert.equal((await send({type:'MANGO_SETUP'},source)).ok,false);
 console.log('PASS: broadcast isolation, complete frames, no duplicates, index order, cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
