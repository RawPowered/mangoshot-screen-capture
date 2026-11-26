/* MangoShot v0.6.18 - serializable layer clipboard, transforms and appearance.
 * Native screenshot and imported asset registries are deliberately excluded.
 * This module never reads/writes the OS clipboard.
 */
(function(root){'use strict';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):min));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const presets={
  none:{kind:'none',color:'#000000',blur:0,offsetX:0,offsetY:0,blend:'source-over'},
  shadow:{kind:'shadow',color:'#000000',blur:16,offsetX:5,offsetY:8,blend:'source-over'},
  glow:{kind:'glow',color:'#adf76a',blur:22,offsetX:0,offsetY:0,blend:'source-over'},
  floating:{kind:'shadow',color:'#061511',blur:29,offsetX:8,offsetY:13,blend:'source-over'},
  crisp:{kind:'shadow',color:'#0d271b',blur:2,offsetX:3,offsetY:3,blend:'source-over'}
 };
 const blends=['source-over','multiply','screen','overlay','darken','lighten'];
 const color=(value,fallback)=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value)?value:fallback;
 const mayStyle=s=>!!s&&s.type!=='redact'&&s.type!=='erase-brush'&&s.type!=='eraser'&&s.type!=='erase-stroke';
 const mayCopy=s=>!!s&&s.type!=='erase-stroke'; // Keep editable eraser layers but never missing screenshot assets.
 function style(stroke){
  const src=stroke?.layerFx||{},base=presets.none;
  return {kind:['none','shadow','glow'].includes(src.kind)?src.kind:base.kind,
   color:color(src.color,base.color),blur:clamp(src.blur??0,0,100),
   offsetX:clamp(src.offsetX??0,-100,100),offsetY:clamp(src.offsetY??0,-100,100),
   blend:blends.includes(src.blend)?src.blend:'source-over'};
 }
 function preset(name){return copy(presets[name]||presets.none);}
 function apply(ctx,stroke,draw){
  if(!mayStyle(stroke)){draw();return;}
  const fx=style(stroke);
  if(fx.kind==='none'&&fx.blend==='source-over'){draw();return;}
  ctx.save();
  if(fx.kind!=='none'){
   ctx.shadowColor=fx.color;ctx.shadowBlur=fx.blur;
   ctx.shadowOffsetX=fx.kind==='glow'?0:fx.offsetX;
   ctx.shadowOffsetY=fx.kind==='glow'?0:fx.offsetY;
  }
  ctx.globalCompositeOperation=fx.blend;
  try{draw();}finally{ctx.restore();}
 }
 function translate(stroke,dx,dy){
  const s=copy(stroke);
  if(Array.isArray(s.points))s.points=s.points.map(p=>({...p,x:p.x+dx,y:p.y+dy}));
  return s;
 }
 function bounds(stroke,layerCore,typeCore,pen){
  if(!stroke)return null;
  if(stroke.type==='image')return layerCore?.bounds?.(stroke)||null;
  if(stroke.type==='text')return typeCore?.bounds?.(pen,stroke)||null;
  const pts=stroke.points||[];if(!pts.length)return null;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  const d=stroke.brush&&root.MangoBrushV0725?root.MangoBrushV0725.pad(stroke):Math.max(1,Number(stroke.size)||1)/2;
  return{x:x-d,y:y-d,width:w+2*d,height:h+2*d};
 }
 function hit(stroke,x,y,penInput,vectorCore,layerCore,typeCore,pen){
  if(!stroke||stroke.visible===false)return false;
  const R=root.MangoTransformMaterialV0715;if(R?.rotation(stroke)){const b=vectorCore?.isVector?.(stroke)?vectorCore.bounds(stroke):bounds(stroke,layerCore,typeCore,pen),p=R.local({x,y},b,R.rotation(stroke));x=p.x;y=p.y;}
  if(stroke.type==='image')return !!layerCore?.hit?.(stroke,x,y,0);
  if(stroke.type==='text')return !!typeCore?.hit?.(pen,stroke,x,y,8);
  if(vectorCore?.isVector?.(stroke))return !!vectorCore.hit(stroke,x,y,8);
  if(['pen','highlighter','erase-brush','eraser'].includes(stroke.type))
   return !!penInput?.lineHit?.(stroke,{x,y},Math.max(5,(stroke.size||4)/2));
  if(stroke.type==='redact'){
   const b=bounds(stroke);
   return !!b&&x>=b.x&&y>=b.y&&x<=b.x+b.width&&y<=b.y+b.height;
  }
  return false;
 }
 function cloneLayer(stroke,offset=0){
  if(!mayCopy(stroke))return null;
  const cloned=translate(stroke,offset,offset);
  cloned.id=(stroke.id||'layer')+'-copy-'+Math.random().toString(36).slice(2,10);
  cloned.name=(stroke.name||stroke.type||'Layer')+' copy';
  cloned.locked=false;
  return cloned;
 }
 // Only data owned by this Image Studio session. An image asset ID is not portable
 // to another extension page without its corresponding asset registry.
 function clipboardOf(stroke){return mayCopy(stroke)?copy(stroke):null;}
 root.MangoLayerOpsV0618={clamp,copy,style,preset,presets,mayStyle,mayCopy,apply,translate,bounds,hit,cloneLayer,clipboardOf};
})(typeof globalThis!=='undefined'?globalThis:this);
