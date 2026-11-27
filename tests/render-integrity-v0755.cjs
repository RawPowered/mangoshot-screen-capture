/* Run from repo root: node tests/render-integrity-v0755.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../cursor-effects-v073.js'),T=require('../cursor-capture-v0751.js'),D=require('../cursor-director-core-v074.js'),R=require('../clip-render-v0755.js'),M=require('../clean-master-v0752.js');
require('../creative-zoom.js');const Z=globalThis.MangoCreativeZoom;
const config={...C.preset('off'),spotlight:true,ring:true},cam={zoom:1,cx:.5,cy:.5},fit={x:0,y:0,w:1,h:1},builder=T.create(C.config,'clean'),legacy=C.createTrace();
for(let i=0;i<=120;i++){const t=i/30,p=i>=30&&i<90?{x:.5,y:.5}:null;builder.frame(t,p,cam,fit,config,'linked',true);legacy.add(t,p);}
builder.click(1.5,{x:.5,y:.5});legacy.click(1.5,{x:.5,y:.5});
const trace=legacy.finish(builder.finish()),regions=D.regions(M.rebuild(trace,4).regions,4),parts=[{start:0,end:4}];
assert.equal(regions.length,1);
const events=[],ctx={save(){events.push('save')},restore(){events.push('restore')},setTransform(){events.push('identity')},fillRect(){events.push(typeof this.fillStyle==='object'?'spotlight':'fill')},translate(){},scale(){events.push('camera-transform')},drawImage(){events.push('source')},createRadialGradient(){return {addColorStop(){}}},beginPath(){},arc(){events.push('arc')},stroke(){events.push('ring')}};
const media={readyState:2,seeking:false},zoom=[{id:'test',start:0,duration:1,scale:1.75,x:.5,y:.5}];
function frame(t,strict=false){return R.compose({ctx,media,width:1920,height:1080,time:t,strict,zoom:(ctx,media,t,w,h)=>Z.draw(ctx,media,zoom,t,w,h),grade:()=>events.push('grade'),cursor:(ctx,t,z,w,h)=>D.paint(ctx,trace,regions,parts,t,z,w,h),secondary:()=>{events.push('secondary');return true;},graphics:()=>events.push('graphics')});}
let f=frame(1.6);assert.ok(f.ready&&f.zoom&&f.cursor&&events.includes('spotlight')&&events.includes('ring'));const preview=[...events];events.length=0;
f=frame(1.6,true);assert.deepEqual(events,preview);assert.ok(f.cursor&&f.zoom);assert.ok(events.indexOf('source')<events.indexOf('spotlight')&&events.indexOf('spotlight')<events.indexOf('graphics'));
events.length=0;assert.equal(frame(.2,true).cursor,false);assert.ok(!events.includes('spotlight'));
media.seeking=true;events.length=0;assert.equal(frame(1.6).ready,false);assert.deepEqual(events,[]);assert.throws(()=>frame(1.6,true),/Decoded primary/);media.seeking=false;
assert.equal(D.paint(ctx,trace,regions,[{start:1,end:2},{start:2.5,end:3.5}],.5,{scale:1,x:.5,y:.5},1920,1080),true);
const cov=R.coverage(trace,regions,parts);assert.equal(cov.regions,1);assert.ok(cov.seconds>1.8&&cov.seconds<2.5);
const stats=R.stats();R.count(stats,frame(1.6,true));R.count(stats,frame(.2,true));assert.deepEqual(stats,{frames:2,cursor:1,zoom:2,transitions:0});
const over={...trace,samples:[[0,.5,.5],[101,.5,.5]],capture:undefined};assert.equal(R.clipTail(over,100).trace.samples.length,1);assert.throws(()=>R.clipTail({...over,samples:[[0,.5,.5],[110,.5,.5]]},100),/exceeds/);
const host=fs.readFileSync('clip-studio.js','utf8'),thumb=fs.readFileSync('clip-timeline-ui.js','utf8'),ui=fs.readFileSync('cursor-director-ui-v074.js','utf8'),html=fs.readFileSync('clip-studio.html','utf8');
assert.ok(host.includes('composeCommitted(ctx,video,mapped')&&host.includes('composeCommitted(paint,exportVideo,output')&&!host.includes('paintHandle=requestAnimationFrame(draw)'));
assert.ok(thumb.includes('Math.min(st.duration()-.005,plan[i].source)')&&thumb.includes('activeGeneration===myGeneration')&&thumb.includes('img.src=nearest.url'));
assert.ok(ui.includes('commitSelectedStyle')&&html.includes('cd-new-draft-v0755'));assert.ok(html.indexOf('clip-render-v0755.js')<html.indexOf('clip-studio.js'));
console.log('PASS: shared camera and cursor renderer, cut mapping, missing samples, decode guards, tail recovery, integration anchors');
