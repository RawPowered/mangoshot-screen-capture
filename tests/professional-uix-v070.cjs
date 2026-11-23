/* MangoShot v0.7 Patch B: pure contracts + minimal DOM smoke for both editors. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function loadCore(){
 const env={};vm.runInNewContext(read('studio-control-core-v070.js'),{globalThis:env});
 return env.MangoControlCoreV070;
}
const core=loadCore();
assert.equal(core.fieldsFor('image','rectangle').some(f=>f.id==='image-shape-fill-enabled'),true);
assert.equal(core.fieldsFor('image','text').some(f=>f.id==='text-font-size'),true);
assert.equal(core.fieldsFor('image','select',false,'TEXT LAYER').some(f=>f.id==='text-font-family'),true);
assert.equal(core.fieldsFor('image','select',false,'IMAGE LAYER').some(f=>f.id==='image-layer-x'),true);
assert.equal(core.fieldsFor('image','erase-brush').some(f=>f.id==='image-eraser-hardness'),true);
assert.equal(core.fieldsFor('clip','razor').some(f=>f.id==='timeline-zoom'),true);
assert.equal(core.fieldsFor('clip','select',true).some(f=>f.id==='graphic-opacity'),true);
assert.equal(core.validateLayout({side:9999,bottom:-40,dock:'invalid'}).side,520);
assert.equal(core.validateLayout({side:9999,bottom:-40,dock:'invalid'}).bottom,180);
assert.equal(core.validateLayout({dock:'invalid'}).dock,'right');
assert.equal(core.applyPreset(core.defaultLayout(),'image','canvas').properties,false);
assert.equal(core.applyPreset(core.defaultLayout(),'clip','graphics').dock,'bottom');
function smoke(studio){
 const attrs=new Map(),store=new Map(),nodes={};
 class Element{
  constructor(tag='div'){
   this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes=new Map();
   this.dataset={};this.textContent='';this.className='';this.value='';
   this.type=tag==='input'?'range':undefined;this.disabled=false;this.checked=false;this.open=false;
   this.style={setProperty:(k,v)=>attrs.set(k,v)};
   const classes=new Set(tag==='body'?['studio-'+studio]:[]);
   this.classList={contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),
    toggle:(k,v)=>{if(v===undefined?v:!!v)classes.add(k);else classes.delete(k);}};
  }
  setAttribute(k,v){this.attributes.set(k,String(v))}
  getAttribute(k){return this.attributes.get(k)||null}
  hasAttribute(k){return this.attributes.has(k)}
  removeAttribute(k){this.attributes.delete(k)}
  append(...v){this.children.push(...v)}
  replaceChildren(...v){this.children=[...v]}
  insertAdjacentElement(_position,node){this.children.push(node)}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  dispatchEvent(event){for(const handler of this.listeners[event.type]||[])handler(event);return true}
  cloneNode(){const v=new Element(this.tagName);v.type=this.type;v.value=this.value;v.checked=this.checked;
   v.disabled=this.disabled;v.selectedOptions=this.selectedOptions;v.attributes=new Map(this.attributes);return v;}
  querySelectorAll(query){if(query==='[data-v070-tool]')return find(this,n=>n.dataset.v070Tool);return []}
  click(){this.dispatchEvent({type:'click'})}
 }
 const find=(node,predicate)=>node.children.flatMap(c=>[...(predicate(c)?[c]:[]),...find(c,predicate)]);
 const body=new Element('body'),transport=new Element('div');
 const fields=studio==='image'?
  ['tool','color','size','image-tool-opacity','image-layer-opacity']:
  ['timeline-zoom','performance-profile','graphic-opacity','tool-select','tool-razor','range-tool','graphics-snap'];
 for(const id of fields){
  const v=new Element(id==='tool'||id==='performance-profile'?'select':'input');
  v.id=id;v.type=id==='color'?'color':'range';v.value=id==='tool'?'pen':id==='color'?'#ffa900':'42';
  v.selectedOptions=id==='tool'?[{textContent:'Pen'}]:[];
  nodes[id]=v;
 }
 const doc={body,createElement:tag=>new Element(tag),
  querySelector:q=>q==='.studio-transport'?transport:null,
  getElementById:id=>nodes[id]||null,addEventListener(){}};
 const context={document:doc,Event:class{constructor(type){this.type=type}},root:null};
 const window={document:doc,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  requestAnimationFrame:fn=>fn(),addEventListener(){},dispatchEvent(){},
  MangoControlCoreV070:core};
 if(studio==='clip'){
  let collapsed=false;
  window.MangoMediaDock={collapsed:()=>collapsed,toggle:()=>{collapsed=!collapsed}};
  window.MangoClipView={selectedLayer:()=>null,layers:()=>[]};
 }
 context.globalThis=window;context.window=window;
 vm.runInNewContext(read('studio-professional-v070.js'),context,{filename:'studio-professional-v070.js'});
 const api=window.MangoProfessionalUIV070;
 assert.equal(api.studio,studio);
 assert.equal(transport.children.some(c=>c.className==='v070-options-bar'),true);
 api.setLayout({properties:false,dock:'bottom',side:400});
 assert.equal(api.layout().properties,false);
 assert.equal(api.layout().dock,'bottom');
 assert.equal(body.classList.contains('v070-no-properties'),true);
 assert.equal(attrs.get('--v070-side'),'400px');
 assert.ok(store.has('MangoShot.ProfessionalLayout.v070.'+studio));
 if(studio==='image'){
  const bar=transport.children[0];
  const controls=find(bar,n=>n.dataset?.v070Source==='size');
  assert.equal(controls.length,1,'Pen width control must be in the top toolbar');
  controls[0].value='18';controls[0].dispatchEvent({type:'input'});
  assert.equal(nodes.size.value,'18','Proxy value must reach the authoritative source');
 }
 api.reset();assert.equal(api.layout().properties,true);
}
smoke('image');smoke('clip');
for(const page of ['editor.html','clip-studio.html']){
 const html=read(page);
 for(const item of ['studio-professional-v070.css','studio-control-core-v070.js','studio-professional-v070.js'])
  assert.ok(html.includes(item),page+' missing '+item);
 assert.ok(html.indexOf('studio-control-core-v070.js')<html.indexOf('studio-professional-v070.js'));
 assert.ok(html.indexOf('studio-professional-v070.css')>html.indexOf('studio-v0617.css'));
}
console.log('PASS: MangoShot v0.7 contextual controls, source-proxy updates, workspace persistence, editor wiring');
