/* Local, asset-free geometry presets. Strict model validation on every read.
 * No media, layer IDs, motion tracks, screenshots or foreground masks retained. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730,Q=root.MangoUnifiedSceneV0733;if(!S||!Q)return;
 const KEY='mangoshot.spatial.presets.v1',MAX=16,MAX_BYTES=524288,copy=S.copy;
 const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
 const id=()=>root.crypto?.randomUUID?.()||'preset-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const kindCheck=k=>{if(!['object','scene'].includes(k))throw Error('Invalid preset kind.');return k;};
 function nameCheck(n){if(typeof n!=='string'||!n.trim()||n.trim().length>64)throw Error('Preset names require 1–64 characters.');return n.trim();}
 function clean(kind,v){
  kindCheck(kind);if(kind==='object'){if(v?.camera)return Q.geometry(v);return Q.geometry(Q.pose(v,S.defaultCamera()));}
  const n=Q.check(v);delete n.occlusion;for(const o of n.objects)o.locked=false;return n;
 }
 const empty=()=>({version:1,object:[],scene:[]});
 function check(v){
  if(!exact(v,['version','object','scene'])||v.version!==1)throw Error('Invalid local 3D preset library.');const n=empty(),ids=new Set();
  for(const kind of ['object','scene']){
   if(!Array.isArray(v[kind])||v[kind].length>MAX)throw Error('Preset library limit exceeded.');
   n[kind]=v[kind].map(p=>{if(!exact(p,['id','name','value'])||typeof p.id!=='string'||!/^[\w-]{1,90}$/.test(p.id)||ids.has(p.id))throw Error('Invalid preset identifier.');ids.add(p.id);return {id:p.id,name:nameCheck(p.name),value:clean(kind,p.value)};});
  }return n;
 }
 function read(storage){const raw=storage.getItem(KEY);if(raw==null)return empty();if(raw.length>MAX_BYTES)throw Error('Local preset library exceeds its size budget.');return check(JSON.parse(raw));}
 function write(storage,v){const n=check(v),raw=JSON.stringify(n);if(raw.length>MAX_BYTES)throw Error('Local preset library exceeds its size budget.');storage.setItem(KEY,raw);return n;}
 function save(storage,kind,name,value){kindCheck(kind);const n=read(storage);if(n[kind].length>=MAX)throw Error('Remove a preset before saving another (16 per category).');const p={id:id(),name:nameCheck(name),value:clean(kind,value)};if(n[kind].some(x=>x.name.toLowerCase()===p.name.toLowerCase()))throw Error('A preset with that name already exists.');n[kind].push(p);write(storage,n);return p.id;}
 function remove(storage,kind,presetId){kindCheck(kind);const n=read(storage);if(!n[kind].some(p=>p.id===presetId))throw Error('Preset not found.');n[kind]=n[kind].filter(p=>p.id!==presetId);write(storage,n);}
 function route(points,color,shape='arrow'){return Q.geometry(S.toBezier({...S.defaults(),shape,points,color}));}
 function builtins(kind){kindCheck(kind);
  if(kind==='object')return [
   {id:'route-rise',name:'Ascending route',value:route([[-2,-1,1.5],[-1,-.5,.6],[.1,.2,-.3],[1.4,1,-1.2]],'#f4b942')},
   {id:'route-slalom',name:'Depth slalom',value:route([[-2,-.6,1.4],[-1,.7,.9],[0,-.4,-.2],[.9,.6,-.8],[1.8,0,-1.8]],'#45aaff')},
   {id:'route-ribbon',name:'Curved guide ribbon',value:route([[-1.8,-.8,1.2],[-.8,-.1,.4],[.5,.65,-.6],[1.7,.4,-1.4]],'#a5d96b','ribbon')}
  ];
  const path=builtins('object')[0].value,ring=Q.geometry({...S.defaults(),shape:'ring',points:[[1.4,.65,-1.2],[1.4,1.3,-1.2]],color:'#45aaff'});
  return [{id:'route-destination',name:'Route and destination',value:Q.check({mode:'scene',shape:'scene',camera:S.defaultCamera(),objects:[{id:'route',name:'Ascending route',visible:true,locked:false,geometry:path},{id:'destination',name:'Destination ring',visible:true,locked:false,geometry:ring}]})}];
 }
 function load(storage,kind,ref){
  kindCheck(kind);if(typeof ref!=='string')throw Error('Select a preset.');const builtin=ref.startsWith('builtin:'),pid=ref.slice(builtin?8:5),p=(builtin?builtins(kind):ref.startsWith('user:')?read(storage)[kind]:[]).find(x=>x.id===pid);if(!p)throw Error('Preset not found.');
  const v=clean(kind,p.value);return kind==='scene'?Q.instantiate(v):copy(v);
 }
 const api=Object.freeze({KEY,MAX,MAX_BYTES,copy,empty,clean,check,read,save,remove,builtins,load});
 root.MangoSpatialPresetsV0735=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
