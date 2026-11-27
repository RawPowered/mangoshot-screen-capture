/* Tool Studio: pure selection geometry and validated local tool preferences. */
(function(root){'use strict';
 const groups=Object.freeze([
  {id:'select',label:'Selection',items:['select','marquee']},
  {id:'draw',label:'Drawing',items:['pen','highlighter']},
  {id:'erase',label:'Erasers',items:['erase-brush','erase-stroke']},
  {id:'shapes',label:'Vector shapes',items:['rectangle','rounded-rectangle','ellipse','line','arrow','triangle','diamond','pentagon','hexagon','star','speech-bubble']},
  {id:'redact',label:'Privacy',items:['redact']},{id:'text',label:'Typography',items:['text']},{id:'mask',label:'Image masks',items:['mask-erase','mask-restore']}
 ].map(g=>Object.freeze({...g,items:Object.freeze(g.items)})));
 const actions=Object.freeze({
  'pin-fonts':{name:'Fonts',icon:'text',target:'ux40-creative-open-v079'},'pin-styles':{name:'Text styles',icon:'text',target:'ux45-shelf-styles'},'pin-shapes':{name:'Shapes',icon:'rectangle',target:'ux42-shapes'},'pin-crop':{name:'Crop frame',icon:'rectangle',target:'pc48-crop'},'pin-layer-styles':{name:'Layer styles',icon:'rectangle',target:'ce-open-v0726'},'pin-fx':{name:'Effects Studio',icon:'settings',target:'ux40-effects-studio-menu-v0712'},'pin-brush':{name:'Brush Studio',icon:'pen',target:'bs-open-v0725'},'pin-pixels':{name:'Pixel selection',icon:'marquee',target:'ps-open-v0728'},'pin-filters':{name:'Raster filters',icon:'settings',target:'rl-open-v0727'},'pin-clone':{name:'Clone Stamp',icon:'pen',target:'ux41-tool-clone'},'pin-dodge':{name:'Dodge',icon:'pen',target:'ux41-tool-dodge'},'pin-burn':{name:'Burn',icon:'pen',target:'ux41-tool-burn'},'pin-fill':{name:'Bucket Fill',icon:'rectangle',target:'ux41-tool-fill'},'pin-gradient':{name:'Gradient',icon:'rectangle',target:'ux41-tool-gradient'}
 });
 const actionGroup=Object.freeze({id:'studios',label:'Creative studios & pixel tools',items:Object.freeze(Object.keys(actions))});
 const clipGroups=Object.freeze([{id:'edit',label:'Timeline editing',items:['tool-select','tool-razor','range-tool']},{id:'graphics',label:'Graphics',items:['add-text','add-callout']},{id:'automation',label:'Assisted editing',items:['autocut-toggle']}].map(g=>Object.freeze({...g,items:Object.freeze(g.items)})));
 const titles={select:'Select / Move',marquee:'Marquee selection',pen:'Pressure pen',highlighter:'Highlighter','erase-brush':'Brush eraser','erase-stroke':'Whole stroke eraser',rectangle:'Rectangle','rounded-rectangle':'Rounded rectangle',ellipse:'Ellipse',line:'Line',arrow:'Arrow',triangle:'Triangle',diamond:'Diamond',pentagon:'Pentagon',hexagon:'Hexagon',star:'Star','speech-bubble':'Speech bubble',redact:'Redact',text:'Text','mask-erase':'Mask erase','mask-restore':'Mask restore','tool-select':'Selection tool','tool-razor':'Razor tool','range-tool':'Range selection','add-text':'Add title','add-callout':'Add callout','autocut-toggle':'AutoCut'};
 const icons={'tool-select':'select','tool-razor':'razor','range-tool':'range','add-text':'text','add-callout':'callout','autocut-toggle':'autocut'};
 for(const [id,a] of Object.entries(actions)){titles[id]=a.name;icons[id]=a.icon;}
 const valid=(g,id)=>g.items.includes(id);
 function preferences(raw={},studio='image'){
  const gs=studio==='clip'?clipGroups:groups,all=gs.flatMap(g=>g.items).concat(studio==='image'?actionGroup.items:[]);
  const last={};for(const g of gs)last[g.id]=valid(g,raw?.last?.[g.id])?raw.last[g.id]:g.items[0];
  const favorites=Array.isArray(raw?.favorites)?[...new Set(raw.favorites.filter(x=>all.includes(x)))].slice(0,12):[];
  return {last,favorites};
 }
 function bounds(items){
  if(!items.length||items.some(b=>!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<0||b.height<0))return null;
  const x=Math.min(...items.map(b=>b.x)),y=Math.min(...items.map(b=>b.y));
  return {x,y,width:Math.max(...items.map(b=>b.x+b.width))-x,height:Math.max(...items.map(b=>b.y+b.height))-y};
 }
 const intersects=(a,b)=>!!a&&!!b&&a.x<=b.x+b.width&&a.x+a.width>=b.x&&a.y<=b.y+b.height&&a.y+a.height>=b.y;
 const rect=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)});
 function align(items,mode){
  const b=bounds(items.map(i=>i.bounds));if(!b||items.length<2)return [];
  if(mode==='distribute-x'||mode==='distribute-y'){
   if(items.length<3)return [];const axis=mode.endsWith('x')?'x':'y',extent=axis==='x'?'width':'height';
   const sorted=items.slice().sort((a,c)=>a.bounds[axis]-c.bounds[axis]);const first=sorted[0].bounds[axis],last=sorted.at(-1).bounds;
   const total=sorted.reduce((sum,i)=>sum+i.bounds[extent],0),gap=(last[axis]+last[extent]-first-total)/(sorted.length-1);
   if(gap<0)return [];
   let at=first;return sorted.map(i=>{const d=at-i.bounds[axis];at+=i.bounds[extent]+gap;return {id:i.id,dx:axis==='x'?d:0,dy:axis==='y'?d:0};});
  }
  return items.map(i=>{const r=i.bounds;let dx=0,dy=0;
   if(mode==='left')dx=b.x-r.x;else if(mode==='center')dx=b.x+b.width/2-r.x-r.width/2;else if(mode==='right')dx=b.x+b.width-r.x-r.width;
   else if(mode==='top')dy=b.y-r.y;else if(mode==='middle')dy=b.y+b.height/2-r.y-r.height/2;else if(mode==='bottom')dy=b.y+b.height-r.y-r.height;
   else throw Error('Unknown alignment');return {id:i.id,dx,dy};
  });
 }
 function snap(box,dx,dy,targets,w,h,tolerance,guides=null){
  if(!box)return {dx,dy,x:null,y:null};
  const xs=[0,w/2,w,...(guides?.x||[]).filter(Number.isFinite)],ys=[0,h/2,h,...(guides?.y||[]).filter(Number.isFinite)];for(const t of targets){if(!t)continue;xs.push(t.x,t.x+t.width/2,t.x+t.width);ys.push(t.y,t.y+t.height/2,t.y+t.height);}
  function nearest(origins,values,delta){let best=null;for(const o of origins)for(const v of values){const d=v-o-delta;if(Math.abs(d)<=tolerance&&(best===null||Math.abs(d)<Math.abs(best.d)))best={d,v};}return best;}
  const x=nearest([box.x,box.x+box.width/2,box.x+box.width],xs,dx),y=nearest([box.y,box.y+box.height/2,box.y+box.height],ys,dy);
  return {dx:dx+(x?.d||0),dy:dy+(y?.d||0),x:x?.v??null,y:y?.v??null};
 }
 const api=Object.freeze({groups,clipGroups,actions,actionGroup,titles,icons,preferences,bounds,rect,intersects,align,snap});
 root.MangoToolStudioV0711=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
