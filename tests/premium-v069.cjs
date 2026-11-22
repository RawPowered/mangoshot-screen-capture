/* MangoShot v0.6.9 Premium Studio / branding / resources acceptance gates. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={JSON,Date,Math,Number,String,Array,Intl};context.globalThis=context;
for(const script of ['motion-core-v067.js','premium-core-v069.js','clip-graphics.js','clip-project.js'])
 vm.runInNewContext(read(script),context,{filename:script});
const premium=context.MangoPremium,graphics=context.MangoGraphics,project=context.MangoProject;
assert.equal(premium.catalog.length,24);
assert.deepEqual([...new Set(premium.catalog.map(x=>x.category))].sort(),
 ['Callouts','Subtitles','Text','Titles']);
for(const category of ['Titles','Subtitles','Callouts','Text'])
 assert.equal(premium.catalog.filter(x=>x.category===category).length,6);
assert.equal(new Set(premium.catalog.map(x=>x.id)).size,24,'All preset IDs unique');
const calls=[];
const painter={
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){calls.push('fill')},
 stroke(){calls.push('stroke')},translate(){},rotate(){},scale(){},fillRect(){calls.push('rect')},strokeRect(){},
 arc(){},clip(){},setLineDash(){},fillText(s){calls.push('text:'+s)},strokeText(){},
 measureText(s){return {width:Array.from(String(s)).length*11}},
 createLinearGradient(){return {addColorStop(){}}},
 globalAlpha:1
};
const source={size:1800,format:'webm',duration:12};
for(const item of premium.catalog){
 const l=premium.make('text',item.id,1,3);
 assert.equal(l.premium.id,item.id);assert.equal(l.premium.role,'primary');
 assert.equal(l.end,4);assert.equal(l.motion.enter.type,item.enter);
 assert.doesNotThrow(()=>premium.validate(l.premium));
 assert.doesNotThrow(()=>graphics.render(painter,[l],2.5,1920,1080),item.id+' must draw on Canvas');
 const p=project.pack(source,[{start:0,end:12}],[l]);
 const round=project.check(p,source);
 assert.equal(round.layers[0].premium.id,item.id);
 if(['Titles','Callouts'].includes(item.category)){
  const next=premium.secondary(l);assert.ok(next,'Title and Callout require editable second layer');
  assert.equal(next.premium.role,'secondary');
  assert.equal(next.start,l.start);assert.equal(next.end,l.end);
  assert.doesNotThrow(()=>graphics.render(painter,[l,next],2.5,1920,1080));
 }
}
assert.ok(calls.some(x=>x.startsWith('text:'))&&calls.includes('fill'),'Premium treatments must draw material and glyphs');
assert.throws(()=>premium.validate({id:'bad',intensity:.5,accent:'#ffffff'}),/Invalid/);
assert.throws(()=>premium.validate({id:'aurelia-gold',intensity:4,accent:'#ffffff'}),/Invalid/);
assert.throws(()=>premium.validate({id:'aurelia-gold',intensity:.4,accent:'javascript:alert(1)'}),/Invalid/);
const html=read('clip-studio.html'),layout=read('visual-inspector-v068.js');
for(const v of ['premium-core-v069.js','premium-ui-v069.js','premium-v069.css','branding-v069.css'])
 assert.ok(html.includes(v),'Missing premium dependency: '+v);
assert.ok(html.indexOf('premium-core-v069.js')<html.indexOf('clip-graphics.js'),'Premium painter must initialize before graphics');
assert.ok(html.indexOf('visual-inspector-v068.js')<html.indexOf('premium-ui-v069.js'),'Gallery must initialize after its tab');
assert.ok(layout.includes("['premium','Premium']"),'Premium must be a first-class Callouts section');
const ui=read('premium-ui-v069.js');
new vm.Script(ui,{filename:'premium-ui-v069.js'});
assert.ok(ui.includes('paintCard')&&ui.includes('G.render('),'Premium previews must use real local compositing');
assert.ok(ui.includes('addPremiumComposition')&&read('clip-studio.js').includes('addPremiumComposition(presetId)'),'Single undoable insert path required');
const resources=read('resources.html'),resourceJs=read('resources-v069.js');
new vm.Script(resourceJs,{filename:'resources-v069.js'});
assert.ok(!/<iframe\b/i.test(resources),'Provider pages must never embed in extension');
assert.ok(resourceJs.includes("rel='noopener noreferrer'")||resourceJs.includes("rel='noopener'"),'External links need noopener');
for(const domain of ['freepik.com','pexels.com','unsplash.com','mixkit.co','pixabay.com','fonts.google.com','fontshare.com','polyhaven.com'])
 assert.ok(resourceJs.includes(domain),'Resource directory missing '+domain);
for(const page of ['popup.html','recorder.html','editor.html','clip-studio.html','resources.html'])
 assert.ok(read(page).includes('branding-v069.css'),'Branded stylesheet missing '+page);
for(const asset of ['assets/mangoshot-icon.webp','assets/mangoshot-wordmark.webp']){
 const bytes=fs.readFileSync(path.join(root,asset));
 assert.ok(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP');
}
for(const size of [16,32,48,128]){
 const bytes=fs.readFileSync(path.join(root,'icons/icon-'+size+'.png'));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.17');
assert.deepEqual(JSON.parse(read('manifest.json')).permissions,['activeTab','scripting','clipboardWrite']);
console.log('PASS: 24 premium treatments, deterministic Canvas rendering, editable paired layers, persistence, brand binary integrity and no-iframe Resources');
