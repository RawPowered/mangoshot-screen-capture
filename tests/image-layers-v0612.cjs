/* MangoShot v0.6.12: layer geometry, import, non-destructive masking and flat cutout. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const paints=[],pixels=new Uint8ClampedArray(5*5*4);
for(let i=0;i<25;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=255;pixels[i*4+3]=255;}
pixels[12*4]=240;pixels[12*4+1]=20;pixels[12*4+2]=20;
class MockContext{
 constructor(){this.globalAlpha=1;this.globalCompositeOperation='source-over';this.filter='none';}
 save(){}restore(){}beginPath(){}moveTo(){}lineTo(){}arc(){}stroke(){}fill(){}fillRect(){}clearRect(){}
 drawImage(){paints.push('image');}closePath(){}
 createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};}
 putImageData(x){paints.push('imageData');}
 getImageData(x,y,w,h){return {data:pixels.slice(0,w*h*4)};}
}
const document={createElement(name){if(name!=='canvas')throw Error('Unsupported DOM type '+name);
 return {width:0,height:0,getContext(){return new MockContext();}};}};
class Image{naturalWidth=5;naturalHeight=5;set src(v){Promise.resolve().then(()=>this.onload?.());}}
const globals={document,Image,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
 crypto:{randomUUID:()=>Math.floor(Math.random()*1e10).toString(16)},Promise,Map,Uint8Array,Int32Array,
 Uint8ClampedArray,Math,Date,Number,String,Array,Error};
globals.globalThis=globals;
vm.runInNewContext(read('image-layers-v0612.js'),globals,{filename:'image-layers-v0612.js'});
const M=globals.MangoImageLayersV0612;
(async()=>{
 assert.ok(M,'Layer core is published');
 assert.throws(()=>M.checkFile?.({type:'image/svg+xml',size:50})||(()=>{throw Error('unsupported')})());
 const layer=await M.importFile({type:'image/png',size:300,name:'photo.png'});
 assert.equal(layer.type,'image');assert.equal(layer.width,5);assert.equal(layer.height,5);
 assert.equal(layer.opacity,1);assert.equal(layer.visible,true);
 assert.equal(M.asset(layer).name,'photo.png');
 layer.points[0].x=10;layer.points[0].y=20;
 assert.equal(M.hit(layer,12,22),true);assert.equal(M.hit(layer,200,200),false);
 const normalized=M.normalize(layer,12.5,22.5);
 assert.equal(normalized.x,.5);assert.equal(normalized.y,.5);
 const canvas=new MockContext();
 M.paint(canvas,layer);assert.ok(paints.includes('image'),'Plain image paints');
 layer.mask={feather:0,paths:[{mode:'erase',radius:.2,points:[{x:.5,y:.5}]}]};
 const masked=M.composite(layer);assert.ok(masked&&masked!==M.asset(layer).image);
 const untouched=M.asset(layer).image;assert.equal(untouched.naturalWidth,5,'Mask must not mutate source');
 const result=M.quickCutout(layer,{tolerance:30});
 assert.ok(result.cutoutKey);assert.equal(result.width,5);assert.equal(result.height,5);
 assert.equal(result.removed,24,'Flat white background should be removed without destroying red center');
 assert.equal(layer.cutoutKey,null,'Cutout computation must not modify layer until Undo snapshot');
 layer.cutoutKey=result.cutoutKey;assert.doesNotThrow(()=>M.composite(layer));
 const restored=M.clearCutout(layer);assert.equal(restored.cutoutKey,null);
 assert.equal(layer.cutoutKey,result.cutoutKey,'Clear cutout returns a new layer view, never mutates Undo history');
 await assert.rejects(M.importFile({type:'image/svg+xml',size:200,name:'attack.svg'}),/PNG, JPEG or WebP/);
 await assert.rejects(M.importFile({type:'image/png',size:22*1024*1024,name:'huge.png'}),/20 MB/);
 const html=read('editor.html'),script=read('editor.js');
 for(const id of ['image-import','image-import-file','image-panel-layers','image-panel-type','image-panel-mask',
  'image-layer-opacity','image-mask-erase','image-mask-restore','image-quick-cutout','image-layer-selection-box']){
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 }
 assert.ok(html.includes('image-layers-v0612.js')&&html.includes('image-studio-v0612.css'));
 assert.ok(script.includes('function renderStrokeList')&&script.includes('function moveLayerAt'));
 assert.ok(script.includes('snapshot();strokes.push(layer)'),'Image insertion must use editor history');
 assert.ok(script.includes('function importImages(')&&script.includes('maskDraw.path.points.push('));
 assert.ok(!html.includes('iframe'),'Imported images must be local; no iframe');
 assert.deepEqual(JSON.parse(read('manifest.json')).permissions,['activeTab','scripting','clipboardWrite']);
 assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
 console.log('PASS: local image import, native alpha mask, flat-background cutout, nondestructive assets and layer UI contracts');
})().catch(e=>{console.error(e);process.exitCode=1;});
