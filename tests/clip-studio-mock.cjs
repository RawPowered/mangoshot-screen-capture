const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),els=new Map();let mimeMp4=false;
class FakeElement{
 constructor(id){this.id=id;this.disabled=false;this.hidden=false;this.value='0';this.textContent='';this.style={};this.children=[];this.listeners={};this.videoWidth=640;this.videoHeight=360;this.duration=24;this.currentTime=0;this.seekable={length:0};this.readyState=4;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);}
 replaceChildren(...children){this.children=children;}
 appendChild(node){this.children.push(node);}
 remove(){}
 pause(){}
 play(){return Promise.resolve();}
 set src(value){this.source=value;setTimeout(()=>{for(const f of this.listeners.loadedmetadata||[])f();},0);}
 get src(){return this.source;}
}
const get=id=>{if(!els.has(id))els.set(id,new FakeElement(id));return els.get(id);};
const doc={getElementById:get,createElement:name=>new FakeElement(name),body:{appendChild(){}}};
const ctx={document:doc,window:{addEventListener(){}},Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  MediaRecorder:class {static isTypeSupported(type){return type.includes('webm')||(mimeMp4&&type.includes('mp4'));}},
  setTimeout,clearTimeout,requestAnimationFrame:cb=>setTimeout(cb,1)};
ctx.globalThis=ctx;const run=filename=>vm.runInNewContext(fs.readFileSync(path.join(root,filename),'utf8'),ctx);
run('clip-timeline.js');run('media-format.js');ctx.MangoClips={load:async()=>null,clear:async()=>null};run('clip-studio.js');
(async()=>{
 await get('file').listeners.change[0]({target:{files:[new Blob([Uint8Array.from([0x1a,0x45,0xdf,0xa3,0,0,0,0])],{type:'video/webm'})]}});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(get('duration').textContent,/0:24/);
 assert.equal(get('export-mp4').disabled,true,'MP4 must not be presented when encoder absent');
 get('in').value='5';get('out').value='10';get('cut').onclick();
 assert.equal(get('segments').children.length,2,'Middle cut should keep two clips');
 get('undo').onclick();assert.equal(get('segments').children.length,1);
 get('trim').onclick();assert.equal(get('segments').children.length,1);
 assert.match(get('duration').textContent,/0:05/);
 mimeMp4=true;get('reset').onclick();assert.equal(get('export-mp4').disabled,false);
 console.log('PASS: import, cut, undo, trim, codec gate for MP4');
})().catch(e=>{console.error(e);process.exitCode=1;});
