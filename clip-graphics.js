/* MangoShot layered graphics: pure timing operations and deterministic canvas render.
   Coordinates are normalized to the video dimensions; no HTML or remote assets. */
(function(root){
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const fontFamilies={sans:'Arial, Helvetica, sans-serif',serif:'Georgia, serif',mono:'Consolas, monospace',rounded:'Trebuchet MS, Arial, sans-serif',condensed:'Arial Narrow, Impact, sans-serif',display:'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',handwritten:'Segoe Print, Comic Sans MS, cursive'};
 const styles={
  none:{fontSize:52,font:'sans',weight:'600',color:'#ffffff',background:'transparent',outline:'#000000',outlineWidth:0,shadow:0,align:'left',opacity:1},
  title:{fontSize:74,font:'sans',weight:'800',color:'#ffffff',background:'transparent',outline:'#101010',outlineWidth:2,shadow:12,align:'center',opacity:1},
  lowerThird:{fontSize:48,font:'sans',weight:'700',color:'#ffffff',background:'#18252de8',outline:'#000000',outlineWidth:0,shadow:6,align:'left',opacity:1},
  callout:{fontSize:40,font:'sans',weight:'600',color:'#132024',background:'#e4f7e7f2',outline:'#557167',outlineWidth:2,shadow:9,align:'center',opacity:1},
  spotlight:{fontSize:48,font:'sans',weight:'800',color:'#ffffff',background:'#c13c34ed',outline:'#000000',outlineWidth:0,shadow:8,align:'center',opacity:1},
  limeAccent:{fontSize:62,font:'sans',weight:'800',color:'#d9ff7f',background:'#17271ddd',outline:'#111d13',outlineWidth:1,shadow:12,align:'center',opacity:1},
  glass:{fontSize:43,font:'sans',weight:'700',color:'#f7fff8',background:'#14292ccf',outline:'#b8ff38',outlineWidth:2,shadow:12,align:'center',opacity:1},
  step:{fontSize:50,font:'sans',weight:'800',color:'#182318',background:'#b8f544ee',outline:'#223823',outlineWidth:1,shadow:9,align:'center',opacity:1},
  warning:{fontSize:50,font:'sans',weight:'800',color:'#fff5e9',background:'#d45d20ee',outline:'#642709',outlineWidth:2,shadow:10,align:'center',opacity:1},
  minimal:{fontSize:40,font:'sans',weight:'500',color:'#ffffff',background:'#111921bd',outline:'#101010',outlineWidth:0,shadow:3,align:'left',opacity:1},
  outline:{fontSize:48,font:'sans',weight:'800',color:'#e7ffe3',background:'transparent',outline:'#111717',outlineWidth:4,shadow:10,align:'center',opacity:1},
  editorial:{fontSize:66,font:'serif',weight:'700',color:'#f9f1df',background:'#1c2730da',outline:'#121d23',outlineWidth:1,shadow:10,align:'center',opacity:1},
  kinetic:{fontSize:77,font:'display',weight:'800',color:'#dcff53',background:'transparent',outline:'#192019',outlineWidth:3,shadow:15,align:'center',opacity:1},
  techNote:{fontSize:42,font:'mono',weight:'700',color:'#b8fff0',background:'#0b2a2fe9',outline:'#2bd3b1',outlineWidth:1,shadow:6,align:'left',opacity:1},
  softBadge:{fontSize:43,font:'rounded',weight:'800',color:'#21341b',background:'#e1ff9aed',outline:'#6b9343',outlineWidth:1,shadow:6,align:'center',opacity:1},
  quoteCard:{fontSize:56,font:'serif',weight:'600',color:'#fff8f0',background:'#283747e3',outline:'#8ba2b4',outlineWidth:1,shadow:13,align:'center',opacity:1},
  pointerPop:{fontSize:44,font:'sans',weight:'800',color:'#fff8ec',background:'#e46f2fe9',outline:'#703714',outlineWidth:2,shadow:12,align:'center',opacity:1},
  premium:{fontSize:59,font:'serif',weight:'700',color:'#f4e4b5',background:'#27231eea',outline:'#a98c47',outlineWidth:2,shadow:11,align:'center',opacity:1},
  checklist:{fontSize:42,font:'mono',weight:'700',color:'#eaffdf',background:'#234331e9',outline:'#4fbc77',outlineWidth:1,shadow:7,align:'left',opacity:1}
 };
 const cp=value=>JSON.parse(JSON.stringify(value));
 function create(kind,preset='none',at=0,opts={}){
  const isCallout=kind==='callout';const style=styles[preset]||styles.none;
  const id=(root.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
  const layer={id,kind:isCallout?'callout':'text',name:isCallout?'Callout':'Text',track:2,start:at,end:at+4,
   x:.15,y:isCallout?.32:.72,width:isCallout?.48:.7,text:isCallout?'Highlight this area':'Add title',
   preset,fontSize:style.fontSize,font:style.font,weight:style.weight,color:style.color,
   background:style.background,outline:style.outline,outlineWidth:style.outlineWidth,shadow:style.shadow,
   align:style.align,opacity:style.opacity,fadeIn:0,fadeOut:0,tailX:.68,tailLength:32,visible:true,locked:false,motion:root.MangoMotion?.defaults?.()};
  if(preset==='title'){layer.y=.24;layer.x=.07;layer.width=.86;}
  if(preset==='lowerThird'){layer.y=.78;layer.x=.06;layer.width=.63;}
  if(['glass','step','warning'].includes(preset)){layer.y=.30;layer.x=.25;layer.width=.5;}
  if(preset==='minimal'){layer.y=.82;layer.x=.07;layer.width=.55;}
  if(['editorial','quoteCard','premium'].includes(preset)){layer.y=.28;layer.x=.15;layer.width=.70;}
  if(preset==='kinetic'){layer.y=.18;layer.x=.12;layer.width=.76;}
  if(['techNote','checklist'].includes(preset)){layer.y=.76;layer.x=.06;layer.width=.68;}
  if(['softBadge','pointerPop'].includes(preset)){layer.y=.34;layer.x=.28;layer.width=.44;}
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
 function lines(ctx,raw,maxWidth,maxRows=7){const output=[],width=Math.max(18,maxWidth);
  const push=text=>{if(output.length<maxRows)output.push(text);};
  for(const paragraph of String(raw||'').split(/\n/)){let line='';
   for(const word of paragraph.split(/\s+/)){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
    if(line){push(line);line='';}
    let piece='';for(const char of Array.from(word)){
     if(piece&&ctx.measureText(piece+char).width>width){push(piece);piece=char;}else piece+=char;
     if(output.length>=maxRows)break;
    }line=piece;if(output.length>=maxRows)break;
   }if(output.length>=maxRows)break;push(line);
  }
  if(output.length===maxRows&&String(raw||'').length>output.join('').length){
   let text=output[maxRows-1];while(text.length&&ctx.measureText(text+'…').width>width)text=text.slice(0,-1);
   output[maxRows-1]=text+'…';}
  return output.length?output:[''];
 }
 function paintOne(ctx,l,w,h,sec){const x=clamp(l.x*w,0,w-40),y=clamp(l.y*h,0,h-24),width=clamp(l.width*w,40,Math.max(40,w-x)),scale=h/1080;
  let fontsize=clamp(l.fontSize*scale,9,200),pad,lineH,boxH,rendered;
  ctx.save();ctx.globalAlpha=clamp(l.opacity,0,1)*fade(l,sec);
  for(let i=0;i<16;i++){
   ctx.font=`${l.weight||'600'} ${fontsize}px ${fontFamilies[l.font]||fontFamilies.sans}`;
   pad=Math.max(5,fontsize*.32);rendered=lines(ctx,root.MangoMotion?.textFrame?.(l,sec)?.text??l.text,width-pad*2,7);
   lineH=fontsize*1.22;boxH=rendered.length*lineH+2*pad;
   if(boxH<=h-y-4||fontsize<=10)break;fontsize=Math.max(10,fontsize*.87);
  }
  const motion=root.MangoMotion?.textFrame?.(l,sec);
  const fullText=motion?.text??l.text;
  // Preserve the complete glyph layout while a typing reveal advances.
  const drawRows=lines(ctx,fullText,width-pad*2,7);
  if(motion){
   ctx.globalAlpha*=motion.alpha;
   const centerX=x+width/2,centerY=y+boxH/2;
   ctx.translate(centerX+(motion.dx||0)*width,centerY+(motion.dy||0)*boxH);
   ctx.rotate(motion.angle||0);ctx.scale(motion.scale||1,(motion.scale||1));
   ctx.scale(motion.scaleX||1,1);ctx.translate(-centerX,-centerY);
  }
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
  // Typewriter reveals glyphs without reflowing the full text box.
  const enter=l.motion?.enter,enterLimit=Math.min(Number(enter?.duration)||.45,Math.max(.08,(l.end-l.start)*.5));
  const typing=enter?.type==='typeIn'&&sec-l.start<enterLimit;
  const exiting=l.motion?.exit,exitLimit=Math.min(Number(exiting?.duration)||.35,Math.max(.08,(l.end-l.start)*.5));
  const reverseType=exiting?.type==='typeIn'&&l.end-sec<exitLimit;
  const typeFraction=typing?Math.min(1,Math.max(0,(sec-l.start)/enterLimit)):reverseType?Math.min(1,Math.max(0,(l.end-sec)/exitLimit)):1;
  const spinLetters=enter?.type==='spinLetters'&&sec-l.start<enterLimit;
  const spinOut=exiting?.type==='spinLetters'&&l.end-sec<exitLimit;
  const spinFraction=spinLetters?Math.min(1,Math.max(0,(sec-l.start)/enterLimit)):spinOut?Math.min(1,Math.max(0,(l.end-sec)/exitLimit)):1;
  const totalGlyphs=drawRows.reduce((count,row)=>count+Array.from(row).length,0);
  const visibleCount=Math.round(totalGlyphs*typeFraction);let drawn=0;
  for(let i=0;i<drawRows.length;i++){
   const ty=y+pad+i*lineH;
   const chars=Array.from(drawRows[i]);const visible=chars.slice(0,Math.max(0,visibleCount-drawn)).join('');
   if(spinLetters||spinOut){
    const startX=l.align==='center'?tx-ctx.measureText(drawRows[i]).width/2:l.align==='right'?tx-ctx.measureText(drawRows[i]).width:tx;
    let cursor=startX;
    for(let j=0;j<chars.length;j++){
     const ch=chars[j],cw=ctx.measureText(ch).width;
     const local=root.MangoMotion.letterProgress(drawn+j,totalGlyphs,spinFraction);
     if(local>0){ctx.save();ctx.globalAlpha*=local;ctx.translate(cursor+cw/2,ty+lineH/2);
      ctx.rotate((1-local)*-Math.PI*1.5);ctx.scale(Math.max(.08,local),Math.max(.08,local));
      if(!hasBackground&&(Number(l.outlineWidth)||0)>0)ctx.strokeText(ch,-cw/2,-lineH/2);
      ctx.fillText(ch,-cw/2,-lineH/2);ctx.restore();}
     cursor+=cw;
    }
   }else{
    if(!hasBackground&&(Number(l.outlineWidth)||0)>0)ctx.strokeText(visible,tx,ty);
    ctx.fillText(visible,tx,ty);
   }
   drawn+=chars.length;
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
 function bounds(layer,w,h,ctx){const fh=clamp(layer.fontSize*h/1080,9,200),x=clamp(layer.x*w,0,w-40),y=clamp(layer.y*h,0,h-24),width=clamp(layer.width*w,40,Math.max(40,w-x));if(ctx){ctx.save();ctx.font=`${layer.weight||'600'} ${fh}px ${fontFamilies[layer.font]||fontFamilies.sans}`;const rows=lines(ctx,layer.text,width-2*Math.max(5,fh*.32),7);ctx.restore();return {x,y,w:width,h:Math.min(h-y,rows.length*fh*1.22+fh*.64)};}return {x,y,w:width,h:Math.min(h-y,fh*2.5)};}
 root.MangoGraphics={styles,create,style,render,ripple,trim,bounds,at,clone:cp};
})(typeof globalThis!=='undefined'?globalThis:this);
