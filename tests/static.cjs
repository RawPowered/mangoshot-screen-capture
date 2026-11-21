const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version,3);
assert.deepEqual(manifest.permissions,['activeTab','scripting']);
assert.equal(manifest.background.service_worker,'background.js');
assert.deepEqual(manifest.background.scripts,['background.js']);
for(const file of ['background.js','content.js','popup.js','editor.js','pdf-export.js','recorder.js']){
 new vm.Script(read(file),{filename:file});console.log('Syntax OK:',file);
}
for(const html of ['editor.html','popup.html','recorder.html']){
 const text=read(html);
 for(const script of [...text.matchAll(/<script\s+src="([^"]+)"/g)])
  assert.ok(fs.existsSync(path.join(root,script[1])),'Missing '+script[1]);
}
const listeners={};const messages=[];
const source={id:23,active:true,windowId:9,url:'https://example.test/'};
const chrome={
 runtime:{id:'mango-ext',getURL:p=>'chrome-extension://mango-ext/'+p,
  lastError:null,onMessage:{addListener(fn){listeners.onMessage=fn;}},
  sendMessage(msg,cb){messages.push(msg);cb({ok:true});}},
 tabs:{onRemoved:{addListener(fn){listeners.onRemoved=fn;}},
  get(id,cb){assert.equal(id,23);cb(source);},
  captureVisibleTab(id,opts,cb){assert.equal(id,9);cb('data:image/png;base64,TEST');}}
};
const ctx={chrome,globalThis:{chrome},Map,Date,Number,Error,Promise,setTimeout};
vm.runInNewContext(read('background.js'),ctx);
const send=(message,sender)=>new Promise((resolve,reject)=>{
 let returned=false;returned=listeners.onMessage(message,sender,resolve);
 if(returned!==true&&!['MANGO_SETUP'].includes(message.type))reject(new Error('Listener did not handle '+message.type));
});
(async()=>{
 const editor={id:'mango-ext',url:'chrome-extension://mango-ext/editor.html?source=23',tab:{id:42}};
 const src={tab:source};
 assert.equal((await send({type:'MANGO_INIT',source:23,mode:'full',captureId:'capture-1'},editor)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},src)).captureId,'capture-1');
 assert.equal((await send({type:'MANGO_START',captureId:'capture-1',meta:{width:800,height:600,pageHeight:2100,frames:4}},src)).ok,true);
 assert.equal((await send({type:'MANGO_FRAME',captureId:'capture-1',index:0,scrollY:0},src)).ok,true);
 assert.ok(messages.some(m=>m.type==='MANGO_FRAME'&&m.dataUrl.startsWith('data:image/png')));
 assert.equal((await send({type:'MANGO_DONE',captureId:'capture-1'},src)).ok,true);
 assert.equal((await send({type:'MANGO_SETUP'},src)).ok,false);
 assert.equal((await send({type:'MANGO_INIT',source:23,mode:'visible',captureId:'capture-2'},editor)).ok,true);
 listeners.onRemoved(42);
 assert.equal((await send({type:'MANGO_SETUP'},src)).ok,false);
 console.log('PASS: screenshot messaging, frame forwarding, capture cleanup and authorization');
})().catch(e=>{console.error(e);process.exitCode=1});
