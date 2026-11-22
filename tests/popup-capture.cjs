/* Visible screenshot must be taken during popup toolbar gesture, not deferred to an inactive editor. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let screenshots=0,saves=[],opened=[],injections=0,init=false,closing=false;
const element=id=>({id,textContent:'',disabled:false,addEventListener(event,fn){handlers[id+':'+event]=fn;}});
const handlers={},nodes=new Map();const doc={querySelector(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},getElementById(id){return this.querySelector('#'+id)}};
const imgData='data:image/png;base64,'+'A'.repeat(160);
class Image{naturalWidth=1440;naturalHeight=900;set src(value){this.onload?.();}}
const tab={id:23,windowId:9,url:'https://example.test/',active:true};
const api={runtime:{lastError:null,getURL:x=>'chrome-extension://mango/'+x,sendMessage(msg,cb){if(msg.type==='MANGO_POPUP_INIT')init=true;cb({ok:true});}},
 tabs:{query(opts,cb){cb([tab])},captureVisibleTab(win,opt,cb){screenshots++;assert.equal(win,9);cb(imgData)},create(opts,cb){opened.push(opts);cb({id:55})}},
 scripting:{executeScript(opts,cb){injections++;assert.equal(opts.target.tabId,23);cb([])}}};
const context={globalThis:{chrome:api,crypto:{randomUUID:()=> 'capture-123456'}},document:doc,window:{close(){closing=true}},Image,
 MangoCaptureStore:{png:d=>d===imgData,save:async(id,meta,frames)=>{saves.push({id,meta,frames})}},Promise,Error,encodeURIComponent};
vm.runInNewContext(read('popup.js'),context);
(async()=>{
 await handlers['#visible:click']();
 if(!screenshots)console.log('Capture status:',doc.querySelector('#status').textContent);
 assert.equal(screenshots,1,'visible area must capture directly before editor opens');
 assert.equal(saves.length,1);assert.equal(saves[0].frames[0].dataUrl,imgData);
 assert.equal(opened[0].active,true);assert.match(opened[0].url,/capture-result.html\?stored=capture-123456/);
 assert.equal(closing,true);
 console.log('PASS: toolbar visible screenshot uses direct capture, local storage and active quick-copy result');
})().catch(e=>{console.error(e);process.exitCode=1});
