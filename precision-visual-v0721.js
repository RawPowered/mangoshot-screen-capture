/* MangoShot Precision Visual Controls 0.7.21. Existing host owns all edits. */
(function(root){'use strict';
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const hue=v=>((v%360)+360)%360;
 const hexOK=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 function hsvHex(h,s,v){if(![h,s,v].every(Number.isFinite))throw Error('Invalid color');
  h=hue(h);s=clamp(s,0,1);v=clamp(v,0,1);const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const a=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h/60)];
  return '#'+a.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
 }
 function hexHsv(hex){if(!hexOK(hex))throw Error('Invalid RGB hex');
  const [r,g,b]=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255),v=Math.max(r,g,b),n=Math.min(r,g,b),d=v-n;
  let h=0;if(d){if(v===r)h=60*((g-b)/d%6);else if(v===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}
  return {h:hue(h),s:v===0?0:d/v,v};
 }
 function padPoint(x,y,w,h){if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Invalid pad size');
  return {x:Math.round(clamp(x/w,0,1)*200-100),y:Math.round(clamp(y/h,0,1)*200-100)};
 }
 function mergeDraft(initial,base,fx,mat,defaults){
  const out={...base},prior=initial.fx,n={...(base.fx||prior)};
  if(n.kind!=='none'&&hexOK(fx.color))n.color=fx.color.toLowerCase();
  if(n.kind==='shadow'){n.offsetX=fx.offsetX;n.offsetY=fx.offsetY;}
  if(Object.keys(n).some(k=>n[k]!==prior[k]))out.fx=n;else delete out.fx;
  const old=initial.material||defaults;
  if(Object.keys(mat).some(k=>mat[k]!==old[k]))out.material={...mat};
  return out;
 }
 const core={hsvHex,hexHsv,padPoint,mergeDraft};
 if(typeof module==='object'&&module.exports)module.exports=core;
 const doc=root.document,R=root.MangoTransformMaterialV0715;
 if(!doc||!R)return;
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 function button(label,fn,cls){const b=el('button',cls||'ci-action-v0720',label);b.type='button';b.addEventListener('click',fn);return b;}
 function select(id,items,label){const n=el('select');n.id=id;n.setAttribute('aria-label',label);for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;}
 function number(id,min,max,step,label){const n=el('input','pv-number-v0721');n.id=id;n.type='number';n.min=min;n.max=max;n.step=step;n.setAttribute('aria-label',label);return n;}
 function field(label,input){const l=el('label','pv-field-v0721');l.htmlFor=input.id;l.append(el('span','',label),input);return l;}
 function pointer(node,fn){let id=null;
  function move(e){const r=node.getBoundingClientRect();if(r.width&&r.height)fn(e.clientX-r.left,e.clientY-r.top,r.width,r.height);}
  node.addEventListener('pointerdown',e=>{if(e.button!==0||node.getAttribute('aria-disabled')==='true')return;e.preventDefault();id=e.pointerId;node.setPointerCapture?.(id);move(e);});
  node.addEventListener('pointermove',e=>{if(e.pointerId===id)move(e);});
  for(const k of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(k,e=>{if(e.pointerId===id)id=null;});
 }
 function mount(body,kind,changed){
  const details=el('details','pv-details-v0721');details.id='pv-advanced-v0721';details.append(el('summary','','Advanced appearance · Color, Lighting & Materials'));
  const content=el('div','pv-layout-v0721'),left=el('section','pv-section-v0721'),right=el('section','pv-section-v0721');
  left.append(el('h3','','Color & shadow'));
  let fx=null,mat=null,hsv={h:0,s:0,v:0},updating=false;
  const target=select('pv-target-v0721',[['fx','Shadow / glow'],['primary','Material highlight'],['secondary','Material shade']],'Color target');
  const colors=el('div','pv-colors-v0721'),wheel=el('div','pv-wheel-v0721'),marker=el('span','pv-wheel-marker-v0721'),sv=el('div','pv-sv-v0721'),svMarker=el('span','pv-sv-marker-v0721');
  wheel.append(marker);sv.append(svMarker);wheel.setAttribute('aria-hidden','true');sv.setAttribute('aria-hidden','true');
  colors.append(wheel,sv);
  const hex=el('input','pv-hex-v0721');hex.id='pv-hex-v0721';hex.type='text';hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label','Hex RGB color');
  const swatch=el('input','pv-swatch-v0721');swatch.id='pv-swatch-v0721';swatch.type='color';swatch.setAttribute('aria-label','Native RGB color picker');
  const h=number('pv-hue-v0721',0,359,1,'Hue degrees'),s=number('pv-saturation-v0721',0,100,1,'Saturation percent'),v=number('pv-value-v0721',0,100,1,'Value percent');
  const channels=el('div','pv-three-v0721');channels.append(field('H °',h),field('S %',s),field('V %',v));
  const hexrow=el('div','pv-hex-row-v0721');hexrow.append(swatch,field('Hex',hex));
  const xy=el('div','pv-xy-v0721'),dot=el('span','pv-xy-dot-v0721');xy.id='pv-xy-v0721';xy.append(dot);xy.setAttribute('aria-label','Shadow offset pad, use X and Y fields for keyboard access');xy.setAttribute('role','img');
  const x=number('pv-x-v0721',-100,100,1,'Shadow X offset'),y=number('pv-y-v0721',-100,100,1,'Shadow Y offset');
  const xyfields=el('div','pv-two-v0721');xyfields.append(field('X px',x),field('Y px',y));
  left.append(field('Edit color',target),colors,hexrow,channels,el('h3','','Shadow position'),xy,xyfields,el('small','pv-note-v0721','Color wheel and pad support direct pointer control. Numeric fields provide exact values.'));
  const presets=el('div','pv-presets-v0721');presets.id='pv-presets-v0721';right.append(el('h3','','Material looks'),presets);
  const matKind=select('pv-material-kind-v0721',R.kinds.map(k=>[k,k[0].toUpperCase()+k.slice(1)]),'Material kind');
  const matStrength=number('pv-strength-v0721',0,100,1,'Material intensity'),matDepth=number('pv-depth-v0721',0,16,.5,'Material edge depth'),matAngle=number('pv-angle-v0721',-360,360,1,'Lighting angle');
  const matFields=el('div','pv-three-v0721');matFields.append(field('Strength %',matStrength),field('Depth px',matDepth),field('Angle °',matAngle));
  const gradient=el('div','pv-gradient-v0721');gradient.setAttribute('role','img');gradient.setAttribute('aria-label','Two-color gradient swatch, composition preview above is authoritative');
  const colorBtns=el('div','pv-two-v0721');
  for(const [key,label] of [['primary','Edit highlight'],['secondary','Edit shade']])colorBtns.append(button(label,()=>{target.value=key;loadColor();sync();}));
  right.append(field('Material',matKind),matFields,gradient,colorBtns,el('small','pv-note-v0721','Two-color material gradient. Glass is stylized sheen, not physical refraction. Material preview and export use the existing renderer.'));
  content.append(left,right);details.append(content);body.append(details);
  function chosen(){return target.value==='fx'?fx?.color:mat?.[target.value];}
  function loadColor(){if(hexOK(chosen()))hsv=hexHsv(chosen());paintColor();}
  function paintColor(){if(!fx||!mat)return;
   const col=hsvHex(hsv.h,hsv.s,hsv.v);hex.value=col;swatch.value=col;h.value=String(Math.floor(hsv.h));s.value=String(Math.round(hsv.s*100));v.value=String(Math.round(hsv.v*100));
   const a=(hsv.h-90)*Math.PI/180;marker.style.left=(50+38*Math.cos(a))+'%';marker.style.top=(50+38*Math.sin(a))+'%';
   sv.style.setProperty('--pv-hue',hsvHex(hsv.h,1,1));svMarker.style.left=hsv.s*100+'%';svMarker.style.top=(1-hsv.v)*100+'%';
  }
  function setColor(col,keepHue=false){if(!fx||!mat||!hexOK(col))return;
   if(target.value==='fx'){if(kind.value==='none')return;fx={...fx,color:col.toLowerCase()};}
   else mat={...mat,[target.value]:col.toLowerCase()};
   if(!keepHue)hsv=hexHsv(col);paintColor();sync();changed();
  }
  function setHsv(){setColor(hsvHex(hsv.h,hsv.s,hsv.v),true);}
  pointer(wheel,(px,py,w,h)=>{hsv={...hsv,h:hue(Math.atan2(py-h/2,px-w/2)*180/Math.PI+90)};setHsv();});
  pointer(sv,(px,py,w,h)=>{hsv={...hsv,s:clamp(px/w,0,1),v:1-clamp(py/h,0,1)};setHsv();});
  function editNum(n,lo,hi,apply){n.addEventListener('change',()=>{const val=n.valueAsNumber;if(Number.isFinite(val)){apply(clamp(val,lo,hi));changed();}else sync();});}
  editNum(h,0,359,val=>{hsv.h=val;setHsv();});editNum(s,0,100,val=>{hsv.s=val/100;setHsv();});editNum(v,0,100,val=>{hsv.v=val/100;setHsv();});
  hex.addEventListener('change',()=>{if(hexOK(hex.value))setColor(hex.value);else paintColor();});
  swatch.addEventListener('input',()=>setColor(swatch.value));
  target.addEventListener('change',()=>{loadColor();sync();});
  function setXY(a,b){if(!fx||kind.value!=='shadow')return;fx={...fx,offsetX:Math.round(clamp(a,-100,100)),offsetY:Math.round(clamp(b,-100,100))};sync();changed();}
  pointer(xy,(px,py,w,h)=>{const p=padPoint(px,py,w,h);setXY(p.x,p.y);});
  editNum(x,-100,100,val=>setXY(val,fx.offsetY));editNum(y,-100,100,val=>setXY(fx.offsetX,val));
  function changeMat(key,value){if(!mat)return;mat=R.checkMaterial({...mat,[key]:value});sync();loadColor();changed();}
  matKind.addEventListener('change',()=>changeMat('kind',matKind.value));
  editNum(matStrength,0,100,val=>changeMat('strength',val/100));editNum(matDepth,0,16,val=>changeMat('depth',Math.round(val*2)/2));editNum(matAngle,-360,360,val=>changeMat('angle',val));
  const tiles=new Map();
  function renderTiles(){if(tiles.size)return;
   for(const p of R.presets){const b=button('',()=>{mat={...p.material};sync();loadColor();changed();},'pv-preset-v0721');b.id='pv-preset-'+p.id+'-v0721';b.setAttribute('aria-label',p.name);const c=el('canvas');c.width=120;c.height=64;c.setAttribute('aria-hidden','true');
    const q=c.getContext('2d');R.materialPaint(q,p.material,g=>{g.font='800 38px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e0e5ec';g.fillText('Aa',60,33);},{x:20,y:12,width:80,height:42},.65);
    b.append(c,el('span','',p.name));presets.append(b);tiles.set(p.id,b);
   }
  }
  details.addEventListener('toggle',()=>{if(details.open){renderTiles();sync();}});
  function sync(){if(!fx||!mat||updating)return;updating=true;
   const disabled=target.value==='fx'&&kind.value==='none';for(const n of [wheel,sv])n.setAttribute('aria-disabled',String(disabled));for(const n of [hex,swatch,h,s,v])n.disabled=disabled;
   x.disabled=y.disabled=kind.value!=='shadow';xy.setAttribute('aria-disabled',String(x.disabled));x.value=fx.offsetX;y.value=fx.offsetY;dot.style.left=(fx.offsetX+100)/2+'%';dot.style.top=(fx.offsetY+100)/2+'%';
   matKind.value=mat.kind;matStrength.value=mat.strength*100;matDepth.value=mat.depth;matAngle.value=mat.angle;
   gradient.style.background='linear-gradient('+String(mat.angle+90)+'deg,'+mat.primary+','+mat.secondary+')';
   for(const p of R.presets)tiles.get(p.id)?.setAttribute('aria-pressed',String(Object.keys(p.material).every(k=>p.material[k]===mat[k])));
   updating=false;
  }
  return {reset(l){fx={...l.fx};mat=R.checkMaterial(l.material||R.defaults());target.value=l.fx.kind==='none'?'primary':'fx';loadColor();sync();},sync,
   patch(l,base){if(!fx||!mat)return base;const next=mergeDraft(l,base,fx,mat,R.defaults());if(next.material)next.material=R.checkMaterial(next.material);return next;}};
 }
 function dock(aside,panel){
  const key='MangoShotCarbonImageV0721.layerDockPercent';let size=37;try{const raw=root.localStorage.getItem(key);if(raw!==null&&Number.isFinite(Number(raw)))size=clamp(Number(raw),25,60);}catch{}
  const handle=el('div','pv-dock-split-v0721');handle.id='pv-dock-split-v0721';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-label','Resize layer dock');handle.setAttribute('aria-orientation','horizontal');handle.setAttribute('aria-valuemin','25');handle.setAttribute('aria-valuemax','60');
  panel.prepend(handle);
  function apply(v,save=false){size=Math.round(clamp(v,25,60));panel.style.setProperty('--pv-dock-height',size+'%');handle.setAttribute('aria-valuenow',size);handle.setAttribute('aria-valuetext',size+' percent of inspector');if(save)try{root.localStorage.setItem(key,String(size));}catch{}}
  apply(size);let drag=null;
  handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();handle.focus();drag={id:e.pointerId,start:e.clientY,size};handle.setPointerCapture?.(e.pointerId);});
  handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId&&aside.clientHeight)apply(drag.size+(drag.start-e.clientY)/aside.clientHeight*100);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(drag?.id===e.pointerId){drag=null;apply(size,true);}});
  handle.addEventListener('keydown',e=>{let n=size;if(e.key==='ArrowUp')n+=5;else if(e.key==='ArrowDown')n-=5;else if(e.key==='Home')n=25;else if(e.key==='End')n=60;else return;e.preventDefault();apply(n,true);});
 }
 root.MangoPrecisionVisualV0721=Object.freeze({...core,mount,dock});
})(typeof globalThis!=='undefined'?globalThis:this);
