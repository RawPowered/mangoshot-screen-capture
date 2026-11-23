const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={JSON,Date};context.globalThis=context;
for(const file of ['clip-graphics.js','clip-project.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const {MangoGraphics:G,MangoProject:P}=context;
const source={size:10245,format:'webm',duration:9};
const segments=[{start:0,end:4},{start:6,end:9}],layers=[G.create('callout','callout',2,{id:'x',end:5})];
const original=P.pack(source,segments,layers,[{time:3,label:'Look here'}]);
const loaded=P.check(JSON.parse(JSON.stringify(original)),source);
assert.equal(loaded.segments.length,2);assert.equal(loaded.layers[0].kind,'callout');assert.equal(loaded.markers[0].label,'Look here');
assert.throws(()=>P.check(original,{...source,size:2}),/matching source/);
assert.throws(()=>P.check({...original,layers:[{...layers[0],background:'url(javascript:alert(1))'}]},source),/background/);
assert.throws(()=>P.check({...original,layers:[{...layers[0],text:'x'.repeat(401)}]},source),/text/);
for(const font of ['rounded','condensed','display','handwritten']){
 const draft=G.create('text','minimal',2,{id:'font-'+font,font,end:5});
 const project=P.pack(source,segments,[draft],[]);
 assert.equal(P.check(project,source).layers[0].font,font,'Font must survive JSON project validation');
}
console.log('PASS: non-destructive project round-trip, source guard, input validation');
