/* Native local-video streaming. A maximum of two active secondary decoders.
 * Timeline seconds are authoritative. No full-duration raster cache for video.
 * Reviewed stills use independent, paused decoders. */
(function(root){'use strict';
 const MAX_PIXELS=24000000,MAX_DECODERS=2,DRIFT_LIMIT=.32,STILL_TOLERANCE=.035,EPS=.000001;
 const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const isVideo=(c,asset)=>c.track!=='A2'&&asset(c.assetId)?.kind==='video';
 const enabled=(m,c)=>c.visible&&m.tracks[c.track].visible&&m.tracks[c.track].opacity*c.opacity>0;
 const selected=(m,t,asset)=>m.clips.filter(c=>isVideo(c,asset)&&enabled(m,c)&&c.start<=t+EPS&&t<c.end-EPS);
 const has=(m,asset)=>m.clips.some(c=>isVideo(c,asset)&&enabled(m,c));
 const sourceAt=(c,t)=>clamp(c.sourceIn+t-c.start,c.sourceIn,c.sourceOut);
 function partition(parts,m,asset){
  const marks=m.clips.filter(c=>isVideo(c,asset)&&enabled(m,c)).flatMap(c=>[c.start,c.end]).sort((a,b)=>a-b),out=[];let at=0;
  for(const p of parts){const span=p.end-p.start,end=at+span;let previous=at;
   for(const t of marks){if(t<=previous+EPS||t>=end-EPS)continue;out.push({start:p.start+previous-at,end:p.start+t-at,outputStart:previous,outputEnd:t});previous=t;}
   if(end>previous+EPS)out.push({start:p.start+previous-at,end:p.end,outputStart:previous,outputEnd:end});at=end;
  }return out;
 }
 function wait(el,event,action,signal,timeout=8000){
  return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);signal?.removeEventListener('abort',abort);};
   const ok=()=>{clean();resolve();},bad=()=>{clean();reject(Error('Local secondary video decode failed.'));},abort=()=>{clean();reject(Error('Secondary video operation cancelled.'));};
   timer=setTimeout(()=>{clean();reject(Error('Secondary video '+event+' timed out.'));},timeout);el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}try{action();}catch(e){clean();reject(e);}
  });
 }
 function inspect(v){const {videoWidth:w,videoHeight:h,duration}=v;if(!finite(duration)||duration<.1||!finite(w)||!finite(h)||w<1||h<1||w>16384||h>16384||w*h>MAX_PIXELS)throw Error('Secondary video duration or dimensions unsupported (24 MP maximum).');return {width:w,height:h,duration};}
 function release(v){if(!v)return;try{v.pause();v.removeAttribute('src');v.load();v.remove();}catch{}}
 async function open(a,signal){if(!a?.blob||!a.url||a.missing)throw Error('Relink local secondary video: '+(a?.name||'unknown'));
  const v=root.document.createElement('video');v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='auto';v.disablePictureInPicture=true;
  v.style.cssText='position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';root.document.body.appendChild(v);
  try{await wait(v,'loadeddata',()=>{v.src=a.url;v.load();},signal);inspect(v);return v;}catch(e){release(v);throw e;}
 }
 async function seek(v,t,signal){if(signal?.aborted)throw Error('Secondary video operation cancelled.');v.pause();v.playbackRate=1;const target=clamp(t,0,Math.max(0,v.duration-.002));
  if(v.seeking||v.readyState<2||Math.abs(v.currentTime-target)>.002)await wait(v,'seeked',()=>{v.currentTime=target;},signal);
  if(signal?.aborted||v.readyState<2||v.seeking||Math.abs(v.currentTime-target)>STILL_TOLERANCE)throw Error('Secondary video seek did not reach the requested frame.');return v;
 }
 async function probe(a,signal){let v;try{v=await open(a,signal);return inspect(v);}finally{release(v);}}
 function pool(asset){
  const live=new Map();let controller=null,pending=null,requested=null,generation=0,playing=false,peak=0,maxDrift=0,seeks=0;
  function pause(){playing=false;for(const v of live.values()){v.pause();v.playbackRate=1;}}
  function clear(){++generation;controller?.abort();controller=null;pending=null;requested=null;pause();for(const v of live.values())release(v);live.clear();}
  function requestKey(m,t){return JSON.stringify(selected(m,t,asset).map(c=>[c.id,asset(c.assetId)?.url,Math.round(sourceAt(c,t)*1000)]));}
  function frame(c,t,run=false){
   const v=live.get(c.id);if(!v||v.seeking||v.readyState<2||v.error)return null;
   const drift=sourceAt(c,t)-v.currentTime;maxDrift=Math.max(maxDrift,Math.abs(drift));
   if(Math.abs(drift)>(run?DRIFT_LIMIT:STILL_TOLERANCE))return null;
   if(run&&playing&&!v.paused){const rate=Math.abs(drift)<.045?1:clamp(1+drift*.6,.92,1.08);if(Math.abs(v.playbackRate-rate)>.01)v.playbackRate=rate;}
   return v;
  }
  function readyAt(m,t,run=false){return selected(m,t,asset).every(c=>!!frame(c,t,run));}
  async function prime(m,t){
   const key=requestKey(m,t),wanted=selected(m,t,asset);if(wanted.length>MAX_DECODERS)throw Error('Secondary video decoder limit exceeded.');
   if(pending&&requested===key)return pending;
   if(!pending&&!playing&&readyAt(m,t)){const ids=new Set(wanted.map(c=>c.id));for(const [id,v] of live){if(!ids.has(id)){release(v);live.delete(id);}}requested=key;return;}
   // A superseded in-flight seek must never publish frames to the newer request.
   if(pending){clear();}else pause();
   const run=++generation;requested=key;controller=new AbortController();const signal=controller.signal;
   pending=Promise.resolve().then(async()=>{
    const ids=new Set(wanted.map(c=>c.id));for(const [id,v] of live){if(!ids.has(id)){release(v);live.delete(id);}}
    for(const c of wanted){if(signal.aborted||run!==generation)throw Error('Secondary video operation cancelled.');
     const a=asset(c.assetId);let v=live.get(c.id);if(v&&v.src!==a.url){release(v);live.delete(c.id);v=null;}
     if(!v){v=await open(a,signal);if(signal.aborted||run!==generation){release(v);throw Error('Secondary video operation cancelled.');}live.set(c.id,v);peak=Math.max(peak,live.size);}
     if(c.sourceOut>v.duration+.03)throw Error('Secondary clip exceeds decoded source duration.');
     await seek(v,sourceAt(c,t),signal);seeks++;
    }
   }).catch(e=>{if(run===generation){for(const v of live.values())release(v);live.clear();}throw e;}).finally(()=>{if(run===generation){pending=null;controller=null;}});
   return pending;
  }
  async function start(m,t){await prime(m,t);const run=generation;const videos=selected(m,t,asset).map(c=>live.get(c.id));playing=true;
   try{await Promise.all(videos.map(v=>v.play()));if(run!==generation)throw Error('Secondary playback was superseded.');}catch(e){if(run===generation)pause();throw e;}
  }
  return {prime,start,pause,clear,frame,readyAt,stats:()=>({activeDecoders:live.size,peakDecoders:peak,maxDrift,seeks,playing,preparing:!!pending})};
 }
 function recorderEvent(rec,event,action){return new Promise((resolve,reject)=>{let timer;const done=()=>{clean();resolve();},bad=()=>{clean();reject(Error('Recorder '+event+' failed.'));},clean=()=>{clearTimeout(timer);rec.removeEventListener(event,done);rec.removeEventListener('error',bad);};timer=setTimeout(bad,5000);rec.addEventListener(event,done,{once:true});rec.addEventListener('error',bad,{once:true});try{action();}catch(e){clean();reject(e);}});}
 // Pause the encoder across source-seek barriers. The primary clock, secondary
 // videos, and imported/voiceover audio resume on the same retained interval.
 async function exportRanges({parts,primary,recorder,seekPrimary,prime,start,pause,draw,progress,stop,frame=()=>new Promise(r=>root.requestAnimationFrame(r)),clock=()=>root.performance.now()}){
  const total=parts.at(-1)?.outputEnd||0;if(!total)throw Error('No playable sequence.');
  let started=false;
  for(const p of parts){if(stop())break;primary.pause();pause();
   if(recorder.state==='recording')await recorderEvent(recorder,'pause',()=>recorder.pause());
   await seekPrimary(p.start);if(stop())break;await prime(p.outputStart);if(stop())break;
   if(primary.readyState<2)await wait(primary,'loadeddata',()=>{},null);
   draw(p.outputStart,false);
   if(!started){recorder.start(800);started=true;}else await recorderEvent(recorder,'resume',()=>recorder.resume());
   await Promise.all([start(p.outputStart),primary.play()]);
   let prior=primary.currentTime,last=clock();
   while(!stop()){
    const now=primary.currentTime,output=Math.min(p.outputEnd-.00001,p.outputStart+Math.max(0,now-p.start));
    if(primary.error)throw Error('Primary video decode failed during export.');
    if(primary.ended||now>=p.end-.008)break;
    if(now>prior+.001){prior=now;last=clock();}else if(clock()-last>8000)throw Error('Primary playback stalled during export.');
    draw(Math.max(p.outputStart,output),true);progress(Math.max(p.outputStart,output),total);await frame();
   }
   primary.pause();pause();
   if(recorder.state==='recording')await recorderEvent(recorder,'pause',()=>recorder.pause());
  }
  primary.pause();pause();if(!stop())progress(total,total);return started;
 }
 const api=Object.freeze({MAX_PIXELS,MAX_DECODERS,DRIFT_LIMIT,STILL_TOLERANCE,isVideo,enabled,selected,has,sourceAt,partition,probe,pool,exportRanges});
 root.MangoStreamingV0718=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
