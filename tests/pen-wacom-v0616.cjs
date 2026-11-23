/* v0.6.16: Wacom-compatible Pointer Events diagnostics and dual eraser behavior. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const operations=[];
const ctx={
 save(){operations.push('save')},restore(){operations.push('restore')},
 beginPath(){operations.push('begin')},arc(){operations.push('arc')},
 stroke(){operations.push('stroke')},fill(){operations.push('fill')},
 moveTo(){},lineTo(){},clearRect(){operations.push('clear')},
 createRadialGradient(){operations.push('gradient');return {addColorStop(){}}}
};
const scope={Math,Number,String,Array,Error};scope.globalThis=scope;
vm.runInNewContext(read('pen-input-v0616.js'),scope);
const P=scope.MangoPenInputV0616;
assert.ok(P&&P.pressure&&P.eraserTip&&P.createDiagnostic);
assert.equal(P.eraserTip({pointerType:'pen',button:5,buttons:0}),true);
assert.equal(P.eraserTip({pointerType:'pen',button:-1,buttons:32}),true);
assert.equal(P.eraserTip({pointerType:'pen',button:2,buttons:2}),false,
 'Barrel/right click is not pen eraser');
assert.equal(P.eraserTip({pointerType:'mouse',button:5,buttons:32}),false,
 'Never mistake a mouse button for a Wacom eraser');
assert.equal(P.pressure({pointerType:'pen',pressure:.2}),.2);
assert.equal(P.pressure({pointerType:'pen',pressure:.85}),.85);
assert.equal(P.pressure({pointerType:'pen',pressure:.85},false),1);
assert.equal(P.pressure({pointerType:'mouse',pressure:.5}),1);
assert.equal(P.pressure({pointerType:'pen',pressure:100}),1);
assert.equal(P.pressure({pointerType:'pen',pressure:0}),.04);
assert.equal(P.samples({clientX:10,clientY:20}).length,1);
const events=[{clientX:5,clientY:5},{clientX:10,clientY:11}];
assert.equal(P.samples({clientX:12,clientY:12,getCoalescedEvents:()=>events}).length,3);
assert.equal(P.samples({clientX:10,clientY:11,getCoalescedEvents:()=>events}).length,2);
assert.equal(P.samples({clientX:12,clientY:12,getCoalescedEvents(){throw Error('unsupported')}}).length,1);
const p=P.localPoint({clientX:110,clientY:45,pointerType:'pen',pressure:.3},
 {left:10,top:5,width:200,height:100},800,400);
assert.equal(p.x,400);assert.equal(p.y,160);assert.equal(p.p,.3);
const strokes=[
 {type:'pen',points:[{x:10,y:20},{x:90,y:20}],size:5},
 {type:'highlighter',points:[{x:10,y:50},{x:90,y:50}],size:8},
 {type:'shape',kind:'rectangle',points:[{x:150,y:150},{x:300,y:240}],size:3},
 {type:'text',points:[{x:100,y:100}],text:'Annotation'},
 {type:'image',points:[{x:0,y:0}],width:500,height:500},
 {type:'pen',points:[{x:10,y:20},{x:80,y:20}],size:5,locked:true},
 {type:'pen',points:[{x:10,y:20},{x:80,y:20}],size:5,visible:false},
 {type:'redact',points:[{x:400,y:400},{x:450,y:450}]},
 {type:'erase-brush',points:[{x:20,y:20}],size:9}
];
const vectors={isVector:s=>s.type==='shape',hit:(s,x,y,pad)=>x>=150-pad&&x<=300+pad&&y>=150-pad&&y<=240+pad};
const textHit=(s,x,y,pad)=>x>=100-pad&&x<=250+pad&&y>=100-pad&&y<=150+pad;
let selected=P.intersectIndices(strokes,{x:25,y:20},4,vectors,textHit);
assert.deepEqual([...selected],[0],'Pen geometry matches without removing locked or hidden strokes');
assert.deepEqual([...P.intersectIndices(strokes,{x:50,y:50},2,vectors,textHit)],[1]);
assert.deepEqual([...P.intersectIndices(strokes,{x:180,y:175},1,vectors,textHit)],[2]);
assert.deepEqual([...P.intersectIndices(strokes,{x:110,y:110},1,vectors,textHit)],[3]);
assert.deepEqual([...P.intersectIndices(strokes,{x:420,y:410},1,vectors,textHit)],[7]);
assert.deepEqual([...P.intersectIndices(strokes,{x:350,y:10},1,vectors,textHit)],[],
 'Imported image and untouched screenshot are not whole-stroke erase targets');
operations.length=0;
assert.equal(P.paintEraser(ctx,{type:'erase-brush',points:[{x:8,y:9,p:.2},
 {x:45,y:9,p:.9}],size:30,hardness:.4,opacity:.8,usePressure:true}),true);
assert.ok(operations.includes('gradient'),'Soft brush must paint a real variable-alpha gradient');
assert.ok(operations.includes('arc'),'Pressure brush must use round stamps');
assert.ok(operations.filter(x=>x==='fill').length>2,'Fast strokes must interpolate eraser dabs');
assert.equal(ctx.globalCompositeOperation,'destination-out');
assert.equal(P.paintEraser(ctx,{type:'pen',points:[]}),false);
assert.equal(P.paintEraser(ctx,{type:'erase-brush',points:[]}),true);
const slots={},handlers={};
for(const key of ['type','pressure','range','tilt','rotation','eraser','events','status'])slots[key]={textContent:''};
const canvas={
 width:320,height:148,
 getContext:()=>ctx,
 getBoundingClientRect:()=>({left:0,top:0,width:320,height:148}),
 addEventListener(type,cb){(handlers[type]??=[]).push(cb)},
 setPointerCapture(){},releasePointerCapture(){}
};
const button={
 handlers:{},addEventListener(type,cb){this.handlers[type]=cb},click(){this.handlers.click?.()}
};
const clearButton={...button,handlers:{}},copyButton={...button,handlers:{}};
const diagnostic=P.createDiagnostic({canvas,fields:slots,copyButton,clearButton});
const fire=(type,event)=>{for(const cb of handlers[type]||[])cb({...event,preventDefault(){}});};
fire('pointerdown',{pointerId:4,button:0,buttons:1,pointerType:'pen',pressure:.15,clientX:5,clientY:20});
fire('pointermove',{pointerId:4,button:-1,buttons:1,pointerType:'pen',pressure:.8,clientX:65,clientY:80,
 getCoalescedEvents:()=>[{pointerId:4,button:-1,buttons:1,pointerType:'pen',pressure:.4,clientX:40,clientY:50}]});
fire('pointerup',{pointerId:4,button:0,buttons:0,pointerType:'pen',pressure:0,clientX:65,clientY:80});
assert.ok(diagnostic.snapshot().pen>=2);
assert.ok(diagnostic.snapshot().maximum-diagnostic.snapshot().minimum>.07);
assert.match(slots.status.textContent,/pressure varies/i);
fire('pointerdown',{pointerId:8,button:5,buttons:32,pointerType:'pen',pressure:.3,clientX:70,clientY:40});
fire('pointerup',{pointerId:8,button:5,buttons:0,pointerType:'pen',pressure:0,clientX:70,clientY:40});
assert.ok(diagnostic.snapshot().eraser>0);
assert.match(slots.eraser.textContent,/Detected/);
assert.match(diagnostic.report(),/Wacom|browser/i);
clearButton.click();
assert.equal(diagnostic.snapshot().events,0);
assert.match(slots.status.textContent,/No pen contact/i);
const html=read('editor.html'),editor=read('editor.js');
for(const k of ['image-studio-v0616.css','pen-input-v0616.js','data-studio-tool="erase-brush"',
 'data-studio-tool="erase-stroke"','id="pen-test-pad"','pen-test-range',
 'image-eraser-hardness','image-pen-pressure','image-eraser-tip']){
 assert.ok(html.includes(k),'Missing pen test / eraser UI '+k);
}
for(const k of ['penInput?.paintEraser?.(pen,stroke)','penInput.intersectIndices(strokes',
 'penInput?.eraserTip?.(event)','pointerSamples(event)','function eraseEntireAt(p)',
 'penInput?.createDiagnostic?.(','lastEraserMode','snapshot();entireErase.changed=true']){
 assert.ok(editor.includes(k),'Missing pen/erase integration '+k);
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
console.log('PASS: pressure variation, eraser-tip button mapping, coalescing, both erasers and local diagnostic pad');
