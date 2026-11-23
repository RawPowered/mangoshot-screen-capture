const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const scope={};scope.globalThis=scope;
for(const file of ['clip-timeline.js','clip-edit-ops.js','clip-graphics.js','sequence-operations.js','auto-cut.js','auto-cut-analysis.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),scope,{filename:file});
const ac=scope.MangoAutoCut,analysis=scope.MangoAutoCutAnalysis;
const sr=8000,duration=10,arr=new Float32Array(sr*duration);
for(let i=0;i<arr.length;i++){
 const t=i/sr;arr[i]=(t<2||t>=4&&t<6||t>=8)?.25*Math.sin(i*.55):0;
}
const pcm={sampleRate:sr,numberOfChannels:1,length:arr.length,duration:duration,getChannelData:()=>arr};
const silence=ac.silence(pcm,{thresholdDb:-35,minDuration:.8,padding:.1});
assert.equal(silence.length,2,'detect two silent intervals');
assert.ok(silence[0].start>=2&&silence[0].end<=4.01);
assert.ok(silence[1].start>=6&&silence[1].end<=8.01);
const original=[{start:0,end:10}],layers=[{id:'title',start:4.4,end:5.5,visible:true}],markers=[{time:1,label:'intro'},{time:4.2,label:'middle'},{time:9.5,label:'end'}];
const all=ac.proposals(silence,original,layers,{protectOverlays:true,maxFraction:.7});
assert.equal(all.length,2);
const tx=ac.apply(original,layers,markers,all);
const removed=all.reduce((s,x)=>s+x.end-x.start,0);
assert.ok(Math.abs(scope.MangoEditOps.length(tx.segments)-(10-removed))<.0001,'all removals must close without gaps');
assert.equal(tx.applied,2);assert.ok(Math.abs(tx.removed-removed)<.0001);
assert.deepEqual(Array.from(original,p=>[p.start,p.end]),[[0,10]],'original source must not change');
assert.ok(tx.layers[0].start<layers[0].start,'graphics after removed region move left');
assert.ok(tx.markers.at(-1).time<markers.at(-1).time,'markers after cut move left');
// Existing manual cuts: a silence interval outside retained source must never
// remove an unrelated section in the edited sequence.
const edited=[{start:0,end:3},{start:7,end:10}];
const mapped=ac.toSequence([{start:2,end:8,reason:'silence'}],edited);
assert.deepEqual(Array.from(mapped,x=>[x.start,x.end]),[[2,4]],'source time maps into current, contiguous sequence time');
const protectedRanges=ac.proposals([{start:1,end:7,reason:'still screen'}],original,[{start:2,end:4,visible:true}],{protectOverlays:true});
assert.equal(protectedRanges.length,2);assert.ok(protectedRanges[0].end<=2+.001);assert.ok(protectedRanges[1].start>=4-.001);
const still=ac.stillFrames([
 {start:0,end:1,motion:.2},{start:1,end:2,motion:.002},{start:2,end:3,motion:.003},
 {start:3,end:4,motion:.002},{start:4,end:5,motion:.001},{start:5,end:6,motion:.3}],
 {minDuration:2,padding:.2,threshold:.01,sourceDuration:6});
assert.equal(still.length,1,'visual static footage detection');
assert.ok(still[0].start>1&&still[0].end<5);
assert.ok(analysis.frameDifference(Uint8ClampedArray.from([0,0,0,255]),Uint8ClampedArray.from([255,255,255,255]))>.95);
assert.throws(()=>ac.apply(original,layers,markers,[]),/No AutoCut ranges/);
const excessive=ac.proposals([{start:0,end:99,reason:'silence'}],[{start:0,end:100}],[],{maxFraction:.7});
assert.ok(excessive.reduce((s,r)=>s+r.end-r.start,0)<71,'max-cut safety budget enforced');
console.log('PASS: local silence and still-frame analysis, sequence mapping, layer protection, one-step gapless ripple transaction');
