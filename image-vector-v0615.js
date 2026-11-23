/* MangoShot Image Studio v0.6.15: editable Canvas vector shapes.
 * Serializable geometry + appearance; never rasterize in project history.
 * Shared painter is used for preview, clipboard and PNG/PDF exports.
 */
(function(root){'use strict';
 const kinds=Object.freeze(['rectangle','rounded-rectangle','ellipse','line','arrow',
  'triangle','diamond','pentagon','hexagon','star','speech-bubble']);
 const labels=Object.freeze({'rectangle':'Rectangle','rounded-rectangle':'Rounded rectangle',
  ellipse:'Ellipse',line:'Line',arrow:'Arrow',triangle:'Triangle',diamond:'Diamond',
  pentagon:'Pentagon',hexagon:'Hexagon',star:'Star','speech-bubble':'Speech bubble'});
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(Number(v))?Number(v):lo));
 const color=(v,def)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v)?v:def;
 const defaults=()=>({stroke:'#ffb100',strokeWidth:4,fill:'#ffb100',fillEnabled:false,
  lineStyle:'solid',opacity:1,cornerRadius:18,starPoints:5,starInner:.46,
  arrowHead:'end'});
 function kindOf(s){
  if(s?.type==='shape'&&kinds.includes(s.kind))return s.kind;
  return s&&['rectangle','arrow'].includes(s.type)?s.type:null;
 }
 function isVector(s){return !!kindOf(s);}
 function bounds(s){
  const a=s?.points?.[0]||{x:0,y:0},b=s?.points?.at(-1)||a;
  return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),
   width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};
 }
 function style(s){
  const d=defaults(),v=s?.vector||{};
  return {stroke:color(v.stroke||s?.color,d.stroke),strokeWidth:clamp(v.strokeWidth??s?.size??d.strokeWidth,.5,64),
   fill:color(v.fill,d.fill),fillEnabled:v.fillEnabled===true,
   lineStyle:['solid','dashed','dotted'].includes(v.lineStyle)?v.lineStyle:d.lineStyle,
   opacity:clamp(s?.opacity??v.opacity??1,0,1),cornerRadius:clamp(v.cornerRadius??18,0,200),
   starPoints:Math.round(clamp(v.starPoints??5,4,12)),
   starInner:clamp(v.starInner??.46,.1,.85),
   arrowHead:['none','start','end','both'].includes(v.arrowHead)?v.arrowHead:'end'};
 }
 function make(kind,a,b,values={}){
  if(!kinds.includes(kind))throw Error('Unsupported vector shape.');
  const d=defaults();
  const merged={...d,...values};const raw={type:'shape',kind,points:[{x:a.x,y:a.y,p:1},{x:b.x,y:b.y,p:1}],
   size:merged.strokeWidth,color:merged.stroke,visible:true,opacity:merged.opacity,
   vector:{stroke:merged.stroke,strokeWidth:merged.strokeWidth,fill:merged.fill,
    fillEnabled:merged.fillEnabled,lineStyle:merged.lineStyle,cornerRadius:merged.cornerRadius,
    starPoints:merged.starPoints,starInner:merged.starInner,arrowHead:merged.arrowHead}};
  raw.name=labels[kind];return raw;
 }
 function path(ctx,s){
  const k=kindOf(s),b=bounds(s),x=b.x,y=b.y,w=b.width,h=b.height,v=style(s);
  if(!k)return false;
  const px=x+w/2,py=y+h/2;
  const poly=(n,rInner)=>{
   const radius=Math.max(.01,Math.min(w,h)/2);
   ctx.beginPath();
   const steps=rInner?n*2:n;
   for(let i=0;i<steps;i++){
    const a=-Math.PI/2+Math.PI*2*i/steps;
    const rr=rInner&&i%2?radius*rInner:radius;
    const xx=px+Math.cos(a)*rr*(w/2/radius),yy=py+Math.sin(a)*rr*(h/2/radius);
    if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
   }
   ctx.closePath();
  };
  if(k==='line'||k==='arrow'){
   const a=s.points[0],z=s.points.at(-1)||a;
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);return true;
  }
  if(k==='rectangle'){ctx.beginPath();ctx.rect(x,y,w,h);return true;}
  if(k==='rounded-rectangle'||k==='speech-bubble'){
   const r=Math.min(v.cornerRadius,w/2,h/2);
   ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
   ctx.quadraticCurveTo(x+w,y,x+w,y+r);
   if(k==='speech-bubble'){
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+w*.38,y+h);ctx.lineTo(x+w*.2,y+h+Math.min(42,h*.25));
    ctx.lineTo(x+w*.24,y+h);ctx.lineTo(x+r,y+h);
   }else{ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);}
   ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
   ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();return true;
  }
  if(k==='ellipse'){ctx.beginPath();ctx.ellipse(px,py,Math.max(.05,w/2),Math.max(.05,h/2),0,0,Math.PI*2);return true;}
  if(k==='diamond'){ctx.beginPath();ctx.moveTo(px,y);ctx.lineTo(x+w,py);ctx.lineTo(px,y+h);ctx.lineTo(x,py);ctx.closePath();return true;}
  if(k==='triangle'){poly(3);return true;}
  if(k==='pentagon'){poly(5);return true;}
  if(k==='hexagon'){poly(6);return true;}
  if(k==='star'){poly(v.starPoints,v.starInner);return true;}
  return false;
 }
 function paint(ctx,s){
  if(!isVector(s)||s.visible===false)return false;
  const v=style(s),k=kindOf(s);
  ctx.save();ctx.globalAlpha*=v.opacity;
  ctx.lineWidth=v.strokeWidth;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=v.stroke;ctx.fillStyle=v.fill;
  if(typeof ctx.setLineDash==='function')ctx.setLineDash(v.lineStyle==='dashed'?[v.strokeWidth*3,v.strokeWidth*2]:v.lineStyle==='dotted'?[v.strokeWidth*.4,v.strokeWidth*2]:[]);
  if(!path(ctx,s)){ctx.restore();return false;}
  if(v.fillEnabled&&!['line','arrow'].includes(k))ctx.fill();
  ctx.stroke();
  if(k==='arrow'&&v.arrowHead!=='none'){
   const a=s.points[0],z=s.points.at(-1),len=Math.max(10,v.strokeWidth*4);
   const head=(from,to)=>{const theta=Math.atan2(to.y-from.y,to.x-from.x);
    ctx.beginPath();ctx.moveTo(to.x-len*Math.cos(theta-.5),to.y-len*Math.sin(theta-.5));
    ctx.lineTo(to.x,to.y);ctx.lineTo(to.x-len*Math.cos(theta+.5),to.y-len*Math.sin(theta+.5));ctx.stroke();};
   if(v.arrowHead==='start'||v.arrowHead==='both')head(z,a);
   if(v.arrowHead==='end'||v.arrowHead==='both')head(a,z);
  }
  ctx.restore();return true;
 }
 function hit(s,x,y,pad=10){
  if(!isVector(s)||s.visible===false)return false;
  const b=bounds(s),p=pad+style(s).strokeWidth/2;
  if(kindOf(s)==='line'||kindOf(s)==='arrow'){
   const a=s.points[0],z=s.points.at(-1),dx=z.x-a.x,dy=z.y-a.y;
   const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);
   return Math.hypot(x-(a.x+dx*t),y-(a.y+dy*t))<=p;
  }
  return x>=b.x-p&&y>=b.y-p&&x<=b.x+b.width+p&&y<=b.y+b.height+p+(kindOf(s)==='speech-bubble'?b.height*.25:0);
 }
 function translate(s,dx,dy){
  return {...s,points:(s.points||[]).map(p=>({...p,x:p.x+dx,y:p.y+dy}))};
 }
 function resized(s,from,to){
  if(!isVector(s)||!(from.width>0&&from.height>0))return s;
  const points=s.points.map(p=>({...p,
   x:to.x+(p.x-from.x)*to.width/from.width,
   y:to.y+(p.y-from.y)*to.height/from.height}));
  return {...s,points};
 }
 root.MangoImageVectorV0615={kinds,labels,defaults,isVector,kindOf,bounds,style,make,path,paint,hit,translate,resized};
})(typeof globalThis!=='undefined'?globalThis:this);
