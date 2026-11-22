/* MangoShot v0.6.17 menu navigation: focus, native details, command routing. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const actions=[],listeners={},focused=[];
function node(id){
 return {id,open:false,dataset:{},textContent:'',listeners:{},
  setAttribute(key,value){this[key]=value;},
  addEventListener(type,cb){(this.listeners[type]??=[]).push(cb)},
  fire(type,event){for(const fn of this.listeners[type]||[])fn(event)},
  focus(){focused.push(id)},
  querySelector(){return null},
  querySelectorAll(){return []}
 };
}
const menus=['File','Edit','Layer','View','Help'].map(name=>{
 const m=node(name),summary=node(name+' summary'),item=node(name+' first');
 const pop=node(name+' pop');pop.querySelectorAll=()=>[item];
 m.querySelector=k=>k===':scope > summary'?summary:k==='.v06-menu-pop'?pop:null;
 m.querySelectorAll=()=>[item];return m;
});
const bar=node('bar'),kbd=node('key');
kbd.dataset.keyFor='undo';
bar.querySelectorAll=k=>k==='.v06-menu'?menus:k==='[data-key-for]'?[kbd]:[];
const doc={
 activeElement:null,querySelector:q=>q==='.v06-menu-bar'?bar:null,
 querySelectorAll:q=>q==='.v06-menu[open]'?menus.filter(m=>m.open):[],
 getElementById:id=>id==='status'?node('status'):null,
 addEventListener(k,cb){(listeners[k]??=[]).push(cb)}
};
const root={MangoShortcutsV0617:{act:id=>{actions.push(id);return true},keys:()=>({undo:'Ctrl+Z'})},
 MangoShortcutCoreV0617:{display:s=>s},addEventListener(){}};
const sandbox={globalThis:root,document:doc};
vm.runInNewContext(read('studio-menus-v0617.js'),sandbox);
assert.equal(kbd.textContent,'Ctrl+Z');
function key(target,key){let prevented=0;target.fire('keydown',{key,preventDefault(){prevented++}});return prevented;}
const file=menus[0],edit=menus[1],help=menus[4];
assert.equal(key(file.querySelector(':scope > summary'),'ArrowDown'),1);
assert.equal(file.open,true);assert.ok(focused.includes('File first'));
assert.equal(key(file.querySelector(':scope > summary'),'ArrowRight'),1);
assert.equal(edit.open,true);assert.equal(file.open,false);
assert.equal(key(edit.querySelector(':scope > summary'),'ArrowLeft'),1);
assert.equal(file.open,true);
assert.equal(key(file.querySelector('.v06-menu-pop'),'Escape'),1);
assert.equal(file.open,false);assert.ok(focused.includes('File summary'));
help.open=true;
const button={dataset:{studioAction:'showShortcuts'}};
bar.fire('click',{target:{closest:selector=>selector==='[data-studio-action]'?button:null}});
assert.deepEqual(actions,['showShortcuts']);assert.equal(help.open,false);
file.open=true;
for(const cb of listeners.pointerdown||[])cb({target:{closest:()=>null}});
assert.equal(file.open,false,'Clicking outside closes menus');
root.MangoStudioMenusV0617.refresh({undo:'Alt+Z'});
assert.equal(kbd.textContent,'Alt+Z');
for(const html of ['editor.html','clip-studio.html']){
 const source=read(html);
 assert.ok(source.includes('class="v06-menu-bar'),'Menus exist in '+html);
 assert.ok(source.includes('data-key-for="undo"'),'Live Undo label exists in '+html);
 assert.ok(source.includes('data-studio-action="showShortcuts"'),'Help preferences are accessible in '+html);
}
console.log('PASS: menu keyboard traversal, Escape, outside click, action dispatch and dynamic shortcut labels');
