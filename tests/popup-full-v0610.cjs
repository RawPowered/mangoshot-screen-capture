/* Popup full-page capture: transient port close retry, tab/window identity and injection. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','popup.js'),'utf8');
async function scenario(failures){
 const handlers={},buttons=new Map(),inits=[],injected=[],closed=[];
 const get=id=>{if(!buttons.has(id))buttons.set(id,{id,disabled:false,textContent:'',
  addEventListener(type,fn){handlers[id+':'+type]=fn;}});return buttons.get(id);};
 const document={querySelector:s=>get(s.replace('#','')),getElementById:get};
 const runtime={lastError:null,getURL:x=>'chrome-extension://mango/'+x,
  sendMessage(msg,cb){
   inits.push(msg);
   if(inits.length<=failures){this.lastError={message:'The message port closed before a response was received.'};cb();}
   else{this.lastError=null;cb({ok:true,captureId:msg.captureId});}
   this.lastError=null;
  }};
 const api={runtime,
  tabs:{query(options,cb){cb([{id:22,windowId:7,active:true,url:'https://example.test/'}]);},create(opts,cb){cb({id:42});}},
  scripting:{executeScript(options,cb){injected.push(options);cb([]);}}};
 const context={globalThis:{chrome:api,crypto:{randomUUID:()=> 'capture-unique'}},
 document,window:{close(){closed.push(true)}},setTimeout,
 Promise,Error,encodeURIComponent,Image:class{},
 MangoCaptureStore:{png(){return false;}}};
 vm.runInNewContext(src,context,{filename:'popup.js'});
 await handlers['full:click']();
 return {inits,injected,closed,buttons};
}
(async()=>{
 const worked=await scenario(1);
 assert.equal(worked.inits.length,2,'Transient service worker port loss should retry once');
 assert.equal(worked.inits[0].captureId,worked.inits[1].captureId,'Retries must reuse the SAME capture identity');
 assert.equal(worked.inits[0].windowId,7,'Capture must pin the active window');
 assert.equal(worked.injected.length,1,'Successful full capture must inject content once');
 assert.equal(worked.injected[0].target.tabId,22);
 assert.equal(worked.closed.length,1,'Popup closes after injection');
 const error=await scenario(2);
 assert.equal(error.injected.length,0);
 assert.match(error.buttons.get('status').textContent,/Reload the extension/);
 assert.equal(error.buttons.get('full').disabled,false,'Full-page button must recover after failure');
 assert.equal(error.buttons.get('visible').disabled,false);
 console.log('PASS: full-page popup handshake retry, service failure diagnostics, injection and state recovery');
})().catch(error=>{console.error(error);process.exitCode=1;});
