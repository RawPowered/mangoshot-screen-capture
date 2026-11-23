const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const g={};g.globalThis=g;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','zoom-hud-v063.js'),'utf8'),g);
const {compute,toFocus,drag}=g.MangoZoomHUDMath;
function near(x,y){assert.ok(Math.abs(x-y)<1e-9,'Expected '+x+' ≈ '+y);}
let r=compute(2,.5,.5);near(r.left,.25);near(r.top,.25);near(r.width,.5);near(r.height,.5);
let target=toFocus(.25,.25,2);near(target.x,.5);near(target.y,.5);
target=drag(r,{x:.85,y:.45});near(target.x,1);near(target.y,.4);
r=compute(1,.25,.75);near(r.left,0);near(r.top,0);near(r.width,1);
target=toFocus(.2,.8,1);near(target.x,.5);near(target.y,.5);
r=compute(4,.7,.2);target=toFocus(r.left,r.top,4);near(target.x,.7);near(target.y,.2);
for(const s of [1.2,1.5,2,3,4,5])for(const x of [0,.1,.35,.5,.8,1])for(const y of [0,.25,.6,1]){
 const box=compute(s,x,y),got=toFocus(box.left,box.top,s);
 near(got.x,x);near(got.y,y);
 assert.ok(box.left>=0&&box.left+box.width<=1+1e-9);
 assert.ok(box.top>=0&&box.top+box.height<=1+1e-9);
}
console.log('PASS: zoom HUD ROI bounds, focus inversion, offset drag and scale=1 geometry');
