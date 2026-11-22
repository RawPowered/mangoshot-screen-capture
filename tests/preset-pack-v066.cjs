const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={JSON,Date};ctx.globalThis=ctx;
for(const source of ['clip-graphics.js','clip-project.js'])vm.runInNewContext(fs.readFileSync(path.join(root,source),'utf8'),ctx);
const G=ctx.MangoGraphics,P=ctx.MangoProject;
const styles=['editorial','kinetic','techNote','softBadge','quoteCard','pointerPop','premium','checklist'];
assert.equal(styles.length,8);for(const style of styles)assert.ok(G.styles[style],style+' preset missing');
const source={size:70000,format:'mp4',duration:8},segments=[{start:0,end:8}];
let rendered=0;
const painter={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},
 measureText(s){return {width:String(s).length*13}},fillText(){rendered++;},strokeText(){}};
for(const [index,style] of styles.entries()){
 for(const kind of ['text','callout']){
  const layer=G.create(kind,style,.5,{id:kind+'-'+index,start:.5,end:4});
  assert.equal(layer.preset,style);assert.equal(layer.kind,kind);
  assert.ok(layer.x>=0&&layer.y>=0&&layer.width>=.1);
  assert.ok(layer.fontSize>=12&&layer.fontSize<=220);
  const project=P.pack(source,segments,[layer],[]);
  const checked=P.check(project,source);
  assert.equal(checked.layers[0].preset,style,'Project must retain preset identity');
  assert.equal(checked.layers[0].background,layer.background);
  G.render(painter,[layer],1,1920,1080);
  const restyled=G.style(G.create(kind,'none',.5,{id:'new-'+index,end:4}),style);
  assert.equal(restyled.preset,style);assert.equal(restyled.fontSize,layer.fontSize);
 }
}
assert.ok(rendered>=16,'Each preset should render actual text on Canvas compositor');
const html=fs.readFileSync(path.join(root,'clip-studio.html'),'utf8');
for(const style of styles)assert.equal([...html.matchAll(new RegExp('value="'+style+'"','g'))].length,2,'Preset must exist in both dropdowns');
const gallery=fs.readFileSync(path.join(root,'type-hud-v063.js'),'utf8');
for(const style of styles)assert.ok(gallery.includes(style+':'),'Gallery missing display name for '+style);
console.log('PASS: all eight new Studio II styles render on Canvas and survive project save/reload and dropdowns');