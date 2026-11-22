/* MangoShot v0.6.7 — deterministic, browser-local motion at edited-sequence time.
 * Shared by Program Monitor and MediaRecorder canvas export. No timers or DOM state.
 * V1 transitions are single-decoder cut treatments, NOT two-source cross dissolves. */
(function(root){'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
 const motionTypes=['none','fade','slideUp','slideDown','slideLeft','slideRight','pop','bounce','zoom','spin','flip','typeIn','spinLetters'];
 const transitionTypes=['none','dipBlack','dipWhite','flash','wipeLeft','wipeRight','iris','slideIn','zoomPunch','spinIn'];
 const numberTypes=['none','countUp','countDown','timerUp','timerDown'];
 const easing=['linear','easeIn','easeOut','easeInOut','back'];
 const defaults=()=>({enter:{type:'none',duration:.45,ease:'easeOut'},exit:{type:'none',duration:.35,ease:'easeIn'},
  numeric:{type:'none',from:0,to:100,duration:2,decimals:0,prefix:'',suffix:''}});
 function phase(raw){const x=raw||{};return {type:motionTypes.includes(x.type)?x.type:'none',
   duration:clamp(Number(x.duration)||.45,.08,5),ease:easing.includes(x.ease)?x.ease:'easeOut'};}
 function numeric(raw){const x=raw||{};return {type:numberTypes.includes(x.type)?x.type:'none',
  from:clamp(finite(Number(x.from))?Number(x.from):0,-100000000,100000000),
  to:clamp(finite(Number(x.to))?Number(x.to):100,-100000000,100000000),
  duration:clamp(Number(x.duration)||2,.08,3600),
  decimals:Math.round(clamp(Number(x.decimals)||0,0,3)),
  prefix:String(x.prefix||'').slice(0,24),suffix:String(x.suffix||'').slice(0,24)};}
 function checkLayer(raw){
  if(raw==null)return defaults();
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid text motion');
  for(const key of ['enter','exit'])if(raw[key]!=null){
   const x=raw[key];if(!x||!motionTypes.includes(x.type)||!finite(x.duration)||x.duration<.08||x.duration>5||!easing.includes(x.ease))throw Error('Invalid '+key+' animation');}
  if(raw.numeric!=null){const x=raw.numeric;
   if(!x||!numberTypes.includes(x.type)||!finite(x.from)||!finite(x.to)||Math.abs(x.from)>1e8||Math.abs(x.to)>1e8||
    !finite(x.duration)||x.duration<.08||x.duration>3600||!Number.isInteger(x.decimals)||x.decimals<0||x.decimals>3||
    typeof x.prefix!=='string'||x.prefix.length>24||typeof x.suffix!=='string'||x.suffix.length>24)throw Error('Invalid numeric animation');}
  return {enter:phase(raw.enter),exit:phase(raw.exit),numeric:numeric(raw.numeric)};
 }
 function ease(t,name){t=clamp(t);switch(name){
  case 'easeIn':return t*t*t;
  case 'easeOut':return 1-(1-t)**3;
  case 'easeInOut':return t<.5?4*t*t*t:1-(-2*t+2)**3/2;
  case 'back':return 1+2.70158*(t-1)**3+1.70158*(t-1)**2;
  default:return t;
 }}
 function glyphs(s){return Array.from(String(s||''));}
 function clock(v){const total=Math.max(0,Math.floor(v));const h=Math.floor(total/3600);
  const mm=Math.floor(total%3600/60),ss=total%60;return (h?String(h).padStart(2,'0')+':':'')+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');}
 function numberText(n,age){if(n.type==='none')return null;
  const p=clamp(age/n.duration);let value;
  if(n.type==='timerUp')return clock(n.from+p*(n.to-n.from));
  if(n.type==='timerDown')return clock(n.from+p*(n.to-n.from));
  if(n.type==='countDown')value=n.from+(n.to-n.from)*p;
  else value=n.from+(n.to-n.from)*p;
  const formatted=value.toLocaleString('en-US',{minimumFractionDigits:n.decimals,maximumFractionDigits:n.decimals});
  return n.prefix+formatted+n.suffix;
 }
 function animation(type,p,mode){const f=clamp(p);const lost=1-f;
  const v={alpha:1,dx:0,dy:0,scale:1,scaleX:1,angle:0,visible:null,letters:null};
  switch(type){
   case 'fade':v.alpha=f;break;
   case 'slideUp':v.alpha=f;v.dy=.65*lost;break;
   case 'slideDown':v.alpha=f;v.dy=-.65*lost;break;
   case 'slideLeft':v.alpha=f;v.dx=.55*lost;break;
   case 'slideRight':v.alpha=f;v.dx=-.55*lost;break;
   case 'pop':v.alpha=f;v.scale=.5+.5*f;break;
   case 'bounce':v.alpha=f;v.scale=.75+.25*(f+Math.sin(f*Math.PI*2)*lost*.3);break;
   case 'zoom':v.alpha=f;v.scale=1.65-.65*f;break;
   case 'spin':v.alpha=f;v.angle=(mode==='exit'?1:-1)*Math.PI*2*lost;v.scale=.55+.45*f;break;
   case 'flip':v.alpha=f;v.scaleX=.15+.85*f;break;
   case 'typeIn':v.visible=f;break;
   case 'spinLetters':v.letters=f;break;
  }return v;
 }
 function textFrame(layer,seconds){const d=checkLayer(layer.motion),age=seconds-layer.start,remain=layer.end-seconds;
  const span=Math.max(.08,layer.end-layer.start),enter=Math.min(d.enter.duration,span*.5),exit=Math.min(d.exit.duration,span*.5);
  let text=numberText(d.numeric,Math.max(0,age));if(text===null)text=String(layer.text||'');
  let state={text,alpha:1,dx:0,dy:0,scale:1,scaleX:1,angle:0,letters:null};
  const active=age<enter&&d.enter.type!=='none'?
   {item:d.enter,progress:age/enter,mode:'enter'}:
   remain<exit&&d.exit.type!=='none'?{item:d.exit,progress:remain/exit,mode:'exit'}:null;
  if(active){
   const p=clamp(ease(active.progress,active.item.ease));
   const a=animation(active.item.type,p,active.mode);
   Object.assign(state,a);
   // Typewriter rendering preserves layout; visible glyphs are selected by the canvas painter.
  }
  return state;
 }
 function letterProgress(index,total,amount){const lag=total>1?index/(total-1)*.44:0;return clamp((amount-lag)/.56);}
 function checkTransitions(items){if(!Array.isArray(items)||items.length>300)throw Error('Invalid clip transitions');
  return items.map(x=>{
   if(!x||!finite(x.fromEnd)||!finite(x.toStart)||x.fromEnd<0||x.toStart<0||!transitionTypes.includes(x.type)||
      !finite(x.duration)||x.duration<.08||x.duration>2||!easing.includes(x.ease))throw Error('Invalid clip transition');
   return {fromEnd:x.fromEnd,toStart:x.toStart,type:x.type,duration:x.duration,ease:x.ease};
  });
 }
 function key(a,b){return a.toFixed(5)+':'+b.toFixed(5);}
 function setTransition(items,segments,index,patch){
  if(!Number.isInteger(index)||index<1||index>=segments.length)throw Error('Select the second or later V1 clip to edit its opening transition');
  const prior=segments[index-1],next=segments[index],durationLimit=Math.min(2,prior.end-prior.start,next.end-next.start);
  const candidate={fromEnd:prior.end,toStart:next.start,type:patch.type||'none',
   duration:Number(patch.duration),ease:patch.ease||'easeInOut'};
  if(durationLimit<.08)throw Error('Clip too short for a transition');
  candidate.duration=Math.min(candidate.duration,durationLimit);
  checkTransitions([candidate]);
  const id=key(prior.end,next.start);
  return checkTransitions(items.filter(t=>key(t.fromEnd,t.toStart)!==id).concat(candidate.type==='none'?[]:[candidate]));
 }
 function transitionAt(segments,items,seconds){if(!finite(seconds)||segments.length<2||!items?.length)return null;
  let position=0;
  for(let i=1;i<segments.length;i++){
   position+=segments[i-1].end-segments[i-1].start;
   const prev=segments[i-1],next=segments[i],id=key(prev.end,next.start);
   const found=items.find(x=>key(x.fromEnd,x.toStart)===id&&x.type!=='none');
   if(!found)continue;
   const duration=Math.min(found.duration,prev.end-prev.start,next.end-next.start);
   if(seconds>=position-duration/2&&seconds<position+duration/2)
    return {...found,index:i,boundary:position,duration,progress:clamp((seconds-position+duration/2)/duration)};
  }return null;
 }
 function paintTransition(ctx,video,zoom,segments,items,seconds,w,h){
  const a=transitionAt(segments,items,seconds);if(!a||!video||video.readyState<2)return false;
  const p=clamp(ease(a.progress,a.ease)),after=seconds>=a.boundary;
  const amount=after?clamp((a.progress-.5)*2):0;
  ctx.save();ctx.fillStyle='#070a0c';ctx.fillRect(0,0,w,h);
  function frame(){root.MangoCreativeZoom.draw(ctx,video,zoom,seconds,w,h);}
  switch(a.type){
   case 'dipBlack':case 'dipWhite':case 'flash':
    frame();ctx.fillStyle=a.type==='dipBlack'?'#000': '#fff';
    ctx.globalAlpha=a.type==='flash'?Math.pow(1-Math.abs(2*a.progress-1),3):1-Math.abs(2*p-1);
    ctx.fillRect(0,0,w,h);break;
   case 'wipeLeft':case 'wipeRight':
    if(!after)frame();else{
     ctx.beginPath();if(a.type==='wipeLeft')ctx.rect(w*(1-amount),0,w*amount,h);else ctx.rect(0,0,w*amount,h);
     ctx.clip();frame();}break;
   case 'iris':
    if(!after)frame();else{
     ctx.beginPath();ctx.arc(w/2,h/2,Math.hypot(w,h)*amount/2,0,Math.PI*2);
     ctx.clip();frame();}break;
   case 'slideIn':
    if(!after)frame();else{ctx.translate(w*(1-amount),0);frame();}break;
   case 'zoomPunch':
    if(!after)frame();else{ctx.translate(w/2,h/2);ctx.scale(1.4-.4*amount,1.4-.4*amount);ctx.translate(-w/2,-h/2);frame();}break;
   case 'spinIn':
    if(!after)frame();else{ctx.translate(w/2,h/2);ctx.rotate((1-amount)*Math.PI*.7);ctx.scale(.5+.5*amount,.5+.5*amount);ctx.translate(-w/2,-h/2);frame();}break;
   default:ctx.restore();return false;
  }ctx.restore();return true;
 }
 root.MangoMotion={motionTypes,transitionTypes,numberTypes,easing,defaults,checkLayer,textFrame,
  letterProgress,clock,numberText,checkTransitions,setTransition,transitionAt,paintTransition};
})(typeof globalThis!=='undefined'?globalThis:this);
