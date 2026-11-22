/* MangoShot v0.6.16 — browser Pointer Events + non-destructive annotation erasers.
 * Browser exposes pen events, not direct Wacom SDK access. No upload/telemetry.
 */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(n))?Number(n):a));
 const supported=new Set(['pen','highlighter','rectangle','redact','text','shape','arrow']);
 function eraserTip(event){
  return event?.pointerType==='pen'&&(event.button===5||((Number(event.buttons)||0)&32)!==0);
 }
 function pressure(event,enabled=true){
  if(!enabled||event?.pointerType!=='pen')return 1;
  const p=Number(event?.pressure);
  return Number.isFinite(p)?clamp(p,.04,1):.5;
 }
 function samples(event){
  let events=[];
  try{events=typeof event?.getCoalescedEvents==='function'?event.getCoalescedEvents()||[]:[];}catch{}
  if(!Array.isArray(events)||!events.length)events=[event];
  else{
   // Coalesced points are ordered, and the dispatched event may be the last point.
   const last=events[events.length-1];
   if(last?.clientX!==event.clientX||last?.clientY!==event.clientY)events=[...events,event];
  }
  return events.slice(-96);
 }
 function localPoint(event,rect,width,height,enabled=true){
  const w=Number(rect?.width)||1,h=Number(rect?.height)||1;
  return {x:(event.clientX-(rect?.left||0))*width/w,
   y:(event.clientY-(rect?.top||0))*height/h,
   p:pressure(event,enabled)};
 }
 function pointSegmentDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
  const t=d>0?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
 }
 function lineHit(s,p,radius){
  const points=s?.points||[];
  if(!points.length)return false;
  const margin=radius+Math.max(1,Number(s.size)||3)*(s.type==='highlighter'?2.5:.5);
  if(points.length===1)return Math.hypot(p.x-points[0].x,p.y-points[0].y)<=margin;
  for(let i=1;i<points.length;i++){
   if(pointSegmentDistance(p,points[i-1],points[i])<=margin)return true;
  }
  return false;
 }
 function wholeStrokeHit(s,p,radius,vectorCore,textHit){
  if(!s||s.visible===false||s.locked||s.type==='image'||
   s.type==='erase-brush'||s.type==='eraser'||s.type==='erase-stroke')return false;
  if(['pen','highlighter'].includes(s.type))return lineHit(s,p,radius);
  if(s.type==='redact'){
   const a=s.points?.[0],b=s.points?.at(-1);if(!a||!b)return false;
   return p.x>=Math.min(a.x,b.x)-radius&&p.x<=Math.max(a.x,b.x)+radius&&
    p.y>=Math.min(a.y,b.y)-radius&&p.y<=Math.max(a.y,b.y)+radius;
  }
  if(s.type==='text')return typeof textHit==='function'&&textHit(s,p.x,p.y,radius)===true;
  if(vectorCore?.isVector?.(s))return vectorCore.hit(s,p.x,p.y,radius)===true;
  return supported.has(s.type)&&lineHit(s,p,radius);
 }
 function intersectIndices(layers,p,radius,vectorCore,textHit){
  const indices=[];
  for(let i=layers.length-1;i>=0;i--)
   if(wholeStrokeHit(layers[i],p,radius,vectorCore,textHit))indices.push(i);
  return indices;
 }
 function paintEraser(ctx,stroke){
  if(stroke?.type!=='erase-brush'&&stroke?.type!=='eraser')return false;
  if(stroke.visible===false)return true;
  const points=stroke.points||[];
  if(!points.length)return true;
  const size=clamp(stroke.size,1,400),hardness=clamp(stroke.hardness??.8,.05,1);
  const opacity=clamp(stroke.opacity??1,0,1);
  const usePressure=stroke.usePressure!==false;
  const circle=point=>{
   const p=usePressure?clamp(point.p??1,.04,1):1;
   const radius=Math.max(.6,size*(stroke.type==='eraser'?2.5:.5)*(.18+.82*p));
   ctx.globalAlpha=opacity*(usePressure?(.2+.8*p):1);
   ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);
   if(typeof ctx.createRadialGradient==='function'&&hardness<.99){
    const gradient=ctx.createRadialGradient(point.x,point.y,radius*hardness,point.x,point.y,radius);
    gradient.addColorStop(0,'rgba(0,0,0,1)');
    gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gradient;
   }else ctx.fillStyle='#000000';
   ctx.fill();
  };
  ctx.save();ctx.globalCompositeOperation='destination-out';
  circle(points[0]);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],distance=Math.hypot(b.x-a.x,b.y-a.y);
   const radius=Math.max(1,size*.5),steps=Math.min(4096,Math.ceil(distance/Math.max(1,radius*.35)));
   for(let j=1;j<=steps;j++){
    const t=j/steps;
    circle({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
     p:(a.p??1)+((b.p??1)-(a.p??1))*t});
   }
  }
  ctx.restore();return true;
 }
 function createDiagnostic({canvas,fields={},copyButton,clearButton}={}){
  if(!canvas?.addEventListener||!canvas.getContext)return null;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const state={events:0,pen:0,mouse:0,touch:0,eraser:0,coalesced:0,minimum:1,maximum:0,
   lastPressure:0,tiltX:0,tiltY:0,twist:0,buttons:0,pointerType:'none',active:false};
  let pointerId=null,last=null;
  function render(){
   if(fields.type)fields.type.textContent=state.pointerType;
   if(fields.pressure)fields.pressure.textContent=state.lastPressure.toFixed(3);
   if(fields.range)fields.range.textContent=state.pen?
    state.minimum.toFixed(3)+' – '+state.maximum.toFixed(3):'No pen contact yet';
   if(fields.tilt)fields.tilt.textContent=state.tiltX+'° / '+state.tiltY+'°';
   if(fields.rotation)fields.rotation.textContent=state.twist+'°';
   if(fields.eraser)fields.eraser.textContent=state.eraser?'Detected ('+state.eraser+')':'Not detected';
   if(fields.events)fields.events.textContent=state.events+' samples · '+state.coalesced+' coalesced';
   if(fields.status)fields.status.textContent=!state.pen?
    'No pen contact observed. Use the pen on the test pad.':
    state.maximum-state.minimum>.07?
    'Pen pressure varies — pressure input observed.':
    'Pen contact observed, but pressure variation not yet confirmed. Vary pressure on the pad.';
  }
  function add(event,draw=false){
   if(!event)return;
   state.events++;
   const kind=['pen','mouse','touch'].includes(event.pointerType)?event.pointerType:'unknown';
   state.pointerType=kind;
   if(kind==='pen'){state.pen++;const p=pressure(event,true);
    state.minimum=Math.min(state.minimum,p);state.maximum=Math.max(state.maximum,p);}
   else if(kind==='mouse')state.mouse++;else if(kind==='touch')state.touch++;
   state.lastPressure=Number.isFinite(Number(event.pressure))?Number(event.pressure):0;
   state.tiltX=Number(event.tiltX)||0;state.tiltY=Number(event.tiltY)||0;
   state.twist=Number(event.twist)||0;state.buttons=Number(event.buttons)||0;
   if(eraserTip(event))state.eraser++;
   if(draw){
    const p=localPoint(event,canvas.getBoundingClientRect(),canvas.width,canvas.height,true);
    ctx.save();ctx.lineCap='round';
    if(eraserTip(event)){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=15;}
    else{ctx.strokeStyle='#b6f379';ctx.lineWidth=2+17*pressure(event,true);}
    ctx.beginPath();ctx.moveTo(last?.x??p.x,last?.y??p.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    ctx.restore();last=p;
   }
  }
  const down=e=>{
   if(e.button!==0&&!eraserTip(e))return;
   pointerId=e.pointerId;last=null;state.active=true;
   canvas.setPointerCapture?.(e.pointerId);e.preventDefault?.();add(e,true);render();
  };
  const move=e=>{
   if(pointerId!==e.pointerId)return;
   const list=samples(e);state.coalesced+=Math.max(0,list.length-1);
   for(const part of list)add(part,true);
   e.preventDefault?.();render();
  };
  const up=e=>{
   if(pointerId!==e.pointerId)return;
   add(e,false);pointerId=null;last=null;state.active=false;
   canvas.releasePointerCapture?.(e.pointerId);render();
  };
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',up);
  const clear=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);
   Object.assign(state,{events:0,pen:0,mouse:0,touch:0,eraser:0,coalesced:0,
    minimum:1,maximum:0,lastPressure:0,tiltX:0,tiltY:0,twist:0,buttons:0,pointerType:'none',active:false});
   pointerId=null;last=null;render();};
  clearButton?.addEventListener?.('click',clear);
  const report=()=>[
   'MangoShot Pen Diagnostics v0.6.16','Device reported: '+state.pointerType,
   'Pen contact samples: '+state.pen,'Pressure observed: '+(state.pen?
    state.minimum.toFixed(3)+' to '+state.maximum.toFixed(3):'none'),
   'Pressure varied: '+(state.pen>0&&state.maximum-state.minimum>.07?'yes':'not confirmed'),
   'Eraser events: '+state.eraser,
   'Tilt X / Y: '+state.tiltX+' / '+state.tiltY,
   'Twist: '+state.twist,'Coalesced extra events: '+state.coalesced,
   'Total events: '+state.events,
   'Note: browser pointer data cannot identify tablet manufacturer.'
  ].join('\n');
  copyButton?.addEventListener?.('click',()=>{if(root.navigator?.clipboard?.writeText)
   root.navigator.clipboard.writeText(report()).then(()=>{if(fields.status)fields.status.textContent='Diagnostic report copied locally.';})
    .catch(()=>{if(fields.status)fields.status.textContent='Clipboard blocked. Read the results on screen.';});});
  render();return {snapshot:()=>({...state}),report,clear};
 }
 root.MangoPenInputV0616={eraserTip,pressure,samples,localPoint,pointSegmentDistance,
  lineHit,wholeStrokeHit,intersectIndices,paintEraser,createDiagnostic};
})(typeof globalThis!=='undefined'?globalThis:this);
