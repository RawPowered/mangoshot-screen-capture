const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const nodes={},events={},downloads=[],states=[];let recorder,stopped=0;
const ele=id=>nodes[id]??=( {id,disabled:false,hidden:false,checked:false,value:'',dataset:{},className:'',style:{},textContent:'',readyState:4,listeners:{},
 addEventListener(name,fn){this.listeners[name]=fn;},getBoundingClientRect(){return {left:0,top:0,width:640,height:360};},
 getContext(){return {save(){},restore(){},drawImage(){},fillRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};},
 captureStream(){return stream();},play(){return Promise.resolve();},setPointerCapture(){},setAttribute(){},click(){if(id==='a')downloads.push(this.download);},remove(){}} );
function t(){return {stop(){stopped++;},getSettings(){return {width:640,height:360,displaySurface:'monitor'};},addEventListener(){}};}
function stream(){return {getTracks(){return [t()];},getVideoTracks(){return [t()];},getAudioTracks(){return [];},addTrack(){}};}
class Recorder{static isTypeSupported(v){return v.includes('webm');}constructor(_s,opt){this.mimeType=opt.mimeType;this.state='inactive';recorder=this;}start(){this.state='recording';}stop(){this.state='inactive';}pause(){}resume(){}}
const recovery={async begin(mime){return {id:'s1',mime,created:Date.now()};},async append(){},async latest(){return null;},async mark(_session,status){states.push(status);},async discard(){}};
const chrome={runtime:{lastError:null},tabs:{}};
const context={document:{getElementById:ele,createElement:ele,body:{appendChild(){}}},window:{addEventListener(k,fn){events[k]=fn;}},
 navigator:{mediaDevices:{getDisplayMedia:async()=>stream()}},MediaRecorder:Recorder,MangoRecovery:recovery,MangoClips:{save:async()=>{}},
 chrome,Blob,URL:{createObjectURL(){return 'blob:x';},revokeObjectURL(){}},URLSearchParams,location:{search:''},Date,
 requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setInterval(){return 1;},clearInterval(){},
 setTimeout:(fn,ms)=>{const timer=setTimeout(fn,Math.min(ms||0,35));timer.unref?.();return timer;},clearTimeout};
context.globalThis=context;vm.runInNewContext(read('camera.js'),context);vm.runInNewContext(read('recorder.js'),context);
(async()=>{
 await ele('start').listeners.click();
 recorder.ondataavailable({data:new Blob(['fragment'],{type:'video/webm'})});
 const before=stopped;ele('stop').listeners.click();
 assert.ok(stopped>before,'Captured tracks must stop synchronously');
 assert.equal(ele('result').hidden,true);
 await new Promise(r=>setTimeout(r,55));
 assert.equal(ele('result').hidden,false,'Watchdog must expose flushed data if encoder stalls');
 assert.match(ele('result-meta').textContent,/INCOMPLETE/);
 assert.equal(downloads.length,0,'Incomplete recovery must not be presented as guaranteed-valid MP4/WebM');
 recorder.ondataavailable({data:new Blob(['fragment-final'],{type:'video/webm'})});recorder.onstop();
 assert.equal(downloads.length,1,'Late finalization should offer a new, complete file');
 assert.doesNotMatch(ele('result-meta').textContent,/INCOMPLETE/);
 console.log('PASS: encoder timeout exposes recovery, late onstop upgrades to complete download, source stops immediately');
})().catch(e=>{console.error(e);process.exitCode=1});
