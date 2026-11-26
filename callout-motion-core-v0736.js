/* Bounded independent scalar animation; normalized clip-local time. */
(function(root){'use strict';
 const properties=Object.freeze({x:{name:'Position X',min:-1,max:1,step:.001},y:{name:'Position Y',min:-1,max:1,step:.001},width:{name:'Width',min:.05,max:2,step:.001},height:{name:'Height',min:.05,max:2,step:.001},opacity:{name:'Opacity',min:0,max:1,step:.01},rotation:{name:'Rotation',min:-180,max:180,step:1},glow:{name:'Glow',min:0,max:40,step:1},thickness:{name:'Stroke',min:1,max:16,step:.1},fillOpacity:{name:'Fill opacity',min:0,max:1,step:.01},fontScale:{name:'Text scale',min:.5,max:2,step:.01},dim:{name:'Spotlight dim',min:0,max:.95,step:.01},progress:{name:'Progress',min:0,max:1,step:.01}});
 const poseKeys=['x','y','width','height','opacity'],eases=['linear','smooth','easeIn','easeOut','hold','bezier'],MIN=.01,MAX=12,EPS=1e-8;
 const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 const curveDefault=()=>[.42,0,.58,1],empty=()=>({tracks:[]});
 const key=(t,value,ease='smooth',curve=curveDefault())=>({t,value,ease,curve:[...curve]});
 function check(m){
  if(!m||Object.keys(m).length!==1||!Array.isArray(m.tracks)||m.tracks.length>Object.keys(properties).length)throw Error('Invalid callout animation tracks.');
  const seen=new Set(),tracks=m.tracks.map(a=>{
   if(!a||Object.keys(a).length!==2||!Object.hasOwn(properties,a.property)||seen.has(a.property)||!Array.isArray(a.keys)||a.keys.length<2||a.keys.length>MAX)throw Error('Invalid or duplicate callout property track.');
   seen.add(a.property);const spec=properties[a.property];
   const keys=a.keys.map((k,i)=>{if(!k||Object.keys(k).length!==4||!finite(k.t,0,1)||!finite(k.value,spec.min,spec.max)||!eases.includes(k.ease)||!Array.isArray(k.curve)||k.curve.length!==4||!k.curve.every(x=>finite(x,0,1))||k.curve[0]>k.curve[2]||k.curve[1]>k.curve[3]||i&&k.t-a.keys[i-1].t<MIN-EPS)throw Error('Invalid callout key, easing curve or 1% key spacing.');return key(k.t,k.value,k.ease,k.curve);});
   if(keys[0].t!==0||keys.at(-1).t!==1)throw Error('Callout tracks require fixed start/end keys.');
   return {property:a.property,keys};
  });return {tracks:tracks.sort((a,b)=>Object.keys(properties).indexOf(a.property)-Object.keys(properties).indexOf(b.property))};
 }
 const get=(m,p)=>m.tracks.find(t=>t.property===p),count=m=>m.tracks.reduce((n,t)=>n+t.keys.length,0);
 function cubic(t,a,b){const z=1-t;return 3*z*z*t*a+3*z*t*t*b+t*t*t;}
 function easing(t,mode,curve=curveDefault()){
  t=clamp(t,0,1);if(t===0||t===1)return t;
  if(mode==='hold')return 0;if(mode==='smooth')return t*t*(3-2*t);if(mode==='easeIn')return t*t;if(mode==='easeOut')return 1-(1-t)*(1-t);
  if(mode==='bezier'){let lo=0,hi=1;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(cubic(mid,curve[0],curve[2])<t)lo=mid;else hi=mid;}return cubic((lo+hi)/2,curve[1],curve[3]);}return t;
 }
 function sample(track,t){const a=track.keys;t=clamp(t,0,1);if(t<=0)return a[0].value;if(t>=1)return a.at(-1).value;const i=a.findIndex(k=>k.t>t),l=a[i-1],r=a[i],u=easing((t-l.t)/(r.t-l.t),l.ease,l.curve);return l.value+(r.value-l.value)*u;}
 function evaluate(m,base,recipe,t){const pose=Object.fromEntries(poseKeys.map(p=>[p,base[p]])),v={...recipe};for(const a of m.tracks){const value=sample(a,t);if(poseKeys.includes(a.property))pose[a.property]=value;else v[a.property]=value;}return {pose,recipe:v};}
 function enable(m,p,base){const n=check(m);if(get(n,p))return n;if(!Object.hasOwn(properties,p))throw Error('Unknown callout property.');n.tracks.push({property:p,keys:[key(0,base),key(1,base)]});return check(n);}
 function remove(m,p){return check({tracks:m.tracks.filter(t=>t.property!==p)});}
 function nearest(track,t){return track.keys.findIndex(k=>Math.abs(k.t-t)<MIN-EPS);}
 function set(m,p,t,value,base){let n=enable(m,p,base);const a=get(n,p);t=clamp(Math.round(t*10000)/10000,0,1);let i=nearest(a,t);if(i>=0)a.keys[i].value=value;else{if(a.keys.length>=MAX)throw Error('Track has 12 keys. Remove one before adding another.');a.keys.push(key(t,value));a.keys.sort((a,b)=>a.t-b.t);}n=check(n);return n;}
 function insert(m,p,t){const a=get(m,p);if(!a)throw Error('Enable the track first.');return set(m,p,t,sample(a,t),a.keys[0].value);}
 function edit(m,p,i,patch){const n=check(m),a=get(n,p),k=a?.keys[i];if(!k)throw Error('Select a key.');if(Object.keys(patch).some(x=>!['t','value','ease','curve'].includes(x)))throw Error('Unsupported key field.');if((i===0||i===a.keys.length-1)&&Object.hasOwn(patch,'t')&&patch.t!==k.t)throw Error('Start and end key times are fixed.');a.keys[i]={...k,...patch};return check(n);}
 function removeKey(m,p,i){const n=check(m),a=get(n,p);if(!a||i<=0||i>=a.keys.length-1)throw Error('Start and end keys cannot be removed.');a.keys.splice(i,1);return check(n);}
 function poseAt(m,base,recipe,t,changes){let n=check(m);for(const [p,v] of Object.entries(changes)){if(!poseKeys.includes(p))throw Error('Unsupported pose property.');n=set(n,p,t,v,base[p]);}return n;}
 function pathPreset(m,id,base){const n=check(m),spec={drift:[[0,-.12,0],[1,.12,0]],rise:[[0,0,.16],[1,0,-.16]],arc:[[0,-.12,.06],[.5,0,-.12],[1,.12,.06]]}[id];if(!spec)throw Error('Unknown path preset.');const keep=n.tracks.filter(t=>!['x','y'].includes(t.property));for(const [p,j] of [['x',1],['y',2]])keep.push({property:p,keys:spec.map(row=>key(row[0],clamp(base[p]+row[j],-1,1),'smooth'))});return check({tracks:keep});}
 const api=Object.freeze({properties,poseKeys,eases,MIN,MAX,copy,empty,key,check,get,count,easing,sample,evaluate,enable,remove,nearest,set,insert,edit,removeKey,poseAt,pathPreset,curveDefault});
 root.MangoCalloutMotionV0736=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
