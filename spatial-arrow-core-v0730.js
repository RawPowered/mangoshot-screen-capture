/* Spatial Arrow: a true XYZ centerline, swept circular mesh, independent camera.
 * World units are layer-local, not inferred coordinates of photographed/game objects. */
(function(root){'use strict';
 const LIMIT=3,MAX_NODES=12,SIDES=16,NEAR=.05,FAR=50,EPS=1e-7;
 const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),copy=x=>JSON.parse(JSON.stringify(x));
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(EPS,length(a))),lerp=(a,b,t)=>add(a,mul(sub(b,a),t)),rad=x=>x*Math.PI/180;
 const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
 const vector=(v,b)=>Array.isArray(v)&&v.length===3&&v.every(x=>finite(x,-b,b));
 const defaultCamera=()=>({azimuth:12,elevation:15,distance:6.8,fov:39,projection:'perspective',target:[0,0,0]});
 const defaults=()=>({mode:'spatial',shape:'arrow',points:[[-2,-.65,1.3],[-.8,.15,.7],[.2,.12,-.5],[1.5,.6,-1.3]],radius:.085,headRadius:.19,headLength:.48,color:'#f4b942',material:'metal',smooth:true,camera:defaultCamera(),light:-45});
 function checkCamera(c){if(!exact(c,['azimuth','elevation','distance','fov','projection','target'])||!finite(c.azimuth,-180,180)||!finite(c.elevation,-89.5,89.5)||!finite(c.distance,2,18)||!finite(c.fov,15,90)||!['perspective','orthographic'].includes(c.projection)||!vector(c.target,LIMIT))throw Error('Invalid spatial camera.');return {...c,target:c.target.slice()};}
 function check(v){
  if(!exact(v,Object.keys(defaults()))||v.mode!=='spatial'||v.shape!=='arrow'||!Array.isArray(v.points)||v.points.length<2||v.points.length>MAX_NODES||!v.points.every(p=>vector(p,LIMIT))||typeof v.smooth!=='boolean'||typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color)||!['matte','metal','gloss'].includes(v.material)||!finite(v.radius,.025,.25)||!finite(v.headRadius,.05,.5)||v.headRadius<v.radius*1.2||!finite(v.headLength,.12,1.2)||!finite(v.light,-180,180))throw Error('Invalid spatial arrow geometry or material.');
  if(v.points.some((p,i)=>i&&length(sub(p,v.points[i-1]))<.045))throw Error('Adjacent path points must be at least 0.045 world units apart.');
  return {...v,color:v.color.toLowerCase(),points:v.points.map(p=>p.slice()),camera:checkCamera(v.camera)};
 }
 function camera(c,w,h){c=checkCamera(c);const a=rad(c.azimuth),e=rad(c.elevation),offset=[c.distance*Math.sin(a)*Math.cos(e),c.distance*Math.sin(e),c.distance*Math.cos(a)*Math.cos(e)],eye=add(c.target,offset),forward=unit(mul(offset,-1)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward),t=Math.tan(rad(c.fov)/2);return {eye,forward,right,up,t,aspect:w/h,ortho:c.projection==='orthographic',distance:c.distance};}
 function project(p,c,w,h){const v=camera(c,w,h),d=sub(p,v.eye),z=dot(d,v.forward);if(z<=NEAR||z>=FAR)return null;const s=v.t*(v.ortho?v.distance:z);return {x:w/2*(1+dot(d,v.right)/(s*v.aspect)),y:h/2*(1-dot(d,v.up)/s),z};}
 function viewDelta(p,c,w,h,dx,dy){const b=camera(c,w,h),z=dot(sub(p,b.eye),b.forward),factor=2*b.t*(b.ortho?b.distance:z)/h;return add(mul(b.right,dx*factor),mul(b.up,-dy*factor));}
 function axisDelta(p,c,w,h,axis,dx,dy){const a=project(p,c,w,h),b=project(add(p,mul(axis,.5)),c,w,h);if(!a||!b)return null;const x=b.x-a.x,y=b.y-a.y,d=x*x+y*y;if(d<36)return null;return mul(axis,.5*(dx*x+dy*y)/d);}
 // Catmull-Rom cubic interpolation through actual XYZ points. Straight mode keeps
 // polyline segments; smoothing uses bounded sampling, not a screen-space bend.
 function centerline(value){
  const v=check(value),p=v.points,out=[p[0].slice()];
  for(let i=0;i<p.length-1;i++){
   const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(p.length-1,i+2)];
   for(let j=1;j<=12;j++){const t=j/12,t2=t*t,t3=t2*t,q=j===12?c.slice():v.smooth?b.map((x,k)=>.5*(2*x+(-a[k]+c[k])*t+(2*a[k]-5*x+4*c[k]-d[k])*t2+(-a[k]+3*x-3*c[k]+d[k])*t3)):lerp(b,c,t);if(length(sub(q,out.at(-1)))>EPS)out.push(q);}
  }return out;
 }
 function frame(t,old){let n=old?sub(old,mul(t,dot(old,t))):[0,0,0];if(length(n)<.001)n=cross(t,Math.abs(t[1])<.85?[0,1,0]:[1,0,0]);n=unit(n);return {n,b:unit(cross(t,n))};}
 function mesh(value){
  const v=check(value),samples=centerline(v),lengths=[0];for(let i=1;i<samples.length;i++)lengths.push(lengths.at(-1)+length(sub(samples[i],samples[i-1])));
  const total=lengths.at(-1),headLength=Math.min(v.headLength,total*.42);let cut=total-headLength;
  let i=1;while(i<lengths.length-1&&lengths[i]<cut)i++;
  let center=lerp(samples[i-1],samples[i],(cut-lengths[i-1])/Math.max(EPS,lengths[i]-lengths[i-1]));
  if(length(sub(samples.at(-1),center))<EPS){i=samples.length-1;center=samples[i-1].slice();}
  const shaft=samples.slice(0,i);if(length(sub(center,shaft.at(-1)))>EPS)shaft.push(center);else shaft[shaft.length-1]=center;
  const tip=samples.at(-1),headT=unit(sub(tip,center)),vertices=[],normals=[],rings=[];let old=null;
  const tri=(a,b,c,na,nb,nc)=>{vertices.push(...a,...b,...c);normals.push(...na,...nb,...nc);};
  const radial=(f,k)=>add(mul(f.n,Math.cos(k*2*Math.PI/SIDES)),mul(f.b,Math.sin(k*2*Math.PI/SIDES)));
  for(let j=0;j<shaft.length;j++){
   const p=shaft[j],delta=sub(shaft[Math.min(shaft.length-1,j+1)],shaft[Math.max(0,j-1)]),t=j===shaft.length-1?headT:unit(length(delta)>EPS?delta:sub(shaft[j+1],shaft[j])),f=frame(t,old);old=f.n;
   rings.push({p,t,f,points:Array.from({length:SIDES},(_,k)=>{const n=radial(f,k);return {n,p:add(p,mul(n,v.radius))};})});
  }
  for(let j=1;j<rings.length;j++)for(let k=0;k<SIDES;k++){const z=(k+1)%SIDES,a=rings[j-1].points[k],b=rings[j-1].points[z],c=rings[j].points[k],d=rings[j].points[z];tri(a.p,b.p,c.p,a.n,b.n,c.n);tri(b.p,d.p,c.p,b.n,d.n,c.n);}
  const first=rings[0],f0=mul(first.t,-1);
  for(let k=0;k<SIDES;k++){const j=(k+1)%SIDES;tri(first.p,first.points[j].p,first.points[k].p,f0,f0,f0);}
  const f=frame(headT,old),coneLength=length(sub(tip,center)),back=mul(headT,-1);
  for(let k=0;k<SIDES;k++){const a=radial(f,k),b=radial(f,k+1),p=add(center,mul(a,v.headRadius)),q=add(center,mul(b,v.headRadius)),na=unit(add(mul(a,coneLength),mul(headT,v.headRadius))),nb=unit(add(mul(b,coneLength),mul(headT,v.headRadius)));
   tri(p,q,tip,na,nb,unit(add(na,nb)));tri(center,q,p,back,back,back);
  }
  return {positions:new Float32Array(vertices),normals:new Float32Array(normals),samples,tip:tip.slice(),headBase:center,arcLength:total,triangles:vertices.length/9};
 }
 function scalePoints(points,factor){const center=mul(points.reduce(add,[0,0,0]),1/points.length);return points.map(p=>add(center,mul(sub(p,center),factor)));}
 function rotatePoints(points,axis,degrees){const a=rad(degrees),s=Math.sin(a),c=Math.cos(a),center=mul(points.reduce(add,[0,0,0]),1/points.length),u=[0,0,0];u[axis]=1;return points.map(p=>{const v=sub(p,center);return add(center,add(add(mul(v,c),mul(cross(u,v),s)),mul(u,dot(u,v)*(1-c))));});}
 const api=Object.freeze({LIMIT,MAX_NODES,SIDES,NEAR,FAR,copy,defaults,defaultCamera,check,checkCamera,add,sub,mul,dot,length,camera,project,viewDelta,axisDelta,centerline,mesh,rotatePoints,scalePoints});
 root.MangoSpatialArrowV0730=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
