/* MangoShot v0.7.50: shared graphic pose editing using the existing compositor schema. */
(function(root){const C=root.MangoCompositorV0714||(typeof require==='function'?require('./compositor-core-v0714.js'):null);if(!C)return;const api=(function motionCore(C){
 'use strict';
 const fields=Object.freeze({x:{min:-1,max:1,factor:100},y:{min:-1,max:1,factor:100},scale:{min:.1,max:4,factor:100},rotation:{min:-720,max:720,factor:1},opacity:{min:0,max:1,factor:100}});
 const finite=Number.isFinite,clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),EPS=.000001;
 function at(layer,seconds){if(!layer||!finite(seconds)||!finite(layer.start)||!finite(layer.end)||layer.end<=layer.start||seconds<layer.start-.000001||seconds>layer.end+.000001)return null;return clamp((seconds-layer.start)/(layer.end-layer.start),0,1);}
 function nearest(keys,t,tolerance=EPS){let index=-1,distance=Infinity;keys.forEach((k,i)=>{const d=Math.abs(k.t-t);if(d<=tolerance&&d<distance){index=i;distance=d;}});return index;}
 function snap(layer,seconds){const t=at(layer,seconds);if(t===null)return null;const keys=layer.keyframes||[],i=nearest(keys,t,Math.max(EPS,Math.min(.008/(layer.end-layer.start),.01)));return i<0?t:keys[i].t;}
 function upsert(raw,t,patch={}){
  let keys=C.checkKeys(raw||[]);if(!finite(t)||t<0||t>1)throw Error('Keyframe must be inside the selected layer.');
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid motion properties.');
  for(const [name,value] of Object.entries(patch)){if(name==='ease'){if(!C.easing.includes(value))throw Error('Unsupported easing.');continue;}const f=fields[name];if(!Object.hasOwn(fields,name)||!finite(value)||value<f.min||value>f.max)throw Error('Invalid '+name+' value.');}
  let i=nearest(keys,t);if(i<0){if(keys.length>=C.MAX_KEYS)throw Error('Maximum '+C.MAX_KEYS+' transform keyframes.');keys=C.insertKey(keys,t);i=nearest(keys,t);}const previous=keys[i],key={...previous,...patch};if(Object.hasOwn(patch,'ease')&&patch.ease!==previous.ease)delete key.curve;keys[i]=key;return C.checkKeys(keys);
 }
 function remove(raw,t){const keys=C.checkKeys(raw||[]),i=nearest(keys,t);if(i<0)throw Error('Move the playhead to a keyframe first.');keys.splice(i,1);if(i>0){delete keys[i-1].curve;delete keys[i-1].out;}return C.checkKeys(keys);}
 function adjacent(raw,t,direction){const keys=C.checkKeys(raw||[]);if(direction===-1)return [...keys].reverse().find(k=>k.t<t-EPS)||null;if(direction===1)return keys.find(k=>k.t>t+EPS)||null;throw Error('Invalid key direction.');}
 function posePatch(p){return Object.fromEntries([...Object.keys(fields),'ease'].map(k=>[k,p[k]]));}
 function move(raw,t,dx,dy){if(!finite(dx)||!finite(dy))throw Error('Invalid movement.');const p=C.pose(C.checkKeys(raw||[]),t);return upsert(raw,t,{x:clamp(p.x+dx,-1,1),y:clamp(p.y+dy,-1,1)});}
 return Object.freeze({fields,at,nearest,snap,upsert,remove,adjacent,posePatch,move});
})(C);root.MangoMotionCoreV0750=api;if(typeof module==='object'&&module.exports)module.exports=api;})(globalThis);
