const assert=require('node:assert/strict'),B=require('../brush-core-v0725.js');
const p=B.defaults();assert.deepEqual(B.check(p),p);assert.equal(B.response(.375,p.curve),.375);assert.equal(B.response(1,p.curve),1);assert.equal(B.widthAt(0,p),p.minWidth);assert.equal(B.widthAt(1,p),1);assert.equal(B.flowAt(.5,{...p,pressureFlow:true}),.5);
for(const preset of B.presets)B.check(preset.profile);
assert.throws(()=>B.check({...p,curve:[0,.5,.3,.7,1]}));assert.throws(()=>B.check({...p,spacing:0}));assert.throws(()=>B.check({...p,flow:NaN}));assert.throws(()=>B.check({...p,extra:1}));
const a=[{x:0,y:0,p:0},{x:100,y:0,p:1}],b=[a[0],{x:50,y:0,p:.5},a[1]];
const x=B.samples(a,10,.2),y=B.samples(b,10,.2);assert.equal(x.length,y.length);for(let i=0;i<x.length;i++){assert.ok(Math.abs(x[i].x-y[i].x)<1e-9);assert.ok(Math.abs(x[i].p-y[i].p)<1e-9);}
assert.ok(B.samples([{x:-1000000,y:-1000000,p:0},{x:1000000,y:1000000,p:1}],.1,.05).length<=B.MAX_DABS);
assert.equal(B.samples([{x:1,y:2,p:1}],10,.2).length,1);assert.equal(B.diameter({type:'highlighter',size:8}),40);
console.log('Precision brush curve, presets, fixed-distance sampling and bounded dab contract passed');
