const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
for(const file of ['creative-core-v079','image-editor-core-v0611','image-type-effects-v0613','motion-core-v067','premium-core-v069','clip-graphics','clip-project'])require('../'+file+'.js');
const C=globalThis.MangoCreativeV079,G=globalThis.MangoGraphics,P=globalThis.MangoProject;
assert.equal(C.fonts.length,16);assert.equal(C.presets.length,24);assert.equal(new Set(C.fonts.map(f=>f.id)).size,16);assert.equal(new Set(C.presets.map(f=>f.id)).size,24);
const provenance=JSON.parse(fs.readFileSync('assets/fonts/PROVENANCE.json','utf8'));
for(const f of C.fonts){const p=provenance.fonts.find(x=>x.id===f.id),bytes=fs.readFileSync('assets/fonts/'+p.file);
 assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),p.gitBlobSha1);
 assert.match(fs.readFileSync('assets/fonts/'+p.license,'utf8'),/SIL OPEN FONT LICENSE/);assert.ok(C.family(f.id,'sans-serif').includes(f.family));}
assert.equal(C.weight('allura',800),'400');assert.equal(C.weight('oswald',900),'700');assert.equal(C.family('untrusted','fallback'),'fallback');
const source={size:500,format:'webm',duration:8},segments=[{start:0,end:8}];
for(const p of C.presets){const im=C.imagePatch(p.id),v=C.videoPatch(p.id);assert.equal(im.fontFamily,p.font);assert.equal(v.font,p.font);assert.ok(im.effects.shadow.enabled);
 const layer=G.create('text',p.id,1);assert.equal(layer.preset,p.id);assert.equal(layer.font,p.font);assert.equal(layer.text,p.sample);
 const checked=P.check(P.pack(source,segments,[layer]),source);assert.equal(checked.layers[0].font,p.font);
 const changed=G.style(layer,'creative-signature');assert.equal(changed.font,'allura');assert.equal(changed.weight,'400');
 assert.equal(G.style(changed,'title').premium,null);
}
const old=G.create('text','title',0);assert.equal(P.check(P.pack(source,segments,[old]),source).layers[0].font,'sans');
assert.throws(()=>P.check(P.pack(source,segments,[{...old,font:'unknown'}]),source),/font/);
assert.throws(()=>C.imagePatch('unknown'));assert.throws(()=>C.videoPatch('unknown'));assert.throws(()=>C.requireFonts(['manrope']),/not loaded/);
for(const file of ['editor.html','clip-studio.html']){const h=fs.readFileSync(file,'utf8');assert.match(h,/creative-open-v079/);assert.match(h,/creative-library-v079.js/);assert.ok(h.indexOf('creative-core-v079.js')<h.indexOf(file==='editor.html'?'image-editor-core-v0611.js':'clip-graphics.js'));}
console.log('Sixteen pinned OFL fonts, 24 shared style adapters, old/new project validation and font readiness gates passed');
