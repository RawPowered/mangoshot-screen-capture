/* Rigid-body transforms evaluated after mesh generation. Positions rotate about
 * a shared track pivot; normals rotate without translation. No pose morphing. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730;if(!S)return;
 const MAX_TRANSLATION=6,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b,rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
 const vector=(p,b)=>Array.isArray(p)&&p.length===3&&p.every(x=>finite(x,-b,b));
 const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
 const identity=()=>[0,0,0,1],zero=()=>[0,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 function quaternion(q){if(!Array.isArray(q)||q.length!==4||!q.every(x=>finite(x,-1.000001,1.000001))||Math.abs(Math.hypot(...q)-1)>1e-6)throw Error('Expected a unit quaternion.');return q.slice();}
 function normalize(q){const n=Math.hypot(...q);if(!Number.isFinite(n)||n<1e-12)throw Error('Invalid quaternion.');return q.map(x=>x/n);}
 function pivot(p){if(!vector(p,S.LIMIT))throw Error('Pivot must be within +/-3 world units.');return p.slice();}
 function translation(p){if(!vector(p,MAX_TRANSLATION))throw Error('Translation must be within +/-6 world units.');return p.slice();}
 function multiply(a,b){const v=a.slice(0,3),w=b.slice(0,3),q=S.add(S.add(S.mul(w,a[3]),S.mul(v,b[3])),cross(v,w));return normalize([...q,a[3]*b[3]-dot(v,w)]);}
 function axisAngle(i,angle){if(!Number.isInteger(i)||i<0||i>2||!Number.isFinite(angle))throw Error('Invalid rotation axis.');const v=[0,0,0];v[i]=Math.sin(rad(angle)/2);return [...v,Math.cos(rad(angle)/2)];}
 function fromEuler(e){if(!vector(e,360))throw Error('Angles must be within +/-360 degrees.');return multiply(axisAngle(2,e[2]),multiply(axisAngle(1,e[1]),axisAngle(0,e[0])));}
 function toEuler(q){const [x,y,z,w]=normalize(quaternion(q)),sin=clamp(2*(w*y-z*x),-1,1);if(Math.abs(sin)>.9999999)return [0,deg(Math.asin(sin)),deg(Math.atan2(2*(w*z-x*y),1-2*(x*x+z*z)))];return [deg(Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y))),deg(Math.asin(sin)),deg(Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z)))];}
 function slerp(a,b,t){a=quaternion(a);b=quaternion(b);if(t<=0)return a;if(t>=1)return b;let d=dot(a,b);if(d<0){b=b.map(x=>-x);d=-d;}d=clamp(d,-1,1);if(d>.9995)return normalize(a.map((x,i)=>x+(b[i]-x)*t));const angle=Math.acos(d),den=Math.sin(angle);return normalize(a.map((x,i)=>(x*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/den));}
 function rotate(q,p){const u=q.slice(0,3),v=cross(u,p);return S.add(p,S.mul(S.add(S.mul(v,q[3]),cross(u,v)),2));}
 function check(t){if(!exact(t,['pivot','rotation','translation']))throw Error('Invalid rigid transform.');return {pivot:pivot(t.pivot),rotation:quaternion(t.rotation),translation:translation(t.translation)};}
 function point(t,p){const v=check(t);return S.add(S.add(v.pivot,rotate(normalize(v.rotation),S.sub(p,v.pivot))),v.translation);}
 function mesh(m,raw){const t=check(raw),q=normalize(t.rotation),p=t.pivot,offset=S.sub(S.add(p,t.translation),rotate(q,p));for(let i=0;i<m.positions.length;i+=3){const a=S.add(rotate(q,[m.positions[i],m.positions[i+1],m.positions[i+2]]),offset),b=rotate(q,[m.normals[i],m.normals[i+1],m.normals[i+2]]);m.positions.set(a,i);m.normals.set(b,i);}return m;}
 function between(a,b,t){return {rotation:slerp(a.rotation,b.rotation,t),translation:translation(a.translation.map((x,i)=>x+(b.translation[i]-x)*t)),reveal:a.reveal+(b.reveal-a.reveal)*t};}
 const api=Object.freeze({MAX_TRANSLATION,identity,zero,quaternion,pivot,translation,multiply,axisAngle,fromEuler,toEuler,slerp,rotate,check,point,mesh,between});
 root.MangoRigidMotionV0736=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
