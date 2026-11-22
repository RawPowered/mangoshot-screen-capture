/* MangoShot v0.6.11: real editor interactions in a mocked extension page.
 * Validates ClipboardItem image/png composition, text placement, selection and Undo.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const drawCalls=[];let activeCopy=false,clipboardWrites=[];
const elements=new Map(),events={};
class FakeElement{
 constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.hidden=['text-inline','text-selection-box','image-context-menu'].includes(id);
  this.value=id==='tool'?'pen':id==='zoom'?'fit':id==='size'?'4':id==='text-font-size'?'48':
   id==='text-font-family'?'sans':id==='color'?'#ffb100':'';
  this.style={};this.dataset={};this.disabled=false;this.width=0;this.height=0;this.clientWidth=1200;this.textContent='';this.children=[];
  this.listeners={};this.classList={toggle(){},add(){},remove(){}};this.ownerDocument=document;
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 fire(type,e={}){for(const fn of this.listeners[type]||[])fn(e);}
 append(...children){this.children.push(...children);}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...children){this.children=[...children];}
 remove(){}
 setAttribute(name,value){this[name]=value;}
 getAttribute(name){return this[name];}
 getBoundingClientRect(){return {left:0,top:0,width:640,height:480};}
 getContext(){if(!this._ctx)this._ctx=makeContext();return this._ctx;}
 toBlob(cb,type){assert.equal(type,'image/png');cb(new Blob([new Uint8Array([137,80,78,71,0])],{type:'image/png'}));}
 focus(){}
 select(){}
 setPointerCapture(){}
 contains(child){return child===this||this.children.includes(child);}
 querySelector(selector){return selector.startsWith('[data-image-action')?actionItems.find(x=>x.dataset.imageAction==='delete'):actionItems[0];}
 querySelectorAll(){return actionItems;}
}
function makeContext(){return {
 save(){},restore(){},clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},
 stroke(){},fill(){},setLineDash(){},strokeText(){},fillText(v){drawCalls.push('text:'+v);},
 measureText(t){return {width:String(t).length*22};},drawImage(){drawCalls.push('image');}
};}
const document={
 createElement:tag=>new FakeElement(tag),
 getElementById:id=>{if(!elements.has(id))elements.set(id,new FakeElement('div',id));return elements.get(id);},
 querySelector:selector=>document.getElementById(selector.startsWith('#')?selector.slice(1):selector),
 querySelectorAll:selector=>selector==='[data-image-action]'?actionItems:[],
 addEventListener(type,fn){(events[type]??=[]).push(fn);},
 body:{appendChild(){}},activeElement:null
};
const actionItems=['copy','copy-original','png','pdf','undo','redo','delete'].map(action=>{
 const b=new FakeElement('button');b.dataset.imageAction=action;return b;
});
const context={
 document,window:{innerWidth:1280,innerHeight:900,addEventListener(){}},location:{search:'?stored=mock-id'},URLSearchParams,
 Image:class {naturalWidth=640;naturalHeight=480;width=640;height=480;set src(value){Promise.resolve().then(()=>this.onload?.());}},
 Promise,Map,JSON,Number,String,Array,Math,Error,Blob,Date,requestAnimationFrame:cb=>cb(),setTimeout,clearTimeout,
 crypto:{randomUUID:()=> 'mock-uuid'},
 navigator:{clipboard:{write(items){assert.equal(activeCopy,true,'Clipboard write must start from a real click');
  clipboardWrites.push(items);return Promise.resolve();}}},
 ClipboardItem:class {constructor(data){this.data=data;}},
 URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
 MangoPDF:{fromCanvas:async()=>new Blob(['pdf'])},
 MangoCaptureStore:{load:async()=>({meta:{width:640,height:480,pageHeight:480,dpr:1,frames:1,full:false},
  frames:[{index:0,scrollY:0,dataUrl:'data:image/png;base64,AAAA'}]}),remove:async()=>{}}
};
const chrome={runtime:{lastError:null,onMessage:{addListener(){}}},
 tabs:{getCurrent(cb){cb({id:55})},update(id,data,cb){cb({id:55})}}};
context.globalThis={chrome,crypto:context.crypto,MangoCaptureStore:context.MangoCaptureStore};
for(const id of ['png','pdf','copy-image','clear'])document.getElementById(id).disabled=true;
vm.runInNewContext(read('image-editor-core-v0611.js'),context,{filename:'image-editor-core-v0611.js'});
const core=context.globalThis.MangoImageEditorCore;
assert.ok(core);
const stroke={type:'text',points:[{x:100,y:120}],fontSize:48,fontFamily:'sans',
 styleId:'label',text:'Review\nThis',color:'#ffffff'};
const ctx=makeContext(),bounds=core.textMetrics(ctx,stroke);
assert.ok(bounds.width>90&&bounds.height>100);
assert.equal(core.hitText(ctx,stroke,105,125),true);
assert.equal(core.hitText(ctx,stroke,10,10),false);
assert.doesNotThrow(()=>core.drawText(ctx,stroke));
vm.runInNewContext(read('editor.js'),context,{filename:'editor.js'});
const get=id=>document.getElementById(id),fire=(id,type,e)=>get(id).fire(type,e);
async function settle(){await new Promise(resolve=>setTimeout(resolve,15));}
(async()=>{
 await settle();
 assert.equal(get('png').disabled,false,'Image must be assembled before editing');
 // Click to place, type inline, press Enter. Never stamps a hardcoded "Note".
 get('tool').value='text';fire('tool','change');
 fire('ink','pointerdown',{button:0,pointerId:1,clientX:100,clientY:120,preventDefault(){}});
 assert.equal(get('text-inline').hidden,false);
 get('text-inline-input').value='Hello MangoShot';
 fire('text-inline-input','keydown',{key:'Enter',shiftKey:false,isComposing:false,preventDefault(){},stopPropagation(){}});
 assert.equal(get('text-inline').hidden,true);
 assert.equal(get('tool').value,'select','Placed text must remain movable');
 assert.ok(drawCalls.some(x=>x==='text:Hello MangoShot'));
 assert.equal(get('stroke-list').children.length,1,'Text is an editable annotation object');
 // Drag selection, then Undo: the selected text box must move and restore.
 const box=get('text-selection-box'),before=box.style.left;
 fire('ink','pointerdown',{button:0,pointerId:2,clientX:110,clientY:124,preventDefault(){}});
 fire('ink','pointermove',{pointerId:2,clientX:190,clientY:160,preventDefault(){}});
 fire('ink','pointerup',{pointerId:2});
 const moved=box.style.left;
 assert.notEqual(moved,before,'Dragging a text object must update its position');
 fire('undo','click');assert.equal(box.style.left,before,'Undo restores original text geometry');
 // Right-click menu must use FULL native screenshot, with both base + ink.
 const menu=get('image-context-menu');
 fire('canvas-wrap','contextmenu',{clientX:200,clientY:140,preventDefault(){},stopPropagation(){}});
 assert.equal(menu.hidden,false,'Custom menu must replace the native canvas menu');
 const copy=actionItems.find(x=>x.dataset.imageAction==='copy');
 drawCalls.length=0;activeCopy=true;copy.fire('click');activeCopy=false;
 await settle();
 assert.equal(clipboardWrites.length,1);
 const item=clipboardWrites[0][0],png=await item.data['image/png'];
 assert.equal(png.type,'image/png');
 assert.equal(drawCalls.filter(x=>x==='image').length,2,'Clipboard image must compose base AND ink');
 assert.match(get('status').textContent,/copied.*640 × 480/i);
 // Original-only action retains the existing undecorated screenshot.
 drawCalls.length=0;activeCopy=true;
 actionItems.find(x=>x.dataset.imageAction==='copy-original').fire('click');
 activeCopy=false;await settle();
 assert.equal(drawCalls.filter(x=>x==='image').length,1);
 console.log('PASS: inline text, move/undo, full-resolution annotated PNG clipboard and context menu');
})().catch(error=>{console.error(error);process.exitCode=1});
