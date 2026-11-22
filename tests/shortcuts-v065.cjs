const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),js=fs.readFileSync(path.join(root,'keyboard-shortcuts-v065.js'),'utf8');
const saved={},buttons=new Map(),events={};let current=0;
const button=(id)=>{if(!buttons.has(id))buttons.set(id,{id,disabled:false,clicked:0,click(){this.clicked++;}});return buttons.get(id);};
const st={original:()=>({size:10}),exporting:()=>false,video:()=>({pause(){}}),seekOutput:()=>{},sequencePosition:()=>12,
 deleteSelected(){current++;},isPlaying:()=>false};
const context={
 document:{getElementById:id=>id==='v062-shortcuts-dialog'?null:button(id),
  addEventListener(type,fn){events[type]=fn;},querySelectorAll:()=>[]},
 globalThis:{localStorage:{getItem:k=>saved[k]||null,setItem(k,v){saved[k]=v;}},MangoClipView:st},
 Event:class {},Object,Set,Map,JSON,Promise
};
vm.runInNewContext(js,context,{filename:'keyboard-shortcuts-v065.js'});
const api=context.globalThis.MangoShortcuts;
assert.equal(api.active,true);const defaults=api.keys();
assert.equal(defaults.select,'V');assert.equal(defaults.razor,'C');assert.equal(defaults.workspaceTimeline,'Shift+3');
function ke(key,code='',mods={}){
 let prevented=0,stopped=0;
 const e={key,code,ctrlKey:false,shiftKey:false,altKey:false,metaKey:false,isComposing:false,repeat:false,
  target:{closest:()=>null},preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;},...mods};
 events.keydown(e);return {prevented,stopped};
}
assert.equal(api.normalize({key:'!',code:'Digit1',shiftKey:true,ctrlKey:false,metaKey:false,altKey:false}),'Shift+1');
assert.equal(api.normalize({key:'?',code:'Slash',shiftKey:true,ctrlKey:false,metaKey:false,altKey:false}),'Shift+/');
assert.equal(api.normalize({key:' ',code:'Space',shiftKey:false,ctrlKey:false,metaKey:false,altKey:false}),'Space');
assert.equal(api.normalize({key:'z',code:'KeyZ',ctrlKey:true,shiftKey:false,metaKey:false,altKey:false}),'Ctrl+Z');
assert.equal(ke('v','KeyV').prevented,1);assert.equal(button('tool-select').clicked,1);
assert.equal(ke('c','KeyC').prevented,1);assert.equal(button('tool-razor').clicked,1);
assert.equal(ke('Delete','Delete').prevented,1);assert.equal(current,1);
assert.equal(ke('z','KeyZ',{ctrlKey:true}).prevented,1);assert.equal(button('undo').clicked,1);
assert.equal(api.bind('select','C').ok,false,'Conflicting shortcut must be rejected');
assert.equal(api.bind('select','Ctrl+W').ok,false,'Browser close-tab must be reserved');
assert.equal(api.bind('select','Alt+Q').ok,true);
assert.equal(api.keys().select,'Alt+Q');assert.ok(saved['MangoShot.ClipStudio.Keymap.v1']);
assert.equal(ke('v','KeyV').prevented,0,'Old binding must no longer fire');
assert.equal(ke('q','KeyQ',{altKey:true}).prevented,1);assert.equal(button('tool-select').clicked,2);
assert.equal(ke('v','KeyV',{target:{closest:()=>({})}}).prevented,0,'Do not intercept typing in form fields');
assert.equal(api.bind('select','').ok,true);
assert.equal(api.keys().select,'');
assert.equal(api.bind('select','V').ok,true);
assert.equal(api.bind('ripple','Ctrl+R').ok,false,'Browser reload must be reserved');
assert.equal(api.validate({...api.defaults,select:'C'}).select,'V','Duplicate imported binding must not override a default');
console.log('PASS: shortcut dispatch, modifiers, editable safety, uniqueness, reserved browser keys and local persistence');