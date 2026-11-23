const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const g={};g.globalThis=g;vm.runInNewContext(load('zoom-hud-v063.js'),g);
const {compute,resize,paintFrame}=g.MangoZoomHUDMath;
function near(a,b){assert.ok(Math.abs(a-b)<1e-7,String(a)+' ~= '+String(b));}
let rect=compute(2,.5,.5);
const more=resize(rect,'se',-.2,-.2);assert.ok(more.scale>2);
near(more.width,more.height);
const less=resize(rect,'se',.15,.15);assert.ok(less.scale<2);
near(less.left,rect.left);near(less.top,rect.top);
for(const corner of ['nw','ne','sw','se']){
 const result=resize(rect,corner,-.15,.13);
 assert.ok(result.scale>=1&&result.scale<=5);
 assert.ok(result.left>=0&&result.top>=0&&result.left+result.width<=1+1e-7&&result.top+result.height<=1+1e-7);
 near(result.width,result.height);
}
let drawn=0,clears=0,height=180,width=320;
const canvas={get width(){return width},set width(v){width=v;clears++;},get height(){return height},set height(v){height=v;clears++;},
 getContext(){return {drawImage(...args){assert.equal(args.length,5);drawn++;}}}};
const video={videoWidth:1920,videoHeight:1080,readyState:3};
assert.equal(paintFrame(video,canvas).ok,true);assert.equal(drawn,1);assert.equal(clears,0);
assert.equal(paintFrame(video,canvas).ok,true);assert.equal(drawn,2);assert.equal(clears,0);
video.videoHeight=1200;assert.equal(paintFrame(video,canvas).ok,true);assert.equal(clears,1);assert.equal(drawn,3);
assert.equal(paintFrame({...video,readyState:1},canvas).ok,false);
console.log('PASS: canvas dimensions never clear a drawn frame; HUD resize 4 corners keeps zoom/aspect in bounds');
