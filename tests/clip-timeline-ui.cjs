const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const items=new Map(),events={},commits=[],messages=[];let rippleCalls=0,selectedRange=null,deleteCalls=0;
const node=(id)=>{if(items.has(id))return items.get(id);const o={id,value:id==='timeline-zoom'?'1':'',textContent:'',disabled:false,style:{},dataset:{},classList:{toggle(){}},children:[],listeners:{},setAttribute(){},scrollLeft:0,clientWidth:600,
 addEventListener(k,fn){this.listeners[k]=fn;},setPointerCapture(){},releasePointerCapture(){},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},getBoundingClientRect(){const width=id==='timeline-inner'?600*Number(node('timeline-zoom').value||1):600;return {left:100,right:100+width,width};},click(){this.listeners.click?.();}};items.set(id,o);return o;};
const video={currentTime:60,pause(){},play(){return Promise.resolve();}};
const state={duration:()=>120,outputDuration:()=>120,outputAt:x=>x,seekOutput:x=>{video.currentTime=x;},video:()=>video,segments:()=>[{start:0,end:120}],url:()=>null,exporting:()=>false,
 message:s=>messages.push(s),commit:(segments,message)=>{commits.push(segments);messages.push(message);},
 rippleDelete:(a,b)=>{rippleCalls++;messages.push('ripple '+a+'-'+b);return true;},
 setRange:(a,b)=>{selectedRange={a,b};},range:()=>selectedRange?{active:true,start:selectedRange.a,end:selectedRange.b}:{active:false},
 deleteSelection:()=>{deleteCalls++;return true;}};
const ctx={requestAnimationFrame:fn=>fn(),document:{getElementById:node,createElement:type=>({type,style:{},textContent:'',className:'',title:''}),addEventListener(k,fn){events[k]=fn;}},
 globalThis:{MangoClipView:state},Math,Number,Promise,setTimeout};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','clip-edit-ops.js'),'utf8'),ctx);ctx.MangoEditOps=ctx.globalThis.MangoEditOps;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','clip-timeline-ui.js'),'utf8'),ctx);
const ui=ctx.globalThis.MangoClipTimeline;
ui.reset();assert.ok(node('timeline-ruler').children.length>=5,'Timeline ruler ticks');
node('add-marker').listeners.click();assert.equal(node('marker-list').children.length,1,'Marker should be represented in project bin');
node('split').listeners.click();assert.equal(commits.length,1);assert.equal(commits[0].length,2);
assert.equal(commits[0][0].end,60);assert.equal(commits[0][1].start,60);
node('timeline-zoom').value='2';node('timeline-zoom').listeners.input();assert.equal(node('timeline-inner').style.width,'200%');
node('timeline-ruler').listeners.pointerdown({clientX:400,button:0,preventDefault(){}});assert.equal(video.currentTime,30,'Zoomed ruler maps screen coordinate to sequence time');
node('timeline-ruler').listeners.pointermove({clientX:700,preventDefault(){}});assert.equal(video.currentTime,60,'Dragging ruler continuously scrubs');
node('timeline-ruler').listeners.pointerup({});
node('timeline-playhead').listeners.pointerdown({clientX:550,button:0,preventDefault(){}});
assert.equal(video.currentTime,45,'Playhead drag starts continuous seek');
node('timeline-playhead').listeners.pointermove({clientX:650,preventDefault(){}});
assert.ok(video.currentTime>45,'Drag follows pointer');node('timeline-playhead').listeners.pointerup({});
const last=video.currentTime;node('timeline-ruler').listeners.wheel({deltaY:120,preventDefault(){}});
assert.ok(video.currentTime>last,'Wheel over ruler seeks forward');
node('range-tool').listeners.click();
assert.equal(node('range-tool').id,'range-tool');
node('timeline-ruler').listeners.pointerdown({clientX:220,button:0,currentTarget:node('timeline-ruler'),preventDefault(){}});
node('timeline-ruler').listeners.pointermove({clientX:480,preventDefault(){}});
node('timeline-ruler').listeners.pointerup({currentTarget:node('timeline-ruler')});
assert.ok(selectedRange.b-selectedRange.a>15,'Range tool must select timeline span through pointer movement');
node('ripple-delete').listeners.click();
assert.equal(deleteCalls,1,'Timeline must dispatch selected clip or selected range to main editor');
node('range-tool').listeners.click();
node('timeline-ruler').listeners.pointerdown({clientX:180,button:0,currentTarget:node('timeline-ruler'),shiftKey:true,preventDefault(){}});
node('timeline-ruler').listeners.pointermove({clientX:400,preventDefault(){}});
node('timeline-ruler').listeners.pointerup({currentTarget:node('timeline-ruler')});
assert.ok(selectedRange.b-selectedRange.a>=20,'Shift+drag ruler must choose a range without switching tools');
console.log('PASS: timeline ruler, source scrubbing, marker, non-destructive split, zoom');
