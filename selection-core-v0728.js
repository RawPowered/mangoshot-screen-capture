/* Pixel selection recipes, normalized to an immutable source or flattened composition.
 * Selection masks intersect existing image masks; they never alter redaction objects. */
(function(root){'use strict';
 const MAX_SOURCE=9000000,MAX_EXPORT=16000000,MAX_TOTAL=18000000,MAX_RECIPES=12,MAX_REGIONS=16,MAX_VERTICES=2048,MAX_POINTS=8192,MAX_PROJECT_POINTS=100000;
 const kinds=['rectangle','ellipse','polygon','lasso'],operators=['replace','add','subtract','intersect'];
 const exact=(v,ks)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
 const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),copy=v=>JSON.parse(JSON.stringify(v));
 const empty=()=>({regions:[],inverted:false,feather:0,enabled:true});
 function region(r){
  if(!exact(r,['kind','op','points'])||!kinds.includes(r.kind)||!operators.includes(r.op)||!Array.isArray(r.points))throw Error('Invalid selection region.');
  const simple=['rectangle','ellipse'].includes(r.kind);
  if(simple?r.points.length!==2:r.points.length<3||r.points.length>MAX_VERTICES)throw Error('Invalid selection geometry.');
  const points=r.points.map(p=>{if(!exact(p,['x','y'])||!finite(p.x,0,1)||!finite(p.y,0,1))throw Error('Selection coordinates must be normalized.');return {x:p.x,y:p.y};});
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  if(Math.max(...xs)-Math.min(...xs)<.0000001||Math.max(...ys)-Math.min(...ys)<.0000001||!simple&&new Set(points.map(p=>p.x+':'+p.y)).size<3)throw Error('Draw a non-empty selection.');
  return {kind:r.kind,op:r.op,points};
 }
 function check(v,allowEmpty=false){
  if(!exact(v,['regions','inverted','feather','enabled'])||!Array.isArray(v.regions)||v.regions.length>MAX_REGIONS||!allowEmpty&&!v.regions.length||typeof v.inverted!=='boolean'||typeof v.enabled!=='boolean'||!Number.isInteger(v.feather)||!finite(v.feather,0,64))throw Error('Invalid selection mask.');
  const regions=v.regions.map(region);if(regions.length&&regions[0].op!=='replace')throw Error('First selection region must replace.');
  if(regions.reduce((n,r)=>n+r.points.length,0)>MAX_POINTS)throw Error('Selection point budget exceeded.');
  return {regions,inverted:v.inverted,feather:v.feather,enabled:v.enabled};
 }
 function add(v,r){
  const a=check(v,true),next=region(r);
  if(!a.regions.length)next.op='replace';
  if(next.op==='replace')return check({...a,regions:[next],inverted:false,enabled:true});
  return check({...a,regions:[...a.regions,next],enabled:true});
 }
 const active=v=>!!v&&v.enabled&&v.regions.length>0;
 function dimensions(w,h,max=MAX_SOURCE){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>max)throw Error('Selection exceeds the pixel budget.');return w*h;}
 function requireProject(layers,lookup,C=root.MangoCompositorV0714){
  let total=0,points=0,activeLayers=0;
  for(const l of layers||[]){if(l.selectionMask==null)continue;if(l.type!=='image')throw Error('Selection masks require imported image layers.');
   const v=check(l.selectionMask);points+=v.regions.reduce((n,r)=>n+r.points.length,0);
   if(!active(v))continue;
   const a=lookup(l);if(!a)throw Error('Missing selection mask asset.');const n=dimensions(a.width,a.height);
   // Existing masked canvases are per stroke, not shared between duplicate layers.
   activeLayers++;total+=n;
   if(v.feather&&C?.supports&&!C.supports())throw Error('This browser does not support Canvas2D feathering.');
  }
  if(points>MAX_PROJECT_POINTS||total>MAX_TOTAL||activeLayers>MAX_RECIPES)throw Error('Selection mask project budget exceeded (18 MP, 12 active layers, 100,000 points).');
  return {pixels:total,activeLayers,points};
 }
 function path(q,r,w,h){
  const a=r.points.map(p=>({x:p.x*w,y:p.y*h}));q.beginPath();
  if(r.kind==='rectangle'||r.kind==='ellipse'){
   const x=Math.min(a[0].x,a[1].x),y=Math.min(a[0].y,a[1].y),rw=Math.abs(a[0].x-a[1].x),rh=Math.abs(a[0].y-a[1].y);
   if(r.kind==='rectangle')q.rect(x,y,rw,rh);else q.ellipse(x+rw/2,y+rh/2,rw/2,rh/2,0,0,Math.PI*2);
  }else{q.moveTo(a[0].x,a[0].y);for(const p of a.slice(1))q.lineTo(p.x,p.y);q.closePath();}
 }
 const canvas=(w,h)=>{const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;};
 function reset(q){q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.filter='none';q.clearRect(0,0,q.canvas.width,q.canvas.height);}
 function render(v,w,h,sourceW=w,sourceH=h){
  dimensions(w,h,MAX_EXPORT);dimensions(sourceW,sourceH,MAX_EXPORT);const a=check(v,true),out=canvas(w,h),q=out.getContext('2d');
  q.fillStyle='#ffffff';if(!active(a)){q.fillRect(0,0,w,h);return out;}
  let tmp=null;const scratch=()=>{if(!tmp)tmp=canvas(w,h);const g=tmp.getContext('2d');reset(g);g.fillStyle='#ffffff';return g;};
  try{
   for(const r of a.regions){
    if(r.op==='replace')reset(q);
    if(r.op==='intersect'){const g=scratch();path(g,r,w,h);g.fill('evenodd');q.globalCompositeOperation='destination-in';q.drawImage(tmp,0,0);}
    else{q.globalCompositeOperation=r.op==='subtract'?'destination-out':'source-over';q.fillStyle='#ffffff';path(q,r,w,h);q.fill('evenodd');}
    q.globalCompositeOperation='source-over';
   }
   if(a.feather){const g=scratch(),radius=a.feather*Math.min(w/sourceW,h/sourceH);g.filter='blur('+radius+'px)';g.drawImage(out,0,0);g.filter='none';reset(q);q.drawImage(tmp,0,0);}
   if(a.inverted){const g=scratch();g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-out';g.drawImage(out,0,0);reset(q);q.drawImage(tmp,0,0);}
   return out;
  }catch(e){out.width=out.height=1;throw e;}
  finally{if(tmp)tmp.width=tmp.height=1;}
 }
 function apply(ctx,v,sourceW=ctx.canvas.width,sourceH=ctx.canvas.height){
  if(!active(v))return false;
  const c=render(v,ctx.canvas.width,ctx.canvas.height,sourceW,sourceH);
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='destination-in';ctx.drawImage(c,0,0);}finally{ctx.restore();c.width=c.height=1;}return true;
 }
 const api=Object.freeze({MAX_SOURCE,MAX_EXPORT,MAX_REGIONS,MAX_VERTICES,MAX_POINTS,MAX_PROJECT_POINTS,kinds,operators,copy,empty,region,check,add,active,dimensions,requireProject,path,render,apply,clamp});
 root.MangoSelectionV0728=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
