/* MangoShot v0.6.17 shared shortcut core and runtime across both editor contexts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function engine(studio,legacyKeys=null){
 const store=new Map(),handlers={},buttons=new Map(),called=[];
 class Element{
  constructor(tag='div',id=''){
   this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.children=[];this.listeners={};
   this.open=false;this.style={};this.value='';this.disabled=false;this.type='button';this.textContent='';this.files=[];
   this.classList={contains:x=>studio==='image'?x==='studio-image':x==='studio-clip',toggle(){},add(){},remove(){}};
  }
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  setAttribute(k,v){this[k]=v}
  removeAttribute(k){if(k==='open')this.open=false}
  hasAttribute(k){return k==='open'?this.open:false}
  append(...items){this.children.push(...items)}
  replaceChildren(...items){this.children=[...items]}
  remove(){}
  focus(){doc.activeElement=this}
  showModal(){this.open=true}
  close(){this.open=false;for(const cb of this.listeners.close||[])cb()}
  click(){called.push(this.id);for(const cb of this.listeners.click||[])cb({target:this})}
  querySelector(){return null}
  querySelectorAll(q){if(q.includes('[data-command-id]'))return this.children.filter(c=>c.dataset.commandId);return []}
 }
 const doc={
  body:new Element('body'),activeElement:null,
  createElement:tag=>new Element(tag),
  getElementById(id){
   if(!buttons.has(id))buttons.set(id,new Element('button',id));
   return buttons.get(id);
  },
  querySelector(){return null},
  querySelectorAll(){return []},
  addEventListener(k,fn){(handlers[k]??=[]).push(fn)}
 };
 const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
 const root={localStorage,document:doc,confirm:()=>true,addEventListener(){}};
 if(legacyKeys)root.MangoShortcuts={keys:()=>({...legacyKeys})};
 if(studio==='image')root.MangoImageActions={run:id=>{called.push('image:'+id);return id!=='notLoaded'}};
 else root.MangoClipView={original:()=>({size:1}),exporting:()=>false,video:()=>({pause(){}}),
  seekOutput(){},sequencePosition:()=>12,deleteSelected(){called.push('delete')},
  deleteSelection(){called.push('deleteRange')},isPlaying:()=>false};
 const sandbox={globalThis:root,document:doc,window:root,Math,Map,Set,Object,Array,String,
  Number,Error,JSON,Promise,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,setTimeout};
 vm.runInNewContext(read('shortcut-core-v0617.js'),sandbox,{filename:'shortcut-core-v0617.js'});
 vm.runInNewContext(read('studio-shortcuts-v0617.js'),sandbox,{filename:'studio-shortcuts-v0617.js'});
 function press(key,code='',opts={}){
  let prevented=0,stopped=0;
  const e={key,code,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,
   isComposing:false,repeat:false,target:{closest:()=>null},preventDefault(){prevented++},
   stopImmediatePropagation(){stopped++},...opts};
  for(const fn of handlers.keydown||[])fn(e);
  return{prevented,stopped};
 }
 return {api:root.MangoShortcutsV0617,core:root.MangoShortcutCoreV0617,press,
  called,doc,root,store,buttons};
}
const i=engine('image');assert.ok(i.api.active);assert.equal(i.api.studio,'image');
const core=i.core;
assert.equal(core.normalize({key:'?',code:'Slash',shiftKey:true}),'Shift+/');
assert.equal(core.normalize({key:'[',code:'BracketLeft'}),'[');
assert.equal(core.normalize({key:']',code:'BracketRight'}),']');
assert.equal(core.normalize({key:'z',code:'KeyZ',ctrlKey:true}),'Ctrl+Z');
assert.equal(core.canonical('Ctrl+W'),null);
assert.equal(core.canonical('Ctrl+Shift+P'),null);
assert.equal(core.canonical('Alt+ArrowLeft'),null);
assert.equal(core.canonical('Meta+Q'),null);
assert.equal(core.canonical('Ctrl+Alt+K'),'Ctrl+Alt+K');
assert.equal(core.canonical('Shift+E'),'Shift+E');
assert.equal(core.canonical('Ctrl+Alt+K+K'),null);
assert.equal(core.rebind(core.defaults('image'),'select','E','image').ok,false,'Cannot duplicate Brush Erase');
assert.equal(core.rebind(core.defaults('image'),'select','Ctrl+W','image').ok,false);
const testImageKeys=[['v','KeyV','select'],['p','KeyP','pen'],['e','KeyE','brushErase'],
 ['E','KeyE','strokeErase']];
for(const [key,code,id] of testImageKeys){
 const result=i.press(key,code,id==='strokeErase'?{shiftKey:true}:{});
 assert.equal(result.prevented,1,id+' must execute only once');
 assert.ok(i.called.includes('image:'+id));
}
assert.equal(i.press('v','KeyV',{target:{closest:()=>({})}}).prevented,0,'Editable fields are safe');
assert.equal(i.press('v','KeyV',{isComposing:true}).prevented,0,'IME composition is safe');
assert.equal(i.press('v','KeyV',{repeat:true}).prevented,0,'Held tool key cannot repeat');
assert.equal(i.press('w','KeyW',{ctrlKey:true}).prevented,0,'Reserved browser key must pass through');
assert.equal(i.api.bind('select','Ctrl+W').ok,false);
assert.equal(i.api.bind('select','Alt+Q').ok,true);
assert.equal(i.api.keys().select,'Alt+Q');
assert.equal(i.press('v','KeyV').prevented,0,'Changed binding releases old key');
assert.equal(i.press('q','KeyQ',{altKey:true}).prevented,1);
assert.ok(i.store.has('MangoShot.Shortcuts.Image.v2'));
let palette=i.press('k','KeyK',{ctrlKey:true,altKey:true});
assert.equal(palette.prevented,1);
assert.equal(i.doc.getElementById('studio-command-palette').open,true);
i.press('Escape','Escape');
assert.equal(i.doc.getElementById('studio-command-palette').open,false);
const preferences=i.press('?','Slash',{shiftKey:true});
assert.equal(preferences.prevented,1);
assert.equal(i.doc.getElementById('image-shortcuts-dialog').open,true);
assert.equal(i.press('v','KeyV').prevented,0,'Shortcuts dialog prevents tool commands');
i.doc.getElementById('image-shortcuts-dialog').close();
assert.equal(i.api.bind('select','V').ok,true);
const clipLegacy={select:'Alt+Q',razor:'C',range:'R',showShortcuts:'Shift+/'};
const c=engine('clip',clipLegacy);
assert.equal(c.api.studio,'clip');assert.equal(c.api.keys().select,'Alt+Q','Migrates existing clip binding');
assert.equal(c.api.keys().commandPalette,'Ctrl+Alt+K','New commands gain defaults');
assert.equal(c.press('q','KeyQ',{altKey:true}).prevented,1);
assert.ok(c.called.includes('tool-select'));
assert.equal(c.press('c','KeyC').prevented,1);
assert.ok(c.called.includes('tool-razor'));
assert.equal(c.press('z','KeyZ',{ctrlKey:true}).prevented,1);
assert.ok(c.called.includes('undo'));
assert.equal(c.press('x','KeyX',{target:{closest:()=>({})}}).prevented,0);
const profile={format:'MangoShot.Shortcuts',version:2,studio:'clip',bindings:c.api.keys()};
const valid=core.check(profile.bindings,'clip',{allowMissing:false});
assert.equal(valid.ok,true);
const invalid=core.check({...profile.bindings,razor:'Alt+Q'},'clip',{allowMissing:false});
assert.equal(invalid.ok,false);
const imageHtml=read('editor.html'),clipHtml=read('clip-studio.html'),legacy=read('keyboard-shortcuts-v065.js');
for(const html of [imageHtml,clipHtml]){
 for(const link of ['shortcut-core-v0617.js','studio-shortcuts-v0617.js','studio-menus-v0617.js','studio-v0617.css','studio-command-palette'])
  assert.ok(html.includes(link),'Missing shared shortcut UI dependency: '+link);
 assert.ok(html.indexOf('studio-command-palette')<html.indexOf('studio-shortcuts-v0617.js'),
  'Modal must exist before module initializes');
}
assert.ok(imageHtml.includes('data-studio-action="showShortcuts"'));
assert.ok(clipHtml.includes('data-studio-action="commandPalette"'));
assert.ok(legacy.includes('root.MangoShortcutsV0617?.active'),'Legacy shortcut handler must yield to newer manager');
assert.ok(read('editor.js').includes('run:imageCommand'));
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
console.log('PASS: shared core, safe browser/typing rules, editable unique bindings, keymap migration, command palette and cross-studio menu wiring');
