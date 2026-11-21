const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),els=new Map();let mimeMp4=false,downloads=[];
class FakeElement{
 constructor(id){this.id=id;this.disabled=false;this.hidden=false;this.value='0';this.textContent='';this.style={};this.children=[];this.listeners={};this.videoWidth=640;this.videoHeight=360;this.duration=24;this.currentTime=0;this.seekable={length:0};this.readyState=4;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);}
 replaceChildren(...children){this.children=children;}
 appendChild(node){this.children.push(node);}
 getContext(){return {clearRect(){},save(){},restore(){},setLineDash(){},fillRect(){},strokeRect(){}};}
 remove(){}
 click(){if(this.id==='a')downloads.push(this.download);}
 pause(){}
 play(){return Promise.resolve();}
 set src(value){this.source=value;setTimeout(()=>{for(const f of this.listeners.loadedmetadata||[])f();},0);}
 get src(){return this.source;}
}
const get=id=>{if(!els.has(id))els.set(id,new FakeElement(id));return els.get(id);};
const doc={getElementById:get,createElement:name=>new FakeElement(name),addEventListener(){},body:{appendChild(){}}};
const ctx={document:doc,window:{addEventListener(){}},Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  MediaRecorder:class {static isTypeSupported(type){return type.includes('webm')||(mimeMp4&&type.includes('mp4'));}},
  URLSearchParams,location:{search:''},setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms||0,30)),clearTimeout,requestAnimationFrame:cb=>setTimeout(cb,1)};
ctx.globalThis=ctx;const run=filename=>vm.runInNewContext(fs.readFileSync(path.join(root,filename),'utf8'),ctx);
run('clip-timeline.js');run('clip-edit-ops.js');run('clip-graphics.js');run('media-format.js');ctx.MangoClips={load:async()=>null,clear:async()=>null};run('clip-studio.js');
(async()=>{
 await get('file').listeners.change[0]({target:{files:[new Blob([Uint8Array.from([0x1a,0x45,0xdf,0xa3,0,0,0,0])],{type:'video/webm'})]}});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(get('duration').textContent,/0:24/);
 assert.equal(get('ripple-delete').disabled,false,'Ripple Delete enabled after video load');
 assert.equal(get('export-webm').textContent,'Save WebM (instant)');
 get('export-webm').onclick();assert.equal(downloads.length,1,'Unedited WebM must copy immediately');
 assert.equal(get('export-mp4').disabled,true,'MP4 must not be presented when encoder absent');
 get('in').value='5';get('out').value='10';get('cut').onclick();
 assert.equal(get('segments').children.length,2,'Middle cut should keep two clips');
 get('undo').onclick();assert.equal(get('segments').children.length,1);
 get('trim').onclick();assert.equal(get('segments').children.length,1);
 assert.match(get('duration').textContent,/0:05/);
 mimeMp4=true;get('reset').onclick();assert.equal(get('export-mp4').disabled,false);
 await get('file').listeners.change[0]({target:{files:[new Blob([Uint8Array.from([0,0,0,24,102,116,121,112,109,112,52,50])],{type:'video/webm'})]}});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(get('source-format').textContent.includes('MP4'),true,'Source header overrides misleading MIME');
 assert.equal(get('export-mp4').textContent,'Save MP4 (instant)');
 get('export-mp4').onclick();assert.equal(downloads.length,2,'Unedited MP4 should immediately copy bytes');
 assert.match(downloads.at(-1),/\.mp4$/);
 assert.match(get('export-webm').textContent,/Convert/,'MP4 to WebM must be labeled as a conversion');
 console.log('PASS: no-edit WebM/MP4 instant copy, edit list, codec gate, honest WebM conversion label');
})().catch(e=>{console.error(e);process.exitCode=1;});
