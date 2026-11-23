const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const ctx={Math,JSON,Date,Number};ctx.globalThis=ctx;
vm.runInNewContext(source('layer-timeline-ops.js'),ctx);
const Ops=ctx.MangoLayerOps;
const layer=(id,start,end,track=2)=>({id,name:id,kind:'text',text:id,start,end,track,visible:true,locked:false,
 x:.2,y:.2,width:.5,fontSize:52,font:'sans',weight:'600',align:'left',color:'#ffffff',background:'transparent',fadeIn:0,fadeOut:0,
 opacity:1,outline:'#000000',outlineWidth:0,shadow:0,tailX:.5,tailLength:32,preset:'none'});
const first=layer('A',10,20),second=layer('B',30,40);
assert.deepEqual([Ops.transform(first,'move',10,100).start,Ops.transform(first,'move',10,100).end],[20,30]);
assert.equal(Ops.transform(first,'start',25,100).start,19.92);
assert.equal(Ops.transform(first,'end',-25,100).end,10.08);
assert.equal(Ops.transform(first,'move',-200,100).start,0);
assert.equal(Ops.transform(first,'move',200,100).end,100);
assert.equal(Ops.snapTransform(first,'move',4.6,100,[second],15,.8,true).start,15,'Snaps start to playhead');
assert.equal(Ops.snapTransform(first,'move',4.6,100,[second],15,.8,false).start,14.6,'Alt/snap disabled preserves position');
assert.equal(Ops.snapTransform(first,'end',9.5,100,[second],30,.8,true).end,30);
assert.equal(Ops.reorder([first,second],'A',1)[1].id,'A');
assert.equal(Ops.placeAbove([first,second],'A','B')[1].id,'A');
assert.equal(Ops.placeAbove([first,layer('C',1,9,3)],'A','C')[1].track,3);
assert.equal(JSON.stringify(Ops.anchors([first,second],'A',22,100).sort((a,b)=>a-b)),'[0,22,30,40,100]');
const stacked=[layer('lower',0,5),layer('upper',0,5)];
const moved=Ops.reorder(stacked,'lower',1);
assert.equal(moved[1].id,'lower','Reordering changes same-track composition order');
const packed={schema:'mangoshot.project.v1',source:{size:100,format:'webm',duration:100},
 segments:[{start:0,end:100}],layers:moved,markers:[]};
const projectCtx={Math,JSON,Date};projectCtx.globalThis=projectCtx;
vm.runInNewContext(source('clip-project.js'),projectCtx);
vm.runInNewContext(source('clip-graphics.js'),projectCtx);
assert.equal(projectCtx.MangoGraphics.at(moved,2).map(l=>l.id).join(','),'upper,lower','Actual compositor must use the new same-track stacking order');
const project=projectCtx.MangoProject.check(packed,packed.source);
assert.equal(project.layers[1].id,'lower','Project roundtrip retains layer stacking');


