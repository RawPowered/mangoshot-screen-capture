/* Screen-space target effects; lens pixels originate in the clean media composite. */
(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 const defaults=()=>({mode:'lens',shape:'ellipse',targetMode:'fixed',targetX:.29,targetY:.4,endX:.65,endY:.5,zoom:2.5,zoomEnd:2.5,ease:'smooth',feather:.04,leader:'elbow',marker:'ring',targetSize:.055,caption:'Detail',shade:0});
 const copy=v=>JSON.parse(JSON.stringify(v)),pose={x:.55,y:.2,width:.36,height:.35};
 const presets=[
  ['detail','Detail lens','focus',{},pose],
  ['inspection','Rectangular inspection','focus',{shape:'rect',zoom:2,zoomEnd:2,feather:.10,caption:'Inspect',leader:'straight'}, {x:.52,y:.17,width:.42,height:.42}],
  ['follow','Moving focus lens','focus',{targetMode:'follow',zoom:1.6,zoomEnd:3,leader:'none',marker:'none',caption:'',feather:.10}, {x:.28,y:.25,width:.38,height:.38}],
  ['sweep','Animated target sweep','focus',{targetMode:'sweep',zoom:2,zoomEnd:2.5,caption:'Follow the detail'},pose],
  ['instruction','Anchored instruction','note',{mode:'anchor',leader:'elbow',marker:'region',caption:'',targetSize:.10},{x:.54,y:.18,width:.4,height:.22}],
  ['spot','Target spotlight','spot',{mode:'anchor',leader:'none',marker:'ring',targetMode:'follow',caption:''},{x:.25,y:.22,width:.35,height:.35}]
 ].map(([id,name,recipe,p,b])=>Object.freeze({id,name,recipe,focus:Object.freeze({...defaults(),...p}),pose:Object.freeze({...b})}));
 function check(v){
  const ks=Object.keys(defaults());if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==ks.length||ks.some(k=>!Object.hasOwn(v,k))||!['lens','anchor'].includes(v.mode)||!['ellipse','rect'].includes(v.shape)||!['fixed','sweep','follow'].includes(v.targetMode)||!['linear','smooth'].includes(v.ease)||!['none','straight','elbow'].includes(v.leader)||!['none','ring','crosshair','region'].includes(v.marker)||typeof v.caption!=='string'||v.caption.length>100)throw Error('Invalid Smart Focus recipe.');
  for(const [k,a,b] of [['targetX',0,1],['targetY',0,1],['endX',0,1],['endY',0,1],['zoom',1,6],['zoomEnd',1,6],['feather',0,.4],['targetSize',.015,.25],['shade',0,.85]])if(!finite(v[k],a,b))throw Error('Invalid Smart Focus '+k+'.');
  return Object.fromEntries(ks.map(k=>[k,v[k]]));
 }
 function preset(id){const v=presets.find(p=>p.id===id);if(!v)throw Error('Unknown Smart Focus preset.');return copy(v);}
 function target(v,b,u,w,h){
  const t=clamp(u,0,1),e=v.ease==='smooth'?t*t*(3-2*t):t,lerp=(a,b)=>a+(b-a)*e;
  return {x:v.targetMode==='follow'?clamp((b.x+b.width/2)/w,0,1):v.targetMode==='sweep'?lerp(v.targetX,v.endX):v.targetX,y:v.targetMode==='follow'?clamp((b.y+b.height/2)/h,0,1):v.targetMode==='sweep'?lerp(v.targetY,v.endY):v.targetY,zoom:lerp(v.zoom,v.zoomEnd)};
 }
 function crop(sw,sh,w,h,b,target){
  if(![sw,sh,w,h,b.width,b.height,target.zoom,target.x,target.y].every(Number.isFinite)||Math.min(sw,sh,w,h,b.width,b.height,target.zoom)<=0)throw Error('Invalid lens sample geometry.');
  let cw=b.width/target.zoom*sw/w,ch=b.height/target.zoom*sh/h;
  const fit=Math.min(1,sw/cw,sh/ch);cw*=fit;ch*=fit;
  return {x:clamp(target.x*sw-cw/2,0,sw-cw),y:clamp(target.y*sh-ch/2,0,sh-ch),width:cw,height:ch};
 }
 function geometry(recipe,b,u){
  const m=root.MangoCalloutV0735.motion(recipe,u);
  return {cx:b.x+b.width/2+b.width*m.offset,cy:b.y+b.height/2,width:b.width*m.scale,height:b.height*m.scale,angle:recipe.rotation*Math.PI/180,alpha:m.alpha,active:m.active};
 }
 function edge(g,x,y,ellipse){
  const dx=x-g.cx,dy=y-g.cy,c=Math.cos(g.angle),s=Math.sin(g.angle),lx=dx*c+dy*s,ly=-dx*s+dy*c,hw=g.width/2,hh=g.height/2;
  const a=ellipse?Math.hypot(lx/hw,ly/hh):Math.max(Math.abs(lx)/hw,Math.abs(ly)/hh);
  if(a<=1)return null;const k=1/a;return {x:g.cx+dx*k,y:g.cy+dy*k};
 }
 function shape(q,x,y,w,h,type){q.beginPath();if(type==='ellipse')q.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);else q.roundRect(x-w/2,y-h/2,w,h,Math.min(w,h)*.07);}
 function renderer(){
  let clean=null,scratch=null;
  function surface(canvas,w,h){if(!canvas)canvas=root.document.createElement('canvas');if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return canvas;}
  function capture(canvas){clean=surface(clean,canvas.width,canvas.height);const q=clean.getContext('2d');q.globalCompositeOperation='copy';q.drawImage(canvas,0,0);q.globalCompositeOperation='source-over';return clean;}
  function clear(){for(const c of [clean,scratch])if(c)c.width=c.height=1;clean=scratch=null;}
  function lensPixels(source,v,g,t,w,h){
   if(!source||!source.width||!source.height)throw Error('A clean media sample is required for magnification.');
   const fit=Math.min(1,w/g.width,h/g.height,Math.sqrt(8388608/(g.width*g.height))),pw=Math.max(2,Math.round(g.width*fit)),ph=Math.max(2,Math.round(g.height*fit));
   scratch=surface(scratch,pw,ph);const q=scratch.getContext('2d'),r=crop(source.width,source.height,w,h,g,t);
   q.save();try{q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.clearRect(0,0,pw,ph);shape(q,pw/2,ph/2,pw,ph,v.shape);q.clip();q.imageSmoothingEnabled=true;q.drawImage(source,r.x,r.y,r.width,r.height,0,0,pw,ph);
    if(v.feather){q.globalCompositeOperation='destination-in';if(v.shape==='ellipse'){q.translate(pw/2,ph/2);q.scale(pw/2,ph/2);const a=q.createRadialGradient(0,0,0,0,0,1);a.addColorStop(0,'#fff');a.addColorStop(1-v.feather,'#fff');a.addColorStop(1,'#ffffff00');q.fillStyle=a;q.fillRect(-1,-1,2,2);}else{for(const [x,y] of [[pw,0],[0,ph]]){const a=q.createLinearGradient(0,0,x,y),f=v.feather/2;a.addColorStop(0,'#ffffff00');a.addColorStop(f,'#fff');a.addColorStop(1-f,'#fff');a.addColorStop(1,'#ffffff00');q.fillStyle=a;q.fillRect(0,0,pw,ph);}}}
   }finally{q.restore();}return scratch;
  }
  function paint(q,raw,recipe,b,opacity,u,w,h,source){
   const v=check(raw),g=geometry(recipe,b,u),t=target(v,b,u,w,h),x=t.x*w,y=t.y*h,unit=Math.min(w,h)/540,alpha=clamp(opacity,0,1)*g.alpha,line=Math.max(.5,recipe.thickness*unit),size=v.targetSize*Math.min(w,h);
   if(alpha<=0||g.width<=0||g.height<=0)return;
   q.save();try{
    q.globalAlpha*=alpha;q.lineWidth=line;q.lineCap='round';q.lineJoin='round';q.strokeStyle=recipe.color;q.fillStyle=recipe.color;
    if(v.mode==='lens'&&v.shade){q.save();q.beginPath();q.rect(0,0,w,h);q.translate(g.cx,g.cy);q.rotate(g.angle);if(v.shape==='ellipse')q.ellipse(0,0,g.width/2,g.height/2,0,0,Math.PI*2);else q.roundRect(-g.width/2,-g.height/2,g.width,g.height,Math.min(g.width,g.height)*.07);q.fillStyle='rgba(0,0,0,'+v.shade+')';q.fill('evenodd');q.restore();}
    const e=edge(g,x,y,v.mode==='lens'&&v.shape==='ellipse');
    if(v.leader!=='none'&&e){q.save();q.shadowColor=recipe.color;q.shadowBlur=recipe.glow*unit*.5;const points=v.leader==='elbow'?[[x,y],[(x+e.x)/2,y],[(x+e.x)/2,e.y],[e.x,e.y]]:[[x,y],[e.x,e.y]];
     const m=root.MangoCalloutV0735.motion(recipe,u),reveal=recipe.enter==='none'||!recipe.enterSpan?1:clamp(u/recipe.enterSpan,0,1),lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remain=lengths.reduce((a,b)=>a+b,0)*reveal;q.beginPath();q.moveTo(x,y);for(let i=0;i<lengths.length;i++){const a=points[i],b=points[i+1],f=lengths[i]?Math.min(1,remain/lengths[i]):1;q.lineTo(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);remain-=lengths[i];if(remain<=0)break;}q.stroke();q.restore();}
    if(v.mode==='lens'){
     const image=lensPixels(source,v,g,t,w,h);q.save();try{q.translate(g.cx,g.cy);q.rotate(g.angle);q.drawImage(image,-g.width/2,-g.height/2,g.width,g.height);q.shadowColor=recipe.color;q.shadowBlur=recipe.glow*unit;shape(q,0,0,g.width,g.height,v.shape);q.stroke();q.shadowBlur=0;
      if(v.caption){const fs=Math.max(5,Math.min(g.height*.14,g.width*.13)*recipe.fontScale),label=v.caption+'  ·  '+t.zoom.toFixed(1)+'×',pad=fs*.45,ly=g.height*.32;q.font='600 '+fs+'px system-ui, sans-serif';const tw=Math.min(g.width*.82,q.measureText(label).width+pad*2);q.beginPath();q.roundRect(-tw/2,ly-fs*.8,tw,fs*1.6,Math.min(fs*.25,tw/2));q.fillStyle='rgba(17,22,28,.9)';q.fill();q.fillStyle='#f1f5f8';q.textAlign='center';q.textBaseline='middle';q.fillText(label,0,ly,Math.max(1,tw-pad));}
     }finally{q.restore();}
    }
    if(v.marker!=='none'){
     q.save();q.shadowColor=recipe.color;q.shadowBlur=recipe.glow*unit*.45;q.beginPath();
     if(v.marker==='ring'){q.arc(x,y,size/2,0,2*Math.PI);}
     else if(v.marker==='crosshair'){const r=size/2,k=r*.25;for(const [a,b] of [[-r,-k],[k,r]]){q.moveTo(x+a,y);q.lineTo(x+b,y);q.moveTo(x,y+a);q.lineTo(x,y+b);}}
     else{const r=size/2,k=r*.5;for(const a of [-1,1])for(const z of [-1,1]){q.moveTo(x+a*(r-k),y+z*r);q.lineTo(x+a*r,y+z*r);q.lineTo(x+a*r,y+z*(r-k));}}q.stroke();q.restore();
    }
   }finally{q.restore();}
   if(v.mode==='anchor')root.MangoCalloutV0735.paint(q,recipe,b,opacity,u,w,h);
  }
  return Object.freeze({capture,paint,clear});
 }
 const api=Object.freeze({defaults,presets,preset,check,target,crop,geometry,edge,renderer});root.MangoSmartFocusV0737=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
