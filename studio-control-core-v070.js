/* MangoShot v0.7 Patch B: declarative tool options and validated UI preferences.
 * Pure descriptors. Editing source controls remain the authoritative state. */
(function(root){'use strict';
 const field=(id,label)=>({id,label});
 const image={
  select:[field('tool','Tool'),field('image-layer-opacity','Layer opacity')],
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
   field('graphic-opacity','Opacity')],
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
 function fieldsFor(studio,tool,selectedGraphic=false){
  if(studio==='clip')return selectedGraphic?[...clip.timeline,...clip.graphic]:clip.timeline.slice();
  if(shapeNames.has(tool))return image.shape.slice();
  return (image[tool]||[field('tool','Tool')]).slice();
 }
 root.MangoControlCoreV070={image,clip,presets,defaultLayout,validateLayout,applyPreset,fieldsFor};
})(typeof globalThis!=='undefined'?globalThis:this);