class FakeElement {
 constructor(id=''){this.id=id;this.style={};this.dataset={};this.children=[];this.listeners={};this.value='0';this.textContent='';this.hidden=false;
 this.disabled=false;this.className='';this.classList={add:c=>this._classes.add(c),remove:c=>this._classes.delete(c),
 toggle:(c,on)=>{on?this._classes.add(c):this._classes.delete(c);},contains:c=>this._classes.has(c)};this._classes=new Set();}
 appendChild(c){this.children.push(c);c.parentElement=this;return c;}
 prepend(c){this.children.unshift(c);c.parentElement=this;}
 replaceChildren(...nodes){this.children=nodes;for(const c of nodes)c.parentElement=this;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
 addEventListener(name,cb){this.listeners[name]=cb;}
 setAttribute(){} setPointerCapture(){}
 getBoundingClientRect(){if(this.id==='timeline-inner')return {left:0,top:0,width:1000,height:300,right:1000,bottom:300};
 if(this.id==='graphic-track-2')return {left:0,top:80,width:1000,height:30,right:1000,bottom:110};
 if(this.id==='graphic-track-3')return {left:0,top:44,width:1000,height:30,right:1000,bottom:74};
 if(this.id==='graphics-preview')return {left:0,top:0,width:1000,height:500};
 return {left:0,top:0,right:100,width:100,height:35,bottom:35};}
}
const els=new Map(),el=id=>{if(!els.has(id))els.set(id,new FakeElement(id));return els.get(id);};
for(const id of ['graphic-track-2','graphic-track-3'])el(id).parentElement=new FakeElement('parent-'+id);
let layers=[first,second],selected=null,commits=[],stackChanges=0;
const st={outputDuration:()=>100,exporting:()=>false,layers:()=>layers,selectedLayer:()=>selected,video:()=>({currentTime:25}),outputAt:x=>x,
 selectLayer:(id)=>{selected=id;},commitLayerTimeline:(id,draft)=>{commits.push({...draft});layers=layers.map(x=>x.id===id?draft:x);ctx.MangoLayerUI.render();},
 reorderLayer:(id,dir)=>{stackChanges++;layers=Ops.reorder(layers,id,dir);ctx.MangoLayerUI.render();},
 placeLayerAbove:(id,target)=>{stackChanges++;layers=Ops.placeAbove(layers,id,target);ctx.MangoLayerUI.render();},
 setLayerHidden(){},setLayerLocked(){},styleLayer(){},addLayer(){},deleteLayer(){},duplicateLayer(){},updateLayer(){},
 message:()=>{},beginLayerMove:()=>{},moveLayer:()=>{},endLayerMove:()=>{},seekOutput:()=>{}};
ctx.document={getElementById:el,createElement:()=>new FakeElement()};ctx.MangoGraphics={at:()=>[],bounds:()=>({})};ctx.MangoClipView=st;
vm.runInNewContext(source('clip-graphics-ui.js'),ctx);
let chip=el('graphic-track-2').children.find(x=>x.dataset.layerId==='A');
const evt=(x,y,target=chip)=>({button:0,clientX:x,clientY:y,pointerId:1,target,preventDefault(){},stopPropagation(){}});
chip.listeners.pointerdown(evt(100,90));chip.listeners.pointermove(evt(200,90));chip.listeners.pointerup(evt(200,90));
assert.equal(commits.length,1);assert.equal(layers[0].start,20);assert.equal(layers[0].end,30);
chip=el('graphic-track-2').children.find(x=>x.dataset.layerId==='A');
const endHandle=chip.children.find(x=>x.dataset.edge==='end');
chip.listeners.pointerdown(evt(200,90,endHandle));chip.listeners.pointermove(evt(250,90,endHandle));chip.listeners.pointerup(evt(250,90,endHandle));
assert.equal(layers[0].start,20);assert.equal(layers[0].end,35,'Out handle extends duration');
chip=el('graphic-track-2').children.find(x=>x.dataset.layerId==='A');
chip.listeners.pointerdown(evt(200,90));chip.listeners.pointermove(evt(200,55));chip.listeners.pointerup(evt(200,55));
assert.equal(layers[0].track,3,'Layer drops onto G3');
const before=commits.length;chip=el('graphic-track-3').children.find(x=>x.dataset.layerId==='A');
chip.listeners.pointerdown(evt(200,55));chip.listeners.pointerup(evt(200,55));
assert.equal(commits.length,before,'Click/select is not recorded as an edit');
const snap=el('graphics-snap');snap.listeners.click();assert.equal(snap.textContent.includes('OFF'),true);
const row=el('layer-list').children.find(x=>x.dataset.id==='B'),grip=row.children.find(x=>x.className==='layer-grip');
const other=el('layer-list').children.find(x=>x.dataset.id==='A');
// Simulate a Wacom list drag with the grip captured and a target layer row.
other.getBoundingClientRect=()=>({top:40,bottom:70});
grip.listeners.pointerdown(evt(5,10,grip));grip.listeners.pointermove(evt(5,55,grip));grip.listeners.pointerup(evt(5,55,grip));
assert.equal(stackChanges,1,'Layer list supports reorder with pointer drag');
// Monitor interaction operates on normalized video coordinates, not window pixels.
ctx.MangoGraphics.at=(all,time)=>all.filter(l=>l.start<=time&&time<l.end&&l.visible);
ctx.MangoGraphics.bounds=(l,w,h)=>({x:l.x*w,y:l.y*h,w:l.width*w,h:120});
const preview=el('graphics-preview');preview.width=1000;preview.height=500;
let positionEdits=0,widthEdits=0;
st.beginLayerMove=()=>{};st.moveLayer=(id,x,y)=>{const l=layers.find(l=>l.id===id);l.x=x;l.y=y;positionEdits++;};
st.resizeLayer=(id,width,size)=>{const l=layers.find(l=>l.id===id);l.width=width;l.fontSize=size;widthEdits++;};
st.endLayerMove=()=>{};
// Move selected graphic: canvas click in its box, then drag 10% of preview width.
preview.listeners.pointerdown(evt(300,130,preview));
preview.listeners.pointermove(evt(400,180,preview));preview.listeners.pointerup(evt(400,180,preview));
assert.ok(positionEdits>0,'Program monitor must move graphic with pointer drag');
const activeGraphic=layers.find(l=>l.id==='A');
const bx=(activeGraphic.x+activeGraphic.width)*1000,by=activeGraphic.y*500+120;
preview.listeners.pointerdown(evt(bx,by,preview));
preview.listeners.pointermove(evt(bx+55,by+35,preview));preview.listeners.pointerup(evt(bx+55,by+35,preview));
assert.ok(widthEdits>0,'Program monitor resize handle must resize title with pointer');
console.log('PASS: timing/clamp/snap/reorder, same-track draw order, pointer move/trim/cross-track/list and monitor resize');
