/* MangoShot v0.7 Patch A — shortcut context and portable modifier regression. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','shortcut-core-v0617.js'),'utf8');
function load(platform){
 const root={navigator:{platform}};
 const sandbox={globalThis:root,Map,Set,Object,Array,String,Number,JSON,Math};
 vm.runInNewContext(source,sandbox,{filename:'shortcut-core-v0617.js'});
 return root.MangoShortcutCoreV0617;
}
function event(key,code,opts={}){
 return {key,code,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,isComposing:false,...opts};
}
const win=load('Win32'),mac=load('MacIntel');
assert.equal(win.platformName(),'other');
assert.equal(mac.platformName(),'mac');
assert.equal(mac.effective('Ctrl+Shift+Z'),'Meta+Shift+Z');
assert.equal(mac.effective('Meta+Z'),'Meta+Z');
assert.equal(win.effective('Ctrl+Z'),'Ctrl+Z');
assert.equal(win.resolve(win.defaults('image'),event('z','KeyZ',{ctrlKey:true})),'undo');
assert.equal(win.resolve(win.defaults('clip'),event('k','KeyK',{ctrlKey:true})),'split');
assert.equal(mac.resolve(mac.defaults('image'),event('z','KeyZ',{metaKey:true})),'undo');
assert.equal(mac.resolve(mac.defaults('clip'),event('k','KeyK',{metaKey:true})),'split');
assert.equal(mac.resolve(mac.defaults('image'),event('z','KeyZ',{ctrlKey:true})),null);
assert.equal(mac.display('Ctrl+Z'),'Cmd+Z');
assert.equal(mac.display('Shift+/'),'?');
assert.equal(win.display('Ctrl+Z'),'Ctrl+Z');
assert.equal(mac.check({...mac.defaults('image'),copyLayer:'Meta+X'},'image').ok,false,
 'Ctrl+X and Meta+X must not resolve to the same physical shortcut on macOS');
assert.equal(mac.check(mac.defaults('clip'),'clip').ok,true);
const editable=node=>({target:node,composedPath:()=>[node]});
const node=(tag='DIV',matches=false)=>({
 tagName:tag,type:'text',isContentEditable:false,closest:()=>matches?{}:null
});
assert.equal(win.eventEditable(editable(node('INPUT',true))),true);
assert.equal(win.eventEditable(editable(node('DIV',false))),false);
assert.equal(win.eventEditable({
 target:node('DIV'),composedPath:()=>[node('DIV'),node('TEXTAREA')]
}),true,'Text editor in composed event path must suppress tool shortcuts');
assert.equal(win.focusedControlAllows({
 target:node('BUTTON',true),key:' ',ctrlKey:false,altKey:false,metaKey:false
 },{image:true,selectedLayer:true}),false,'Space activates focused buttons');
assert.equal(win.focusedControlAllows({
 target:node('BUTTON',true),key:'v',ctrlKey:false,altKey:false,metaKey:false
 },{image:true,selectedLayer:true}),true,'Selected image layer can use tool keys');
assert.equal(win.focusedControlAllows({
 target:node('BUTTON',true),key:'v',ctrlKey:false,altKey:false,metaKey:false
 },{image:false,selectedLayer:false}),false,'Nonediting focused button retains keyboard');
console.log('PASS: MangoShot v0.7 editor core focus, Windows/macOS shortcuts, conflicts and control semantics');
