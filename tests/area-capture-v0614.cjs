/* v0.6.14: popup/worker area selection -> browser PNG -> local result (no overlay). */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let listener,removed,save=null,opened=[],frames=0;
const png='data:image/png;base64,'+'A'.repeat(160);
const api={runtime:{id:'mango',lastError:null,getURL:x=>'chrome-extension://mango/'+x,
 onMessage:{addListener(fn){listener=fn;}}},
 tabs:{onRemoved:{addListener(fn){removed=fn}},
 get(id,cb){assert.equal(id,23);cb({id,windowId:9,active:true})},
 captureVisibleTab(windowId,opt,cb){assert.equal(windowId,9);assert.equal(opt.format,'png');frames++;cb(png)},
 create(opt,cb){opened.push(opt);cb({id:100})}}};
const store={valid:id=>/^[a-zA-Z0-9_-]{8,100}$/.test(id),
 png:value=>value===png,
 async save(id,meta,frames){save={id,meta,frames};}};
const context={globalThis:{chrome:api,MangoCaptureStore:store},Date,Map,Promise,Number,String,Math,Error,URLSearchParams,setTimeout};
vm.runInNewContext(read('background.js'),context,{filename:'background.js'});
const popup={id:'mango',url:'chrome-extension://mango/popup.html'};
const page={id:'mango',tab:{id:23}};
function send(payload,sender){
 return new Promise((resolve,reject)=>{
  let responded=false;const reply=result=>{responded=true;resolve(result)};
  const async=listener(payload,sender,reply);
  if(!responded&&async!==true)reject(Error('No port kept open for '+payload.type));
 });
}
(async()=>{
 const init={type:'MANGO_POPUP_INIT',mode:'area',intent:'copy',source:23,windowId:9,captureId:'capture-area-001'};
 assert.equal((await send(init,popup)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},page)).mode,'area');
 assert.equal((await send(init,popup)).ok,true,'Startup retry must be idempotent');
 assert.equal((await send({...init,captureId:'capture-area-002'},popup)).ok,false,'Concurrent selection is disallowed');
 const rect={x:20,y:15,width:320,height:200};
 const viewport={width:1280,height:720,dpr:1.5};
 assert.equal((await send({type:'MANGO_AREA_COMMIT',captureId:init.captureId,rect,viewport},page)).ok,true);
 assert.equal(frames,1);
 assert.equal(save.frames.length,1);
 assert.equal(save.meta.selection.x,20);
 assert.equal(save.meta.selection.width,320);
 assert.equal(save.meta.width,1280);
 assert.equal(save.meta.pageHeight,720);
 assert.match(opened[0].url,/capture-result\.html\?stored=capture-area-001/);
 assert.equal(opened[0].active,true);
 assert.equal((await send({type:'MANGO_SETUP'},page)).ok,false,'Completed selection must release session');
 const edit={...init,captureId:'capture-area-003',intent:'edit'};
 assert.equal((await send(edit,popup)).ok,true);
 assert.equal((await send({type:'MANGO_AREA_COMMIT',captureId:edit.captureId,
  rect:{x:0,y:0,width:200,height:100},viewport},page)).ok,true);
 assert.match(opened[1].url,/editor\.html\?stored=capture-area-003/);
 const cancelled={...init,captureId:'capture-area-004'};
 assert.equal((await send(cancelled,popup)).ok,true);
 assert.equal((await send({type:'MANGO_AREA_CANCEL',captureId:cancelled.captureId},page)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},page)).ok,false);
 const malicious={...init,captureId:'capture-area-005'};
 assert.equal((await send(malicious,popup)).ok,true);
 assert.equal((await send({type:'MANGO_AREA_COMMIT',captureId:malicious.captureId,rect,viewport},
  {id:'attacker',tab:{id:45}})).ok,false);
 assert.equal((await send({type:'MANGO_AREA_CANCEL',captureId:malicious.captureId},page)).ok,true);
 assert.ok(read('selection-v0614.js').includes('done=true;cleanup();'));
 assert.ok(read('selection-v0614.js').indexOf('done=true;cleanup();')<
  read('selection-v0614.js').indexOf("type:'MANGO_AREA_COMMIT'"),
  'Selection overlay must be removed before capture message');
 console.log('PASS: secure drag-area selection, auto-copy routing, edit routing, cancel, overlay clean-up');
})().catch(e=>{console.error(e);process.exitCode=1});
