/* Precision Brush Studio. Local deterministic pressure response and bounded dab rendering.
 * Legacy strokes without a brush profile continue through the original pen renderer. */
(function(root){'use strict';
 const MAX_DABS=8192,MAX_PIXELS=16000000,STORE='MangoShotBrushV0725',TIPS=['round','chisel','square'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 const copy=v=>JSON.parse(JSON.stringify(v));
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
 const defaults=()=>({tip:'round',hardness:1,flow:1,spacing:.12,aspect:1,angle:0,minWidth:.12,pressureWidth:true,pressureFlow:false,curve:[0,.25,.5,.75,1]});
 function check(p){
  if(!exact(p,Object.keys(defaults()))||!TIPS.includes(p.tip)||!finite(p.hardness,0,1)||!finite(p.flow,.05,1)||!finite(p.spacing,.05,1)||!finite(p.aspect,.15,1)||!finite(p.angle,-180,180)||!finite(p.minWidth,.05,1)||typeof p.pressureWidth!=='boolean'||typeof p.pressureFlow!=='boolean'||!Array.isArray(p.curve)||p.curve.length!==5||p.curve[0]!==0||p.curve[4]!==1||p.curve.some((v,i)=>!finite(v,0,1)||(i&&v<p.curve[i-1])))throw Error('Invalid brush profile. Pressure curve must increase from zero to one.');
  return {...p,curve:p.curve.slice()};
 }
 const presets=Object.freeze([
  ['precision','Precision round',{}],
  ['soft','Soft airbrush',{hardness:.12,flow:.22,spacing:.09,pressureFlow:true,curve:[0,.38,.7,.88,1]}],
  ['ink','Inking nib',{hardness:1,flow:1,spacing:.08,minWidth:.08,curve:[0,.12,.4,.72,1]}],
  ['calligraphy','Calligraphy',{tip:'chisel',aspect:.28,angle:-38,spacing:.08,minWidth:.3,curve:[0,.35,.65,.85,1]}],
  ['marker','Flat marker',{tip:'square',aspect:.6,angle:15,hardness:1,spacing:.12,minWidth:.7,pressureWidth:false,flow:.65}],
  ['chalk','Soft flat brush',{tip:'chisel',aspect:.52,angle:25,hardness:.4,spacing:.25,flow:.38,pressureFlow:true}]
 ].map(([id,name,p])=>Object.freeze({id,name,profile:Object.freeze({...defaults(),...p,curve:Object.freeze((p.curve||defaults().curve).slice())})})));
 function response(p,curve){const x=clamp(Number.isFinite(p)?p:1,0,1)*4,i=Math.min(3,Math.floor(x));return curve[i]+(curve[i+1]-curve[i])*(x-i);}
 function widthAt(p,profile){return profile.pressureWidth?profile.minWidth+(1-profile.minWidth)*response(p,profile.curve):1;}
 function flowAt(p,profile){return profile.flow*(profile.pressureFlow?response(p,profile.curve):1);}
 function diameter(l){return Math.max(.1,Number(l.size)||1)*(l.type==='highlighter'?5:1);}
 function pad(l){return diameter(l)*.72+2;}
 function samples(points,nominal,spacing,limit=MAX_DABS){
  if(!Array.isArray(points)||!points.length)return [];
  if(!finite(nominal,.0001,500000)||!finite(spacing,.05,1)||!Number.isInteger(limit)||limit<2||limit>MAX_DABS)throw Error('Invalid brush spacing.');
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  if(!Number.isFinite(length))throw Error('Invalid brush path.');
  const step=Math.max(.45,nominal*spacing,length/(limit-1));const a=[{...points[0]}];let next=step,travel=0;
  for(let i=1;i<points.length&&a.length<limit;i++){
   const p=points[i-1],q=points[i],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d===0)continue;
   while(next<=travel+d+1e-7&&a.length<limit){const t=clamp((next-travel)/d,0,1);a.push({x:p.x+dx*t,y:p.y+dy*t,p:(p.p??1)+((q.p??1)-(p.p??1))*t});next+=step;}
   travel+=d;
  }
  const last=points.at(-1),end=a.at(-1);
  if(a.length<limit&&Math.hypot(last.x-end.x,last.y-end.y)>step*.35)a.push({...last});
  return a;
 }
 const cache=new Map(),buffers=new WeakMap();
 function stamp(profile,color){
  const key=profile.tip+'|'+profile.hardness+'|'+color;let c=cache.get(key);if(c)return c;
  c=root.document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=62,x=64,y=64;
  if(profile.hardness>=.99){g.fillStyle=color;}else{
   const grad=g.createRadialGradient(x,y,Math.max(0,r*profile.hardness),x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,color+'00');g.fillStyle=grad;
  }
  if(profile.tip==='square'){g.fillRect(2,2,124,124);}
  else{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
  if(cache.size>=32){const first=cache.keys().next().value;const old=cache.get(first);old.width=old.height=1;cache.delete(first);}
  cache.set(key,c);return c;
 }
 function region(ctx,l){
  const m=ctx.getTransform(),padding=pad(l),pts=l.points;let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  for(const p of pts){x1=Math.min(x1,p.x);x2=Math.max(x2,p.x);y1=Math.min(y1,p.y);y2=Math.max(y2,p.y);}
  x1-=padding;y1-=padding;x2+=padding;y2+=padding;
  const corners=[[x1,y1],[x1,y2],[x2,y1],[x2,y2]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
  const left=clamp(Math.floor(Math.min(...corners.map(p=>p.x)))-2,0,ctx.canvas.width),top=clamp(Math.floor(Math.min(...corners.map(p=>p.y)))-2,0,ctx.canvas.height);
  const right=clamp(Math.ceil(Math.max(...corners.map(p=>p.x)))+2,0,ctx.canvas.width),bottom=clamp(Math.ceil(Math.max(...corners.map(p=>p.y)))+2,0,ctx.canvas.height);
  return {left,top,w:right-left,h:bottom-top,m};
 }
 function paint(ctx,l){
  if(!l?.brush||!['pen','highlighter'].includes(l.type))return false;
  if(l.visible===false||!l.points?.length)return true;
  const p=check(l.brush),color=/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#000000',r=region(ctx,l);
  if(r.w<=0||r.h<=0)return true;
  if(r.w*r.h>MAX_PIXELS)throw Error('Advanced brush raster budget exceeded. Use legacy pen on larger canvases.');
  let c=buffers.get(ctx);if(!c){c=root.document.createElement('canvas');buffers.set(ctx,c);}
  if(c.width!==r.w)c.width=r.w;if(c.height!==r.h)c.height=r.h;
  const q=c.getContext('2d');q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.filter='none';q.clearRect(0,0,r.w,r.h);
  q.setTransform(r.m.a,r.m.b,r.m.c,r.m.d,r.m.e-r.left,r.m.f-r.top);
  const tip=stamp(p,color),d=diameter(l),angle=p.angle*Math.PI/180;
  for(const a of samples(l.points,d,p.spacing)){
   const width=d*widthAt(a.p??1,p),height=width*(p.tip==='round'?1:p.aspect),flow=flowAt(a.p??1,p);if(flow<=0)continue;
   q.save();q.translate(a.x,a.y);q.rotate(angle);q.globalAlpha=flow;q.drawImage(tip,-width/2,-height/2,width,height);q.restore();
  }
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=clamp(l.opacity??1,0,1)*(l.type==='highlighter'?.27:1);ctx.drawImage(c,r.left,r.top);}finally{ctx.restore();}
  return true;
 }
 function read(){try{const p=JSON.parse(root.localStorage.getItem(STORE)||'null');if(!p||!exact(p,['profile','custom'])||!Array.isArray(p.custom)||p.custom.length>12)return {profile:null,custom:[]};const custom=p.custom.map(x=>{if(!exact(x,['name','profile'])||typeof x.name!=='string'||!x.name.trim()||x.name.length>40)throw Error('Invalid preset');return {name:x.name,profile:check(x.profile)};});return {profile:p.profile?check(p.profile):null,custom};}catch{return {profile:null,custom:[]};}}
 function save(profile,custom){if(profile)profile=check(profile);const next={profile,custom:custom.map(x=>({name:x.name,profile:check(x.profile)}))};root.localStorage.setItem(STORE,JSON.stringify(next));return next;}
 const api=Object.freeze({MAX_DABS,MAX_PIXELS,TIPS,defaults,check,copy,presets,response,widthAt,flowAt,diameter,pad,samples,paint,read,save});
 root.MangoBrushV0725=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
