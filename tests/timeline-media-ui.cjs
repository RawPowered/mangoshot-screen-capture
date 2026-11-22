const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const uiMap=new Map();let images=0;const paint=[];
class Element{
 constructor(id){this.id=id;this.style={};this.dataset={};this.value=id==='timeline-zoom'?'1':'';this.listeners={};this.textContent='';this.children=[];this.width=960;this.height=46;this.disabled=false;this.readyState=2;this.videoWidth=640;this.videoHeight=360;this.duration=6;this._current=0;this.classList={toggle(){}};}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==fn)}
 get currentTime(){return this._current}
 set currentTime(v){this._current=v;queueMicrotask(()=>this.listeners.seeked?.forEach(fn=>fn()))}
 set src(v){this._src=v;queueMicrotask(()=>{for(const event of ['loadedmetadata','loadeddata'])this.listeners[event]?.forEach(fn=>fn())})}
 get src(){return this._src}
 getContext(){return {clearRect(){paint.length=0},fillRect(_x,_y,_width,h){paint.push(h)},drawImage(){}}}
 toBlob(done){queueMicrotask(()=>done(new Blob(['thumbnail']))) }
 removeAttribute(){} load(){} pause(){}
 replaceChildren(){this.children=[]}appendChild(child){this.children.push(child)}setAttribute(){}
 getBoundingClientRect(){return {left:0,right:800,width:800}}
 click(){this.listeners.click?.forEach(fn=>fn())}
 }
const node=id=>{if(!uiMap.has(id))uiMap.set(id,new Element(id));return uiMap.get(id)};
const document={getElementById:node,createElement:type=>new Element(type),addEventListener(){}};
let clips=[{start:0,end:6}],message='';
const ctx={document,Blob,Float32Array,queueMicrotask,Math,Number,Promise,setTimeout,clearTimeout,
 URL:{createObjectURL:()=>`blob:thumb-${++images}`,revokeObjectURL(){}},
 AudioContext:class{decodeAudioData(){const values=new Float32Array(6000).fill(.08);values.fill(1,2000,4000);return Promise.resolve({numberOfChannels:1,duration:6,getChannelData:()=>values});}close(){return Promise.resolve()}}};
ctx.globalThis=ctx;
const state={duration:()=>6,outputDuration:()=>ctx.MangoSequenceMedia.duration(clips),segments:()=>clips,original:()=>new Blob(['audio test']),url:()=> 'blob:source',exporting:()=>false,video:()=>node('video'),message:s=>message=s,seekOutput(){},outputAt:x=>x,sequencePosition:()=>0};
ctx.MangoClipView=state;
function run(file){vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx)}
run('sequence-media.js');run('clip-edit-ops.js');run('clip-timeline-ui.js');
(async()=>{
 const timeline=ctx.MangoClipTimeline;timeline.reset();
 node('make-thumbnails').click();await new Promise(r=>setTimeout(r,100));
 assert.ok(node('thumbnail-strip').children.length>=12,'Generated sequence thumbnails');
 const beforeTitles=node('thumbnail-strip').children.map(x=>x.title);
 assert.ok(beforeTitles.some(x=>x.includes('source')));
 node('analyze-audio').click();await new Promise(r=>setTimeout(r,30));
 const peakBefore=Math.max(...paint);const highBefore=paint.filter(h=>h>15&&h<45).length;assert.ok(peakBefore>20,'Source waveform contains loud region');
 clips=[{start:0,end:2},{start:4,end:6}];
 timeline.onSequenceChange();timeline.render();await new Promise(r=>setTimeout(r,700));
 const titles=node('thumbnail-strip').children.map(x=>x.title);
 const sourceTimes=titles.map(t=>Number(t.match(/source\s(\d+):(\d+):(\d+)/)?.[3]??0));
 assert.equal(titles.length>=12,true);
 assert.ok(!sourceTimes.some(t=>t===3),'Edited thumbnail sources should skip source time 2–4 s');
 const peakAfter=Math.max(...paint.filter(h=>h<45));
 const highAfter=paint.filter(h=>h>15&&h<45).length;assert.ok(highAfter<highBefore*.15,'Edited A1 must remove waveform energy from deleted source interval');
 console.log('PASS: UI thumbnail reflow and A1 redraw follow V1 edits without re-decode');
})().catch(e=>{console.error(e);process.exitCode=1});
