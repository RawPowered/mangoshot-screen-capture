/* Cinematic Studio: centered, handle-based two-frame transitions. All media is local.
 * Frame preparation uses bounded raster samples and never changes timeline or audio timing. */
(function(root){'use strict';
 const FPS=24,BUDGET=96*1024*1024,MAX_SAMPLES=180;
 const catalog=Object.freeze([
 ['crossDissolve','Cross dissolve','Softly blend the outgoing and incoming moving images.'],
 ['dualWipeLeft','Cinematic wipe left','Reveal the incoming image from the right.'],
 ['dualWipeRight','Cinematic wipe right','Reveal the incoming image from the left.'],
 ['dualWipeUp','Cinematic wipe up','Reveal the incoming image from the bottom.'],
 ['dualWipeDown','Cinematic wipe down','Reveal the incoming image from the top.'],
 ['dualIris','Iris reveal','Open a circular aperture over the outgoing frame.'],
 ['dualPushLeft','Push left','Move both images across the frame together.'],
 ['dualPushRight','Push right','Move both images across the frame together.'],
 ['dualZoom','Zoom dissolve','Scale both images with a soft dissolve.'],
 ['dualWhip','Whip pan','Accelerated horizontal push with a brief motion trail.']
 ].map(([id,name,description])=>Object.freeze({id,name,description})));
 const ids=catalog.map(c=>c.id),isType=id=>ids.includes(id);
 const clamp=n=>Math.max(0,Math.min(1,n));
 const boundaryKey=(a,b)=>a.toFixed(5)+':'+b.toFixed(5);
 function plans(parts,items,sourceDuration){
  if(!Number.isFinite(sourceDuration)||sourceDuration<=0)throw Error('Invalid source duration.');
  const result=[];let boundary=0;
  for(let index=1;index<parts.length;index++){
   const a=parts[index-1],b=parts[index];boundary+=a.end-a.start;
   const tr=items.find(x=>isType(x.type)&&boundaryKey(x.fromEnd,x.toStart)===boundaryKey(a.end,b.start));
   if(!tr)continue;
   const duration=Math.min(tr.duration,a.end-a.start,b.end-b.start,2),half=duration/2;
   if(!Number.isFinite(duration)||duration<.08||a.end+half>sourceDuration+.00001||b.start-half<-.00001)
    throw Error('Cut '+index+' needs '+Math.max(.04,half).toFixed(2)+'s of source handles on both sides. Shorten the transition or use a legacy cut treatment.');
   result.push({...tr,index,boundary,duration,half,start:boundary-half,end:boundary+half,count:Math.max(2,Math.ceil(duration*FPS)+1)});
  }
  if(items.some(t=>isType(t.type)&&!result.some(r=>boundaryKey(r.fromEnd,r.toStart)===boundaryKey(t.fromEnd,t.toStart))))throw Error('Cinematic transition has no matching cut.');
  if(result.reduce((n,p)=>n+p.count,0)>MAX_SAMPLES)throw Error('Cinematic preparation limit exceeded. Shorten or remove some two-frame transitions.');
  return result;
 }
 function times(plan,progress,sourceDuration){
  const delta=(clamp(progress)-.5)*plan.duration;
  return {outgoing:Math.max(0,Math.min(sourceDuration-.001,plan.fromEnd+delta)),incoming:Math.max(0,Math.min(sourceDuration-.001,plan.toStart+delta))};
 }
 function dimensions(width,height,ps){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw Error('Video dimensions are unavailable.');
  const frames=ps.reduce((n,p)=>n+p.count*2,0);
  if(!frames)return {width,height,bytes:0};
  const scale=Math.min(1,1920/width,1080/height,Math.sqrt(BUDGET/(4*frames*width*height)));
  const w=Math.max(1,Math.floor(width*scale)),h=Math.max(1,Math.floor(height*scale));
  if(Math.max(w,h)<Math.min(640,Math.max(width,height)))throw Error('Cinematic frame budget exceeded. Reduce transition count or duration.');
  return {width:w,height:h,bytes:4*w*h*frames};
 }
 function ease(t,name){t=clamp(t);if(name==='easeIn')return t*t*t;if(name==='easeOut')return 1-(1-t)**3;
  if(name==='easeInOut')return t<.5?4*t*t*t:1-(-2*t+2)**3/2;if(name==='back')return clamp(1+2.70158*(t-1)**3+1.70158*(t-1)**2);return t;}
 function composite(ctx,a,b,type,progress,w,h,zoom=[],seconds=0,easing='linear'){
  if(!isType(type)||!a||!b)throw Error('Two decoded frames are required.');
  const p=ease(progress,easing);
  const draw=frame=>{if(root.MangoCreativeZoom)root.MangoCreativeZoom.draw(ctx,frame,zoom,seconds,w,h);else ctx.drawImage(frame,0,0,w,h);};
  function move(frame,x,y,scale=1,alpha=1){ctx.save();try{ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.translate(w/2,h/2);ctx.scale(scale,scale);ctx.translate(-w/2,-h/2);draw(frame);}finally{ctx.restore();}}
  ctx.save();
  try{
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
   if(p<=0){draw(a);return;}if(p>=1){draw(b);return;}
   if(type==='crossDissolve'){draw(a);move(b,0,0,1,p);return;}
   if(type==='dualZoom'){move(a,0,0,1+.10*p);move(b,0,0,1+.16*(1-p),p);return;}
   if(type==='dualPushLeft'||type==='dualPushRight'||type==='dualWhip'){
    const dir=type==='dualPushRight'?1:-1,q=type==='dualWhip'?p*p*(3-2*p):p;
    move(a,dir*w*q,0);move(b,-dir*w*(1-q),0);
    if(type==='dualWhip'){const trail=Math.sin(Math.PI*q)*.16;move(a,dir*w*q-dir*w*.035,0,1,trail);move(b,-dir*w*(1-q)-dir*w*.035,0,1,trail);}
    return;
   }
   draw(a);ctx.beginPath();
   if(type==='dualIris')ctx.arc(w/2,h/2,Math.hypot(w,h)*p/2,0,Math.PI*2);
   else if(type==='dualWipeLeft')ctx.rect(w*(1-p),0,w*p,h);
   else if(type==='dualWipeRight')ctx.rect(0,0,w*p,h);
   else if(type==='dualWipeUp')ctx.rect(0,h*(1-p),w,h*p);
   else ctx.rect(0,0,w,h*p);
   ctx.clip();draw(b);
  }finally{ctx.restore();}
 }
 function event(video,name,action,signal){
  return new Promise((resolve,reject)=>{
   const cleanup=()=>{clearTimeout(timer);video.removeEventListener(name,done);video.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
   const done=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('Cinematic source decoding failed.'));},aborted=()=>{cleanup();reject(Error('Cinematic preparation cancelled.'));};
   const timer=setTimeout(()=>{cleanup();reject(Error('Cinematic source seek timed out.'));},7000);
   video.addEventListener(name,done,{once:true});video.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});
   if(signal?.aborted){aborted();return;}try{action();}catch(e){cleanup();reject(e);}
  });
 }
 function decoder(url,signal){
  const video=root.document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  return {video,ready:event(video,'loadeddata',()=>{video.src=url;video.load();},signal),close(){video.pause();video.removeAttribute('src');video.load();}};
 }
 async function frame(v,time,w,h,signal){
  if(signal?.aborted)throw Error('Cinematic preparation cancelled.');
  if(Math.abs(v.currentTime-time)>.0001||v.seeking)await event(v,'seeked',()=>{v.currentTime=time;},signal);
  if(v.readyState<2)throw Error('Decoded frame unavailable.');
  const canvas=root.document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d',{alpha:false}).drawImage(v,0,0,w,h);
  return canvas;
 }
 function createCache(){
  let key=null,entries=new Map(),promise=null,controller=null,error=null,quality=null;
  const signature=(url,duration,parts,items)=>JSON.stringify([url,duration,parts,items.filter(t=>isType(t.type))]);
  function clear(){controller?.abort();controller=null;for(const list of entries.values())for(const pair of list){pair.a.width=0;pair.b.width=0;}entries.clear();key=null;promise=null;error=null;quality=null;}
  function prepare(url,duration,parts,items,width,height,notify=()=>{}){
   const wanted=signature(url,duration,parts,items);
   if(key===wanted){if(error)return Promise.reject(error);if(promise)return promise;return Promise.resolve(quality);}
   clear();key=wanted;
   let ps,dim;try{ps=plans(parts,items,duration);dim=dimensions(width,height,ps);}catch(e){error=e;return Promise.reject(e);}
   quality={...dim,fps:FPS,transitions:ps.length};
   if(!ps.length)return Promise.resolve(quality);
   controller=new AbortController();const signal=controller.signal,local=new Map();
   promise=(async()=>{
    const left=decoder(url,signal),right=decoder(url,signal);let done=0;const total=ps.reduce((n,p)=>n+p.count,0);
    try{
     await Promise.all([left.ready,right.ready]);
     for(const p of ps){const list=[];local.set(p.index,list);
      for(let i=0;i<p.count;i++){
       const t=times(p,i/(p.count-1),duration),pair=await Promise.all([frame(left.video,t.outgoing,dim.width,dim.height,signal),frame(right.video,t.incoming,dim.width,dim.height,signal)]);
       if(signal.aborted){pair[0].width=0;pair[1].width=0;throw Error('Cinematic preparation cancelled.');}
       list.push({a:pair[0],b:pair[1]});notify(++done,total);
      }
     }
     if(signal.aborted||key!==wanted)throw Error('Cinematic preparation cancelled.');
     entries=local;return quality;
    }catch(e){for(const list of local.values())for(const pair of list){pair.a.width=0;pair.b.width=0;}if(key===wanted)error=e;throw e;}
    finally{left.close();right.close();if(key===wanted){promise=null;controller=null;}}
   })();
   return promise;
  }
  function ready(url,duration,parts,items){return key===signature(url,duration,parts,items)&&!promise&&!error&&!!quality;}
  function paint(ctx,url,duration,parts,items,t,w,h,zoom=[]){
   const active=root.MangoMotion.transitionAt(parts,items,t);
   if(!active||!isType(active.type))return false;
   if(!ready(url,duration,parts,items))return false;
   const samples=entries.get(active.index);if(!samples?.length)return false;
   const p=samples[Math.min(samples.length-1,Math.max(0,Math.round(active.progress*(samples.length-1))))];
   composite(ctx,p.a,p.b,active.type,active.progress,w,h,zoom,t,active.ease);return true;
  }
  return {prepare,ready,paint,clear};
 }
 async function exact(ctx,url,duration,parts,items,t,w,h,zoom=[],signal){
  const active=root.MangoMotion.transitionAt(parts,items,t);if(!active||!isType(active.type))return false;
  const p=plans(parts,items,duration).find(x=>x.index===active.index);if(!p)throw Error('Transition cut unavailable.');
  const left=decoder(url,signal),right=decoder(url,signal);
  try{await Promise.all([left.ready,right.ready]);const at=times(p,active.progress,duration),[a,b]=await Promise.all([frame(left.video,at.outgoing,w,h,signal),frame(right.video,at.incoming,w,h,signal)]);try{composite(ctx,a,b,p.type,active.progress,w,h,zoom,t,p.ease);}finally{a.width=0;b.width=0;}return true;}
  finally{left.close();right.close();}
 }
 const api=Object.freeze({FPS,BUDGET,MAX_SAMPLES,catalog,ids,isType,plans,times,dimensions,ease,composite,createCache,exact});
 root.MangoCinematicV0713=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
