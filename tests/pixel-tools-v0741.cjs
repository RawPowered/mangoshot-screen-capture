const assert=require('node:assert/strict'),P=require('../pixel-tools-core-v0741.js');
const w=16,h=12,src=new Uint8ClampedArray(w*h*4),dst=new Uint8ClampedArray(src.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;src.set(x<6?[220,40,30,255]:x===6?[0,0,0,255]:[40,80,160,255],i);}
const initial=src.slice(),pixel=(a,x,y)=>Array.from(a.slice((y*w+x)*4,(y*w+x)*4+4));
assert.throws(()=>P.dimensions(8192,8192),/8 megapixels/);assert.throws(()=>P.brush(src,src,w,h,'dodge',5,5,{size:8,hardness:100,strength:50}),/buffers/);
let b=P.brush(src,dst,w,h,'clone',11.5,5.5,{size:4,hardness:100,strength:100,dx:-9,dy:0});assert.deepEqual(pixel(dst,11,5),[220,40,30,255]);assert.ok(b.x>=9&&b.width<=5);assert.deepEqual(pixel(dst,0,0),[0,0,0,0]);assert.deepEqual(src,initial);
dst.fill(0);P.brush(src,dst,w,h,'dodge',11.5,5.5,{size:6,hardness:0,strength:50});assert.deepEqual(pixel(dst,11,5),[148,168,208,255]);assert.ok(pixel(dst,13,5)[3]<255&&pixel(dst,13,5)[3]>0);
dst.fill(0);P.brush(src,dst,w,h,'burn',11.5,5.5,{size:4,hardness:100,strength:50});assert.deepEqual(pixel(dst,11,5),[20,40,80,255]);assert.deepEqual(src,initial);
dst.fill(0);b=P.fill(src,dst,w,h,1,1,[20,240,60],0,100);assert.deepEqual(b,{x:0,y:0,width:6,height:12});assert.deepEqual(pixel(dst,5,11),[20,240,60,255]);assert.deepEqual(pixel(dst,7,5),[0,0,0,0]);assert.deepEqual(src,initial);assert.throws(()=>P.fill(src,dst,w,h,16,0,[1,2,3],0,100),/outside|invalid/i);
const separate=new Uint8ClampedArray(5*4);separate.set([1,1,1,255,1,1,1,255,2,2,2,255,1,1,1,255,1,1,1,255]);const o=new Uint8ClampedArray(separate.length);P.fill(separate,o,5,1,0,0,[255,0,0],0,50);assert.equal(o[3],127);assert.equal(o[15],0);
assert.deepEqual(P.union({x:1,y:2,width:3,height:4},{x:0,y:3,width:8,height:2}),{x:0,y:2,width:8,height:4});assert.deepEqual(P.color('#bc452d'),[188,69,45]);console.log('v0.7.41 immutable source, bounded clone, feathered dodge/burn, connected bucket fill and region limits passed');
