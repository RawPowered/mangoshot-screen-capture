/* Image Studio v0.6.15: path-based vectors remain editable and respect layer geometry. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const operations=[];
const ctx={
 save(){operations.push('save')},restore(){operations.push('restore')},
 beginPath(){operations.push('beginPath')},moveTo(){},lineTo(){},closePath(){},rect(){operations.push('rect')},
 ellipse(){operations.push('ellipse')},quadraticCurveTo(){operations.push('quadratic')},
 stroke(){operations.push('stroke')},fill(){operations.push('fill')},
 setLineDash(pattern){operations.push('dash:'+pattern.length)},
 globalAlpha:1
};
const globals={Math,Number,String,Array,Error};globals.globalThis=globals;
vm.runInNewContext(read('image-vector-v0615.js'),globals,{filename:'image-vector-v0615.js'});
const V=globals.MangoImageVectorV0615;
assert.ok(V);
assert.equal(V.kinds.length,11);
assert.equal(V.kinds.includes('speech-bubble'),true);
assert.equal(V.kinds.includes('star'),true);
for(const kind of V.kinds){
 const layer=V.make(kind,{x:100,y:90},{x:290,y:230},{stroke:'#00ff00',
  fill:'#ff00aa',fillEnabled:true,strokeWidth:8,lineStyle:'dashed',opacity:.66,starPoints:7});
 assert.equal(V.isVector(layer),true);
 assert.equal(V.kindOf(layer),kind);
 const s=V.style(layer);assert.equal(s.strokeWidth,8);assert.equal(s.opacity,.66);
 assert.equal(s.lineStyle,'dashed');
 operations.length=0;
 assert.equal(V.paint(ctx,layer),true);
 assert.ok(operations.includes('stroke'),kind+' must draw stroke in Canvas painter');
 if(!['line','arrow'].includes(kind))assert.ok(operations.includes('fill'),kind+' must support filled shapes');
 assert.ok(operations.includes('dash:2'),kind+' must support dashed stroke');
 assert.equal(V.hit(layer,200,155),!['line','arrow'].includes(kind)||
  V.hit(layer,200,155),'hit must be defined');
 const b=V.bounds(layer);
 assert.equal(b.x,100);assert.equal(b.y,90);assert.equal(b.width,190);assert.equal(b.height,140);
 const shifted=V.translate(layer,20,-15);
 assert.equal(V.bounds(shifted).x,120);assert.equal(V.bounds(shifted).y,75);
 assert.equal(V.bounds(layer).x,100,'Source geometry is not mutated by moving');
 const resized=V.resized(layer,b,{x:100,y:90,width:300,height:220});
 assert.equal(V.bounds(resized).width,300);
 assert.equal(V.bounds(resized).height,220);
 assert.equal(V.bounds(layer).height,140,'Shape resizing must be non-destructive');
 assert.equal(JSON.parse(JSON.stringify(resized)).kind,kind,'Shape model must serialize');
}
const rectangle={type:'rectangle',points:[{x:0,y:0},{x:40,y:30}],color:'#ffffff',size:3};
assert.equal(V.isVector(rectangle),true,'Legacy rectangles remain vector-editable');
assert.equal(V.paint(ctx,rectangle),true);
assert.equal(V.style({type:'shape',kind:'ellipse',opacity:8,points:[]}).opacity,1,'Opacity must clamp');
assert.throws(()=>V.make('foreignObject',{x:0,y:0},{x:2,y:2}),/Unsupported/);
const html=read('editor.html'),js=read('editor.js'),css=read('image-studio-v0615.css');
for(const key of ['image-vector-v0615.js','image-studio-v0615.css','image-vector-library',
 'image-active-tool-name','image-tool-opacity','image-shape-fill-enabled','image-shape-line-style',
 'image-shape-radius','image-shape-points','image-shape-heads','vector-selection-box']){
 assert.ok(html.includes(key),'Missing vector inspector surface '+key);
}
for(const key of ['data-vector-kind="'+V.kinds[0]+'"','data-vector-kind="ellipse"','data-vector-kind="star"'])
 assert.ok(html.includes(key),'Missing selectable vector shape '+key);
for(const key of ['vectorCore.paint(pen,stroke)','function syncVectorControls()','function topLayerAt(x,y)',
 'vectorCore.translate(d.origin,dx,dy)','vectorCore.resized(d.initial,d.bounds,newRect)',
 'switchInspectorTab(\'tools\')']){
 assert.ok(js.includes(key),'Missing vector source behavior '+key);
}
assert.ok(css.includes('.image-vector-library')&&css.includes('.image-vector-selection'));
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.16');
assert.deepEqual(JSON.parse(read('manifest.json')).permissions,['activeTab','scripting','clipboardWrite']);
console.log('PASS: 11 editable vector types, fill, stroke, dash, position, resize, UI and history wiring');
