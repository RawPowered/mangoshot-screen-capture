/* Test the actual editor onMessage handler against the v0.2 duplicate-broadcast regression. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const elements=new Map();let listener;
const create=id=>{
 if(elements.has(id))return elements.get(id);
 const object={id,width:0,height:0,clientWidth:800,disabled:false,textContent:'',style:{},value:'fit',listeners:{},
 addEventListener(type,fn){this.listeners[type]=fn},getContext(){return {drawImage(){},clearRect(){},stroke(){},beginPath(){},moveTo(){},lineTo(){},fillText(){},fillRect(){},strokeRect(){},save(){},restore(){}}},
 getBoundingClientRect(){return {left:0,top:0,width:320,height:240}},setPointerCapture(){},click(){}};
 elements.set(id,object);return object;
};
const document={querySelector:create,getElementById:create,createElement:name=>create(name+'-new'),body:{appendChild(){}}};
const chrome={runtime:{lastError:null,onMessage:{addListener(fn){listener=fn}},sendMessage(msg,cb){/* no background: simulate initiation failure */cb({ok:false,error:'test harness'})}},
 tabs:{getCurrent(cb){cb({id:42})},update(id,options,cb){cb({id:42})}}};
class Image {naturalWidth=320;naturalHeight=240;get width(){return this.naturalWidth}get height(){return this.naturalHeight}
 set src(value){Promise.resolve().then(()=>this.onload?.())}};
const vmctx={globalThis:{chrome},document,window:{addEventListener(){}},location:{search:'?mode=visible&source=23'},URLSearchParams,Number,crypto:{randomUUID:()=> 'test-capture'},Image,Promise,Math,Error,requestAnimationFrame:fn=>{fn();return 1},setTimeout(){}};
vm.runInNewContext(read('editor.js'),vmctx);
function send(type,payload={}){let result;listener({type,captureId:'test-capture',...payload},{id:'test-ext'},value=>result=value);return result;}
(async()=>{
 const meta={width:320,height:240,pageHeight:240,frames:1,full:false};
 assert.equal(send('MANGO_EDITOR_START',{meta}).ok,true);
 send('MANGO_SOURCE_FRAME',{index:0,scrollY:0});
 assert.equal(create('#status').textContent,'Capturing 1 frame(s)…');
 const dataUrl='data:image/png;base64,AAA';
 assert.equal(send('MANGO_EDITOR_FRAME',{index:0,scrollY:0,dataUrl}).ok,true);
 assert.equal(create('#status').textContent,'Frame 1 / 1');
 assert.equal(send('MANGO_EDITOR_FRAME',{index:0,scrollY:0,dataUrl}).ok,false);
 assert.equal(send('MANGO_EDITOR_DONE').ok,true);
 await new Promise(setImmediate);
 assert.equal(create('#base').width,320);
 assert.equal(create('#base').height,240);
 assert.match(create('#status').textContent,/Ready/);
 console.log('PASS: actual editor ignores source frames, accepts image once, assembles image');
})().catch(e=>{console.error(e);process.exitCode=1});
