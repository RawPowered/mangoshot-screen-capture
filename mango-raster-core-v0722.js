/* MangoEngine raster ABI v1. Exact integer RGBA operations, local-only. */
(function(root){'use strict';
 const MAX_PIXELS=16000000,OPS=Object.freeze({gray:0,blur:1,sharp:2});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function validate(w,h,op,amount,n){
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>MAX_PIXELS||!Object.hasOwn(OPS,op)||!Number.isInteger(amount)||amount<0||amount>100||n!==w*h*4)throw Error('Invalid or over-budget RGBA raster request.');
 }
 const roundDiv=(n,d)=>Math.floor((n+Math.floor(d/2))/d);
 function rows(src,out,w,h,op,amount,start,end){
  for(let y=start;y<end;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,a=src[i+3];out[i+3]=a;
   if(!amount||!a){out[i]=src[i];out[i+1]=src[i+1];out[i+2]=src[i+2];continue;}
   if(op==='gray'){
    const g=(77*src[i]+150*src[i+1]+29*src[i+2]+128)>>8;
    for(let k=0;k<3;k++)out[i+k]=roundDiv(src[i+k]*(100-amount)+g*amount,100);
    continue;
   }
   let weight=0,r=0,g=0,b=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const j=(clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1))*4,wt=(dy===0?2:1)*(dx===0?2:1)*src[j+3];
    weight+=wt;r+=wt*src[j];g+=wt*src[j+1];b+=wt*src[j+2];
   }
   const channels=[r,g,b];for(let k=0;k<3;k++){
    const low=weight?roundDiv(channels[k],weight):src[i+k],orig=src[i+k];
    out[i+k]=clamp(roundDiv(op==='blur'?orig*(100-amount)+low*amount:orig*(100+amount)-low*amount,100),0,255);
   }
  }
 }
 function process(src,w,h,op,amount){
  validate(w,h,op,amount,src.length);const out=new Uint8ClampedArray(src.length);rows(src,out,w,h,op,amount,0,h);return out;
 }
 async function sliced(src,w,h,op,amount,signal){
  validate(w,h,op,amount,src.length);const out=new Uint8ClampedArray(src.length),step=Math.max(1,Math.floor(30000/w));
  for(let y=0;y<h;y+=step){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');rows(src,out,w,h,op,amount,y,Math.min(h,y+step));if(y+step<h)await new Promise(r=>setTimeout(r,0));}
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');return out;
 }
 const api=Object.freeze({MAX_PIXELS,OPS,validate,process,sliced});root.MangoRasterCoreV0722=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
