/* Creative Effects v1: alpha-preserving gradients and ordered isolated outer effects.
 * All state is JSON, all processing local, no external resources. */
(function(root){'use strict';
 const MAX_PIXELS=9000000,MAX_STOPS=8,MAX_SHADOWS=6,MAX_LAYERS=64;
 const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
 const exact=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 const copy=v=>JSON.parse(JSON.stringify(v));
 const empty=()=>({gradient:null,shadows:[]});
 const eligible=l=>!!l&&!['redact','eraser','erase-brush','erase-stroke'].includes(l.type);
 function checkGradient(g){
  if(g===null)return null;
  if(!exact(g,['kind','angle','opacity','stops'])||!['linear','radial'].includes(g.kind)||!finite(g.angle,-180,180)||!finite(g.opacity,0,1)||!Array.isArray(g.stops)||g.stops.length<2||g.stops.length>MAX_STOPS)throw Error('Invalid gradient.');
  const stops=g.stops.map((s,i)=>{if(!exact(s,['position','color','opacity'])||!finite(s.position,0,1)||!hex(s.color)||!finite(s.opacity,0,1)||(i>0&&s.position<=g.stops[i-1].position))throw Error('Gradient stops must be ordered and unique.');return {...s,color:s.color.toLowerCase()};});
  if(stops[0].position!==0||stops.at(-1).position!==1)throw Error('Gradient endpoints must be 0% and 100%.');
  return {...g,stops};
 }
 function checkShadow(s){
  if(!exact(s,['kind','enabled','color','opacity','blur','x','y'])||!['shadow','glow'].includes(s.kind)||typeof s.enabled!=='boolean'||!hex(s.color)||!finite(s.opacity,0,1)||!finite(s.blur,0,100)||!finite(s.x,-200,200)||!finite(s.y,-200,200))throw Error('Invalid shadow or glow.');
  return {...s,color:s.color.toLowerCase(),x:s.kind==='glow'?0:s.x,y:s.kind==='glow'?0:s.y};
 }
 function check(v){
  if(!exact(v,['gradient','shadows'])||!Array.isArray(v.shadows)||v.shadows.length>MAX_SHADOWS)throw Error('Invalid creative appearance or too many outer effects.');
  return {gradient:checkGradient(v.gradient),shadows:v.shadows.map(checkShadow)};
 }
 const active=v=>!!v&&(!!v.gradient&&v.gradient.opacity>0||v.shadows.some(s=>s.enabled&&s.opacity>0));
 const content=v=>!!v&&(v.gradient!==null||v.shadows.length>0);
 const rgba=(c,a)=>'rgba('+parseInt(c.slice(1,3),16)+','+parseInt(c.slice(3,5),16)+','+parseInt(c.slice(5,7),16)+','+a+')';
 const stop=(position,color,opacity=1)=>({position,color,opacity});
 const presets=[
  ['spectrum','Spectrum',[stop(0,'#ff0000'),stop(.5,'#00ff00'),stop(1,'#0000ff')]],
  ['gold','Brushed gold',[stop(0,'#6b4617'),stop(.21,'#e5b75f'),stop(.41,'#fff0b9'),stop(.55,'#96621d'),stop(.74,'#ecc77a'),stop(1,'#5d3c14')]],
  ['silver','Polished silver',[stop(0,'#4e5968'),stop(.24,'#d9e4ef'),stop(.46,'#ffffff'),stop(.53,'#788a9b'),stop(.78,'#d5dee8'),stop(1,'#414951')]],
  ['carbon','Carbon steel',[stop(0,'#15191e'),stop(.25,'#46515c'),stop(.55,'#a6b2bd'),stop(.72,'#41484f'),stop(1,'#171b20')]],
  ['aurora','Aurora',[stop(0,'#243b9d'),stop(.4,'#17c9b2'),stop(.7,'#b0ef81'),stop(1,'#6b3bb4')]],
  ['glass','Glass sheen',[stop(0,'#d8f3ff',.85),stop(.35,'#87b9dd',.25),stop(.49,'#ffffff',.7),stop(.54,'#334a68',.25),stop(1,'#c2e2ff',.7)]]
 ].map(([id,name,stops])=>({id,name,gradient:{kind:'linear',angle:0,opacity:1,stops}}));
 const shadow=kind=>kind==='glow'?{kind:'glow',enabled:true,color:'#a7efce',opacity:.8,blur:15,x:0,y:0}:{kind:'shadow',enabled:true,color:'#000000',opacity:.7,blur:12,x:14,y:14};
 function requireBudget(layers,w,h,C=root.MangoCompositorV0714){
  let count=0;for(const l of layers||[]){if(l.creativeFx==null)continue;
   if(!eligible(l))throw Error('Protected redaction and eraser layers cannot receive creative effects.');
   const v=check(l.creativeFx);if(!active(v))continue;count++;
   const needsBlur=v.shadows.some(s=>s.enabled&&s.opacity>0&&s.blur>0)||(l.layerFx?.kind!=='none'&&l.layerFx?.blur>0);
   if(needsBlur&&C&&!C.supports())throw Error('This browser does not support reliable Canvas2D blur.');
  }
  if(count&&(w*h>MAX_PIXELS||count>MAX_LAYERS))throw Error('Creative effects support up to 9 megapixels and 64 active layers. Reduce size or disable effects.');
 }
 function mapped(ctx,b){
  if(!b)return {x:0,y:0,width:ctx.canvas.width,height:ctx.canvas.height};
  const m=ctx.getTransform(),pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(1,Math.max(...xs)-Math.min(...xs)),height:Math.max(1,Math.max(...ys)-Math.min(...ys))};
 }
 function makeGradient(q,g,b){
  const cx=b.x+b.width/2,cy=b.y+b.height/2,a=g.angle*Math.PI/180;let grad;
  if(g.kind==='radial')grad=q.createRadialGradient(cx,cy,0,cx,cy,Math.max(.5,Math.hypot(b.width,b.height)/2));
  else{const r=Math.max(.5,(Math.abs(b.width*Math.cos(a))+Math.abs(b.height*Math.sin(a)))/2),dx=Math.cos(a)*r,dy=Math.sin(a)*r;grad=q.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);}
  for(const s of g.stops)grad.addColorStop(s.position,rgba(s.color,s.opacity));return grad;
 }
 function gradientCSS(g){const stops=g.stops.map(s=>rgba(s.color,s.opacity)+' '+(s.position*100)+'%').join(',');return g.kind==='radial'?'radial-gradient(circle,'+stops+')':'linear-gradient('+(g.angle+90)+'deg,'+stops+')';}
 // Shared scratch is safe because paint is synchronous and never recursively invokes this module.
 let buffers=null;
 function reset(q){q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.globalAlpha=1;q.filter='none';q.shadowColor='transparent';q.shadowBlur=q.shadowOffsetX=q.shadowOffsetY=0;q.clearRect(0,0,q.canvas.width,q.canvas.height);}
 function paint(ctx,l,draw,bounds,scale,legacy){
  if(!eligible(l)||!active(l.creativeFx)){draw(ctx);return;}
  const v=check(l.creativeFx),w=ctx.canvas.width,h=ctx.canvas.height;
  if(!w||!h||w*h>MAX_PIXELS)throw Error('Creative effect raster budget exceeded.');
  if(!buffers)buffers=Array.from({length:3},()=>root.document.createElement('canvas'));
  for(const c of buffers){if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;}
  const [source,mask,result]=buffers,[p,q,r]=buffers.map(c=>c.getContext('2d'));reset(p);reset(q);reset(r);
  const b=mapped(ctx,bounds);
  p.save();try{p.setTransform(ctx.getTransform());draw(p);}finally{p.restore();}
  if(v.gradient&&v.gradient.opacity>0){
   p.save();try{p.setTransform(1,0,0,1,0,0);p.globalCompositeOperation='source-atop';p.globalAlpha=v.gradient.opacity;p.fillStyle=makeGradient(p,v.gradient,b);p.fillRect(0,0,w,h);}finally{p.restore();}
  }
  const entries=v.shadows.filter(s=>s.enabled&&s.opacity>0).map(s=>({...s,x:s.x*scale,y:s.y*scale,blur:s.blur*scale}));
  if(legacy&&legacy.kind!=='none')entries.unshift({kind:legacy.kind,color:legacy.color,opacity:1,blur:legacy.blur,x:legacy.kind==='glow'?0:legacy.offsetX,y:legacy.kind==='glow'?0:legacy.offsetY});
  for(const s of entries){
   reset(q);if(s.blur>0)q.filter='blur('+s.blur+'px)';q.drawImage(source,s.x,s.y);q.filter='none';q.globalCompositeOperation='source-in';q.fillStyle=rgba(s.color,s.opacity);q.fillRect(0,0,w,h);
   r.drawImage(mask,0,0);
  }
  r.drawImage(source,0,0);
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.filter='none';ctx.shadowColor='transparent';ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.globalCompositeOperation=legacy?.blend||'source-over';ctx.drawImage(result,0,0);}finally{ctx.restore();}
 }
 const api=Object.freeze({MAX_PIXELS,MAX_STOPS,MAX_SHADOWS,MAX_LAYERS,copy,empty,eligible,check,active,content,presets,shadow,requireBudget,gradientCSS,paint});
 root.MangoCreativeEffectsV0726=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
