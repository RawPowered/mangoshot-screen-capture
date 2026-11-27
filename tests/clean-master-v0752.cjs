/* Run from repository root: node tests/clean-master-v0752.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../clean-master-v0752.js');
require('../creative-zoom.js');
const Z=globalThis.MangoCreativeZoom,C=require('../cursor-effects-v073.js'),capture=require('../cursor-capture-v0751.js'),D=require('../cursor-director-core-v074.js');
const fit={x:0,y:0,w:1,h:1},settings=C.preset('off'),builder=capture.create(C.config,'clean'),legacy=C.createTrace();
for(let i=0;i<=120;i++){const t=i/30,p={x:.25+t*.05,y:.4},z=t<=1?1:t<=2?1+t-1:t<=3?2:2-(t-3),cx=.5,cy=.5;
 const fx={...settings,spotlight:t>=.5&&t<2,ring:t>=1&&t<3};builder.frame(t,p,{zoom:z,cx,cy},fit,fx,'linked',true);legacy.add(t,p);}
const trace=legacy.finish(builder.finish());assert.equal(trace.capture.master,'clean');assert.equal(trace.baked,false);
const rebuilt=M.rebuild(trace,4),keys=Z.check(rebuilt.zoomFrames),regions=D.regions(rebuilt.regions,4);
assert.ok(keys.length>=2);assert.ok(keys.every(k=>k.ease==='linear'));assert.ok(regions.length>=2);assert.ok(regions.every(r=>M.isLive(r.id)));
for(const [time,scale] of [[0,1],[1,1],[1.5,1.5],[2.5,2],[3.5,1.5],[4,1]])assert.ok(Math.abs(Z.at(keys,time).scale-scale)<.12,'camera sample '+time);
assert.ok(Math.abs(Z.at(keys,2.5).x-.5)<.01);
const imported=regions[0],post={...imported,id:'post-test',style:D.style({ring:true,spotlight:false})};
assert.equal(D.regions([...regions,post],4).length,regions.length+1);
assert.throws(()=>D.regions([...regions,{...imported,id:'live-capture-overlap'}],4),/Overlapping/);
assert.throws(()=>M.rebuild({...trace,baked:true},4),/clean master/i);
assert.throws(()=>M.rebuild({...trace,capture:{...trace.capture,master:'composite'}},4),/clean master/i);
assert.equal(M.rebuild({...trace,truncated:true},4).zoomFrames.length,0);
const letterbox=trace.capture.cameraFrames.map(s=>[...s.slice(0,4),.1,0,.8,1]);
assert.equal(M.camera(letterbox,4).items.length,0);assert.match(M.camera(letterbox,4).notice,/letterboxed/);
const changed=Z.at([{id:'linear',start:0,duration:1,scale:2,x:.8,y:.2,ease:'linear'}],.5);
assert.ok(Math.abs(changed.scale-1.5)<1e-9);assert.ok(Math.abs(changed.x-.8)<1e-9);
assert.equal(Z.at([{id:'legacy',start:0,duration:1,scale:2,x:.8,y:.2}],.5).x,.65);
const recorder=fs.readFileSync('recorder.js','utf8'),html=fs.readFileSync('clip-studio.html','utf8'),studio=fs.readFileSync('clip-studio.js','utf8');
assert.ok(recorder.includes('canvas:recordingCanvas')&&recorder.includes('control.drawSource(rawCtx,media,MangoCamera.camera()')&&recorder.includes('if(!rawCtx)ctx.drawImage(ink'));
assert.ok(html.includes('id="live-fx-track-v0752"')&&html.indexOf('clean-master-v0752.js')<html.indexOf('clip-studio.js'));
assert.ok(studio.includes('restoreCapturedLive()')&&studio.includes('MangoCleanMasterV0752.rebuild'));
console.log('PASS: clean metadata, camera reconstruction, separate live/post regions, affine interpolation, legacy compatibility, validation and integration anchors');
