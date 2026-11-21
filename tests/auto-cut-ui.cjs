const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dom=new Map();class Node{
 constructor(id){this.id=id;this.value='0';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.children=[];this.style={};this.handlers={};this.open=false;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 replaceChildren(...next){this.children=next;}
 append(...children){this.children.push(...children);}
 scrollIntoView(){};setAttribute(){};
}
const el=id=>{if(!dom.has(id))dom.set(id,new Node(id));return dom.get(id);};
const doc={getElementById:el,createElement:tag=>new Node(tag)};
const old=new Blob(['video-data']);let source=old,applied=0,seen=null,messages=[],seeked=null;
let segments=[{start:0,end:10}],layers=[];
const view={original:()=>source,url:()=> 'blob:local',duration:()=>10,outputDuration:()=>segments.reduce((n,x)=>n+x.end-x.start,0),
 segments:()=>segments,layers:()=>layers,exporting:()=>false,seekOutput:t=>{seeked=t;},
 commitAutoCut:ranges=>{applied++;seen=ranges;segments=[{start:0,end:7}];return true;}};
const context={document:doc,Blob,DOMException,AbortController,console,MangoClipView:view,MangoAutoCutAnalysis:{
 audio:async(_blob,_url,_opts,signal,progress)=>{progress(1,'Finished');return {ranges:[{start:2,end:5,reason:'silence'}],method:'PCM',sourceDuration:10};},
 still:async()=>({ranges:[{start:6,end:9,reason:'still'}],method:'frames',sourceDuration:10})},
 MangoAutoCut:{proposals:(ranges)=>ranges.map(r=>({...r,enabled:true}))}};
context.globalThis=context;
for(const [id,value] of Object.entries({'autocut-mode':'audio','autocut-min':'1.2','autocut-padding':'.18','autocut-db':'-38','autocut-motion':'.009'}))el(id).value=value;
el('autocut-protect').checked=true;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','auto-cut-ui.js'),'utf8'),context);
(async()=>{
 assert.equal(el('autocut-analyze').disabled,false,'Analyze available when source is loaded');
 await context.MangoAutoCutUI.analyze();
 assert.equal(el('autocut-list').children.length,1);
 assert.equal(el('autocut-overlay').children.length,1,'Timeline overlay must show one red removal');
 assert.equal(el('autocut-apply').disabled,false);
 el('autocut-list').children[0].children[2].onclick();assert.equal(seeked,1.9,'Preview button seeks near candidate');
 el('autocut-apply').onclick();assert.equal(applied,1,'Apply should be single transaction');
 assert.equal(seen.length,1);assert.equal(el('autocut-overlay').children.length,0,'Edits invalidate stale cut overlays');
 assert.equal(el('autocut-apply').disabled,true);
 el('autocut-mode').value='still';el('autocut-mode').handlers.change();await context.MangoAutoCutUI.analyze();
 assert.equal(el('autocut-list').children.length,1);
 source=new Blob(['second source']);context.MangoAutoCutUI.onEditorChange();
 assert.equal(el('autocut-apply').disabled,true,'New source must not use prior suggestions');
 console.log('PASS: AutoCut analysis review, timeline marks, one-transaction apply, mode changes, source invalidation');
})().catch(e=>{console.error(e);process.exitCode=1});
