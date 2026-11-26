/* Native image project v1. Strict local JSON envelope with embedded PNG assets.
 * No URLs, arbitrary executable content, history, credentials or remote resources. */
(function(root){'use strict';
 const MAX_FILE=96*1024*1024,MAX_PIXELS=16000000,MAX_TOTAL_PIXELS=32000000,MAX_LAYERS=500,MAX_POINTS=250000;
 const types=new Set(['image','text','shape','rectangle','arrow','pen','highlighter','redact','erase-brush','eraser']);
 const shapes=new Set(['rectangle','rounded-rectangle','ellipse','line','arrow','triangle','diamond','pentagon','hexagon','star','speech-bubble']);
 const own=(o,k)=>Object.hasOwn(o,k),obj=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
 const fail=m=>{throw Error(m);};
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 const integer=(v,a,b)=>Number.isInteger(v)&&finite(v,a,b);
 const text=(v,n)=>typeof v==='string'&&v.length<=n;
 const id=v=>text(v,180)&&v.length>0&&!/[\u0000-\u001f\u007f]/.test(v);
 const rgb=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
 function dimensions(w,h,limit=MAX_PIXELS){if(!integer(w,1,16384)||!integer(h,1,30000)||w*h>limit)fail('Image dimensions exceed project budget.');}
 function keys(o,allowed){if(!obj(o)||Object.keys(o).some(k=>!allowed.includes(k)))fail('Unsupported or invalid project fields.');}
 function binaryLength(s){if(typeof s!=='string'||s.length===0||s.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))fail('Invalid embedded base64.');return s.length/4*3-(s.endsWith('==')?2:s.endsWith('=')?1:0);}
 function pngHeader(s,w,h){dimensions(w,h);if(typeof s!=='string'||s.length>MAX_FILE||!s.startsWith('data:image/png;base64,'))fail('Only embedded PNG source data is supported.');
  const b64=s.slice(22);binaryLength(b64);if(b64.length<44)fail('PNG header is missing.');
  const a=atob(b64.slice(0,44));if(a.slice(0,8)!=='\x89PNG\r\n\x1a\n'||a.slice(12,16)!=='IHDR'||a.slice(8,12)!=='\x00\x00\x00\r')fail('Invalid PNG header.');
  const u32=i=>a.charCodeAt(i)*16777216+a.charCodeAt(i+1)*65536+a.charCodeAt(i+2)*256+a.charCodeAt(i+3);
  if(u32(16)!==w||u32(20)!==h)fail('PNG dimensions do not match project metadata.');return s;
 }
 function encode(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out);}
 function decode(s){const raw=atob(s),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a;}
 const common=['type','id','name','points','visible','locked','opacity','size','color','text','rotation','layerGroup','layerFx','effectStack','material','kind','vector','fontSize','fontFamily','fontWeight','scaleX','scaleY','styleId','effects','assetId','width','height','mask','cutoutKey','hardness','usePressure'];
 function points(a,unit,budget){if(!Array.isArray(a)||!a.length||a.length>32000)fail('Invalid layer points.');budget.n+=a.length;if(budget.n>MAX_POINTS)fail('Project point budget exceeded.');return a.map(p=>{keys(p,['x','y','p']);if(!finite(p.x,unit?0:-1000000,unit?1:1000000)||!finite(p.y,unit?0:-1000000,unit?1:1000000)||own(p,'p')&&!finite(p.p,0,1))fail('Invalid point coordinate.');return {...p};});}
 const checkOptional=(l,k,fn)=>{if(own(l,k)&&!fn(l[k]))fail('Invalid layer '+k+'.');};
 function layer(l,budget,cores){
  keys(l,common);if(!types.has(l.type)||!id(l.id))fail('Unsupported layer type or identity.');
  const n={...l,points:points(l.points,false,budget)};
  for(const k of ['name','text'])checkOptional(l,k,v=>text(v,k==='name'?200:1000));
  for(const k of ['visible','locked','usePressure'])checkOptional(l,k,v=>typeof v==='boolean');
  for(const k of ['opacity','hardness'])checkOptional(l,k,v=>finite(v,0,1));
  checkOptional(l,'size',v=>finite(v,0,100000));checkOptional(l,'color',rgb);checkOptional(l,'rotation',v=>finite(v,-180,180));
  if(l.layerGroup!=null)n.layerGroup=cores.layer.checkGroup(l.layerGroup);
  if(l.layerFx!=null)n.layerFx=cores.layer.checkFx(l.layerFx);
  if(l.effectStack!=null)n.effectStack=cores.compositor.checkStack(l.effectStack);
  if(l.material!=null)n.material=cores.material.checkMaterial(l.material);
  if(['redact','erase-brush','eraser'].includes(l.type)&&(n.material?.kind&&n.material.kind!=='none'||n.effectStack?.length||n.layerFx?.kind&&n.layerFx.kind!=='none'))fail('Protected layers cannot contain appearance effects.');
  if(l.type==='shape'&&!shapes.has(l.kind))fail('Unsupported shape.');
  if(l.vector!=null){keys(l.vector,['stroke','strokeWidth','fill','fillEnabled','lineStyle','opacity','cornerRadius','starPoints','starInner','arrowHead']);
   for(const k of ['stroke','fill'])checkOptional(l.vector,k,rgb);
   checkOptional(l.vector,'fillEnabled',v=>typeof v==='boolean');checkOptional(l.vector,'lineStyle',v=>['solid','dashed','dotted'].includes(v));
   checkOptional(l.vector,'arrowHead',v=>['none','start','end','both'].includes(v));
   for(const [k,a,b] of [['strokeWidth',.5,64],['opacity',0,1],['cornerRadius',0,200],['starPoints',4,12],['starInner',.1,.85]])checkOptional(l.vector,k,v=>finite(v,a,b));
  }
  if(l.type==='text'){if(!text(l.text,1000)||!l.text.trim())fail('Invalid text layer.');
   checkOptional(l,'fontSize',v=>finite(v,.1,10000));for(const k of ['scaleX','scaleY'])checkOptional(l,k,v=>finite(v,.08,25));
   checkOptional(l,'fontFamily',v=>text(v,80)&&/^[a-zA-Z0-9_-]+$/.test(v));checkOptional(l,'fontWeight',v=>['100','200','300','400','500','600','700','800','900'].includes(String(v)));
   checkOptional(l,'styleId',v=>['plain','title','label','callout'].includes(v));
   if(l.effects!=null){const defaults=cores.text.initial();keys(l.effects,Object.keys(defaults));for(const [k,v] of Object.entries(l.effects)){keys(v,Object.keys(defaults[k]));for(const [f,val] of Object.entries(v)){const d=defaults[k][f];if(typeof d==='boolean'?typeof val!=='boolean':typeof d==='number'?!finite(val,-360,360):!rgb(val))fail('Invalid text effect.');}}n.effects=cores.text.merged(l.effects);}
  }else if(l.effects!=null)fail('Text effects require a text layer.');
  if(l.type==='image'){
   if(!id(l.assetId)||!finite(l.width,1,100000)||!finite(l.height,1,100000))fail('Invalid image layer reference or geometry.');
   if(l.cutoutKey!=null&&!id(l.cutoutKey))fail('Invalid matte reference.');
   if(l.mask!=null){keys(l.mask,['paths','feather']);if(!Array.isArray(l.mask.paths)||l.mask.paths.length>2000||!finite(l.mask.feather,0,20))fail('Invalid mask.');
    n.mask={feather:l.mask.feather,paths:l.mask.paths.map(p=>{keys(p,['mode','radius','points']);if(!['erase','restore'].includes(p.mode)||!finite(p.radius,.001,.5))fail('Invalid mask path.');return {...p,points:points(p.points,true,budget)};})};
   }
  }else if(l.assetId!=null||l.mask!=null||l.cutoutKey!=null)fail('Only image layers may reference assets or masks.');
  return n;
 }
 function check(p,cores){
  keys(p,['format','version','name','width','height','base','layers','assets','mattes']);
  if(p.format!=='MangoShotImage'||p.version!==1||!text(p.name,120)||!p.name.trim())fail('Unsupported image project format or version.');
  dimensions(p.width,p.height);pngHeader(p.base,p.width,p.height);
  if(!Array.isArray(p.layers)||p.layers.length>MAX_LAYERS||!Array.isArray(p.assets)||p.assets.length>128||!Array.isArray(p.mattes)||p.mattes.length>128)fail('Project layer or asset limit exceeded.');
  const budget={n:0},layers=p.layers.map(l=>layer(l,budget,cores)),ids=new Set(),assets=new Map(),mattes=new Map();let total=p.width*p.height,encoded=p.base.length;
  for(const l of layers){if(ids.has(l.id))fail('Duplicate layer ID.');ids.add(l.id);}
  for(const a of p.assets){keys(a,['id','name','width','height','png']);if(!id(a.id)||assets.has(a.id)||!text(a.name,120)||a.width>8192||a.height>8192)fail('Invalid asset ID or dimensions.');
   dimensions(a.width,a.height);total+=a.width*a.height;if(total>MAX_TOTAL_PIXELS)fail('Decoded project pixel budget exceeded.');pngHeader(a.png,a.width,a.height);encoded+=a.png.length;assets.set(a.id,a);}
  for(const m of p.mattes){keys(m,['id','width','height','alpha']);if(!id(m.id)||mattes.has(m.id)||!integer(m.width,1,900)||!integer(m.height,1,900)||binaryLength(m.alpha)!==m.width*m.height)fail('Invalid embedded matte.');encoded+=m.alpha.length;total+=m.width*m.height;if(total>MAX_TOTAL_PIXELS)fail('Decoded project pixel budget exceeded.');mattes.set(m.id,m);}
  if(encoded>MAX_FILE)fail('Embedded project data exceeds file budget.');
  const used=new Set(),usedMattes=new Set();for(const l of layers)if(l.type==='image'){if(!assets.has(l.assetId))fail('Missing image asset.');used.add(l.assetId);if(l.cutoutKey){if(!mattes.has(l.cutoutKey))fail('Missing cutout matte.');usedMattes.add(l.cutoutKey);}}
  if(used.size!==assets.size||usedMattes.size!==mattes.size)fail('Unreferenced project assets are not permitted.');
  cores.compositor.requireProject(layers,[],p.width,p.height);
  return {...p,layers,assets:[...assets.values()],mattes:[...mattes.values()]};
 }
 const api=Object.freeze({MAX_FILE,MAX_PIXELS,MAX_TOTAL_PIXELS,MAX_LAYERS,MAX_POINTS,dimensions,pngHeader,encode,decode,check});
 root.MangoImageDocumentCoreV0723=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
