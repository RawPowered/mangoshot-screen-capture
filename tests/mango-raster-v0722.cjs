const assert=require('node:assert/strict'),C=require('../mango-raster-core-v0722.js');
const p=new Uint8ClampedArray([255,0,0,17,0,255,0,128,0,0,255,0]);
assert.deepEqual(Array.from(C.process(p,3,1,'gray',100)),[77,77,77,17,149,149,149,128,0,0,255,0]);
const a=new Uint8ClampedArray([255,0,0,255,0,255,0,0]);assert.deepEqual(C.process(a,2,1,'blur',100),a);
for(const op of Object.keys(C.OPS)){assert.deepEqual(C.process(p,3,1,op,0),p);assert.throws(()=>C.process(p,4,1,op,100));assert.throws(()=>C.process(p,3,1,op,101));}
assert.throws(()=>C.validate(5000,5000,'gray',100,100000000));assert.throws(()=>C.validate(1,1,'__proto__',100,4));
assert.equal(Array.from(C.process(new Uint8ClampedArray([0,0,0,255,255,255,255,255,0,0,0,255]),3,1,'blur',100))[4],128);
console.log('Raster validation, alpha and exact integer contract passed');
