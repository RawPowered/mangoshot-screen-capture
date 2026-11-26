/* Bounded native A/V decoders on an independent sequence clock.
 * Uses the existing Carbon compositor and graphic renderer. No synthetic V1. */
(function(root){'use strict';
 const P=root.MangoIndependentSequenceV0719,C=root.MangoCompositorV0714,G=root.MangoGraphics;
 const abortError=()=>Error('Sequence operation cancelled.'),assertLive=s=>{if(s?.aborted)throw abortError();},clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const DRIFT=.32,MAX_ACTIVE=6;
 function wait(el,event,action,signal,timeout=8000){return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);signal?.removeEventListener('abort',abort);},ok=()=>{clean();resolve();},bad=()=>{clean();reject(Error('Local media '+event+' failed.'));},abort=()=>{clean();reject(abortError());};timer=setTimeout(()=>{clean();reject(Error('Local media '+event+' timed out.'));},timeout);el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}try{action();}catch(e){clean();reject(e);}});}
 function closeMedia(v){if(!v)return;try{v.pause();v.removeAttribute('src');v.load();v.remove();}catch{}}
 async function openMedia(a,signal){assertLive(signal);if(!a?.url||!a.blob||a.missing)throw Error('Relink local source: '+(a?.name||'unknown'));
  const v=root.document.createElement(a.kind==='video'?'video':'audio');v.preload='auto';v.muted=true;v.playsInline=true;v.disablePictureInPicture=true;v.style.cssText='position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';root.document.body.appendChild(v);
  try{await wait(v,'loadeddata',()=>{v.src=a.url;v.load();},signal);assertLive(signal);return v;}catch(e){closeMedia(v);throw e;}
 }
 async function inspect(a,signal){
  if(!a?.blob||a.missing)throw Error('Relink '+(a?.name||'local source'));assertLive(signal);
  if(a.kind==='image'){const image=await root.createImageBitmap(a.blob);try{assertLive(signal);return {duration:null,width:image.width,height:image.height};}finally{image.close();}}
  let v;try{v=await openMedia(a,signal);return {duration:v.duration,width:a.kind==='video'?v.videoWidth:null,height:a.kind==='video'?v.videoHeight:null};}finally{closeMedia(v);}
 }
 async function seek(v,t,signal){assertLive(signal);v.pause();v.playbackRate=1;const target=clamp(t,0,Math.max(0,v.duration-.002));
  if(v.seeking||v.readyState<2||Math.abs(v.currentTime-target)>.002)await wait(v,'seeked',()=>{v.currentTime=target;},signal);
  assertLive(signal);if(v.error||v.seeking||v.readyState<2||Math.abs(v.currentTime-target)>.04)throw Error('Source did not decode at the requested timestamp.');
 }
 const sameMeta=(a,m)=>a.kind==='image'?a.width===m.width&&a.height===m.height:Number.isFinite(m.duration)&&Math.abs(a.duration-m.duration)<.12&&(a.kind!=='video'||a.width===m.width&&a.height===m.height);
 function validateSources(project,registry){if(project.clips.some(c=>['spatial','scene'].includes(c.callout3d?.mode)))root.MangoSpatialRendererV0730.requireRenderer();for(const c of project.clips){if(P.graphic(c.track))continue;const a=P.asset(project,c),entry=registry.get(c.assetId);if(!a||!entry||entry.missing||!entry.blob||!entry.url||entry.size!==a.size||entry.kind!==a.kind||entry.name!==a.name)throw Error('Relink missing or mismatched source: '+(a?.name||c.assetId));C?.requireSupport(c.grade);}}
 async function preflight(project,registry,signal){const p=P.check(project);validateSources(p,registry);const seen=new Set();
  for(const c of p.clips){if(P.graphic(c.track)||seen.has(c.assetId))continue;seen.add(c.assetId);const a=P.asset(p,c),m=await inspect(registry.get(c.assetId),signal);if(!sameMeta(a,m))throw Error('Decoded source metadata does not match saved project: '+a.name);}
  return p;
 }
 function createPool(project,registry,signal,ctx=null,dest=null){
  const entries=new Map();let peak=0,maxDrift=0,seeks=0;const focusRenderer=root.MangoSmartFocusV0737?.renderer();
  function release(e){try{e.node?.disconnect();e.gain?.disconnect();}catch{}closeMedia(e.media);e.image?.close();}
  function pause(){for(const e of entries.values())if(e.media){e.media.pause();e.media.playbackRate=1;if(e.gain)e.gain.gain.value=0;}}
  function clear(){pause();for(const e of entries.values())release(e);entries.clear();focusRenderer?.clear();}
  function at(t){return P.needed(project,t);}
  async function prime(t){assertLive(signal);pause();const wanted=at(t),ids=new Set(wanted.map(c=>c.id));if(wanted.length>MAX_ACTIVE)throw Error('Active media decoder budget exceeded.');
   for(const [id,e] of entries)if(!ids.has(id)){release(e);entries.delete(id);}
   for(const c of wanted){assertLive(signal);const a=registry.get(c.assetId),meta=P.asset(project,c);let e=entries.get(c.id);
    if(!e){e={};try{if(meta.kind==='image'){e.image=await root.createImageBitmap(a.blob);if(e.image.width!==meta.width||e.image.height!==meta.height)throw Error('Still image dimensions changed.');}
      else{e.media=await openMedia(a,signal);const v=e.media;if(!sameMeta(meta,{duration:v.duration,width:v.videoWidth,height:v.videoHeight}))throw Error('Decoded source metadata differs: '+meta.name);
       if(ctx&&dest&&P.sound(project,c)){e.node=ctx.createMediaElementSource(v);e.gain=ctx.createGain();e.gain.gain.value=0;e.node.connect(e.gain);e.gain.connect(dest);v.muted=false;}
      }assertLive(signal);entries.set(c.id,e);peak=Math.max(peak,entries.size);
     }catch(err){release(e);throw err;}}
    if(e.media){await seek(e.media,P.sourceAt(c,t),signal);seeks++;}
   }
  }
  function sync(t,running){assertLive(signal);for(const c of at(t)){const e=entries.get(c.id);if(!e)throw Error('Required media decoder is missing.');
    if(e.media){const v=e.media,target=P.sourceAt(c,t),drift=target-v.currentTime;maxDrift=Math.max(maxDrift,Math.abs(drift));
     if(v.error||v.seeking||v.readyState<2||Math.abs(drift)>(running?DRIFT:.045))throw Error('Media synchronization exceeded tolerance: '+P.asset(project,c).name);
     const nominal=P.rateAt(c,t);if(running&&!v.paused){const rate=clamp(nominal+(Math.abs(drift)<.045?0:clamp(drift*.6,-.12,.12)),.25,4);if(Math.abs(v.playbackRate-rate)>.008)v.playbackRate=rate;}else if(!running)v.playbackRate=nominal;
     if(e.gain){const g=P.mix(project,c,t).gain;if(running)e.gain.gain.setTargetAtTime(g,ctx.currentTime,.012);else e.gain.gain.value=g;}
    }
   }}
  async function start(t){assertLive(signal);sync(t,false);await Promise.all([...entries.values()].filter(e=>e.media).map(e=>e.media.play()));assertLive(signal);}
  function draw(canvas,t,running=false){const p=project,{width:w,height:h,background}=p.settings,q=canvas.getContext('2d',{alpha:false});if(!q)throw Error('Canvas renderer unavailable.');
   sync(t,running);q.save();try{q.globalAlpha=1;q.filter='none';q.fillStyle=background;q.fillRect(0,0,w,h);
    for(const c of P.active(p,t)){if(!P.visual(c.track)||!P.show(p,c))continue;const e=entries.get(c.id),f=e?.image||e?.media;if(!f)throw Error('Required visual frame unavailable.');
     const dw=c.width*w,dh=c.height*h,r=P.fit(f.videoWidth||f.width,f.videoHeight||f.height,dw,dh,c.fit);q.save();try{q.translate(c.x*w,c.y*h);q.beginPath();q.rect(0,0,dw,dh);q.clip();q.globalAlpha=P.mix(p,c,t).opacity;q.filter=C?.filter(c.grade,h/1080)||'none';q.drawImage(f,r.x,r.y,r.w,r.h);}finally{q.restore();}
    }
    const graphics=P.active(p,t).filter(c=>P.graphic(c.track)&&P.show(p,c));const clean=graphics.some(c=>c.focus?.mode==='lens')?focusRenderer.capture(canvas):null;
    for(const c of graphics){if(P.dimensional(c.track)){const b={x:c.x*w,y:c.y*h,width:c.width*w,height:c.height*h},opacity=P.mix(p,c,t).opacity;if(c.callout2d){const u=(t-c.start)/(c.end-c.start),m=c.calloutMotion?root.MangoCalloutMotionV0736.evaluate(c.calloutMotion,c,c.callout2d,u):null;const recipe=m?m.recipe:c.callout2d,box=m?{x:m.pose.x*w,y:m.pose.y*h,width:m.pose.width*w,height:m.pose.height*h}:b,alpha=m?m.pose.opacity*p.tracks[c.track].opacity*P.fade(c,t):opacity;if(c.focus)focusRenderer.paint(q,c.focus,recipe,box,alpha,u,w,h,clean);else root.MangoCalloutV0735.paint(q,recipe,box,alpha,u,w,h);}else if(c.sceneMotion){const m=root.MangoUnifiedSceneMotionV0734.evaluate(c.sceneMotion,(t-c.start)/(c.end-c.start),c.callout3d);root.MangoSpatialRendererV0730.paint(q,m.scene,b,opacity,1,true,m.reveals);}else if(c.spatialMotion){const m=root.MangoSpatialMotionV0731.evaluate(c.spatialMotion,(t-c.start)/(c.end-c.start),c.callout3d);root.MangoSpatialRendererV0730.paint(q,m.value,b,opacity,m.reveal,true);}else root.MangoDimensionalV0729.paint(q,c.callout3d,b,opacity);continue;}const g=G.create('text',c.preset,c.start,{id:c.id,start:c.start,end:c.end,text:c.text,x:c.x,y:c.y,width:c.width,fontSize:c.fontSize,color:c.color,opacity:c.opacity*p.tracks.G1.opacity,fadeIn:c.fadeIn,fadeOut:c.fadeOut});G.render(q,[g],t,w,h);}
   }finally{q.restore();}
  }
  return {prime,start,pause,clear,draw,stats:()=>({active:entries.size,peak,maxDrift,seeks})};
 }
 async function still(project,registry,canvas,t,signal){const p=P.check(project);validateSources(p,registry);const pool=createPool(p,registry,signal);try{await pool.prime(t);pool.draw(canvas,t);return pool.stats();}finally{pool.clear();}}
 const frame=signal=>new Promise((resolve,reject)=>{let id=0;const finish=()=>{signal?.removeEventListener('abort',cancel);root.document.removeEventListener('visibilitychange',hidden);};const cancel=()=>{root.cancelAnimationFrame(id);finish();reject(abortError());};const hidden=()=>{if(root.document.hidden){root.cancelAnimationFrame(id);finish();reject(Error('Keep Sequence Studio visible during playback/export.'));}};if(signal?.aborted){reject(abortError());return;}signal?.addEventListener('abort',cancel,{once:true});root.document.addEventListener('visibilitychange',hidden);id=root.requestAnimationFrame(()=>{finish();resolve();});});
 async function run({project,registry,canvas,from=0,signal,ctx,destination,recorder=null,requestFrame=()=>{},onTime=()=>{}}){
  const p=await preflight(project,registry,signal);assertLive(signal);const pool=createPool(p,registry,signal,ctx,destination);let recorded=false,t=from;
  try{
   const intervals=P.intervals(p,from);for(const [index,interval] of intervals.entries()){
    assertLive(signal);if(root.document.hidden)throw Error('Keep Sequence Studio visible during playback/export.');
    pool.pause();if(recorder?.state==='recording')await wait(recorder,'pause',()=>recorder.pause(),signal,5000);
    t=interval.start;await pool.prime(t);pool.draw(canvas,t);onTime(t,pool.stats());
    assertLive(signal);
    if(recorder){if(!recorded){recorder.start(800);recorded=true;}else if(recorder.state==='paused')await wait(recorder,'resume',()=>recorder.resume(),signal,5000);}
    if(recorder){pool.draw(canvas,t);requestFrame();}
    await pool.start(t);const began=root.performance.now(),span=interval.end-interval.start;
    while(true){assertLive(signal);if(root.document.hidden)throw Error('Keep Sequence Studio visible during playback/export.');
     const elapsed=(root.performance.now()-began)/1000;if(elapsed>=span)break;
     t=Math.min(interval.end-2*P.EPS,interval.start+elapsed);pool.draw(canvas,t,true);if(recorder)requestFrame();onTime(t,pool.stats());await frame(signal);
    }
    pool.pause();if(index<intervals.length-1&&recorder?.state==='recording')await wait(recorder,'pause',()=>recorder.pause(),signal,5000);
    t=interval.end;
   }
   onTime(p.settings.duration,pool.stats());return {recorded,stats:pool.stats()};
  }finally{pool.clear();}
 }
 root.MangoIndependentRuntimeV0719=Object.freeze({DRIFT,MAX_ACTIVE,inspect,sameMeta,validateSources,preflight,createPool,still,run});
})(typeof globalThis!=='undefined'?globalThis:this);
