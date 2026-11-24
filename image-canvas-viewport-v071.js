/* MangoShot v0.7.1 — no-scroll image canvas navigation.
 * Space + left drag or middle-button drag pans; Alt + wheel zooms at pointer. */
(function(root){'use strict';
 if(typeof document==='undefined'||!document.body?.classList?.contains('studio-image'))return;
 const doc=document,body=doc.body,stage=doc.getElementById('workspace');
 const wrap=doc.getElementById('canvas-wrap'),base=doc.getElementById('base');
 const zoom=doc.getElementById('zoom');
 if(!stage||!wrap||!zoom||!base)return;
 let space=false,drag=null,offset={x:0,y:0};
 const editable=target=>!!target?.closest?.(
  'input,textarea,select,button,a,summary,[contenteditable],[role="textbox"],[role="button"]');
 function paint(){
  wrap.style.transform='translate('+Math.round(offset.x)+'px,'+Math.round(offset.y)+'px)';
 }
 function reset(){offset={x:0,y:0};paint();}
 const within=target=>target===stage||target===wrap||wrap.contains?.(target);
 function arm(value){space=!!value;body.classList.toggle('v071-pan-armed',space);}
 function end(event){
  if(!drag||event?.pointerId!=null&&event.pointerId!==drag.id)return;
  drag=null;body.classList.remove('v071-panning');
  if(event?.pointerId!=null&&stage.hasPointerCapture?.(event.pointerId))
   stage.releasePointerCapture?.(event.pointerId);
 }
 doc.addEventListener('keydown',event=>{
  if(doc.getElementById('automation-dialog-v075')?.open)return;
  if(event.key==='Escape'){end();arm(false);return;}
  if(event.code!=='Space'&&event.key!==' ')return;
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||editable(event.target))return;
  event.preventDefault();arm(true);
 },true);
 doc.addEventListener('keyup',event=>{
  if(event.code==='Space'||event.key===' ')arm(false);
 },true);
 stage.addEventListener('pointerdown',event=>{
  const pan=(event.button===1||(space&&event.button===0));
  if(!pan||!within(event.target))return;
  event.preventDefault();event.stopImmediatePropagation();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,
   originX:offset.x,originY:offset.y};
  stage.setPointerCapture?.(event.pointerId);
  body.classList.add('v071-panning');
 },true);
 stage.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  event.preventDefault();event.stopImmediatePropagation();
  offset={x:drag.originX+event.clientX-drag.x,y:drag.originY+event.clientY-drag.y};
  paint();
 },true);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  stage.addEventListener(name,end,true);
 root.addEventListener?.('blur',()=>{end();arm(false);});
 const addZoom=(value,label,before)=>{
  if([...zoom.options].some(opt=>opt.value===value))return;
  const node=doc.createElement('option');node.value=value;node.textContent=label;
  if(before)zoom.insertBefore(node,zoom.firstChild);
  else zoom.append(node);
 };
 addZoom('fit-width','Fit width',true);
 addZoom('0.25','25%');
 addZoom('3','300%');
 addZoom('4','400%');
 const steps=[.25,.5,.75,1,1.5,2,3,4];
 stage.addEventListener('wheel',event=>{
  if(!event.altKey||!base.width||!within(event.target))return;
  event.preventDefault();
  const old=wrap.getBoundingClientRect();
  const current=old.width/base.width;
  const idx=steps.findIndex(v=>v>=current-.01);
  const index=idx<0?steps.length-1:idx;
  const next=steps[Math.max(0,Math.min(steps.length-1,index+(event.deltaY<0?1:-1)))];
  const x=old.width?Math.min(1,Math.max(0,(event.clientX-old.left)/old.width)):.5;
  const y=old.height?Math.min(1,Math.max(0,(event.clientY-old.top)/old.height)):.5;
  zoom.value=String(next);
  zoom.dispatchEvent(new Event('change',{bubbles:true}));
  const after=wrap.getBoundingClientRect();
  offset.x+=old.left+old.width*x-(after.left+after.width*x);
  offset.y+=old.top+old.height*y-(after.top+after.height*y);
  paint();
 },{passive:false});
 zoom.addEventListener('change',()=>{
  if(zoom.value==='fit')reset();
 });
 root.MangoCanvasViewportV071={reset,offset:()=>({...offset}),arm,
  panBy:(x,y)=>{offset.x+=Number(x)||0;offset.y+=Number(y)||0;paint();}};
 const hint=doc.getElementById('image-hint');
 if(hint)hint.textContent='Fit shows the whole capture · Space + drag or middle-drag pans · Alt + wheel zooms at cursor.';
})(typeof globalThis!=='undefined'?globalThis:this);
