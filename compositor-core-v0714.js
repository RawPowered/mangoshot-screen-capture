/* Local, bounded compositing: ordered Canvas2D filters and normalized layer keyframes. */
(function(root){'use strict';
 const MAX_STACK=8,MAX_KEYS=32,MAX_PIXELS=33000000;
 const specs=Object.freeze({
  exposure:{label:'Exposure (stops)',min:-2,max:2,step:.05,initial:0,fn:v=>'brightness('+Math.pow(2,v).toFixed(5)+')'},
  contrast:{label:'Contrast',min:.25,max:2,step:.05,initial:1,fn:v=>'contrast('+v+')'},
  saturation:{label:'Saturation',min:0,max:2,step:.05,initial:1,fn:v=>'saturate('+v+')'},
  temperature:{label:'Sepia / warmth',min:0,max:1,step:.05,initial:0,fn:v=>'sepia('+v+')'},
  hue:{label:'Hue shift (degrees)',min:-180,max:180,step:1,initial:0,fn:v=>'hue-rotate('+v+'deg)'},
  monochrome:{label:'Monochrome',min:0,max:1,step:.05,initial:0,fn:v=>'grayscale('+v+')'},
  blur:{label:'Soft focus (px at 1080p)',min:0,max:30,step:.5,initial:0,fn:(v,s)=>'blur('+(v*s).toFixed(3)+'px)'},
  invert:{label:'Invert',min:0,max:1,step:.05,initial:0,fn:v=>'invert('+v+')'}
 });
 const effects=Object.freeze(Object.keys(specs));
 const item=(kind,value)=>({kind,value,enabled:true});
 const presets=Object.freeze([
  ['clean','Clean',[]],
  ['cinema','Cinema contrast',[item('contrast',1.2),item('saturation',.78)]],
  ['silver','Silver monochrome',[item('monochrome',1),item('contrast',1.22)]],
  ['warm','Golden hour',[item('temperature',.38),item('exposure',.15),item('saturation',1.16)]],
  ['editorial','Muted editorial',[item('saturation',.55),item('contrast',1.12),item('temperature',.12)]],
  ['cool','Cool cast',[item('temperature',.16),item('hue',-24),item('saturation',.85)]],
  ['bright','Clean bright',[item('exposure',.35),item('contrast',1.05)]],
  ['night','Nocturne',[item('exposure',-.55),item('contrast',1.2),item('saturation',.7)]],
  ['soft','Soft focus',[item('blur',3),item('contrast',.93)]],
  ['vivid','Vivid color',[item('saturation',1.45),item('contrast',1.12)]]
 ].map(([id,name,stack])=>Object.freeze({id,name,stack:Object.freeze(stack.map(Object.freeze))})));
 const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
 const copy=x=>JSON.parse(JSON.stringify(x));
 function checkStack(stack){
  if(!Array.isArray(stack)||stack.length>MAX_STACK)throw Error('Use at most '+MAX_STACK+' ordered effects.');
  return stack.map(x=>{const spec=x&&Object.hasOwn(specs,x.kind)?specs[x.kind]:null;
   if(!spec||!finite(x.value,spec.min,spec.max)||typeof x.enabled!=='boolean')throw Error('Invalid effect stack item.');
   return {kind:x.kind,value:x.value,enabled:x.enabled};});
 }
 const active=stack=>Array.isArray(stack)&&stack.some(x=>x.enabled&&specs[x.kind]&&x.value!==specs[x.kind].initial);
 function filter(stack,scale=1){return checkStack(stack).filter(x=>x.enabled&&x.value!==specs[x.kind].initial).map(x=>specs[x.kind].fn(x.value,scale)).join(' ')||'none';}
 const easing=['linear','easeIn','easeOut','easeInOut','hold'];
 const neutral=()=>({t:0,x:0,y:0,scale:1,rotation:0,opacity:1,ease:'linear'});
 function checkKeys(keys){
  if(!Array.isArray(keys)||keys.length>MAX_KEYS)throw Error('Use at most '+MAX_KEYS+' keyframes.');
  const sorted=keys.map(k=>{
   if(!k||!finite(k.t,0,1)||!finite(k.x,-1,1)||!finite(k.y,-1,1)||!finite(k.scale,.1,4)||!finite(k.rotation,-720,720)||!finite(k.opacity,0,1)||!easing.includes(k.ease))throw Error('Invalid keyframe: check time, position, scale, rotation and opacity.');
   return {t:k.t,x:k.x,y:k.y,scale:k.scale,rotation:k.rotation,opacity:k.opacity,ease:k.ease};
  }).sort((a,b)=>a.t-b.t);
  if(sorted.some((k,i)=>i&&k.t-sorted[i-1].t<.000001))throw Error('Keyframe positions must be unique.');
  return sorted;
 }
 function ease(p,name){p=Math.max(0,Math.min(1,p));if(name==='hold')return p===1?1:0;if(name==='easeIn')return p*p;if(name==='easeOut')return 1-(1-p)**2;if(name==='easeInOut')return p*p*(3-2*p);return p;}
 function pose(keys,t){
  if(!keys?.length)return neutral();
  const a=keys[0],z=keys.at(-1);if(t<=a.t)return {...a};if(t>=z.t)return {...z};
  for(let i=1;i<keys.length;i++){const b=keys[i],a=keys[i-1];if(t<=b.t){const p=ease((t-a.t)/(b.t-a.t),a.ease),out={t,ease:a.ease};for(const k of ['x','y','scale','rotation','opacity'])out[k]=a[k]+(b[k]-a[k])*p;return out;}}
  return {...z};
 }
 function at(layer,seconds){return pose(layer.keyframes||[],Math.max(0,Math.min(1,(seconds-layer.start)/Math.max(.001,layer.end-layer.start))));}
 function transform(ctx,p,box,w,h){
  const x=box.x+box.w/2,y=box.y+box.h/2;
  ctx.translate(x+p.x*w,y+p.y*h);ctx.rotate(p.rotation*Math.PI/180);ctx.scale(p.scale,p.scale);ctx.translate(-x,-y);
 }
 function box(r,p,w,h){
  const angle=p.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),nw=(r.w*c+r.h*s)*p.scale,nh=(r.w*s+r.h*c)*p.scale;
  return {x:r.x+r.w/2+p.x*w-nw/2,y:r.y+r.h/2+p.y*h-nh/2,w:nw,h:nh};
 }
 let supported;
 function supports(){
  if(supported!==undefined)return supported;
  if(!root.document)return false;
  try{const c=root.document.createElement('canvas'),a=root.document.createElement('canvas');c.width=c.height=a.width=a.height=2;
   const ctx=c.getContext('2d',{willReadFrequently:true}),p=a.getContext('2d');p.fillStyle='#ff0000';p.fillRect(0,0,2,2);
   ctx.filter='grayscale(1)';ctx.drawImage(a,0,0);const [r,g,b]=ctx.getImageData(0,0,1,1).data;supported=Math.abs(r-g)<3&&Math.abs(g-b)<3&&r>10&&r<245;c.width=a.width=0;
  }catch{supported=false;}return supported;
 }
 function requireSupport(stack){checkStack(stack);if(active(stack)&&!supports())throw Error('This browser cannot render Canvas2D filters reliably. Remove or disable the stack, or use a supported browser.');}
 const buffers=new WeakMap();
 function scratch(ctx){
  const w=ctx.canvas.width,h=ctx.canvas.height;if(!w||!h||w*h>MAX_PIXELS)throw Error('Compositor canvas exceeds the raster budget.');
  let c=buffers.get(ctx);if(!c){c=root.document.createElement('canvas');buffers.set(ctx,c);}if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
  const p=c.getContext('2d');if(!p)throw Error('Compositor buffer unavailable.');
  p.setTransform(1,0,0,1,0,0);p.globalAlpha=1;p.globalCompositeOperation='source-over';p.filter='none';p.clearRect(0,0,w,h);return {c,p,w,h};
 }
 // Whole-layer filter: draw the editable layer into a transparent buffer first.
 // Existing outer shadow/blend stays on the destination context.
 function paintStack(ctx,stack,draw,scale=1){
  if(!active(stack)){draw(ctx);return;}
  requireSupport(stack);const {c,p}=scratch(ctx);p.save();
  try{p.setTransform(ctx.getTransform());draw(p);}finally{p.restore();}
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.filter=filter(stack,scale);ctx.drawImage(c,0,0);}finally{ctx.restore();}
 }
 // Grade the source/composited cut BEFORE cursor and graphics are drawn.
 function gradeFrame(ctx,stack){
  if(!active(stack))return;
  requireSupport(stack);const {c,p,w,h}=scratch(ctx);p.drawImage(ctx.canvas,0,0);
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.filter=filter(stack,h/1080);ctx.drawImage(c,0,0);}finally{ctx.restore();}
 }
 function requireProject(layers,grade=[]){requireSupport(grade);for(const l of layers||[]){if(l.effectStack!=null)requireSupport(l.effectStack);if(l.keyframes!=null)checkKeys(l.keyframes);}}
 const api=Object.freeze({MAX_STACK,MAX_KEYS,specs,effects,presets,copy,checkStack,active,filter,easing,neutral,checkKeys,pose,at,transform,box,supports,requireSupport,paintStack,gradeFrame,requireProject});
 root.MangoCompositorV0714=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
