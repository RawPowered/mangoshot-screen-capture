const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let callback=null,id=0,playing=false;const updates=[];
const events=new Map();let currentTime=0;
const video={get currentTime(){return currentTime},set currentTime(v){currentTime=v;queueMicrotask(()=>events.get('seeked')?.());},
 pause(){playing=false},play(){playing=true;return Promise.resolve()},requestVideoFrameCallback(cb){callback=cb;return ++id},cancelVideoFrameCallback(){callback=null},
 addEventListener(name,fn){events.set(name,fn)},removeEventListener(name,fn){if(events.get(name)===fn)events.delete(name);}};
const context={queueMicrotask,requestAnimationFrame:fn=>{callback=fn;return ++id},cancelAnimationFrame:()=>{callback=null},setTimeout,clearTimeout,Float32Array,Error};context.globalThis=context;
for(const source of ['sequence-media.js','sequence-preview.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',source),'utf8'),context);
const clips=[{start:0,end:2},{start:4,end:7}],model=context.MangoSequencePreview.create(video,()=>clips,n=>updates.push(n));
(async()=>{
 model.seekOutput(2);assert.equal(video.currentTime,4,'Seeking exact edit boundary must skip deleted media');
 model.seekOutput(0);await model.play();await Promise.resolve();
 assert.equal(model.isPlaying(),true);
 video.currentTime=1.985;const frame=callback;frame?.();await new Promise(resolve=>setTimeout(resolve,8));
 assert.ok(video.currentTime>=4&&video.currentTime<=4.05,'Preview must seek next retained clip at edit point');
 assert.equal(playing,true,'Program Monitor resumes after edit jump');
 video.currentTime=6.985;callback?.();await new Promise(resolve=>setTimeout(resolve,8));
 assert.equal(model.isPlaying(),false,'Preview must stop at end of edited sequence');
 assert.equal(model.current(),5);
 console.log('PASS: edited Program Monitor preview skips deleted region and tracks sequence time');
})().catch(e=>{console.error(e);process.exitCode=1});
