/* MangoShot layered graphics: pure timing operations and deterministic canvas render.
   Coordinates are normalized to the video dimensions; no HTML or remote assets. */
(function(root){
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const fontFamilies={sans:'Arial, Helvetica, sans-serif',serif:'Georgia, serif',mono:'Consolas, monospace'};
 const styles={
  none:{fontSize:52,font:'sans',weight:'600',color:'#ffffff',background:'transparent',outline:'#000000',outlineWidth:0,shadow:0,align:'left',opacity:1},
  title:{fontSize:74,font:'sans',weight:'800',color:'#ffffff',background:'transparent',outline:'#101010',outlineWidth:2,shadow:12,align:'center',opacity:1},
  lowerThird:{fontSize:48,font:'sans',weight:'700',color:'#ffffff',background:'#18252de8',outline:'#000000',outlineWidth:0,shadow:6,align:'left',opacity:1},
  callout:{fontSize:40,font:'sans',weight:'600',color:'#132024',background:'#e4f7e7f2',outline:'#557167',outlineWidth:2,shadow:9,align:'center',opacity:1},
  spotlight:{fontSize:48,font:'sans',weight:'800',color:'#ffffff',background:'#c13c34ed',outline:'#000000',outlineWidth:0,shadow:8,align:'center',opacity:1}
 };
 const cp=value=>JSON.parse(JSON.stringify(value));
 function create(kind,preset='none',at=0,opts={}){
  const isCallout=kind==='callout';const style=styles[preset]||styles.none;
  const id=(root.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
  const layer={id,kind:isCallout?'callout':'text',name:isCallout?'Callout':'Text',track:2,start:at,end:at+4,
   x:.15,y:isCallout?.32:.72,width:isCallout?.48:.7,text:isCallout?'Highlight this area':'Add title',
   preset,fontSize:style.fontSize,font:style.font,weight:style.weight,color:style.color,
   background:style.background,outline:style.outline,outlineWidth:style.outlineWidth,shadow:style.shadow,
   align:style.align,opacity:style.opacity,fadeIn:0,fadeOut:0,tailX:.68,tailLength:32,visible:true,locked:false};
  if(preset==='title'){layer.y=.24;layer.x=.07;layer.width=.86;}
  if(preset==='lowerThird'){layer.y=.78;layer.x=.06;layer.width=.63;}
  if(isCallout&&preset==='none')layer.background='#ffffffdc';
  return {...layer,...opts};
 }
 function style(layer,preset){const p=styles[preset]||styles.none;
  return {...layer,...cp(p),preset};
 }
 function at(layers,seconds){return layers.filter(l=>l.visible&&l.start<=seconds&&seconds<l.end).slice().sort((a,b)=>a.track-b.track);}
 function fade(layer,sec){const age=sec-layer.start,remaining=layer.end-sec;
  return clamp(Math.min(layer.fadeIn>0?age/layer.fadeIn:1,layer.fadeOut>0?remaining/layer.fadeOut:1,1),0,1);
 }
 function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
 function lines(ctx,raw,maxWidth,maxRows=5){const output=[];
  for(const paragraph of String(raw||'').split(/\n/)){
   let line='';for(const word of paragraph.split(/\s+/)){
    const candidate=line?line+' '+word:word;
    if(line&&ctx.measureText(candidate).width>maxWidth){output.push(line);line=word;}else line=candidate;
   }output.push(line);if(output.length>=maxRows)break;
  }return output.slice(0,maxRows);
 }
 function paintOne(ctx,l,w,h,sec){const x=l.x*w,y=l.y*h,width=clamp(l.width*w,40,w),scale=h/1080;
  const fontsize=clamp(l.fontSize*scale,9,200),pad=Math.max(8,fontsize*.38);
  ctx.save();ctx.globalAlpha=clamp(l.opacity,0,1)*fade(l,sec);
  ctx.font=`${l.weight||'600'} ${fontsize}px ${fontFamilies[l.font]||fontFamilies.sans}`;
  const rendered=lines(ctx,l.text,width-pad*2,5),lineH=fontsize*1.24,boxH=rendered.length*lineH+2*pad;
  const hasBackground=l.background&&l.background!=='transparent';
  if(hasBackground){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=(Number(l.shadow)||0)*scale;
   ctx.fillStyle=l.background;rounded(ctx,x,y,width,boxH,14*scale);ctx.fill();
   ctx.shadowBlur=0;
   if((Number(l.outlineWidth)||0)>0){ctx.lineWidth=l.outlineWidth*scale;ctx.strokeStyle=l.outline;ctx.stroke();}
   if(l.kind==='callout'){const tailX=x+width*clamp(Number(l.tailX??.68),.15,.85),tailY=y+boxH;
     ctx.beginPath();ctx.moveTo(tailX-20*scale,tailY-1);ctx.lineTo(tailX+38*scale,tailY-1);
     ctx.lineTo(tailX+14*scale,tailY+clamp(Number(l.tailLength??32),0,200)*scale);ctx.closePath();ctx.fill();}
  }
  ctx.fillStyle=l.color;ctx.textBaseline='top';ctx.textAlign=l.align||'left';
  ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=hasBackground?0:(Number(l.shadow)||0)*scale;
  if(!hasBackground&&(Number(l.outlineWidth)||0)>0){ctx.strokeStyle=l.outline;ctx.lineJoin='round';ctx.lineWidth=l.outlineWidth*scale*2;}
  const tx=l.align==='center'?x+width/2:l.align==='right'?x+width-pad:x+pad;
  for(let i=0;i<rendered.length;i++){
   const ty=y+pad+i*lineH;
   if(!hasBackground&&(Number(l.outlineWidth)||0)>0)ctx.strokeText(rendered[i],tx,ty);
   ctx.fillText(rendered[i],tx,ty);
  }
  ctx.restore();return {x,y,width,height:boxH};
 }
 function render(ctx,layers,seconds,w,h){if(!ctx||!Number.isFinite(seconds))return;
  for(const layer of at(layers,seconds))paintOne(ctx,layer,w,h,seconds);
 }
 function ripple(layers,start,end){const d=end-start;if(d<=0)return cp(layers);
  const result=[];
  for(const l of layers){const a=l.start,b=l.end;
   if(b<=start){result.push(cp(l));continue;}
   if(a>=end){result.push({...cp(l),start:a-d,end:b-d});continue;}
   const a2=a<start?a:start,b2=b>end?b-d:start;
   if(b2-a2>=.04)result.push({...cp(l),start:a2,end:b2});
  }return result;
 }
 function trim(layers,start,end){const result=[];for(const l of layers){const a=Math.max(start,l.start),b=Math.min(end,l.end);
   if(b-a>=.04)result.push({...cp(l),start:a-start,end:b-start});
  }return result;
 }
 function bounds(layer,w,h){const fh=clamp(layer.fontSize*h/1080,9,200);return {x:layer.x*w,y:layer.y*h,w:layer.width*w,h:fh*2.5};}
 root.MangoGraphics={styles,create,style,render,ripple,trim,bounds,at,clone:cp};
})(typeof globalThis!=='undefined'?globalThis:this);
