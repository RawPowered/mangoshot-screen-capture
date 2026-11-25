/* Layer Studio: validated organizational paths, atomic batch operations and Canvas2D layer appearance. */
(function(root){'use strict';
 const kinds=['none','shadow','glow'],blends=['source-over','multiply','screen','overlay','darken','lighten'];
 const initial={kind:'none',color:'#000000',blur:0,offsetX:0,offsetY:0,blend:'source-over'};
 const presets=Object.freeze([
 ['clear','Clear',initial],
 ['soft','Soft shadow',{kind:'shadow',color:'#000000',blur:16,offsetX:4,offsetY:8}],
 ['elevated','Elevated',{kind:'shadow',color:'#0b1019',blur:32,offsetX:7,offsetY:14}],
 ['hard','Hard shadow',{kind:'shadow',color:'#15191f',blur:0,offsetX:8,offsetY:8}],
 ['carbon','Carbon edge',{kind:'shadow',color:'#222832',blur:5,offsetX:2,offsetY:3}],
 ['gold','Gold halo',{kind:'glow',color:'#d5ab54',blur:24}],
 ['ice','Ice halo',{kind:'glow',color:'#8bdcff',blur:22}],
 ['lime','Lime halo',{kind:'glow',color:'#b7ff3c',blur:20}],
 ['rose','Rose halo',{kind:'glow',color:'#f69dbb',blur:18}],
 ['screen','Screen blend',{blend:'screen'}],
 ['multiply','Multiply blend',{blend:'multiply'}]
 ].map(([id,name,patch])=>Object.freeze({id,name,fx:Object.freeze({...initial,...patch})})));
 const hex=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
 const range=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function checkGroup(v){
  if(!Array.isArray(v)||v.length>4||v.some(n=>typeof n!=='string'||!n.trim()||n!==n.trim()||n.length>40||/[/\u0000-\u001f\u007f]/.test(n)))throw Error('Use up to four folder names, each 1–40 characters.');
  return v.slice();
 }
 function path(value){return checkGroup(String(value).trim()===''?[]:String(value).split('/').map(x=>x.trim()));}
 function checkFx(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||!kinds.includes(v.kind)||!hex(v.color)||!range(v.blur,0,100)||!range(v.offsetX,-100,100)||!range(v.offsetY,-100,100)||!blends.includes(v.blend))throw Error('Invalid layer appearance.');
  return {kind:v.kind,color:v.color.toLowerCase(),blur:v.blur,offsetX:v.offsetX,offsetY:v.offsetY,blend:v.blend};
 }
 function appearance(l){try{return checkFx(l?.layerFx||initial);}catch{return {...initial};}}
 const eligible=(studio,l)=>studio==='clip'?['text','callout'].includes(l.kind):!['redact','erase-brush','eraser','erase-stroke'].includes(l.type);
 function describe(studio,l){return {id:l.id,name:l.name||(l.type==='text'?String(l.text||'Text').slice(0,40):l.type)||l.kind,
  type:l.type||l.kind,group:l.layerGroup?checkGroup(l.layerGroup):[],track:l.track,start:l.start,end:l.end,visible:l.visible!==false,locked:!!l.locked,
  opacity:l.opacity??1,fx:appearance(l),eligible:eligible(studio,l),fadeIn:l.fadeIn??0,fadeOut:l.fadeOut??0,outline:l.outline||'#000000',outlineWidth:l.outlineWidth??0};}
 function effects(studio,layer,args){
  if(!eligible(studio,layer))throw Error('Redaction and eraser layers cannot receive appearance effects.');
  const next={...layer};
  if(Object.hasOwn(args,'opacity')){if(!range(args.opacity,0,1))throw Error('Opacity must be 0–100%.');next.opacity=args.opacity;}
  if(Object.hasOwn(args,'fx'))next.layerFx=checkFx(args.fx);
  if(Object.hasOwn(args,'fade')){
   if(studio!=='clip'||!range(args.fade?.in,0,10)||!range(args.fade?.out,0,10))throw Error('Invalid graphic fades.');
   if(args.fade.in+args.fade.out>layer.end-layer.start+.001)throw Error('Fade durations exceed the duration of at least one selected graphic.');
   next.fadeIn=args.fade.in;next.fadeOut=args.fade.out;
  }
  if(Object.hasOwn(args,'outline')){
   if(studio!=='clip'||!hex(args.outline?.color)||!range(args.outline?.width,0,16))throw Error('Invalid graphic outline.');
   if(layer.premium&&args.outline.width!==0)throw Error('Premium material outlines are authored by the material preset. Use the shared shadow/glow instead.');
   next.outline=args.outline.color;next.outlineWidth=args.outline.width;
  }
  return next;
 }
 function plan(studio,layers,ids,command,args={},makeId){
  if(!['image','clip'].includes(studio)||!Array.isArray(layers)||!Array.isArray(ids))throw Error('Invalid layer request.');
  const set=new Set(ids),selected=layers.filter(l=>set.has(l.id));
  if(!selected.length||selected.length!==set.size)throw Error('Selection is empty or stale.');
  const edit=command!=='lock'&&command!=='visibility';
  if(edit&&selected.some(l=>l.locked))throw Error('Unlock all selected layers before this operation.');
  let next=layers.slice(),selection=selected.map(l=>l.id);
  const map=fn=>{next=layers.map(l=>set.has(l.id)?fn(l):l);};
  if(command==='group'){const p=checkGroup(args.path);map(l=>({...l,layerGroup:p.slice()}));}
  else if(command==='ungroup'){map(l=>({...l,layerGroup:(l.layerGroup||[]).slice(0,-1)}));}
  else if(command==='rename'){
   const n=String(args.name||'').trim();if(!n||n.length>80||/[\u0000-\u001f\u007f]/.test(n))throw Error('Enter a valid name (1–80 characters).');
   let index=0;map(l=>({...l,name:selected.length===1?n:n+' '+(++index)}));
  }else if(command==='lock'||command==='visibility'){
   if(typeof args.value!=='boolean')throw Error('Invalid layer toggle.');map(l=>({...l,[command==='lock'?'locked':'visible']:args.value}));
  }else if(command==='effects'){if(!Object.keys(args).length)throw Error('Enable at least one appearance change.');map(l=>effects(studio,l,args));}
  else if(command==='delete'){next=layers.filter(l=>!set.has(l.id));selection=[];}
  else if(command==='duplicate'){
   if(studio==='clip'&&layers.length+selected.length>200)throw Error('The project supports at most 200 graphics.');
   if(studio==='image'&&selected.some(l=>l.type==='erase-stroke'))throw Error('Whole-stroke erasers cannot be duplicated.');
   if(typeof makeId!=='function')throw Error('Missing layer identity generator.');
   const used=new Set(layers.map(l=>l.id)),premiumGroups=new Map(),duplicates=[];
   for(const l of selected){const n=copy(l);n.id=makeId();if(typeof n.id!=='string'||!n.id||n.id.length>120||used.has(n.id))throw Error('Duplicate layer identity.');used.add(n.id);
    n.name=(String(l.name||l.type||l.kind).slice(0,90)+' copy');n.locked=false;
    if(studio==='image')n.points=(n.points||[]).map(p=>({...p,x:p.x+20,y:p.y+20}));
    if(studio==='clip'&&n.premium?.groupId){const old=n.premium.groupId;if(!premiumGroups.has(old))premiumGroups.set(old,'premium-'+n.id);n.premium.groupId=premiumGroups.get(old);}
    duplicates.push(n);
   }
   next=[...layers,...duplicates];selection=duplicates.map(l=>l.id);
  }else if(command==='track'){
   if(studio!=='clip'||![2,3].includes(args.track))throw Error('Select a valid graphic track.');map(l=>({...l,track:args.track}));
  }else if(command==='stack'){
   if(!['front','back'].includes(args.direction))throw Error('Invalid stacking direction.');
   const order=items=>{const a=items.filter(l=>set.has(l.id)),b=items.filter(l=>!set.has(l.id));return args.direction==='front'?[...b,...a]:[...a,...b];};
   if(studio==='image')next=order(layers);
   else{const tracks=new Map([2,3].map(t=>[t,order(layers.filter(l=>l.track===t))]));next=layers.map(l=>tracks.get(l.track).shift());}
  }else throw Error('Unknown layer operation.');
  return {layers:next,selection,changed:!eq(layers,next)};
 }
 const scratch=new WeakMap();
 function composite(ctx,layer,w,h,paint){
  const fx=appearance(layer);
  if(fx.kind==='none'&&fx.blend==='source-over'){paint(ctx);return;}
  let c=scratch.get(ctx);
  if(!c){c=root.document?.createElement('canvas')||(typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(w,h):null);if(!c)throw Error('Layer effect canvas unavailable.');scratch.set(ctx,c);}
  if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
  const p=c.getContext('2d');if(!p)throw Error('Layer effect context unavailable.');
  p.save();try{p.setTransform(1,0,0,1,0,0);p.globalAlpha=1;p.globalCompositeOperation='source-over';p.clearRect(0,0,w,h);paint(p);}finally{p.restore();}
  const scale=h/1080;ctx.save();
  try{ctx.globalCompositeOperation=fx.blend;ctx.globalAlpha=1;
   if(fx.kind!=='none'){ctx.shadowColor=fx.color;ctx.shadowBlur=fx.blur*scale;ctx.shadowOffsetX=fx.kind==='glow'?0:fx.offsetX*scale;ctx.shadowOffsetY=fx.kind==='glow'?0:fx.offsetY*scale;}
   ctx.drawImage(c,0,0);
  }finally{ctx.restore();}
 }
 const api=Object.freeze({kinds,blends,presets,checkGroup,path,checkFx,appearance,eligible,describe,plan,composite});
 root.MangoLayerStudioV0712=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
