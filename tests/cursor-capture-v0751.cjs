/* Pure telemetry and compatibility tests; execute from repository root. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const core=require('../cursor-effects-v073.js'),C=require('../cursor-capture-v0751.js');
const settings=core.preset('off'),cam={zoom:1,cx:.5,cy:.5},fit={x:0,y:0,w:1,h:1};
const c=C.create(core.config),legacy=core.createTrace();
for(let i=0;i<120;i++){const p={x:i/120,y:.2};c.frame(i/30,p,cam,fit,settings,'linked',true);legacy.add(i/30,p);}
c.click(.1,{x:.1,y:.2});c.click(.11,{x:.2,y:.3});legacy.click(.1,{x:.1,y:.2});legacy.click(.11,{x:.2,y:.3});
c.frame(4,{x:.8,y:.2},{zoom:2,cx:.5,cy:.5},fit,{...settings,spotlight:true,zoomMode:'follow'},'linked',true);
c.sourceChanged(4.03);c.frame(4.06,{x:.9,y:.2},cam,fit,settings,'preview',true);c.frame(5,{x:.9,y:.2},cam,fit,settings,'preview',false);
const data=c.finish();legacy.markBaked();const t=legacy.finish(data);
assert.ok(t.samples.length>=115);assert.ok(data.sourceSamples.filter(x=>x[1]!==null).length>=115);assert.equal(data.sourceClicks.length,2);assert.equal(t.clicks.length,2);assert.ok(t.baked);
assert.equal(data.sourceSamples.at(-1)[1],null);assert.deepEqual(data.states.map(x=>[x[1],x[2]]),[['linked',0],['linked',0],['preview',1],['off',1]]);assert.equal(data.cameraFrames.find(x=>x[1]===2)[0],4);assert.deepEqual(core.trace(JSON.parse(JSON.stringify(t))),t);
assert.throws(()=>C.check({...data,sourceSamples:[[1,.1,.2],[.5,.1,.2]]},core.config));assert.throws(()=>C.check({...data,cameraFrames:[[1,2,.5,.5,.9,0,.5,1]]},core.config));assert.throws(()=>C.check({...data,states:[[0,'linked',0,null]]},core.config));
const spans=C.pathIntervals([[0,.5,.5],[.1,.5,.5],[.12,null,null],[1,.5,.5],[1.1,.5,.5]],2);assert.equal(spans[0].end,.12);assert.equal(spans[1].start,1);
assert.deepEqual(C.projectIntervals([{start:1,end:5}],[{start:0,end:2},{start:4,end:6}]),[{start:1,end:2},{start:2,end:3}]);assert.deepEqual(C.projectClicks([[1,.5,.5],[3,.5,.5],[5,.5,.5]],[{start:0,end:2},{start:4,end:6}]),[1,3]);assert.deepEqual(C.liveIntervals(data.states,6).map(x=>[x.kind,x.start,x.end]),[['spotlight',4,4.06],['zoomMode',4,4.06]]);
const g=C.create(core.config);g.frame(0,{x:.5,y:.5},cam,fit,settings,'linked',true);g.gap(0);g.frame(.03,{x:.5,y:.5},cam,fit,settings,'linked',true);g.frame(.06,{x:.5,y:.5},cam,fit,settings,'linked',true);assert.deepEqual(g.finish().sourceSamples,[[0,.5,.5],[.03,null,null],[.06,.5,.5]]);
for(const p of ['recorder.html','clip-studio.html']){const html=fs.readFileSync(p,'utf8');assert.ok(html.indexOf('cursor-capture-v0751.js')<html.indexOf('cursor-effects-v073.js'));}
assert.ok(fs.readFileSync('clip-studio.html','utf8').includes('cursor-path-v0751'));assert.ok(fs.readFileSync('recorder.js','utf8').includes('session.storage.cursorTrace'));
console.log('PASS: high-fidelity capture, source epochs, timestamps, legacy trace roundtrip, live history, projection and wiring');
