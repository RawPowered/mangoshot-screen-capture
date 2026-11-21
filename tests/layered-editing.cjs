const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx={Math,JSON,Date};ctx.globalThis=ctx;
for(const name of ['clip-edit-ops.js','clip-graphics.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
const {MangoEditOps:E,MangoGraphics:G}=ctx;
const eq=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
let parts=[{start:0,end:12}];
const divided=E.split(parts,5);eq(divided,[{start:0,end:5},{start:5,end:12}]);
eq(E.split(divided,9),[{start:0,end:5},{start:5,end:9},{start:9,end:12}]);
eq(E.remove(divided,3,7),[{start:0,end:3},{start:7,end:12}]);
assert.equal(E.length(E.remove(divided,3,7)),8);
assert.equal(E.toSource(E.remove(divided,3,7),3.5),7.5);
assert.equal(E.toOutput(E.remove(divided,3,7),7.5),3.5);
assert.equal(E.toOutput(E.remove(divided,3,7),5),null);
eq(E.trim(divided,2,9),[{start:2,end:5},{start:5,end:9}]);
const label=G.create('text','lowerThird',3,{id:'x',end:9});
const callout=G.create('callout','none',5,{id:'y',start:5,end:11,track:3});
assert.equal(label.preset,'lowerThird');assert.equal(callout.kind,'callout');
const shifted=G.ripple([label,callout],4,8);
assert.equal(shifted[0].start,3);assert.equal(shifted[0].end,5);
assert.equal(shifted[1].start,4);assert.equal(shifted[1].end,7);
const sliced=G.trim([label,callout],5,10);assert.equal(sliced[0].start,0);assert.equal(sliced[0].end,4);
const custom=G.style(label,'none');assert.equal(custom.preset,'none');assert.equal(custom.font,'sans');
let drawn=0;const fake={
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){drawn++;},stroke(){},fillText(){drawn++;},strokeText(){},
 measureText(s){return {width:String(s).length*12}}
};
G.render(fake,[label,callout],6,1280,720);assert.ok(drawn>0,'Graphics must actually draw when visible');
drawn=0;G.render(fake,[label,callout],1,1280,720);assert.equal(drawn,0,'Graphics must not draw outside time range');
assert.equal(G.at([callout,label],6).map(x=>x.id).join(','),'x,y','Track 3 must render above track 2');
console.log('PASS: razor split, ripple timing, source mapping, layers, presets, timed canvas rendering');
