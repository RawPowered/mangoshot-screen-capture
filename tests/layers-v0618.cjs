/* MangoShot v0.6.18: layer geometry, in-session clipboard, appearance and shortcut safety. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const sandbox={Math,Number,String,Array,JSON,Set,Object};
sandbox.globalThis=sandbox;
vm.runInNewContext(read('image-layer-ops-v0618.js'),sandbox,{filename:'image-layer-ops-v0618.js'});
const L=sandbox.MangoLayerOpsV0618;
assert.ok(L);
const pen={type:'pen',points:[{x:5,y:8,p:.2},{x:125,y:23,p:.9}],size:6,color:'#aaff66',visible:true};
const selected=L.clipboardOf(pen);
assert.equal(selected.type,'pen');
selected.points[0].x=500;
assert.equal(pen.points[0].x,5,'Internal copied layer must never mutate source');
const duplicate=L.cloneLayer(pen,20);
assert.equal(duplicate.points[0].x,25);
assert.equal(duplicate.points[0].y,28);
assert.notEqual(duplicate.name,pen.name);
assert.notEqual(duplicate.id,pen.id);
assert.deepEqual([...L.translate(pen,10,-2).points.map(p=>p.x)],[15,135]);
assert.equal(pen.points[0].x,5,'Translation preserves original layer');
const vector={type:'shape',kind:'star',points:[{x:30,y:40},{x:220,y:160}],size:4};
const vectorCore={isVector:v=>v.type==='shape',hit:(v,x,y)=>x>=30&&x<=220&&y>=40&&y<=160};
const layerCore={hit:()=>true,bounds:s=>({x:s.points[0].x,y:s.points[0].y,width:s.width,height:s.height})};
const typeCore={hit:(ctx,s,x,y)=>x>=s.points[0].x&&x<=200&&y>=s.points[0].y&&y<=220};
const penInput={lineHit:(s,p)=>s.type==='pen'&&p.x>=5&&p.x<=125&&Math.abs(p.y-15)<15};
assert.equal(L.hit(pen,15,15,penInput,vectorCore,layerCore,typeCore,{}),true);
assert.equal(L.hit(vector,90,90,penInput,vectorCore,layerCore,typeCore,{}),true);
assert.equal(L.hit({...vector,visible:false},90,90,penInput,vectorCore,layerCore,typeCore,{}),false);
assert.equal(L.hit({type:'image',points:[{x:3,y:4}],width:50,height:60},10,11,penInput,vectorCore,layerCore,typeCore,{}),true);
assert.equal(L.hit({type:'text',points:[{x:50,y:90}],text:'HELLO'},100,130,penInput,vectorCore,layerCore,typeCore,{}),true);
assert.equal(L.bounds(pen).width>120,true);
assert.equal(L.bounds({type:'image',points:[{x:12,y:18}],width:35,height:70},layerCore).height,70);
const shadow=L.preset('shadow');
assert.equal(shadow.kind,'shadow');
assert.ok(shadow.blur>0);
assert.equal(L.preset('glow').kind,'glow');
assert.equal(L.preset('floating').offsetY>0,true);
const old=L.style({layerFx:{kind:'glow',color:'#12ffaa',blur:200,offsetX:999,blend:'unknown'}});
assert.equal(old.blur,100,'Layer blur must have a maximum');
assert.equal(old.offsetX,100,'Layer offsets must clamp');
assert.equal(old.blend,'source-over','Unknown blends are rejected');
assert.equal(old.color,'#12ffaa');
assert.equal(L.mayStyle({type:'redact'}),false,'Redaction cannot receive visual style effects');
assert.equal(L.mayStyle({type:'erase-brush'}),false,'Eraser cannot become a visual effect');
const calls=[];
const ctx={save(){calls.push('save')},restore(){calls.push('restore')}};
L.apply(ctx,{type:'text',layerFx:L.preset('shadow')},()=>{calls.push('draw');assert.equal(ctx.shadowBlur,16);});
assert.deepEqual(calls,['save','draw','restore']);
calls.length=0;
L.apply(ctx,{type:'redact',layerFx:L.preset('glow')},()=>calls.push('redact'));
assert.deepEqual(calls,['redact'],'Redaction bypasses stylized appearance');
const coreScope={Object,Map,Set,Math,Number,String,Array,JSON};coreScope.globalThis=coreScope;
vm.runInNewContext(read('shortcut-core-v0617.js'),coreScope);
const core=coreScope.MangoShortcutCoreV0617,keys=core.defaults('image');
assert.equal(keys.copyLayer,'Ctrl+C');
assert.equal(keys.cutLayer,'Ctrl+X');
assert.equal(keys.pasteLayer,'Ctrl+V');
assert.equal(keys.nudgeLeft,'ArrowLeft');
assert.equal(keys.nudgeRightFast,'Shift+ArrowRight');
assert.equal(core.check(keys,'image',{allowMissing:false}).ok,true);
assert.equal(core.rebind(keys,'pasteLayer','Ctrl+C','image').ok,false);
assert.equal(core.rebind(keys,'pasteLayer','Ctrl+W','image').ok,false);
const js=read('editor.js'),html=read('editor.html');
for(const key of ['layerOps.translate(source,ox,oy)','clone:!!event.altKey','function copySelectedLayer(',
 'function pasteCopiedLayer(', 'function cutSelectedLayer(', 'function reorderLayerTo(',
 'function updateLayerAppearance(', 'layerStackDrag=i','data-layer-preset',
 'layerOps.apply(pen,stroke','nudgeRightFast']){
  assert.ok(js.includes(key)||html.includes(key),'Missing layer behavior '+key);
}
for(const key of ['image-copy-layer','image-cut-layer','image-paste-layer','image-layer-fx-kind',
 'image-layer-fx-blur','image-layer-opacity','data-layer-preset="glow"',
 'data-image-action="copy-layer"','image-layer-ops-v0618.js']){
 assert.ok(html.includes(key),'Missing layer property/control '+key);
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
console.log('PASS: non-destructive clipboard/geometry/style presets, selected layer shortcuts, copy/paste/reorder UI wiring');
