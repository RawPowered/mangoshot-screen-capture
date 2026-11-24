/* v0.6.13 regression: actual text FX Canvas painting and shared image/text resize geometry. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={
 fills:[],outlines:[],gradients:[],
 save(){},restore(){},translate(x,y){this.lastTranslation=[x,y]},scale(x,y){this.lastScale=[x,y]},
 beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},
 fillText(text,x,y){this.fills.push({text,x,y,shadow:this.shadowBlur,opacity:this.globalAlpha})},
 strokeText(text,x,y){this.outlines.push({text,x,y})},
 measureText(text){return {width:String(text).length*18}},
 createLinearGradient(x,y,a,b){this.gradients.push([x,y,a,b]);return {addColorStop(){}}},
 globalAlpha:1
};
const js={globalThis:null,Math,Number,String,Object,Array,Error,Date};js.globalThis=js;
vm.runInNewContext(read('image-editor-core-v0611.js'),js,{filename:'image-editor-core-v0611.js'});
vm.runInNewContext(read('image-type-effects-v0613.js'),js,{filename:'image-type-effects-v0613.js'});
const E=js.MangoImageTypeV0613;
assert.ok(E&&E.draw&&E.resize&&E.applyResize);
assert.equal(E.presets.length,7);
assert.equal(E.merged({shadow:{enabled:true,opacity:20}}).shadow.opacity,1,'Opacity normalized');
assert.equal(E.merged({stroke:{enabled:true,size:200}}).stroke.size,32);
assert.equal(E.merged({overlay:{enabled:true,color:'untrusted'}}).overlay.color,'#ffffff');
const start={type:'text',points:[{x:100,y:60,p:1}],fontSize:40,color:'#fafafa',
 text:'ANIMATED\nTYPOGRAPHY',fontFamily:'sans',styleId:'title',scaleX:1,scaleY:1};
let b=E.bounds(ctx,start);
assert.ok(b.width>100&&b.height>50);
assert.equal(E.hit(ctx,start,b.x+5,b.y+5),true);
assert.equal(E.hit(ctx,start,b.x-40,b.y-40),false);
assert.equal(E.draw(ctx,start).width,b.width,'Painter and hit test must share geometry');
assert.ok(ctx.fills.some(f=>f.text==='ANIMATED'));
let changed={...start,effects:E.preset('gold').effects,color:'#dcb162'};
ctx.fills.length=0;ctx.outlines.length=0;ctx.gradients.length=0;
E.draw(ctx,changed);
assert.ok(ctx.gradients.length>0,'Gradient overlay is actual Canvas paint, not CSS decoration');
assert.ok(ctx.outlines.length>0,'Layer stroke must render glyph outlines');
assert.ok(ctx.fills.length>0);
for(const id of E.presets.map(x=>x.id)){
 const p=E.preset(id);const layer={...start,color:p.color,effects:p.effects};
 assert.doesNotThrow(()=>E.draw(ctx,layer),id+' render');
}
let a=E.resize({x:100,y:60,width:200,height:100},'se',100,10,false);
assert.equal(a.width,300);assert.equal(a.height,150,'Default drag keeps ratio using dominant axis');
assert.equal(a.x,100);assert.equal(a.y,60);
let free=E.resize({x:100,y:60,width:200,height:100},'se',100,10,true);
assert.ok(Math.abs(free.width-300)<1e-7);assert.ok(Math.abs(free.height-110)<1e-7,'Shift drag allows width and height to differ');
let opposite=E.resize({x:100,y:60,width:200,height:100},'nw',40,10,false);
assert.equal(opposite.x+opposite.width,300,'NW drag keeps right edge anchored');
assert.equal(opposite.y+opposite.height,160,'NW drag keeps bottom edge anchored');
let image=E.applyResize({type:'image',width:200,height:100,points:[{x:100,y:60}]},
 {x:100,y:60,width:200,height:100},free);
assert.ok(Math.abs(image.width-300)<1e-7);assert.ok(Math.abs(image.height-110)<1e-7);
const stretched=E.applyResize(start,{x:100,y:60,width:200,height:100},free);
assert.ok(Math.abs(stretched.scaleX-1.5)<1e-7);assert.ok(Math.abs(stretched.scaleY-1.1)<1e-7,'Text transforms may distort only in free mode');
let visual=E.bounds(ctx,{...start,scaleX:2,scaleY:2});
assert.equal(visual.width,b.width*2);assert.equal(visual.height,b.height*2);
assert.equal(start.scaleX,1,'Original source text scale remains intact after transform');
assert.equal(start.points[0].x,100,'Original source text geometry remains intact');
const html=read('editor.html'),editor=read('editor.js'),css=read('image-studio-v0613.css');
for(const name of ['image-type-effects-v0613.js','image-studio-v0613.css','data-resize-kind="text"',
 'data-resize-kind="image"','image-keep-ratio','image-transform-readout',
 'data-fx-group="shadow"','data-fx-group="stroke"','data-fx-group="gradient"',
 'data-fx-group="overlay"','data-fx-group="glow"','data-fx-preset="gold"']){
 assert.ok(html.includes(name),'Missing FX or transform UI: '+name);
}
assert.ok(css.includes('pointer-events:auto!important')&&css.includes('touch-action:none'));
for(const name of ['typeEffects.resize(','typeEffects.applyResize(','window.addEventListener(\'pointermove\'',
 'event.shiftKey||!locked','updateSelectedText({effects:p.effects,color:p.color})',
 'typeEffects?.draw','typeEffects?.bounds']){
 assert.ok(editor.includes(name),'Missing integration '+name);
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
assert.deepEqual(JSON.parse(read('manifest.json')).permissions,['activeTab','scripting','clipboardWrite','nativeMessaging']);
console.log('PASS: 7 editable text looks, Canvas overlays/shadows/glow, shared bounds, default locked and Shift-stretch transforms');
