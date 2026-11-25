const assert=require('node:assert/strict'),C=require('../cinematic-core-v0713.js');
const parts=[{start:0,end:2},{start:4,end:6}],t={fromEnd:2,toStart:4,type:'crossDissolve',duration:1,ease:'linear'};
const [p]=C.plans(parts,[t],6);assert.equal(p.boundary,2);assert.equal(p.count,25);assert.deepEqual(C.times(p,0,6),{outgoing:1.5,incoming:3.5});assert.deepEqual(C.times(p,1,6),{outgoing:2.5,incoming:4.5});
assert.equal(C.plans(parts,[{...t,type:'flash'}],6).length,0);
assert.throws(()=>C.plans([{start:1,end:5.9},{start:1,end:2}],[{...t,fromEnd:5.9,toStart:1}],6),/handles/);
assert.throws(()=>C.plans(parts,[{...t,toStart:5}],6),/matching cut/);
const dim=C.dimensions(3840,2160,[p]);assert.ok(dim.bytes<=C.BUDGET&&dim.width<=1920&&dim.height<=1080&&dim.width>=640);
assert.ok(C.catalog.length===10&&C.ids.every(C.isType));
for(const type of C.ids){const calls=[],ctx={save(){},restore(){},fillRect(){},translate(){},scale(){},beginPath(){},arc(){},rect(){},clip(){},drawImage(x){calls.push(x);}};C.composite(ctx,'A','B',type,.5,320,180);assert.ok(calls.includes('A')&&calls.includes('B'),type);}
console.log('Cinematic source handles, two-frame geometry, all ten modes and raster budget passed');
