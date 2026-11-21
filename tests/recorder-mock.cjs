const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../recorder.js'),'utf8');
let phase='normal',mimeSaved=null,capturedFile='',getDisplayCalls=0,micCalls=0,recState='inactive';
const events={},elements=new Map();
function element(id){if(elements.has(id))return elements.get(id);
 const el={id,style:{},hidden:false,disabled:false,checked:false,textContent:'',value:'5',className:'',
   listeners:{},addEventListener(name,fn){this.listeners[name]=fn},getBoundingClientRect(){return {left:0,top:0,width:640,height:360}},
   getContext(){return {clearRect(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}},
   setPointerCapture(){},getSettings(){return {width:640,height:360}},
   captureStream(){return stream()},play(){return Promise.resolve()},appendChild(){},remove(){},click(){capturedFile=this.download}};
 if(id==='#mic')el.checked=true;
 if(id==='#audio')el.checked=true;
 if(id==='#color')el.value='#ffcc00';
 elements.set(id,el);return el;
}
const track=()=>({stop(){},getSettings(){return {width:640,height:360}},addEventListener(){}});
const stream=()=>({getTracks(){return [track()]},getVideoTracks(){return [track()]},getAudioTracks(){return []}});
const doc={querySelector:element,createElement(name){return name==='canvas'?element('virtual-canvas'):element('virtual-anchor')},body:{appendChild(){}},getElementById:element};
const URL_={createObjectURL(blob){assert.ok(blob.size>0);mimeSaved=blob.type;return 'blob:mango'},revokeObjectURL(){}};
class Recorder{
 static isTypeSupported(t){return t.includes('webm')}
 constructor(s,config){this.mimeType=config.mimeType;this.state='inactive';this.onstop=null;this.ondataavailable=null}
 start(){this.state='recording';recState='recording'}
 stop(){this.state='inactive';recState='inactive';this.ondataavailable({data:new Blob([Buffer.alloc(4000)],{type:this.mimeType}),size:4000});this.onstop()}
 pause(){this.state='paused'}resume(){this.state='recording'}
}
const window_={addEventListener(name,fn){events[name]=fn},MediaRecorder:Recorder};
const navigator_={mediaDevices:{getDisplayMedia:async()=>{getDisplayCalls++;if(phase==='screen-denied'){const e=new Error('Denied');e.name='NotAllowedError';throw e;}return stream()},getUserMedia:async()=>{micCalls++;const e=new Error('Denied');e.name='NotAllowedError';throw e;}}};
const vmctx={document:doc,window:window_,navigator:navigator_,MediaRecorder:Recorder,Blob,URL:URL_,Date,
 requestAnimationFrame:()=>1,cancelAnimationFrame(){},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,AudioContext:class{}};
vm.runInNewContext(script,vmctx);
(async()=>{
 assert.match(element('#status').textContent,/Ready/);
 await element('#start').listeners.click();
 assert.equal(getDisplayCalls,1);
 assert.equal(micCalls,1);
 assert.equal(recState,'recording','Mic refusal must not abort screen video');
 assert.match(element('#status').textContent,/Microphone unavailable/);
 assert.equal(element('#video-placeholder').hidden,true);
 element('#stop').listeners.click();
 assert.equal(recState,'inactive');assert.match(capturedFile,/\.webm$/);assert.match(mimeSaved,/webm/);
 assert.equal(element('#video-placeholder').hidden,false);
 phase='screen-denied';await element('#start').listeners.click();
 assert.match(element('#status').textContent,/Screen sharing was denied/);
 assert.equal(element('#start').disabled,false);
 console.log('PASS: recorder starts without microphone, saves WebM, shows screen denial');
})().catch(e=>{console.error(e);process.exitCode=1});
