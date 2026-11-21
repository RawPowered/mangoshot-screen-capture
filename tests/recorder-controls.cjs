const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const elements=new Map(),windowEvents={},downloads=[],sent=[],appendCalls=[];
let displayCalls=0,micCalls=0,scrollForwarded=false,stoppedTracks=0,clearCalls=0,latestRecorder;
function track(){return {stop(){stoppedTracks++;},getSettings(){return {width:800,height:450,displaySurface:'browser'};},addEventListener(){}};}
const cameraTrack=track(),canvasTrack=track();
function screenStream(){return {getTracks(){return [cameraTrack];},getVideoTracks(){return [cameraTrack];},getAudioTracks(){return [];},addTrack(){}};}
function canvasStream(){return {getTracks(){return [canvasTrack];},getVideoTracks(){return [canvasTrack];},getAudioTracks(){return [];},addTrack(){}};}
function el(id){if(elements.has(id))return elements.get(id);
 const node={id,disabled:false,hidden:false,checked:false,value:id==='size'?'5':'',style:{},dataset:{},textContent:'',className:'',listeners:{},readyState:4,
  addEventListener(name,fn){this.listeners[name]=fn;},getBoundingClientRect(){return {left:0,top:0,width:800,height:450};},
  getContext(){return {save(){},restore(){},clearRect(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};},
  setPointerCapture(){},captureStream(){return canvasStream();},play(){return Promise.resolve();},setAttribute(){},appendChild(){},remove(){},click(){if(this.id==='a')downloads.push(this.download);}};
 if(id==='mic')node.checked=true;if(id==='linked-consent')node.checked=true;
 elements.set(id,node);return node;
}
class MockRecorder{
 static isTypeSupported(t){return t.includes('webm');}
 constructor(_s,{mimeType}){this.mimeType=mimeType;this.state='inactive';latestRecorder=this;}
 start(){this.state='recording';}
 stop(){this.state='inactive';}
 finish(){this.ondataavailable({data:new Blob(['WEBM-RECORDED'],{type:this.mimeType})});this.onstop();}
 pause(){this.state='paused';}resume(){this.state='recording';}
}
const document={getElementById:el,body:{appendChild(){}},createElement(type){return el(type);}};
const window={addEventListener(k,fn){windowEvents[k]=fn;},MediaRecorder:MockRecorder};
const navigator={mediaDevices:{getDisplayMedia:async()=>{displayCalls++;return screenStream();},getUserMedia:async()=>{micCalls++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}}};
const URL={createObjectURL(){return 'blob:test';},revokeObjectURL(){}};
const MangoRecovery={async begin(mime){return {id:'session-1',mime,created:Date.now()};},async append(s,i,blob){appendCalls.push({s,i,blob});},async mark(){},async latest(){return null;},async restore(){return new Blob([]);},async discard(){},async clearAll(){clearCalls++;}};
const MangoClips={save:async()=>{},load:async()=>{}};
const chrome={runtime:{lastError:null,id:'mock',getURL:p=>'chrome-extension://mock/'+p},scripting:{executeScript(o,cb){cb([]);}},tabs:{get(id,cb){cb({id,url:'https://example.test/'});},sendMessage(id,message,cb){sent.push(message);cb({ok:true});},create(o,cb){cb({id:50});}}};
class CaptureController{forwardWheel(){scrollForwarded=true;return Promise.resolve();}setFocusBehavior(){}}
const ctx={document,window,navigator,CaptureController,MediaRecorder:MockRecorder,URL,URLSearchParams,location:{search:'?source=23'},Blob,MangoRecovery,MangoClips,chrome,
 Date,Math,Number,Promise,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setInterval:()=>1,clearInterval(){},setTimeout:(fn,ms)=>{const t=setTimeout(fn,Math.min(30,ms||0));t.unref();return t;},clearTimeout};
ctx.globalThis=ctx;
vm.runInNewContext(read('camera.js'),ctx);vm.runInNewContext(read('recorder.js'),ctx);
const pointer=(x,y,options={})=>({button:0,clientX:x,clientY:y,ctrlKey:!!options.ctrl,altKey:!!options.alt,
 pointerType:'pen',pressure:.65,preventDefault(){},getCoalescedEvents(){return [this]}});
const keyboard=(key,ctrl=false,alt=false)=>({key,code:'Key'+key.toUpperCase(),ctrlKey:ctrl,altKey:alt,target:{matches(){return false;}},preventDefault(){}});
(async()=>{
 assert.equal(el('start').disabled,false);
 await el('start').listeners.click();assert.equal(displayCalls,1);assert.equal(micCalls,1);
 assert.equal(el('stop').disabled,false);assert.match(el('status').textContent,/Microphone unavailable/);
 assert.equal(el('enable-scroll').disabled,false);
 el('enable-scroll').listeners.click();await Promise.resolve();assert.equal(scrollForwarded,true);
 // Wacom strokes: verify more than 50 undo decisions remain usable without raster snapshots.
 for(let n=0;n<60;n++){
  el('ink').listeners.pointerdown(pointer(100,200));
  el('ink').listeners.pointermove(pointer(120+n%3,220));
  el('ink').listeners.pointerup(pointer(120,220));
 }
 assert.equal(el('undo').disabled,false);
 for(let n=0;n<50;n++)windowEvents.keydown(keyboard('z',true));
 assert.equal(el('undo').disabled,false,'At least 50 distinct undo steps must work');
 for(let n=0;n<10;n++)windowEvents.keydown(keyboard('z',true));
 assert.equal(el('undo').disabled,true);
 // After Effects-style Ctrl + upward drag to zoom in, downward drag to zoom out.
 el('zoomIn').listeners.click();const before=parseInt(el('zoomReadout').textContent,10);
 windowEvents.keydown(keyboard('Control',true));
 el('ink').listeners.pointerdown(pointer(400,230,{ctrl:true}));
 el('ink').listeners.pointermove(pointer(400,100,{ctrl:true}));
 const up=parseInt(el('zoomReadout').textContent,10);assert.ok(up>before);
 el('ink').listeners.pointermove(pointer(400,360,{ctrl:true}));
 const down=parseInt(el('zoomReadout').textContent,10);assert.ok(down<up);
 el('ink').listeners.pointerup(pointer(400,360,{ctrl:true}));
 windowEvents.keyup(keyboard('Control'));
 el('zoomRegion').listeners.click();
 el('ink').listeners.pointerdown(pointer(80,80));
 el('ink').listeners.pointermove(pointer(440,280));
 assert.equal(el('zoom-selection').hidden,false,'Region marquee must appear while dragging');
 assert.ok(Number.parseFloat(el('zoom-selection').style.width)>0,'Region border must have visible dimensions');
 el('ink').listeners.pointerup(pointer(440,280));
 assert.equal(el('zoom-selection').hidden,true);
 // Held Ctrl+Alt instead of a sticky interaction toggle.
 windowEvents.keydown(keyboard('Alt',true,true));assert.equal(el('ink').style.pointerEvents,'none');
 assert.match(el('mode').textContent,/HELD/);
 let prevented=false;
 el('screen-wrap').listeners.wheel({target:el('preview'),deltaY:260,clientX:300,clientY:180,
   preventDefault(){prevented=true;}});
 await Promise.resolve();await Promise.resolve();
 assert.equal(prevented,true,'Explicitly linked tab should intercept Ctrl+Alt wheel');
 assert.ok(sent.some(message=>message.type==='MANGO_LINKED_SCROLL'&&message.dy===260),
   'Ctrl+Alt wheel forwards scrolling to consented linked tab');
 windowEvents.keyup(keyboard('Alt',false,false));assert.equal(el('ink').style.pointerEvents,'auto');
 // Stop must release capture tracks and timer immediately, BEFORE the encoder finally emits onstop.
 const previousStops=stoppedTracks;
 el('stop').listeners.click();
 assert.ok(stoppedTracks>previousStops,'Stop releases capture tracks synchronously');
 assert.equal(el('light').className,'record-dot idle');
 assert.match(el('status').textContent,/Capture stopped/);
 assert.equal(el('result').hidden,true,'Encoder has not finalized yet');
 latestRecorder.finish();
 assert.equal(el('result').hidden,false);assert.match(el('result-meta').textContent,/WebM/);
 assert.equal(downloads.length,1,'Original video must automatically save once the encoder completes');
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(appendCalls.length,1,'Encoded chunks are incrementally persisted for recovery');
 await el('dismiss-recovery').listeners.click();
 assert.equal(clearCalls,1,'Privacy control must delete all cached local recovery sessions');
 console.log('PASS: 60 Wacom strokes/undo, Ctrl-dolly zoom, visible region marquee, held interaction, immediate stop, video autosave and recovery chunk');
})().catch(error=>{console.error(error);process.exitCode=1;});
