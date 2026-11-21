const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const elements=new Map(),windowEvents={};let displayCalls=0,micCalls=0,zoomWheelBlocked=false;
function track(){return {stop(){},getSettings(){return {width:800,height:450,displaySurface:'browser'};},addEventListener(){}};}
function stream(){return {getTracks(){return [track()];},getVideoTracks(){return [track()];},getAudioTracks(){return [];},addTrack(){}};}
function el(id){if(elements.has(id))return elements.get(id);
 const node={id,disabled:false,hidden:false,checked:false,value:id==='size'?'5':'',style:{},textContent:'',className:'',listeners:{},
   addEventListener(name,fn){this.listeners[name]=fn;},getBoundingClientRect(){return {left:0,top:0,width:800,height:450};},
   getContext(){return {clearRect(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};},
   setPointerCapture(){},captureStream(){return stream();},play(){return Promise.resolve();},setAttribute(){},appendChild(){},remove(){},click(){}};
 if(id==='mic')node.checked=true;
 elements.set(id,node);return node;
}
class MockRecorder{
 static isTypeSupported(t){return t.includes('webm');}
 constructor(_s,{mimeType}){this.mimeType=mimeType;this.state='inactive';}
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable({data:new Blob(['video'],{type:this.mimeType}),size:5});this.onstop();}
 pause(){this.state='paused';}resume(){this.state='recording';}
}
const document={getElementById:el,body:{appendChild(){}},createElement(type){return el('virtual-'+type);}};
const window={addEventListener(k,fn){windowEvents[k]=fn;},MediaRecorder:MockRecorder};
const navigator={mediaDevices:{getDisplayMedia:async()=>{displayCalls++;return stream();},getUserMedia:async()=>{micCalls++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}}};
const URL={createObjectURL(){return 'blob:test';},revokeObjectURL(){}};
const ctx={document,window,navigator,MediaRecorder:MockRecorder,URL,URLSearchParams,location:{search:''},Blob,
  Date,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setInterval:()=>1,clearInterval(){},setTimeout:()=>1};
ctx.globalThis=ctx;
vm.runInNewContext(read('camera.js'),ctx);vm.runInNewContext(read('recorder.js'),ctx);
(async()=>{
 assert.equal(el('start').disabled,false);
 await el('start').listeners.click();assert.equal(displayCalls,1);assert.equal(micCalls,1);
 assert.equal(el('stop').disabled,false);assert.match(el('status').textContent,/Microphone unavailable/);
 assert.equal(el('mode').disabled,false);
 el('mode').listeners.click();assert.equal(el('mode').textContent,'Interaction: ON');
 el('mode').listeners.click();assert.equal(el('mode').textContent,'Interaction: OFF');
 windowEvents.keydown({key:'Control',ctrlKey:true,altKey:false,target:{matches(){return false;}}});
 assert.equal(el('ink').style.pointerEvents,'auto');
 el('screen-wrap').listeners.wheel({ctrlKey:true,deltaY:-100,clientX:400,clientY:200,preventDefault(){zoomWheelBlocked=true;},stopImmediatePropagation(){}});
 assert.equal(zoomWheelBlocked,true);assert.notEqual(el('zoomReadout').textContent,'100%');
 windowEvents.keydown({key:'0',code:'Digit0',ctrlKey:true,altKey:true,target:{matches(){return false;}},preventDefault(){}});
 assert.equal(el('zoomReadout').textContent,'100%');
 windowEvents.keydown({key:'c',code:'KeyC',ctrlKey:true,altKey:true,target:{matches(){return false;}},preventDefault(){}});
 assert.equal(el('mode').textContent,'Interaction: ON');
 windowEvents.keydown({key:'e',ctrlKey:true,altKey:false,target:{matches(){return false;}},preventDefault(){}});
 assert.match(el('status').textContent,/Ink cleared/);
 el('stop').listeners.click();assert.equal(el('result').hidden,false);
 assert.match(el('result-meta').textContent,/WebM/);console.log('PASS: recorder picker, mic fallback, interaction toggle, hotkeys, zoom, video finalization');
})().catch(e=>{console.error(e);process.exitCode=1;});
