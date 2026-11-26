/* MangoShot 0.7.15: source-pixel rotations and bounded, alpha-preserving material effects. */
(function(root){'use strict';
 const rad=a=>a*Math.PI/180;
 const angle=a=>{if(typeof a!=='number'||!Number.isFinite(a))throw Error('Rotation must be a finite angle.');return Math.round((((a%360)+540)%360-180)*1000)/1000;};
 const rotation=l=>Number.isFinite(l?.rotation)?angle(l.rotation):0;
 const eligible=l=>!!l&&!['redact','erase-brush','eraser','erase-stroke'].includes(l.type);
 const center=b=>({x:b.x+b.width/2,y:b.y+b.height/2});
 function rotate(p,c,a){const t=rad(a),x=p.x-c.x,y=p.y-c.y;return {...p,x:c.x+x*Math.cos(t)-y*Math.sin(t),y:c.y+x*Math.sin(t)+y*Math.cos(t)};}
 function local(p,b,a){return b&&a?rotate(p,center(b),-a):p;}
 function aabb(b,a){if(!b||!a)return b;const c=center(b),t=rad(a),w=Math.abs(Math.cos(t))*b.width+Math.abs(Math.sin(t))*b.height,h=Math.abs(Math.sin(t))*b.width+Math.abs(Math.cos(t))*b.height;return {x:c.x-w/2,y:c.y-h/2,width:w,height:h};}
 function delta(a,b,snap=false){const r=angle(b-a);return snap?Math.round(r/15)*15:r;}
 function pointerAngle(p,c){return Math.atan2(p.y-c.y,p.x-c.x)*180/Math.PI;}
 function resized(b,corner,dx,dy,a,free,resizer){
  const d=rotate({x:dx,y:dy},{x:0,y:0},-a),n=resizer(b,corner,d.x,d.y,free);
  if(!a)return n;
  const opposite=r=>({x:corner.endsWith('e')?r.x:r.x+r.width,y:corner.startsWith('s')?r.y:r.y+r.height});
  const oldAnchor=rotate(opposite(b),center(b),a),newAnchor=rotate(opposite(n),center(n),a);
  return {...n,x:n.x+oldAnchor.x-newAnchor.x,y:n.y+oldAnchor.y-newAnchor.y};
 }
 function paintRotated(ctx,l,b,draw){const a=eligible(l)?rotation(l):0;if(!a||!b){draw(ctx);return;}const c=center(b);ctx.save();try{ctx.translate(c.x,c.y);ctx.rotate(rad(a));ctx.translate(-c.x,-c.y);draw(ctx);}finally{ctx.restore();}}
 const kinds=['none','gradient','metal','glass','bevel','emboss'];
 const defaults=()=>({kind:'none',primary:'#d5ab54',secondary:'#604c30',strength:.75,depth:3,angle:105});
 const presets=Object.freeze([
  ['clear','Clear',{}],['gold','Brushed gold',{kind:'metal',primary:'#e7c16d',secondary:'#68501d',strength:.94,depth:2}],
  ['silver','Polished silver',{kind:'metal',primary:'#f4f7ff',secondary:'#5d6978',strength:.92,depth:2}],
  ['gunmetal','Gunmetal',{kind:'metal',primary:'#87939f',secondary:'#161c24',strength:.92,depth:3}],
  ['rose','Rose metal',{kind:'metal',primary:'#f3c4ac',secondary:'#8c4e4c',strength:.9,depth:2}],
  ['glass','Glass sheen',{kind:'glass',primary:'#e5f5ff',secondary:'#2a668b',strength:.55,depth:2}],
  ['smoke','Smoked glass',{kind:'glass',primary:'#a7b8c8',secondary:'#131c29',strength:.7,depth:2}],
  ['gradient','Midnight gradient',{kind:'gradient',primary:'#99c7e9',secondary:'#263454',strength:.95,depth:0}],
  ['bevel','Raised bevel',{kind:'bevel',primary:'#ffffff',secondary:'#10141a',strength:.8,depth:4}],
  ['emboss','Recessed emboss',{kind:'emboss',primary:'#ffffff',secondary:'#11141a',strength:.8,depth:3}]
 ].map(([id,name,data])=>Object.freeze({id,name,material:Object.freeze({...defaults(),...data})})));
 const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 function checkMaterial(v){if(!v||!kinds.includes(v.kind)||!hex(v.primary)||!hex(v.secondary)||!num(v.strength,0,1)||!num(v.depth,0,16)||!num(v.angle,-360,360))throw Error('Invalid material appearance.');return {kind:v.kind,primary:v.primary.toLowerCase(),secondary:v.secondary.toLowerCase(),strength:v.strength,depth:v.depth,angle:v.angle};}
 const active=m=>!!m&&m.kind!=='none'&&m.strength>0;
 const MAX_PIXELS=16000000,buffers=new WeakMap();
 function requireBudget(layers,w,h){for(const l of layers||[])if(l.material!=null)checkMaterial(l.material);if(w*h>MAX_PIXELS&&(layers||[]).some(l=>active(l.material)))throw Error('Material raster limit: reduce the canvas below 16 million pixels or disable the material.');}
 function buffersFor(ctx){const w=ctx.canvas.width,h=ctx.canvas.height;if(!w||!h||w*h>MAX_PIXELS)throw Error('Material canvas exceeds the raster budget.');let pair=buffers.get(ctx);if(!pair){pair=[root.document.createElement('canvas'),root.document.createElement('canvas')];buffers.set(ctx,pair);}for(const c of pair){if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;}return pair;}
 function reset(p){p.setTransform(1,0,0,1,0,0);p.globalAlpha=1;p.globalCompositeOperation='source-over';p.filter='none';p.shadowColor='transparent';p.shadowBlur=0;p.shadowOffsetX=p.shadowOffsetY=0;p.clearRect(0,0,p.canvas.width,p.canvas.height);}
 function mappedBounds(ctx,b){const m=ctx.getTransform(),w=ctx.canvas.width,h=ctx.canvas.height;if(!b)return {x:0,y:0,width:w,height:h};const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(1,Math.max(...xs)-Math.min(...xs)),height:Math.max(1,Math.max(...ys)-Math.min(...ys))};}
 function materialPaint(ctx,material,draw,bounds,scale=1){
  if(!active(material)){draw(ctx);return;}
  const m=checkMaterial(material),[canvas,edge]=buffersFor(ctx),p=canvas.getContext('2d'),q=edge.getContext('2d'),w=canvas.width,h=canvas.height,b=mappedBounds(ctx,bounds);
  reset(p);p.save();try{p.setTransform(ctx.getTransform());draw(p);}finally{p.restore();}
  p.save();try{
   p.setTransform(1,0,0,1,0,0);p.globalCompositeOperation='source-atop';p.globalAlpha=m.strength;
   const c=center(b),a=rad(m.angle),length=Math.max(1,Math.abs(b.width*Math.cos(a))+Math.abs(b.height*Math.sin(a))),x=Math.cos(a)*length/2,y=Math.sin(a)*length/2;
   const gradient=p.createLinearGradient(c.x-x,c.y-y,c.x+x,c.y+y);
   if(m.kind==='metal'){for(const [s,col] of [[0,m.secondary],[.16,m.primary],[.35,m.secondary],[.48,'#ffffff'],[.53,m.primary],[.67,m.secondary],[.85,m.primary],[1,m.secondary]])gradient.addColorStop(s,col);}
   else if(m.kind==='glass'){for(const [s,col] of [[0,m.primary],[.22,m.primary+'90'],[.49,m.secondary+'38'],[.5,m.secondary+'cc'],[.85,m.primary+'66'],[1,m.secondary]])gradient.addColorStop(s,col);}
   else if(m.kind==='gradient'){gradient.addColorStop(0,m.primary);gradient.addColorStop(1,m.secondary);}
   if(['metal','glass','gradient'].includes(m.kind)){p.fillStyle=gradient;p.fillRect(0,0,w,h);}
  }finally{p.restore();}
  // Two alpha-edge masks create a raised or recessed highlight without filling
  // transparent pixels. No destructive pixel access and no remote shader code.
  if(m.depth>0&&m.kind!=='gradient'){
   const d=Math.max(.5,m.depth*scale),dx=Math.cos(rad(m.angle))*d,dy=Math.sin(rad(m.angle))*d,raised=m.kind!=='emboss';
   for(const [sx,sy,color] of [[dx,dy,raised?m.primary:m.secondary],[-dx,-dy,raised?m.secondary:m.primary]]){
    reset(q);q.drawImage(canvas,0,0);q.globalCompositeOperation='destination-out';q.drawImage(canvas,sx,sy);q.globalCompositeOperation='source-in';q.fillStyle=color;q.fillRect(0,0,w,h);
    p.save();try{p.globalCompositeOperation='source-atop';p.globalAlpha=m.strength*.9;p.drawImage(edge,0,0);}finally{p.restore();}
   }
  }
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(canvas,0,0);}finally{ctx.restore();}
 }
 // Centralized Escape routing even if re-rendered modal controls lose focus.
 // Loaded before editor handlers. Only these owned advanced dialogs are closed.
 if(root.document&&root.addEventListener){const owned=new Set(['layer-studio-v0712','cinematic-studio-v0713','compositor-v0714']);root.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.isComposing)return;const opened=[...root.document.querySelectorAll('dialog[open]')],d=opened.at(-1);if(d&&owned.has(d.id)){e.preventDefault();e.stopImmediatePropagation();d.close();}},true);}
 const api=Object.freeze({angle,rotation,eligible,center,rotate,local,aabb,delta,pointerAngle,resized,paintRotated,kinds,defaults,presets,checkMaterial,active,requireBudget,materialPaint});
 root.MangoTransformMaterialV0715=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
