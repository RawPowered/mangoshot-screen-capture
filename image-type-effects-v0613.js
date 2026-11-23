/* MangoShot Image Studio v0.6.13 | nondestructive text layer effects + shared transform math.
 * Effects render in the same Canvas2D painter used by preview, clipboard, PNG and PDF.
 * UI handles are deliberately outside raster canvases and never appear in exports.
 */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:a));
 const hex=(v,fallback)=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
 const initial=()=>({
  shadow:{enabled:false,color:'#000000',opacity:.65,blur:14,x:4,y:6},
  stroke:{enabled:false,color:'#172224',size:3},
  glow:{enabled:false,color:'#a7ed61',opacity:.75,blur:19},
  gradient:{enabled:false,from:'#ffffff',to:'#b4ef77',angle:90},
  overlay:{enabled:false,color:'#ffffff',opacity:.5},
  panel:{enabled:false,color:'#14291f',opacity:.88,padding:10}
 });
 function merged(input){
  const base=initial();
  for(const k of Object.keys(base)){
   if(input&&typeof input[k]==='object'&&!Array.isArray(input[k])){
    base[k]={...base[k],...input[k]};
    base[k].enabled=input[k].enabled===true;
   }
  }
  base.shadow.color=hex(base.shadow.color,'#000000');
  base.shadow.opacity=clamp(base.shadow.opacity,0,1);base.shadow.blur=clamp(base.shadow.blur,0,80);
  base.shadow.x=clamp(base.shadow.x,-120,120);base.shadow.y=clamp(base.shadow.y,-120,120);
  base.stroke.color=hex(base.stroke.color,'#172224');base.stroke.size=clamp(base.stroke.size,0,32);
  base.glow.color=hex(base.glow.color,'#a7ed61');
  base.glow.opacity=clamp(base.glow.opacity,0,1);base.glow.blur=clamp(base.glow.blur,0,100);
  base.gradient.from=hex(base.gradient.from,'#ffffff');
  base.gradient.to=hex(base.gradient.to,'#b4ef77');base.gradient.angle=clamp(base.gradient.angle,0,360);
  base.overlay.color=hex(base.overlay.color,'#ffffff');base.overlay.opacity=clamp(base.overlay.opacity,0,1);
  base.panel.color=hex(base.panel.color,'#14291f');base.panel.opacity=clamp(base.panel.opacity,0,1);
  base.panel.padding=clamp(base.panel.padding,0,64);
  return base;
 }
 function preset(id){
  const g=initial();let color='#ffffff';
  switch(id){
   case 'soft-shadow':g.shadow={...g.shadow,enabled:true,blur:22,x:5,y:7};break;
   case 'poster':g.stroke={...g.stroke,enabled:true,size:7,color:'#0c161f'};
    g.shadow={...g.shadow,enabled:true,opacity:.8,blur:8,x:4,y:5};break;
   case 'neon':g.glow={...g.glow,enabled:true,blur:32,opacity:.95,color:'#a8fd58'};
    g.stroke={...g.stroke,enabled:true,size:2,color:'#205b45'};color='#efffda';break;
   case 'gold':g.gradient={...g.gradient,enabled:true,from:'#fff5bd',to:'#af731e'};
    g.stroke={...g.stroke,enabled:true,size:3,color:'#644015'};
    g.shadow={...g.shadow,enabled:true,blur:15,x:3,y:4};color='#f1da8d';break;
   case 'glass':g.gradient={...g.gradient,enabled:true,from:'#f4fffe',to:'#8bc5d5'};
    g.shadow={...g.shadow,enabled:true,blur:20,x:4,y:5};
    g.panel={...g.panel,enabled:true,color:'#1e4650',opacity:.73,padding:13};break;
   case 'editorial':g.shadow={...g.shadow,enabled:true,opacity:.45,blur:8,x:1,y:2};color='#f9f2dd';break;
   case 'clean':break;
   default:throw Error('Unknown text effects preset: '+id);
  }
  return {effects:g,color};
 }
 const presets=Object.freeze([
  {id:'clean',label:'Clean'},
  {id:'soft-shadow',label:'Soft Shadow'},
  {id:'poster',label:'Poster'},
  {id:'neon',label:'Neon'},
  {id:'gold',label:'Gold Foil'},
  {id:'glass',label:'Glass'},
  {id:'editorial',label:'Editorial'}
 ]);
 const scaleFor=s=>({x:clamp(s?.scaleX??1,.08,25),y:clamp(s?.scaleY??1,.08,25)});
 function rawBounds(ctx,layer){
  const C=root.MangoImageEditorCore;
  if(!C?.textMetrics)throw Error('Text editor core unavailable');
  return C.textMetrics(ctx,layer);
 }
 function bounds(ctx,layer){
  const b=rawBounds(ctx,layer),sc=scaleFor(layer);
  return {x:b.x,y:b.y,width:b.width*sc.x,height:b.height*sc.y,
   scaleX:sc.x,scaleY:sc.y,fontSize:b.fontSize};
 }
 function hit(ctx,layer,x,y,pad=10){
  if(layer?.type!=='text'||layer.visible===false)return false;
  const b=bounds(ctx,layer);
  return x>=b.x-pad&&y>=b.y-pad&&x<=b.x+b.width+pad&&y<=b.y+b.height+pad;
 }
 function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
 }
 function rgba(hexColor,opacity){
  const c=hex(hexColor,'#000000');return 'rgba('+parseInt(c.slice(1,3),16)+','+
   parseInt(c.slice(3,5),16)+','+parseInt(c.slice(5,7),16)+','+clamp(opacity,0,1)+')';
 }
 function draw(ctx,layer){
  if(layer?.type!=='text'||layer.visible===false)return null;
  const b=rawBounds(ctx,layer),sc=scaleFor(layer),fx=merged(layer.effects);
  const style=b.style,baseColor=hex(layer.color,'#ffffff');
  ctx.save();ctx.translate(b.x,b.y);ctx.scale(sc.x,sc.y);
  ctx.font=b.font;ctx.textBaseline='top';ctx.textAlign='left';
  // Labels and callouts inherit their background plate; other text can enable one.
  const pane=style.panel||fx.panel.enabled;
  if(pane){
   const pad=fx.panel.enabled?fx.panel.padding:b.padding;
   const x=-(pad-b.padding),y=-(pad-b.padding);
   const w=b.width+2*(pad-b.padding),h=b.height+2*(pad-b.padding);
   ctx.save();ctx.fillStyle=fx.panel.enabled?rgba(fx.panel.color,fx.panel.opacity):
    (style.outline?'rgba(10,24,28,.88)':'rgba(11,24,25,.84)');
   roundRect(ctx,x,y,w,h,Math.min(16,b.fontSize*.23));ctx.fill();
   ctx.strokeStyle=style.outline?'rgba(151,241,87,.9)':'rgba(220,239,225,.45)';
   ctx.lineWidth=Math.max(1,b.fontSize*.025);ctx.stroke();ctx.restore();
  }
  let fill=baseColor;
  if(fx.gradient.enabled){
   const rad=fx.gradient.angle*Math.PI/180,dx=Math.cos(rad)*b.width*.5,dy=Math.sin(rad)*b.height*.5;
   const grad=ctx.createLinearGradient(b.width*.5-dx,b.height*.5-dy,b.width*.5+dx,b.height*.5+dy);
   grad.addColorStop(0,fx.gradient.from);grad.addColorStop(1,fx.gradient.to);fill=grad;
  }
  const glyphs=paint=>{
   for(let i=0;i<b.lines.length;i++)paint(b.lines[i],b.padding,b.padding+i*b.lineHeight);
  };
  if(fx.glow.enabled){
   ctx.save();ctx.fillStyle=fx.glow.color;
   ctx.shadowColor=rgba(fx.glow.color,fx.glow.opacity);ctx.shadowBlur=fx.glow.blur;
   ctx.globalAlpha*=fx.glow.opacity*.8;
   glyphs((s,x,y)=>ctx.fillText(s,x,y));ctx.restore();
  }
  if(fx.shadow.enabled){
   ctx.save();ctx.fillStyle=fill;ctx.shadowColor=rgba(fx.shadow.color,fx.shadow.opacity);
   ctx.shadowBlur=fx.shadow.blur;ctx.shadowOffsetX=fx.shadow.x;ctx.shadowOffsetY=fx.shadow.y;
   glyphs((s,x,y)=>ctx.fillText(s,x,y));ctx.restore();
  }
  if(fx.stroke.enabled||style.outline){
   ctx.save();ctx.lineJoin='round';ctx.strokeStyle=fx.stroke.enabled?fx.stroke.color:'rgba(8,14,16,.9)';
   ctx.lineWidth=fx.stroke.enabled?Math.max(.1,fx.stroke.size):Math.max(1,b.fontSize*.045);
   glyphs((s,x,y)=>ctx.strokeText(s,x,y));ctx.restore();
  }
  ctx.fillStyle=fill;
  glyphs((s,x,y)=>ctx.fillText(s,x,y));
  if(fx.overlay.enabled&&fx.overlay.opacity>0){
   ctx.save();ctx.globalAlpha*=fx.overlay.opacity;ctx.fillStyle=fx.overlay.color;
   glyphs((s,x,y)=>ctx.fillText(s,x,y));ctx.restore();
  }
  ctx.restore();return bounds(ctx,layer);
 }
 const corners=new Set(['nw','ne','sw','se']);
 function resize(rect,corner,dx,dy,free=false){
  if(!rect||!corners.has(corner)||!(rect.width>0&&rect.height>0))throw Error('Invalid transform bounds');
  const horizontal=corner.endsWith('e')?1:-1,vertical=corner.startsWith('s')?1:-1;
  const sx=1+horizontal*dx/rect.width,sy=1+vertical*dy/rect.height;
  const k=clamp(Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy,.08,25);
  const kx=free?clamp(sx,.08,25):k,ky=free?clamp(sy,.08,25):k;
  const width=Math.max(4,rect.width*kx),height=Math.max(4,rect.height*ky);
  return {x:horizontal===1?rect.x:rect.x+rect.width-width,
   y:vertical===1?rect.y:rect.y+rect.height-height,width,height};
 }
 function applyResize(layer,start,next){
  if(!layer||!start||!next||!(start.width>0&&start.height>0))throw Error('Invalid resize');
  const clone={...layer,points:[...(layer.points||[])]};
  clone.points[0]={...(clone.points[0]||{}),x:next.x,y:next.y};
  if(layer.type==='text'){
   clone.scaleX=clamp((layer.scaleX??1)*next.width/start.width,.08,25);
   clone.scaleY=clamp((layer.scaleY??1)*next.height/start.height,.08,25);
  }else if(layer.type==='image'){
   clone.width=Math.max(1,next.width);clone.height=Math.max(1,next.height);
  }else throw Error('Resize handles support image and text layers only');
  return clone;
 }
 root.MangoImageTypeV0613={initial,merged,preset,presets,bounds,hit,draw,resize,applyResize};
})(typeof globalThis!=='undefined'?globalThis:this);
