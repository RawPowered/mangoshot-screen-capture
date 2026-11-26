const assert=require('node:assert/strict');require('../media-assets.js');require('../compositor-core-v0714.js');require('../dimensional-callout-core-v0729.js');const M=require('../callout-core-v0735.js'),P=require('../independent-sequence-core-v0719.js');
assert.equal(M.presets.length,14);
for(const p of M.presets){const v=M.check(M.preset(p.id));assert.equal(v.kind,p.value.kind);for(const u of [0,.15,.5,.85,1]){const m=M.motion(v,u);assert.ok(Number.isFinite(m.scale)&&m.alpha>=0&&m.alpha<=1);}}
assert.throws(()=>M.check({...M.defaults(),rotation:Infinity}),/rotation/);assert.throws(()=>M.check({...M.defaults(),kind:'script'}),/Invalid/);assert.throws(()=>M.check({...M.defaults(),enterSpan:.5,exitSpan:.5}),/active interval/);assert.throws(()=>M.check({...M.defaults(),text:'x'.repeat(121)}),/Invalid/);
const v=M.preset('focus');assert.equal(M.motion(v,0).alpha,0);assert.equal(M.motion(v,1).alpha,0);assert.ok(M.motion(v,.5).scale>1);
const blank=P.empty({duration:12,width:320,height:180});assert.equal(P.check(blank).version,3);
let p=P.addCallout2d(blank,1,M.preset('note')),c=p.clips[0];assert.equal(p.version,10);assert.equal(c.callout3d,undefined);assert.deepEqual(P.check(JSON.parse(JSON.stringify(p))),p);
p=P.change(p,c.id,{callout2d:{...c.callout2d,rotation:32},x:.4});assert.equal(p.clips[0].callout2d.rotation,32);
p=P.move(p,c.id,'move',2,'G3');assert.equal(p.clips[0].start,3);assert.equal(p.clips[0].track,'G3');assert.equal(p.clips[0].callout2d.rotation,32);
assert.throws(()=>P.check({...p,version:9,schema:P.SCHEMA9}),/v10/);assert.throws(()=>P.change(p,c.id,{callout3d:globalThis.MangoDimensionalV0729.defaults()}),/without 3D/);
assert.throws(()=>P.change(P.change(p,c.id,{locked:true}),c.id,{x:.2}),/Unlock/);
const mixed=P.addCallout(p,3,globalThis.MangoDimensionalV0729.defaults());assert.equal(mixed.version,10);assert.equal(mixed.clips.length,2);assert.throws(()=>P.addCallout2d(mixed,3,M.defaults()),/overlap/);
assert.deepEqual(P.check(mixed),mixed);console.log('v0.7.35 callout recipes, timing, locks, track moves, backward compatibility and v10 round trip passed');
