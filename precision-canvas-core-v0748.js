/* Pixel-exact output frames and view-space ruler geometry. No source pixel mutation. */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),integer=Number.isInteger,full=(w,h)=>({x:0,y:0,width:w,height:h});
 function checkCrop(r,w,h){if(!integer(w)||!integer(h)||w<1||h<1||!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==4||!['x','y','width','height'].every(k=>Object.hasOwn(r,k)&&integer(r[k]))||r.x<0||r.y<0||r.width<1||r.height<1||r.x+r.width>w||r.y+r.height>h)throw Error('Crop must be an integer pixel rectangle within the source image.');return {x:r.x,y:r.y,width:r.width,height:r.height};}
 const isFull=(r,w,h)=>r.x===0&&r.y===0&&r.width===w&&r.height===h;
 function fit(r,w,h){const x=clamp(Math.round(r.x),0,w-1),y=clamp(Math.round(r.y),0,h-1);return checkCrop({x,y,width:clamp(Math.round(r.width),1,w-x),height:clamp(Math.round(r.height),1,h-y)},w,h);}
 function move(r,dx,dy,w,h){return {...r,x:clamp(Math.round(r.x+dx),0,w-r.width),y:clamp(Math.round(r.y+dy),0,h-r.height)};}
 function fromPoints(a,b,w,h,ratio=0){const x=clamp(a.x,0,w),y=clamp(a.y,0,h),dx=clamp(b.x,0,w)-x,dy=clamp(b.y,0,h)-y;let ww=Math.abs(dx),hh=Math.abs(dy);if(ratio>0){ww=Math.min(ww||1,hh?hh*ratio:ww||1);hh=ww/ratio;const limit=Math.min((dx<0?x:w-x)/Math.max(ww,1e-9),(dy<0?y:h-y)/Math.max(hh,1e-9),1);ww*=limit;hh*=limit;}return fit({x:dx<0?x-ww:x,y:dy<0?y-hh:y,width:ww,height:hh},w,h);}
 function ratioFrame(r,w,h,ratio){if(!(ratio>0))return checkCrop(r,w,h);const width=Math.min(r.width,r.height*ratio),height=width/ratio;return fit({x:r.x+(r.width-width)/2,y:r.y+(r.height-height)/2,width,height},w,h);}
 function stepFor(scale){const target=64/Math.max(scale,.00001),power=10**Math.floor(Math.log10(target));return [1,2,5,10].map(v=>v*power).find(v=>v>=target)||10*power;}
 const api=Object.freeze({full,checkCrop,isFull,fit,move,fromPoints,ratioFrame,stepFor});root.MangoPrecisionCanvasCoreV0748=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
