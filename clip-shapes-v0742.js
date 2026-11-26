/* Real timed vector overlays in the existing Clip Studio graphics renderer. */
(function(root){'use strict';
 const kinds=['rectangle','rounded','ellipse','triangle','diamond','hexagon','star','arrow','line','ring'],labels=['Rectangle','Rounded rectangle','Ellipse','Triangle','Diamond','Hexagon','Star','Arrow','Line','Focus ring'];
 const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function defaults(){return {kind:'rectangle',height:.25,rotation:0,radius:.12};}
 function check(s){if(!s||Object.keys(s).length!==4||!kinds.includes(s.kind)||!finite(s.height,.03,1)||!finite(s.rotation,-180,180)||!finite(s.radius,0,.5))throw Error('Invalid vector shape recipe.');return {...s};}
 function bounds(l,w,h){return {x:clamp(l.x,0,1)*w,y:clamp(l.y,0,1)*h,w:Math.max(1,l.width*w),h:Math.max(1,check(l.shape).height*h)};}
 // Geometry in actual output pixels. Rotation is around the center.
 function geometry(l,w,h){const b=bounds(l,w,h),a=l.shape.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=b.x+b.w/2,cy=b.y+b.h/2;
  const point=(x,y)=>({x:cx+c*x-s*y,y:cy+s*x+c*y}),corners=[point(-b.w/2,-b.h/2),point(b.w/2,-b.h/2),point(b.w/2,b.h/2),point(-b.w/2,b.h/2)];
  return {b,cx,cy,c,s,corners,top:point(0,-b.h/2),rotate:point(0,-b.h/2-Math.max(18,h*.045)),resize:corners[2]};
 }
 function hit(l,w,h,x,y,pad=0){const g=geometry(l,w,h),dx=x-g.cx,dy=y-g.cy;return Math.abs(g.c*dx+g.s*dy)<=g.b.w/2+pad&&Math.abs(-g.s*dx+g.c*dy)<=g.b.h/2+pad;}
 function rotateTo(l,w,h,x,y,snap=false){const g=geometry(l,w,h);let a=(Math.atan2(y-g.cy,x-g.cx)*180/Math.PI+90+540)%360-180;if(snap)a=Math.round(a/15)*15;return Math.round(a*10)/10;}
 function resizeFrom(l,w,h,dx,dy,lock=false){const g=geometry(l,w,h);let ww=clamp(g.b.w+g.c*dx+g.s*dy,.1*w,w),hh=clamp(g.b.h-g.s*dx+g.c*dy,.03*h,h);if(lock){const scale=clamp(Math.abs(ww/g.b.w-1)>Math.abs(hh/g.b.h-1)?ww/g.b.w:hh/g.b.h,Math.max(.1*w/g.b.w,.03*h/g.b.h),Math.min(w/g.b.w,h/g.b.h));ww=g.b.w*scale;hh=g.b.h*scale;}const dw=ww-g.b.w,dh=hh-g.b.h,cx=g.cx+(g.c*dw-g.s*dh)/2,cy=g.cy+(g.s*dw+g.c*dh)/2;return {x:clamp((cx-ww/2)/w,0,1),y:clamp((cy-hh/2)/h,0,1),width:ww/w,shape:check({...l.shape,height:hh/h})};}
 function fillOpacity(color){if(color==='transparent')return 0;return /^#[0-9a-f]{8}$/i.test(color)?Math.round(parseInt(color.slice(7),16)*100/255):100;}
 function withFillOpacity(color,outline,opacity){const c=/^#[0-9a-f]{6}/i.test(color)?color.slice(0,7):outline;if(!/^#[0-9a-f]{6}$/i.test(c)||!finite(opacity,0,100))throw Error('Invalid fill opacity.');return c+Math.round(opacity*255/100).toString(16).padStart(2,'0');}
 function path(q,kind,w,h,r){q.beginPath();
  if(kind==='rectangle')q.rect(0,0,w,h);else if(kind==='rounded')q.roundRect(0,0,w,h,Math.min(w,h)*r);
  else if(kind==='ellipse'||kind==='ring')q.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);
  else if(kind==='line'){q.moveTo(0,h/2);q.lineTo(w,h/2);}
  else if(kind==='arrow'){q.moveTo(0,h*.36);q.lineTo(w*.64,h*.36);q.lineTo(w*.64,0);q.lineTo(w,h*.5);q.lineTo(w*.64,h);q.lineTo(w*.64,h*.64);q.lineTo(0,h*.64);q.closePath();}
  else{const n=kind==='triangle'?3:kind==='diamond'?4:kind==='hexagon'?6:10;for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n,k=kind==='star'&&i%2?.43:1,x=w/2+Math.cos(a)*w/2*k,y=h/2+Math.sin(a)*h/2*k;i?q.lineTo(x,y):q.moveTo(x,y);}q.closePath();}
 }
 function paint(q,l,b,frameH){const s=check(l.shape),scale=frameH/1080;q.save();try{q.translate(b.x+b.w/2,b.y+b.h/2);q.rotate(s.rotation*Math.PI/180);q.translate(-b.w/2,-b.h/2);path(q,s.kind,b.w,b.h,s.radius);q.lineJoin='round';q.lineCap='round';q.shadowColor='rgba(0,0,0,.65)';q.shadowBlur=l.shadow*scale;if(!['line','ring'].includes(s.kind)&&l.background!=='transparent'){q.fillStyle=l.background;q.fill();}q.shadowBlur=0;if(l.outlineWidth>0||['line','ring'].includes(s.kind)){q.strokeStyle=l.outline;q.lineWidth=Math.max(.5,l.outlineWidth*scale);q.stroke();}}finally{q.restore();}}
 const api=Object.freeze({kinds,labels,defaults,check,bounds,geometry,hit,rotateTo,resizeFrom,fillOpacity,withFillOpacity,path,paint});root.MangoClipShapesV0742=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);