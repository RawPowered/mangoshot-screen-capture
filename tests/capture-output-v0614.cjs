/* v0.6.14 capture output: visible/full/area pixels + image clipboard boundaries. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','capture-output-v0614.js'),'utf8');
const drawn=[],written=[],revoked=[];
class FakeImage{
 naturalWidth=100;naturalHeight=60;
 set src(value){Promise.resolve().then(()=>this.onload?.());}
}
class FakeCanvas{
 constructor(){this.width=0;this.height=0;}
 getContext(){return {drawImage(...args){drawn.push(args);}}}
 toBlob(cb,type){assert.equal(type,'image/png');cb(new Blob(['png-bytes'],{type:'image/png'}));}
}
const clipboard={
 async write(items){written.push(items);},
 async read(){return[{types:['text/plain','image/png'],async getType(type){assert.equal(type,'image/png');return new Blob(['img'],{type:'image/png'});}}]}
};
const env={Image:FakeImage,Blob,Promise,Math,Number,String,Array,Error,URL:{
 createObjectURL:()=> 'blob:mock',revokeObjectURL:url=>revoked.push(url)
},document:{createElement(name){assert.equal(name,'canvas');return new FakeCanvas();}},
 navigator:{clipboard},ClipboardItem:class{constructor(data){this.data=data}},Uint8Array};
env.globalThis=env;
vm.runInNewContext(src,env,{filename:'capture-output-v0614.js'});
const C=env.MangoCaptureOutputV0614;
const png='data:image/png;base64,'+'A'.repeat(160);
const frame=[{index:0,scrollY:0,dataUrl:png}];
(async()=>{
 const visible=await C.compose({width:100,height:60,pageHeight:60,frames:1,full:false},frame);
 assert.equal(visible.width,100);assert.equal(visible.height,60);
 const full=await C.compose({width:100,height:60,pageHeight:120,frames:2,full:true},
  [...frame,{index:1,scrollY:60,dataUrl:png}]);
 assert.equal(full.width,100);assert.equal(full.height,120);
 assert.ok(drawn.some(x=>x.length===9&&x[6]===60),'Full page must draw second frame at correct scroll offset');
 drawn.length=0;
 const area=await C.compose({width:100,height:60,pageHeight:60,frames:1,full:false,
  selection:{x:10,y:5,width:30,height:22}},frame);
 assert.equal(area.width,30);assert.equal(area.height,22);
 assert.deepEqual([...drawn[0].slice(1)],[10,5,30,22,0,0,30,22],
  'Draggable area must copy only user selected pixels');
 await assert.rejects(C.compose({width:100,height:60,pageHeight:60,frames:1,full:false,
  selection:{x:-5,y:0,width:20,height:20}},frame),/selected.*area/i);
 const blob=await C.toBlob(area);assert.equal(blob.type,'image/png');
 await C.write(C.toBlob(area));assert.equal(written.length,1);
 assert.equal((await written[0][0].data['image/png']).type,'image/png');
 assert.equal((await C.read()).type,'image/png');
 const imported=await C.blobImage(new Blob(['png'],{type:'image/png'}));
 assert.equal(imported.width,100);assert.equal(imported.height,60);
 assert.equal(revoked.length,1);
 await assert.rejects(C.blobImage(new Blob(['x'],{type:'text/html'})),/PNG, JPEG or WebP/);
 console.log('PASS: pixel-accurate visible/full/area capture, clipboard image write/read and safe local decoding');
})().catch(e=>{console.error(e);process.exitCode=1});
