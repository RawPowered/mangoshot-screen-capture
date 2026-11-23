/* Clip Studio v0.6.15 mode state: one timeline controller owns tool selection.
 * Direct rails and shortcut clicks must agree; one-shot graphics commands do not switch tools. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const source=read('clip-timeline-ui.js'),start=source.indexOf('function setTool(name){');
const end=source.indexOf('function razorOnTimeline(',start);
assert.ok(start>=0&&end>start);
const toolCode=source.slice(start,end);
const elements=new Map(),rails=new Map(),messages=[];
function fake(id){if(!elements.has(id)){elements.set(id,{
 id,attributes:{},dataset:{},classList:{toggle(name,value){this[name]=value}},
 setAttribute(name,value){this.attributes[name]=value;},
 querySelector(query){return query==='strong'?this.title:this.subtitle;},
 title:{textContent:''},subtitle:{textContent:''}
});}return elements.get(id);}
for(const name of ['tool-select','tool-razor','range-tool'])rails.set(name,[fake('rail-'+name)]);
const document={
 body:{dataset:{}},
 querySelectorAll(q){const key=q.match(/\[data-v06-tool="(.+?)"\]/)?.[1];return rails.get(key)||[];}
};
const sandbox={document,Object,tool:'select',state:()=>({message:msg=>messages.push(msg)}),ui:fake};
vm.createContext(sandbox);vm.runInContext(toolCode+';globalThis.setTool=setTool;',sandbox);
for(const [name,id,label] of [['razor','tool-razor','RAZOR'],['range','range-tool','RANGE'],['select','tool-select','SELECT']]){
 assert.equal(sandbox.setTool(name),true);
 assert.equal(sandbox.tool,name);
 assert.equal(fake('timeline').dataset.tool,name);
 assert.equal(document.body.dataset.clipTool,name);
 assert.equal(fake('v0615-active-tool').title.textContent,label);
 for(const kind of ['tool-select','tool-razor','range-tool']){
  const expected=String(kind===id);
  assert.equal(fake(kind).attributes['aria-pressed'],expected);
  assert.equal(fake('rail-'+kind).attributes['aria-pressed'],expected,
   kind+' rail press must follow same source state as timeline');
 }
}
assert.equal(sandbox.setTool('unknown'),false);
assert.ok(messages.some(x=>/Razor/.test(x)));
const html=read('clip-studio.html'),css=read('studio-v0615.css'),workspace=read('clip-workspace-ui.js');
assert.ok(html.includes('id="v0615-active-tool"')&&html.includes('studio-v0615.css'));
assert.ok(css.includes('[aria-pressed=true]')&&css.includes('[data-tool=range]'));
assert.ok(workspace.includes("'add-text':'add-text'"));
assert.ok(workspace.includes("'range-tool':'range-tool'"));
assert.ok(!workspace.includes("String(tool===button)"),'One-shot action cannot override active tool state');
console.log('PASS: Clip Studio Select/Razor/Range rail, timeline and indicator share persistent tool state');
