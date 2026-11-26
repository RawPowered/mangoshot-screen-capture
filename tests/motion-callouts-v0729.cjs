const assert=require('node:assert/strict');require('../media-assets.js');require('../compositor-core-v0714.js');const S=require('../speed-ramp-core-v0729.js'),M=require('../dimensional-callout-core-v0729.js'),P=require('../independent-sequence-core-v0719.js');
const ramp=S.check([{at:0,rate:.5},{at:1,rate:2}]);assert.equal(S.integral(ramp),1.25);assert.equal(S.integral(ramp,.5),.4375);assert.equal(S.rate(ramp,.5),1.25);
assert.throws(()=>S.check([{at:0,rate:0},{at:1,rate:1}]));assert.throws(()=>S.check([{at:0,rate:1},{at:.001,rate:2},{at:1,rate:1}]));
const asset={id:'source',name:'source.webm',kind:'video',size:100,lastModified:0,mime:'video/webm',duration:8,width:320,height:180};
let p=P.empty({duration:10,width:320,height:180,fps:24});p=P.add(p,asset,'V1',0);let id=p.clips[0].id;p=P.change(p,id,{end:4,sourceOut:4});p=P.change(p,id,{speedRamp:ramp});
assert.equal(p.version,4);assert.equal(p.clips[0].sourceOut,5);assert.equal(P.sourceAt(p.clips[0],2),1.75);assert.equal(P.rateAt(p.clips[0],2),1.25);assert.throws(()=>P.move(p,id,'in',1,'V1'),/Trim/);assert.throws(()=>P.change(p,id,{end:8}),/source duration/);
p=P.move(p,id,'move',1,'V1');assert.equal(P.sourceAt(p.clips[0],3),1.75);p=P.change(p,id,{speedRamp:null});assert.equal(p.clips[0].sourceOut,4);assert.equal(P.rateAt(p.clips[0],3),1);
p=P.add(p,null,'G1',1);p=P.addCallout(p,1,M.defaults());p=P.addCallout(p,1,M.presets[1].value);assert.equal(p.clips.filter(c=>P.graphic(c.track)).length,3);assert.throws(()=>P.addCallout(p,1,M.defaults()),/Both/);assert.deepEqual(P.check(JSON.parse(JSON.stringify(p))),p);
const old=P.empty();delete old.tracks.G2;delete old.tracks.G3;assert.equal(P.check(old).version,3);
for(const {value} of M.presets){const m=M.mesh(value);assert.ok(m.faces.length>0&&m.faces.length<64);assert.ok(m.bounds.w>0&&m.bounds.h>0);assert.ok(m.faces.every(f=>f.vertices.every(v=>v.every(Number.isFinite))));}
assert.notDeepEqual(M.mesh(M.defaults()),M.mesh({...M.defaults(),yaw:50}));assert.notDeepEqual(M.outline(M.defaults()),M.outline({...M.defaults(),curve:0}));assert.throws(()=>M.check({...M.defaults(),depth:5}));assert.throws(()=>M.check({...M.defaults(),color:'url(foo)'}));
console.log('Integrated speed mapping, source/track validation, legacy v3 and projected extrusion geometry passed');
