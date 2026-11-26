/* Independent clip-local object/camera tracks in one world. Pure model,
 * deterministic interpolation; no DOM, GPU, source footage or hidden state. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730,Q=root.MangoUnifiedSceneV0733,M=root.MangoSpatialMotionV0731;if(!S||!Q||!M)return;
 const MAX_KEYS=12,MIN_GAP=.01,copy=S.copy,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
 const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
 const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b)),lerp=(a,b,t)=>a+(b-a)*t;
 const angle=(a,b,t)=>((a+((((b-a)+180)%360+360)%360-180)*t+180)%360+360)%360-180;
 const cameraTarget='@camera';
 function keysCheck(keys,fields,read){
  if(!Array.isArray(keys)||keys.length<2||keys.length>MAX_KEYS)throw Error('Each track requires 2–12 keys.');
  const out=keys.map((k,i)=>{if(!exact(k,fields)||!finite(k.at,0,1)||!['linear','smooth','hold'].includes(k.ease)||i&&k.at-keys[i-1].at<MIN_GAP-1e-9)throw Error('Keys must be at least 1% apart.');return {at:k.at,ease:k.ease,...read(k)};});
  if(out[0].at!==0||out.at(-1).at!==1)throw Error('Track endpoints must be at 0% and 100%.');return out;
 }
 function check(value,base){
  const scene=Q.check(base);
  if(!exact(value,['objectTracks','cameraKeys'])||!Array.isArray(value.objectTracks)||value.objectTracks.length>Q.MAX_OBJECTS||!Array.isArray(value.cameraKeys)||!value.objectTracks.length&&!value.cameraKeys.length)throw Error('Motion requires at least one object or camera track.');
  const ids=new Set(),objectTracks=value.objectTracks.map(track=>{
   if(!exact(track,['id','keys'])||typeof track.id!=='string'||ids.has(track.id))throw Error('Duplicate or invalid object track.');
   const o=scene.objects.find(x=>x.id===track.id);if(!o)throw Error('Motion track refers to a missing object.');ids.add(track.id);
   const keys=keysCheck(track.keys,['at','ease','geometry','reveal'],k=>{
    if(!finite(k.reveal,0,1))throw Error('Reveal must be 0–100%.');
    const geometry=Q.geometry(Q.pose(k.geometry,scene.camera));
    if(geometry.shape!==o.geometry.shape||geometry.points.length!==o.geometry.points.length)throw Error('Animated objects must retain primitive and point topology.');
    return {geometry,reveal:k.reveal};
   });
   if(!same(keys[0].geometry,o.geometry))throw Error('Object base geometry must match its first key.');
   for(let i=1;i<keys.length;i++)if(keys[i-1].ease!=='hold')M.checkSegment(Q.pose(keys[i-1].geometry,scene.camera),Q.pose(keys[i].geometry,scene.camera));
   return {id:o.id,keys};
  });
  const cameraKeys=value.cameraKeys.length?keysCheck(value.cameraKeys,['at','ease','camera'],k=>({camera:S.checkCamera(k.camera)})):[];
  if(cameraKeys.length&&!same(cameraKeys[0].camera,scene.camera))throw Error('Scene camera must match its first key.');
  return {objectTracks,cameraKeys};
 }
 function empty(){return {objectTracks:[],cameraKeys:[]};}
 function hasTracks(m){return !!(m?.objectTracks.length||m?.cameraKeys.length);}
 function getKeys(m,target){return target===cameraTarget?m.cameraKeys:m.objectTracks.find(t=>t.id===target)?.keys||[];}
 function addTrack(m,base,target,grow=false){
  const n=copy(m),scene=Q.check(base);if(getKeys(n,target).length)throw Error('Track already exists.');
  if(target===cameraTarget)n.cameraKeys=[{at:0,ease:'smooth',camera:copy(scene.camera)},{at:1,ease:'linear',camera:copy(scene.camera)}];
  else{const o=scene.objects.find(x=>x.id===target);if(!o||o.locked)throw Error('Select an unlocked scene object.');n.objectTracks.push({id:o.id,keys:[{at:0,ease:'smooth',geometry:copy(o.geometry),reveal:grow?0:1},{at:1,ease:'linear',geometry:copy(o.geometry),reveal:1}]});}
  return check(n,scene);
 }
 function removeTrack(m,target){const n=copy(m);if(target===cameraTarget)n.cameraKeys=[];else n.objectTracks=n.objectTracks.filter(t=>t.id!==target);return n;}
 function segment(keys,u){u=clamp(u,0,1);let i=1;while(i<keys.length-1&&u>keys[i].at)i++;const a=keys[i-1],b=keys[i],raw=clamp((u-a.at)/(b.at-a.at),0,1),t=raw>=1?1:a.ease==='hold'?0:a.ease==='smooth'?raw*raw*(3-2*raw):raw;return {a,b,t};}
 function cameraBetween(a,b,t){if(t<=0)return copy(a);if(t>=1)return copy(b);const c={...a,target:a.target.map((x,i)=>lerp(x,b.target[i],t))};for(const k of ['elevation','distance','fov'])c[k]=lerp(a[k],b[k],t);c.azimuth=angle(a.azimuth,b.azimuth,t);if(a.roll||b.roll)c.roll=angle(a.roll||0,b.roll||0,t);return S.checkCamera(c);}
 function objectAt(keys,u,camera){const {a,b,t}=segment(keys,u);return {geometry:Q.geometry(M.interpolate(Q.pose(a.geometry,camera),Q.pose(b.geometry,camera),t)),reveal:lerp(a.reveal,b.reveal,t)};}
 function evaluate(motion,u,base){
  if(!motion||!hasTracks(motion))return {scene:copy(base),reveals:Object.create(null)};
  const scene=copy(base),reveals=Object.create(null);u=clamp(u,0,1);
  if(motion.cameraKeys.length){const {a,b,t}=segment(motion.cameraKeys,u);scene.camera=cameraBetween(a.camera,b.camera,t);}
  for(const track of motion.objectTracks){const o=scene.objects.find(x=>x.id===track.id);if(!o)throw Error('Missing motion object.');const p=objectAt(track.keys,u,scene.camera);o.geometry=p.geometry;reveals[o.id]=p.reveal;}
  return {scene:Q.check(scene),reveals};
 }
 function updateBase(base,motion){const n=copy(base);for(const t of motion.objectTracks){const o=n.objects.find(x=>x.id===t.id);if(!o)throw Error('Missing motion object.');o.geometry=copy(t.keys[0].geometry);}if(motion.cameraKeys.length)n.camera=copy(motion.cameraKeys[0].camera);return Q.check(n);}
 function insertKey(motion,base,target,at){
  const n=check(motion,base),keys=getKeys(n,target);if(keys.length>=MAX_KEYS||!keys.length)throw Error('Enable the track or remove a key first.');
  const i=keys.findIndex(k=>k.at>at);if(i<1||at-keys[i-1].at<MIN_GAP-1e-9||keys[i].at-at<MIN_GAP-1e-9)throw Error('Move the scrubber at least 1% away from another key.');
  const {a,b,t}=segment(keys,at),k=target===cameraTarget?{at,ease:a.ease,camera:cameraBetween(a.camera,b.camera,t)}:{at,ease:a.ease,...objectAt(keys,at,base.camera)};
  keys.splice(i,0,k);return {motion:check(n,base),index:i};
 }
 function count(m){return (m?.cameraKeys.length||0)+(m?.objectTracks.reduce((n,t)=>n+t.keys.length,0)||0);}
 const api=Object.freeze({MAX_KEYS,MIN_GAP,cameraTarget,copy,same,empty,hasTracks,getKeys,addTrack,removeTrack,check,segment,cameraBetween,objectAt,evaluate,updateBase,insertKey,count});
 root.MangoUnifiedSceneMotionV0734=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
