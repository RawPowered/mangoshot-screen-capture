const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const events=new Map(),calls=[];let value=0,cb=null,readyState=4,seeking=false;
const video={
 get currentTime(){return value},
 set currentTime(v){seeking=true;readyState=1;calls.push('seek:'+v);value=v;
  queueMicrotask(()=>{seeking=false;readyState=4;events.get('seeked')?.();});},
 get seeking(){return seeking},get readyState(){return readyState},
 pause(){calls.push('pause')},play(){calls.push('play');return Promise.resolve()},
 requestVideoFrameCallback(fn){cb=fn;return 1},cancelVideoFrameCallback(){cb=null},
 addEventListener(name,fn){events.set(name,fn)},removeEventListener(name,fn){if(events.get(name)===fn)events.delete(name)
 }};
const context={Float32Array,Error,queueMicrotask,setTimeout,clearTimeout,requestAnimationFrame:fn=>{cb=fn;return 1;},
 cancelAnimationFrame:()=>{cb=null}};context.globalThis=context;
for(const script of ['sequence-media.js','sequence-preview.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',script),'utf8'),context,{filename:script});
const clips=[{start:0,end:2},{start:4,end:7}],positions=[];
const model=context.MangoSequencePreview.create(video,()=>clips,x=>{calls.push('paint:'+x);positions.push(x);});
assert.equal(model.seekOutput(2),true);
assert.deepEqual(calls.slice(0,2),['paint:2','seek:4'],
 'Selection must paint last stable frame before decoder seeks to the new clip');
assert.equal(model.current(),2,'Logical sequence time must remain selected through pending decode');
assert.equal(context.MangoSequenceMedia.atOutput(clips,2).source,4);
const rendered=fs.readFileSync(path.join(__dirname,'..','clip-studio.js'),'utf8');
assert.match(rendered,/video\.seeking\|\|video\.readyState<2\)return/,
 'Preview compositor should retain last frame while a seek invalidates decoding');
assert.match(rendered,/MangoCreativeZoom\.draw\(ctx,video,zoomEvents,mapped,w,h\)/,
 'Program Monitor should paint a complete frame not solely graphics');
assert.match(rendered,/if\(exportVideo\.readyState>=2&&!exportVideo\.seeking\)/,
 'Export must hold last frame while between AutoCut source ranges');
const loop=rendered.match(/function draw\(\)\{[\s\S]*?paintHandle=requestAnimationFrame\(draw\);/);
assert.ok(loop&&!loop[0].includes("fillRect(0,0,width,height)"),
 'No repeated black clear should occur in MediaRecorder frame loop');
const ui=fs.readFileSync(path.join(__dirname,'..','clip-studio.html'),'utf8');
assert.ok(ui.includes('id="cc-track"')&&ui.includes('id="caption-studio-panel"'));
assert.ok(ui.indexOf('caption-core-v072.js')<ui.indexOf('clip-studio.js'));
assert.ok(ui.indexOf('clip-studio.js')<ui.indexOf('caption-studio-v072.js'));
const map=context.MangoSequenceMedia.sections(clips);
assert.equal(map[0].outputEnd,map[1].outputStart,'AutoCut output sections must meet exactly');
console.log('PASS: selection seeks preserve prior preview frame, CC timeline wiring and no black-clearing export loop');
