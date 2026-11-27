/* MangoShot Image Studio v0.6.11
 * Deterministic editable text geometry and image merging; local Canvas only.
 */
(function(root){'use strict';
 const styles=Object.freeze({
  plain:Object.freeze({name:'Text',weight:'600',panel:false,outline:false}),
  title:Object.freeze({name:'Title',weight:'800',panel:false,outline:true}),
  label:Object.freeze({name:'Label',weight:'700',panel:true,outline:false}),
  callout:Object.freeze({name:'Callout',weight:'700',panel:true,outline:true})
 });
 const fonts=Object.freeze({
  sans:'system-ui, -apple-system, "Segoe UI", sans-serif',
  serif:'Georgia, "Times New Roman", serif',
  mono:'ui-monospace, "SFMono-Regular", Consolas, monospace',
  display:'Impact, "Arial Narrow", sans-serif',
  rounded:'"Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
  classic:'Palatino, "Palatino Linotype", Georgia, serif'
 });
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
 // Optional textLayout is in em/line-height units, not screen pixels. Preserve legacy metrics when absent.
 const defaultTextLayout=()=>({tracking:0,leading:1.3,align:'left',casing:'original'});
 function checkTextLayout(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4||!['tracking','leading','align','casing'].every(k=>Object.hasOwn(value,k))||typeof value.tracking!=='number'||!Number.isFinite(value.tracking)||value.tracking<-.05||value.tracking>.35||typeof value.leading!=='number'||!Number.isFinite(value.leading)||value.leading<1||value.leading>3||!['left','center','right'].includes(value.align)||!['original','upper','lower'].includes(value.casing))throw Error('Invalid text layout.');return {...value};}
 function spacing(ctx,tracking,fontSize){if('letterSpacing' in ctx)ctx.letterSpacing=(tracking*fontSize)+'px';else if(tracking!==0)throw Error('This browser does not support Canvas text spacing. Use a current Chromium browser.');}
 function textMetrics(ctx,stroke){
  const fontSize=clamp(stroke.fontSize||Math.max(18,(stroke.size||6)*5),12,400);
  const family=root.MangoCreativeV079?.family(stroke.fontFamily,fonts[stroke.fontFamily]||fonts.sans)||fonts[stroke.fontFamily]||fonts.sans,style=styles[stroke.styleId]||styles.plain;
  const weight=root.MangoCreativeV079?.weight(stroke.fontFamily,stroke.fontWeight||style.weight)||stroke.fontWeight||style.weight,font=weight+' '+fontSize+'px '+family;
  const layout=stroke.textLayout?checkTextLayout(stroke.textLayout):defaultTextLayout(),original=String(stroke.text||''),value=layout.casing==='upper'?original.toUpperCase():layout.casing==='lower'?original.toLowerCase():original;
  const lines=value.split(/\r?\n/).slice(0,32),lineHeight=Math.ceil(fontSize*layout.leading),padding=style.panel?Math.max(8,Math.round(fontSize*.24)):2;
  ctx.save?.();ctx.font=font;spacing(ctx,layout.tracking,fontSize);
  const widths=lines.map(line=>Math.max(0,ctx.measureText?.(line||' ')?.width||fontSize*.65)),measured=Math.max(fontSize*.65,...widths);
  ctx.restore?.();
  const contentWidth=Math.ceil(measured),offsets=widths.map(w=>layout.align==='center'?(contentWidth-w)/2:layout.align==='right'?contentWidth-w:0);
  return {x:stroke.points?.[0]?.x||0,y:stroke.points?.[0]?.y||0,
   width:contentWidth+padding*2,height:lineHeight*(lines.length-1)+Math.max(lineHeight,Math.ceil(fontSize*1.3))+padding*2,
   lines,offsets,padding,lineHeight,fontSize,font,style,layout};
 }
 function drawText(ctx,stroke){
  const b=textMetrics(ctx,stroke);ctx.save();
  const color=typeof stroke.color==='string'?stroke.color:'#ffffff';
  if(b.style.panel){
   ctx.fillStyle=b.style.outline?'rgba(10,24,28,.88)':'rgba(11,24,25,.84)';
   ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=9;
   const radius=Math.min(16,b.fontSize*.23);
   ctx.beginPath();ctx.moveTo(b.x+radius,b.y);ctx.lineTo(b.x+b.width-radius,b.y);
   ctx.quadraticCurveTo(b.x+b.width,b.y,b.x+b.width,b.y+radius);
   ctx.lineTo(b.x+b.width,b.y+b.height-radius);
   ctx.quadraticCurveTo(b.x+b.width,b.y+b.height,b.x+b.width-radius,b.y+b.height);
   ctx.lineTo(b.x+radius,b.y+b.height);ctx.quadraticCurveTo(b.x,b.y+b.height,b.x,b.y+b.height-radius);
   ctx.lineTo(b.x,b.y+radius);ctx.quadraticCurveTo(b.x,b.y,b.x+radius,b.y);ctx.closePath();ctx.fill();
   ctx.shadowBlur=0;ctx.strokeStyle=b.style.outline?'rgba(151,241,87,.9)':'rgba(220,239,225,.45)';
   ctx.lineWidth=Math.max(1,b.fontSize*.025);ctx.stroke();
  }
  ctx.font=b.font;spacing(ctx,b.layout.tracking,b.fontSize);ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=color;
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=b.style.panel?0:Math.max(2,b.fontSize*.12);
  if(b.style.outline&&!b.style.panel){ctx.lineWidth=Math.max(1,b.fontSize*.045);ctx.strokeStyle='rgba(8,14,16,.9)';}
  for(let i=0;i<b.lines.length;i++){
   const x=b.x+b.padding+b.offsets[i],y=b.y+b.padding+i*b.lineHeight;
   if(b.style.outline&&!b.style.panel)ctx.strokeText(b.lines[i],x,y);
   ctx.fillText(b.lines[i],x,y);
  }
  ctx.restore();return b;
 }
 function hitText(ctx,stroke,x,y,pad=10){
  if(stroke?.type!=='text')return false;
  const r=textMetrics(ctx,stroke);
  return x>=r.x-pad&&y>=r.y-pad&&x<=r.x+r.width+pad&&y<=r.y+r.height+pad;
 }
 function merge(base,ink,includeInk=true){
  const canvas=base.ownerDocument?.createElement?.('canvas')||
    (typeof document!=='undefined'?document.createElement('canvas'):null);
  if(!canvas)throw Error('Canvas creation unavailable.');
  canvas.width=base.width;canvas.height=base.height;
  if(!canvas.width||!canvas.height)throw Error('No image is loaded.');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Cannot compose screenshot.');
  ctx.drawImage(base,0,0);
  if(includeInk)ctx.drawImage(ink,0,0);
  return canvas;
 }
 function toPng(canvas){
  return new Promise((resolve,reject)=>{
   if(typeof canvas.toBlob!=='function')return reject(Error('PNG encoding not available.'));
   canvas.toBlob(blob=>blob?.size?resolve(blob):reject(Error('Could not encode annotated PNG.')),'image/png');
  });
 }
 root.MangoImageEditorCore={styles,fonts,clamp,defaultTextLayout,checkTextLayout,spacing,textMetrics,drawText,hitText,merge,toPng};
})(typeof globalThis!=='undefined'?globalThis:this);
