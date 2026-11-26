/* Clip-local normalized pose keyframes. Complete XYZ poses share topology.
 * Foreground masks stay in screen space; they are deliberately not camera-tracked. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730;if(!S)return;
 const MAX_KEYS=12,MIN_SEPARATION=.045,copy=S.copy,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 const exact=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(n=>Object.hasOwn(x,n));
 const pose=v=>{const p=S.check(v);delete p.occlusion;return p;};
 const lerp=(a,b,t)=>a+(b-a)*t,vector=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
 const angle=(a,b,t)=>((a+((((b-a)+180)%360+360)%360-180)*t+180)%360+360)%360-180;
 const hex=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
 function checkSegment(a,b){
  if(a.points.length!==b.points.length)throw Error('Motion keys must share the same point count. Disable motion to change topology.');
  // Analytic minimum of the squared length of each interpolated adjacent edge.
  // Prevent a valid endpoint pair from collapsing a tube mid-animation.
  for(let i=1;i<a.points.length;i++){const d=S.sub(a.points[i],a.points[i-1]),e=S.sub(b.points[i],b.points[i-1]),v=S.sub(e,d),den=S.dot(v,v),t=den?clamp(-S.dot(d,v)/den,0,1):0;if(S.length(S.add(d,S.mul(v,t)))<MIN_SEPARATION-1e-10)throw Error('Adjacent path points would collide between keys. Add an intermediate pose or change the path.');}
 }
 function check(v,base){
  if(!exact(v,['keys'])||!Array.isArray(v.keys)||v.keys.length<2||v.keys.length>MAX_KEYS)throw Error('Use 2–12 motion keys.');
  const keys=v.keys.map((k,i)=>{if(!exact(k,['at','pose','reveal','ease'])||!finite(k.at,0,1)||!finite(k.reveal,0,1)||!['linear','smooth','hold'].includes(k.ease)||i&&k.at-v.keys[i-1].at<.009999999||Object.hasOwn(k.pose||{},'occlusion'))throw Error('Invalid motion key. Times must be at least 1% apart.');return {...k,pose:pose(k.pose)};});
  if(keys[0].at!==0||keys.at(-1).at!==1)throw Error('Motion needs keys at 0% and 100%.');
  if(base&&JSON.stringify(pose(base))!==JSON.stringify(keys[0].pose))throw Error('Base arrow must match its first pose.');
  for(let i=1;i<keys.length;i++){if(keys[i].pose.shape!==keys[0].pose.shape||keys[i].pose.points.length!==keys[0].pose.points.length)throw Error('Motion keys must share path topology.');if(keys[i-1].ease!=='hold')checkSegment(keys[i-1].pose,keys[i].pose);}
  return {keys};
 }
 function defaults(base,grow=false){const p=pose(base);return {keys:[{at:0,pose:copy(p),reveal:grow?0:1,ease:'smooth'},{at:1,pose:copy(p),reveal:1,ease:'linear'}]};}
 function interpolate(a,b,t){if(t<=0)return copy(a);if(t>=1)return copy(b);
  const c={...a,camera:{...a.camera}};
  c.points=a.points.map((p,i)=>vector(p,b.points[i],t));for(const k of ['radius','headRadius','headLength'])c[k]=lerp(a[k],b[k],t);
  c.light=angle(a.light,b.light,t);c.color=hex(a.color,b.color,t);
  for(const k of ['elevation','distance','fov'])c.camera[k]=lerp(a.camera[k],b.camera[k],t);
  c.camera.azimuth=angle(a.camera.azimuth,b.camera.azimuth,t);if(a.camera.roll||b.camera.roll)c.camera.roll=angle(a.camera.roll||0,b.camera.roll||0,t);c.camera.target=vector(a.camera.target,b.camera.target,t);
  return S.check(c);
 }
 function evaluate(motion,u,base){
  if(!motion)return {value:base,reveal:1};
  const a=motion.keys;u=clamp(u,0,1);let i=1;while(i<a.length-1&&u>a[i].at)i++;
  const p=a[i-1],q=a[i],raw=clamp((u-p.at)/(q.at-p.at),0,1),t=raw>=1?1:p.ease==='hold'?0:p.ease==='smooth'?raw*raw*(3-2*raw):raw;
  const value=interpolate(p.pose,q.pose,t);if(base.occlusion?.length)value.occlusion=copy(base.occlusion);
  return {value,reveal:lerp(p.reveal,q.reveal,t)};
 }
 const api=Object.freeze({MAX_KEYS,copy,pose,check,defaults,interpolate,evaluate,checkSegment});
 root.MangoSpatialMotionV0731=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
