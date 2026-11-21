/* Regression: a delayed onstop from recording 1 must not corrupt recording 2. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const elements=new Map(),downloads=[],recorders=[];let stored=0,stops=0;
function track(){return {stop(){stops++;},getSettings(){return {width:640,height:360,displaySurface:'browser'};},addEventListener(){}};}
function stream(){return {getTracks(){return [track()];},getVideoTracks(){return [track()];},getAudioTracks(){return [];},addTrack(){}};}
function element(id){if(elements.has(id))return elements.get(id);
 const el={id,value:'',disabled:false,hidden:false,checked:false,style:{},dataset:{},textContent:'',className:'',listeners:{},readyState:4,
  addEventListener(type,fn){this.listeners[type]=fn;},getBoundingClientRect(){return {left:0,top:0,width:640,height:360};},
  getContext(){return {save(){},restore(){},drawImage(){},fillRect(){},clearRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}};},
  captureStream(){return stream();},setPointerCapture(){},setAttribute(){},replaceChildren(){},appendChild(){},play(){return Promise.resolve();},
  click(){if(id==='a')downloads.push(this.download);},remove(){}};
 elements.set(id,el);return el;
}
class MockRecorder{static isTypeSupported(type){return type.includes('webm');}
 constructor(_stream,{mimeType}){this.state='inactive';this.mimeType=mimeType;recorders.push(this);}
 start(){this.state='recording';}stop(){this.state='inactive';}
 finish(data='frame'){this.ondataavailable({data:new Blob([data],{type:this.mimeType})});this.onstop();}
 pause(){this.state='paused';}resume(){this.state='recording';}}
const recovery={async begin(mime){return {id:'r'+(++stored),mime,created:Date.now()};},async append(){},async mark(){},async list(){return [];},async latest(){return null;},async restore(){return new Blob([]);},async clearAll(){}};
const api={runtime:{lastError:null,id:'test',getURL:s=>'chrome-extension://test/'+s},scripting:{executeScript(_opts,cb){cb([]);}},tabs:{get(_id,cb){cb({url:'https://example.test'});},sendMessage(_id,_msg,cb){cb({ok:true});},create(_opts,cb){cb({id:50});}}};
const ctx={document:{getElementById:element,createElement:element,body:{appendChild(){}}},window:{addEventListener(){}},
 navigator:{mediaDevices:{getDisplayMedia:async()=>stream()}},CaptureController:undefined,MediaRecorder:MockRecorder,MangoRecovery:recovery,MangoClips:{save:async()=>{}},chrome:api,
 URL:{createObjectURL(){return 'blob:sample';},revokeObjectURL(){}},URLSearchParams,location:{search:''},Blob,Date,Math,Promise,
 requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setInterval(){return 1;},clearInterval(){},setTimeout:(fn,ms)=>{const t=setTimeout(fn,Math.min(ms||0,35));t.unref?.();return t;},clearTimeout};
ctx.globalThis=ctx;vm.runInNewContext(read('camera.js'),ctx);vm.runInNewContext(read('recorder.js'),ctx);
(async()=>{
 await element('start').listeners.click();assert.equal(recorders.length,1);
 const first=recorders[0];first.ondataavailable({data:new Blob(['early-first-fragment'],{type:first.mimeType})});element('stop').listeners.click();assert.ok(stops>0);
 await new Promise(resolve=>setTimeout(resolve,55));
 assert.equal(element('start').disabled,false,'After a bounded encoder stall the next session can start');
 assert.match(element('result-meta').textContent,/INCOMPLETE/);
 await element('start').listeners.click();assert.equal(recorders.length,2);
 const second=recorders[1];assert.equal(element('stop').disabled,false);
 first.finish('late-first-data');
 assert.equal(element('stop').disabled,false,'First late onstop must not stop second session');
 assert.equal(element('record-state').textContent,'Recording','First late onstop must not replace second session state');
 assert.equal(downloads.length,1,'First session must still finish and download separately');
 element('stop').listeners.click();second.finish('second-data');
 assert.equal(downloads.length,2,'Second session must finalize its own data');
 assert.equal(element('record-state').textContent,'Ready to edit');
 assert.equal(element('start').disabled,false);
 console.log('PASS: two independent recording sessions, delayed first finalization, no UI/data overwrite');
})().catch(e=>{console.error(e);process.exitCode=1});
