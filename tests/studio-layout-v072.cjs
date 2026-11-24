const assert=require('node:assert/strict');
const fs=require('node:fs');
const {place,layers}=require('../studio-layout-core-v072.js');
const v={left:0,top:0,width:1024,height:600};
const a=(x,y,w=30,h=30)=>({left:x,right:x+w,top:y,bottom:y+h});
function inside(g,v){
 assert.ok(g.left>=v.left&&g.top>=v.top);
 assert.ok(g.left+g.width<=v.left+v.width+.01);
 assert.ok(g.top+g.height<=v.top+v.height+.01);
 assert.ok(g.height>0&&g.maxHeight>=g.height);
}
assert.deepEqual(Object.values(layers),[0,10,20,30,40,100,120,140,200,400,420,440,600]);
assert.equal(place(a(10,10),{width:280,height:200},v).side,'down');
assert.equal(place(a(950,550),{width:280,height:300},v,'down',{align:'end'}).side,'up');
assert.equal(place(a(950,100),{width:180,height:400},v,'right').side,'left');
assert.equal(place(a(8,100),{width:180,height:400},v,'right').side,'right');
for(const viewport of [v,{left:0,top:0,width:320,height:240},{left:120,top:50,width:420,height:260},{left:0,top:0,width:15,height:15}]){
 for(const mode of ['down','right','point','free'])for(const x of [-100,0,10,viewport.width-1,viewport.width+100])for(const y of [-100,0,viewport.height-1,viewport.height+100]){
  inside(place(a(x+viewport.left,y+viewport.top),{width:330,height:800},viewport,mode),viewport);
 }
}
for(const file of ['editor.html','clip-studio.html']){
 const h=fs.readFileSync(file,'utf8');
 assert.ok(h.indexOf('studio-precision-v072.css')>h.indexOf('studio-viewport-v071.css'));
 assert.ok(h.indexOf('studio-layout-core-v072.js')>h.indexOf('precision-cursors-v071.js'));
 assert.ok(h.indexOf('studio-overlays-v072.js')>h.indexOf('studio-layout-core-v072.js'));
}
require('../studio-control-core-v070.js');
const core=global.MangoControlCoreV070;
assert.equal(core.formatValue('size',35),'35px');
assert.equal(core.formatValue('image-layer-opacity',75),'75%');
assert.equal(core.formatValue('timeline-zoom',2),'2×');
assert.ok(core.fieldsFor('image','rounded-rectangle').some(f=>f.id==='image-shape-radius'));
assert.ok(core.fieldsFor('image','star').some(f=>f.id==='image-shape-points'));
assert.ok(core.fieldsFor('clip','select',true).some(f=>f.id==='graphic-x'));
const css=fs.readFileSync('studio-precision-v072.css','utf8');
for(const [key,value] of Object.entries(layers))assert.ok(css.includes('--mango-z-'+key+':'+value+';'));
assert.ok(css.includes('[data-mango-overlay][hidden]'));
assert.ok(!/z-index:\s*\d{4,}/.test(css));
console.log('v0.7.2 layout geometry, semantic stacking and field metadata passed');
