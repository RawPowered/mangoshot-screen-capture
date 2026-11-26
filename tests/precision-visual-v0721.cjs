const assert=require('node:assert/strict'),{hsvHex,hexHsv,padPoint,mergeDraft}=require('../precision-visual-v0721.js');
for(const h of [0,60,120,180,240,300,360,-360])assert.equal(hsvHex(h,1,1),['#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#ff0000','#ff0000'][[0,60,120,180,240,300,360,-360].indexOf(h)]);
for(const hex of ['#000000','#ffffff','#a137ff','#d5ab54','#222830','#31a7c2']){const a=hexHsv(hex);assert.equal(hsvHex(a.h,a.s,a.v),hex);}
assert.throws(()=>hexHsv('#bad'));assert.throws(()=>hsvHex(NaN,1,1));assert.deepEqual(padPoint(0,0,100,50),{x:-100,y:-100});assert.deepEqual(padPoint(100,25,100,50),{x:100,y:0});assert.throws(()=>padPoint(0,0,0,10));
const defaults={kind:'none',primary:'#d5ab54',secondary:'#604c30',strength:.75,depth:3,angle:105};
const fx={kind:'none',color:'#000000',blur:0,offsetX:0,offsetY:0,blend:'source-over'},initial={fx,material:null};
assert.deepEqual(mergeDraft(initial,{},fx,defaults,defaults),{});
const next=mergeDraft(initial,{opacity:.5,fx:{...fx,kind:'shadow',blur:15}},{...fx,color:'#ddbb77',offsetX:20,offsetY:-5},{...defaults,kind:'metal'},defaults);
assert.equal(next.fx.color,'#ddbb77');assert.equal(next.fx.offsetX,20);assert.equal(next.fx.blur,15);assert.equal(next.opacity,.5);assert.equal(next.material.kind,'metal');assert.equal(initial.fx.color,'#000000');
assert.deepEqual(mergeDraft(initial,{}, {...fx,color:'#dddddd',offsetX:10},defaults,defaults),{});
console.log('Precision visual color, pad and draft contract passed');
