/* MangoShot v0.7 Patch B: declarative tool options and validated UI preferences.
 * Pure descriptors. Editing source controls remain the authoritative state. */
(function(root){'use strict';
 const units=Object.freeze({
  size:'px','image-layer-x':'px','image-layer-y':'px','image-layer-width':'px','image-layer-height':'px',
  'image-layer-opacity':'%','image-layer-rotation-v0715':'°','image-tool-opacity':'%','image-eraser-hardness':'%','image-mask-brush':'px',
  'image-mask-feather':'px','image-shape-radius':'px','text-font-size':'px','graphic-size':'px',
  'graphic-x':'%','graphic-y':'%','graphic-width':'%','graphic-opacity':'%','graphic-in':'s','graphic-out':'s',
  in:'s',out:'s','timeline-zoom':'×'
 });
 const field=(id,label)=>Object.freeze({id,label,unit:units[id]||''});
 const formatValue=(id,value)=>String(value)+(units[id]||'');
 const image={
  select:[field('tool','Tool')],marquee:[field('tool','Selection')],
  pen:[field('tool','Tool'),field('color','Color'),field('size','Width'),field('image-tool-opacity','Opacity')],
  highlighter:[field('tool','Tool'),field('color','Color'),field('size','Width'),field('image-tool-opacity','Opacity')],
  'erase-brush':[field('tool','Tool'),field('size','Diameter'),field('image-eraser-hardness','Hardness'),field('image-tool-opacity','Opacity')],
  'erase-stroke':[field('tool','Tool'),field('size','Diameter')],
  text:[field('tool','Tool'),field('text-font-size','Size'),field('text-font-family','Font'),field('text-fill-color','Color')],
  'mask-erase':[field('tool','Tool'),field('image-mask-brush','Brush'),field('image-mask-feather','Feather')],
  'mask-restore':[field('tool','Tool'),field('image-mask-brush','Brush'),field('image-mask-feather','Feather')],
  shape:[field('tool','Shape'),field('color','Outline'),field('size','Width'),field('image-shape-fill-enabled','Fill'),
   field('image-shape-fill','Fill color'),field('image-shape-line-style','Stroke')]
 };
 const shapeNames=new Set(['arrow','rectangle','rounded-rectangle','ellipse','line','triangle','diamond',
  'pentagon','hexagon','star','speech-bubble']);
 const clip={
  timeline:[field('timeline-zoom','Timeline zoom'),field('performance-profile','Performance')],
  graphic:[field('graphic-font','Font'),field('graphic-size','Size'),field('graphic-color','Color'),
   field('graphic-opacity','Opacity'),field('graphic-x','X'),field('graphic-y','Y'),field('graphic-width','Width')],
 };
 const bounds={side:[260,520],bottom:[180,440]};
 const defaultLayout=()=>({tools:true,properties:true,dock:'right',side:310,bottom:260,media:true});
 const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 function validateLayout(input){
  const d=defaultLayout(),v=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  return {tools:typeof v.tools==='boolean'?v.tools:d.tools,
   properties:typeof v.properties==='boolean'?v.properties:d.properties,
   media:typeof v.media==='boolean'?v.media:d.media,
   dock:v.dock==='bottom'?'bottom':'right',
   side:clamp(v.side,...bounds.side,d.side),
   bottom:clamp(v.bottom,...bounds.bottom,d.bottom)};
 }
 const presets={
  image:{balanced:{tools:true,properties:true,dock:'right'},
   canvas:{tools:false,properties:false,dock:'right'},
   typography:{tools:true,properties:true,dock:'bottom'}},
  clip:{balanced:{tools:true,properties:true,dock:'right',media:true},
   preview:{tools:false,properties:false,dock:'right',media:false},
   graphics:{tools:true,properties:true,dock:'bottom',media:true}}
 };
 function applyPreset(current,studio,name){
  const preset=presets[studio]?.[name];
  return preset?validateLayout({...current,...preset}):validateLayout(current);
 }
 function fieldsFor(studio,tool,selectedGraphic=false,selectedType=''){
  if(studio==='clip')return selectedGraphic?[...(selectedType==='shape'?clip.graphic.filter(v=>!['graphic-font','graphic-size','graphic-color'].includes(v.id)):clip.graphic),...clip.timeline]:clip.timeline.slice();
  if(tool==='select'){
   const base=image.select.slice();
   const type=String(selectedType).toUpperCase();
   if(type==='TEXT LAYER')base.push(field('text-font-size','Size'),field('text-font-family','Font'),field('text-fill-color','Color'));
   if(['IMAGE LAYER','TEXT LAYER','ANNOTATION','VECTOR LAYER'].includes(type))
    base.push(field('image-layer-opacity','Opacity'),field('image-layer-rotation-v0715','Rotation'),field('image-layer-x','X'),field('image-layer-y','Y'));
   if(['IMAGE LAYER','VECTOR LAYER','ANNOTATION'].includes(type))base.push(field('image-layer-width','W'),field('image-layer-height','H'));
   return base;
  }
  if(shapeNames.has(tool)){
   const fields=image.shape.slice();
   if(tool==='rounded-rectangle')fields.push(field('image-shape-radius','Radius'));
   if(tool==='star')fields.push(field('image-shape-points','Points'));
   if(tool==='arrow')fields.push(field('image-shape-heads','Heads'));
   return fields;
  }
  return (image[tool]||[field('tool','Tool')]).slice();
 }
 root.MangoControlCoreV070={image,clip,presets,defaultLayout,validateLayout,applyPreset,fieldsFor,units,formatValue};
})(typeof globalThis!=='undefined'?globalThis:this);
