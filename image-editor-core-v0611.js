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
  mono:'ui-monospace, "SFMono-Regular", Consolas, monospace'
 });
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
 function textMetrics(ctx,stroke){
  const fontSize=clamp(stroke.fontSize||Math.max(18,(stroke.size||6)*5),12,400);
  const family=fonts[stroke.fontFamily]||fonts.sans,style=styles[stroke.styleId]||styles.plain;
  const weight=stroke.fontWeight||style.weight,font=weight+' '+fontSize+'px '+family;
  const lines=String(stroke.text||'').split(/\r?\n/).slice(0,32);
  const lineHeight=Math.ceil(fontSize*1.3),padding=style.panel?Math.max(8,Math.round(fontSize*.24)):2;
  ctx.save?.();ctx.font=font;
  const measured=lines.reduce((max,line)=>Math.max(max,ctx.measureText?.(line||' ')?.width||fontSize*.65),fontSize*.65);
  ctx.restore?.();
  return {x:stroke.points?.[0]?.x||0,y:stroke.points?.[0]?.y||0,
   width:Math.ceil(measured+padding*2),height:lineHeight*lines.length+padding*2,
   lines,padding,lineHeight,fontSize,font,style};
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
  ctx.font=b.font;ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=color;
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=b.style.panel?0:Math.max(2,b.fontSize*.12);
  if(b.style.outline&&!b.style.panel){ctx.lineWidth=Math.max(1,b.fontSize*.045);ctx.strokeStyle='rgba(8,14,16,.9)';}
  for(let i=0;i<b.lines.length;i++){
   const x=b.x+b.padding,y=b.y+b.padding+i*b.lineHeight;
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
 root.MangoImageEditorCore={styles,fonts,clamp,textMetrics,drawText,hitText,merge,toPng};
})(typeof globalThis!=='undefined'?globalThis:this);
