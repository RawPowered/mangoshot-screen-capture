/* Pure bounded full-resolution pixel operations. RGBA source is immutable. */
(function(root){'use strict';
 const MAX_PIXELS=8000000,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function dimensions(w,h){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>8192||h>8192||w*h>MAX_PIXELS)throw Error('Pixel Tools support images up to 8 megapixels and 8192px per side in this preview.');return w*h;}
 function checkBuffers(src,dst,w,h){const n=dimensions(w,h)*4;if(!(src instanceof Uint8ClampedArray)||!(dst instanceof Uint8ClampedArray)||src===dst||src.length!==n||dst.length!==n)throw Error('Invalid pixel buffers.');}
 function union(a,b){if(!b)return a;if(!a)return {...b};const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};}
 function color(v){if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Expected a six-digit RGB color.');return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16));}
 function number(v,min,max,label){if(!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label+'.');return v;}
 function brush(src,dst,w,h,mode,cx,cy,opts){
  checkBuffers(src,dst,w,h);if(!['clone','dodge','burn'].includes(mode))throw Error('Unknown brush mode.');
  number(cx,-512,w+512,'brush X');number(cy,-512,h+512,'brush Y');
  const radius=number(opts.size,4,300,'brush size')/2,hard=number(opts.hardness,0,100,'hardness')/100,strength=number(opts.strength,0,100,'strength')/100,pressure=number(opts.pressure??1,0,1,'pressure');
  const x0=Math.max(0,Math.floor(cx-radius)),x1=Math.min(w,Math.ceil(cx+radius)),y0=Math.max(0,Math.floor(cy-radius)),y1=Math.min(h,Math.ceil(cy+radius));let dirty=null;
  if(mode==='clone'&&(!Number.isFinite(opts.dx)||!Number.isFinite(opts.dy)))throw Error('Alt-click a clone source first.');
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const d=Math.hypot(x+.5-cx,y+.5-cy)/radius;if(d>=1)continue;
   const edge=d<=hard||hard===1?1:1-(d-hard)/(1-hard),i=(y*w+x)*4;
   let j=i;if(mode==='clone'){const sx=Math.floor(x+opts.dx),sy=Math.floor(y+opts.dy);if(sx<0||sx>=w||sy<0||sy>=h)continue;j=(sy*w+sx)*4;}
   if(!src[j+3])continue;
   const coverage=edge*pressure*(mode==='clone'?strength:1),alpha=Math.round(255*coverage*src[j+3]/255);
   if(alpha===0||alpha<dst[i+3])continue;
   // A max-coverage brush avoids density-dependent buildup from coalesced events.
   for(let k=0;k<3;k++){const v=src[j+k];dst[i+k]=mode==='dodge'?v+(255-v)*strength:mode==='burn'?v*(1-strength):v;}
   dst[i+3]=alpha;dirty=union(dirty,{x,y,width:1,height:1});
  }return dirty;
 }
 function fill(src,dst,w,h,x,y,rgb,tolerance,opacity){
  checkBuffers(src,dst,w,h);x=Math.floor(number(x,0,w-Number.EPSILON,'fill X'));y=Math.floor(number(y,0,h-Number.EPSILON,'fill Y'));if(x>=w||y>=h)throw Error('Fill point outside image.');
  if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid fill color.');
  const limit=number(tolerance,0,100,'tolerance')*2.55,alpha=Math.round(number(opacity,0,100,'opacity')*2.55);if(!alpha)return null;
  const seed=y*w+x,j=seed*4,base=src.slice(j,j+4),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0,x0=w,y0=h,x1=-1,y1=-1;
  function add(p){if(seen[p])return;seen[p]=1;const i=p*4;if(Math.max(Math.abs(src[i]-base[0]),Math.abs(src[i+1]-base[1]),Math.abs(src[i+2]-base[2]),Math.abs(src[i+3]-base[3]))<=limit+1e-9)queue[tail++]=p;}
  add(seed);while(head<tail){const p=queue[head++],px=p%w,py=Math.floor(p/w),i=p*4;dst[i]=rgb[0];dst[i+1]=rgb[1];dst[i+2]=rgb[2];dst[i+3]=alpha;x0=Math.min(x0,px);y0=Math.min(y0,py);x1=Math.max(x1,px);y1=Math.max(y1,py);if(px>0)add(p-1);if(px<w-1)add(p+1);if(py>0)add(p-w);if(py<h-1)add(p+w);}
  return tail?{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}:null;
 }
 function gradient(ctx,w,h,start,end,first,last,opacity){dimensions(w,h);color(first);color(last);number(opacity,0,100,'opacity');if(![start.x,start.y,end.x,end.y].every(Number.isFinite)||Math.hypot(end.x-start.x,end.y-start.y)<1)return false;
  const g=ctx.createLinearGradient(start.x,start.y,end.x,end.y);g.addColorStop(0,first);g.addColorStop(1,last);ctx.save();try{ctx.clearRect(0,0,w,h);ctx.globalAlpha=opacity/100;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}finally{ctx.restore();}return opacity>0;
 }
 const api=Object.freeze({MAX_PIXELS,dimensions,union,color,brush,fill,gradient});root.MangoPixelToolsV0741=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
