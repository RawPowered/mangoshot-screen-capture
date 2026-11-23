const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx={Date,JSON,Math,Set,Number,Map};ctx.globalThis=ctx;
const load=name=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx,{filename:name});
for(const name of ['clip-timeline.js','clip-edit-ops.js','clip-graphics.js','caption-core-v072.js','sequence-operations.js',
 'auto-cut.js','clip-project.js'])load(name);
const cc=ctx.MangoCaptionsV072,project=ctx.MangoProject;
const srt='1\r\n00:00:01,150 --> 00:00:02,500\r\nFirst caption\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,800\r\nSecond caption';
const parsed=cc.parse(srt,12);
assert.equal(parsed.length,2);assert.equal(parsed[0].start,1.15);
assert.equal(parsed[1].end,4.8);
const vtt=cc.serialize(parsed,'vtt');assert.match(vtt,/^WEBVTT/);assert.match(vtt,/00:00:01\.150 --> 00:00:02\.500/);
assert.equal(cc.parse(vtt,12).length,2);
assert.match(cc.serialize(parsed),/00:00:01,150 --> 00:00:02,500/);
assert.throws(()=>cc.parse('not captions'),/No valid/);
assert.throws(()=>cc.parse('x'.repeat(1024*1024+1)),/too large/);
assert.throws(()=>cc.check([{id:'X',start:3,end:4,text:'Hi'},{id:'X',start:5,end:6,text:'Again'}],10),/ID/);
assert.throws(()=>cc.check([{id:'safe',start:2,end:2.02,text:'Bad'}],10),/timing/);
assert.throws(()=>cc.check([{id:'safe',start:2,end:4,text:'Bad'}],3),/timing/);
assert.throws(()=>cc.style({preset:'classic',font:'Courier New'}),/appearance/);
const next=cc.add(parsed,{start:6,end:8,text:'New'},12);
assert.equal(next.length,3);
const created=next.find(c=>!parsed.some(p=>p.id===c.id));
const altered=cc.update(next,created.id,{text:'Changed',start:6.2},12);
assert.equal(altered.find(x=>x.id===created.id).text,'Changed');
assert.equal(cc.remove(altered,created.id).length,2);
const crossing=[
 {id:'left',start:0,end:2,text:'L'},
 {id:'middle',start:2.4,end:3.6,text:'M'},
 {id:'right',start:5,end:8,text:'R'},
 {id:'cross',start:.5,end:6,text:'X'}
];
const shifted=cc.ripple(crossing,2,4);
assert.deepEqual(Array.from(shifted,x=>[x.id,x.start,x.end]),[
 ['left',0,2],['cross',.5,4],['right',3,6]]);
assert.deepEqual(Array.from(cc.trim(crossing,1,5),x=>[x.id,x.start,x.end]),[
 ['left',0,1],['cross',0,4],['middle',1.4,2.6]]);
const segments=[{start:0,end:12}],layers=[],markers=[{time:6,label:'After'}];
const tx=ctx.MangoAutoCut.apply(segments,layers,markers,[{start:2,end:4},{start:7,end:8}]);
let cues=crossing;
for(const cut of [{start:7,end:8},{start:2,end:4}])cues=cc.ripple(cues,cut.start,cut.end);
assert.equal(ctx.MangoEditOps.length(tx.segments),9);
assert.ok(cues.every(c=>c.end<=9),'All captions must fit the AutoCut-edited output');
const source={size:1234,format:'webm',duration:12};
const stored=project.pack(source,tx.segments,[],tx.markers,[],cues,cc.style({preset:'mango'}),false);
const restored=project.check(JSON.parse(JSON.stringify(stored)),source);
assert.equal(restored.burnCaptions,false);assert.equal(restored.captionStyle.preset,'mango');
assert.deepEqual(Array.from(restored.captions,x=>[x.id,x.start,x.end]),Array.from(cues,x=>[x.id,x.start,x.end]));
assert.equal(project.check(project.pack(source,segments,[]),source).captions.length,0,'Old project with no captions remains valid');
assert.throws(()=>project.check({...stored,captions:[{id:'x',start:1,end:2,text:'Hi'},{id:'x',start:3,end:4,text:'Hi'}]},source),/caption data/);
let texts=[],saveCount=0;
const context={save(){saveCount++},restore(){saveCount--},measureText:v=>({width:String(v).length*12}),
 fillRect(){},strokeText:v=>texts.push('stroke:'+v),fillText:v=>texts.push('fill:'+v)};
cc.draw(context,[{id:'draw',start:1,end:4,text:'Visible caption'}],2,1280,720,cc.style({preset:'classic'}));
assert.ok(texts.some(t=>t==='fill:Visible caption'),'Active captions must draw on the compositor');
assert.equal(saveCount,0);
texts=[];cc.draw(context,[{id:'draw',start:1,end:4,text:'Visible caption'}],4,1280,720,cc.style());
assert.equal(texts.length,0,'Captions end exclusively');
console.log('PASS: caption cue validation, SRT/VTT round-trip, AutoCut ripple, safe styling, project persistence, burn-in canvas');
