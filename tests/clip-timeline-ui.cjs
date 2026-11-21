const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const items=new Map(),events={},commits=[],messages=[];
const node=(id)=>{if(items.has(id))return items.get(id);const o={id,value:id==='timeline-zoom'?'1':'',textContent:'',disabled:false,style:{},children:[],listeners:{},
 addEventListener(k,fn){this.listeners[k]=fn;},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},getBoundingClientRect(){return {left:100,width:600};},click(){this.listeners.click?.();}};items.set(id,o);return o;};
const video={currentTime:60,pause(){},play(){return Promise.resolve();}};
const state={duration:()=>120,video:()=>video,segments:()=>[{start:0,end:120}],url:()=>null,exporting:()=>false,
 message:s=>messages.push(s),commit:(segments,message)=>{commits.push(segments);messages.push(message);}};
const ctx={document:{getElementById:node,createElement:type=>({type,style:{},textContent:'',className:'',title:''}),addEventListener(k,fn){events[k]=fn;}},
 globalThis:{MangoClipView:state},Math,Number,Promise,setTimeout};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','clip-timeline-ui.js'),'utf8'),ctx);
const ui=ctx.globalThis.MangoClipTimeline;
ui.reset();assert.ok(node('timeline-ruler').children.length>=5,'Timeline ruler ticks');
node('add-marker').listeners.click();assert.equal(node('marker-list').children.length,1,'Marker should be represented in project bin');
node('split').listeners.click();assert.equal(commits.length,1);assert.equal(commits[0].length,2);
assert.equal(commits[0][0].end,60);assert.equal(commits[0][1].start,60);
node('timeline-zoom').value='2';node('timeline-zoom').listeners.input();assert.equal(node('timeline-inner').style.width,'200%');
node('timeline-ruler').listeners.pointerdown({clientX:400});assert.equal(video.currentTime,60);
console.log('PASS: timeline ruler, source scrubbing, marker, non-destructive split, zoom');
