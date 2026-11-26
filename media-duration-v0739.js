/* Never infer real media duration from a capture clock or cursor metadata. */
(function(root){'use strict';
 const valid=t=>Number.isFinite(t)&&t>0&&t<=86400;
 function expected(capture,trace){const t=Number(capture?.seconds),end=trace?.samples?.at?.(-1)?.[0];return Math.max(capture?.schema==='mangoshot.capture.v1'&&valid(t)?t:0,typeof end==='number'&&valid(end)?end:0);}
 const mismatch=(duration,hint)=>hint>=2&&(!valid(duration)||duration<hint-Math.max(1,hint*.05));
 function wait(video,events,timeout,action,live){return new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);for(const e of events)video.removeEventListener(e,done);resolve(live());};for(const e of events)video.addEventListener(e,done,{once:true});timer=setTimeout(done,timeout);try{action?.();}catch{done();}});}
 async function resolve(video,hint=0,live=()=>true){
  if(video.readyState<2)await wait(video,['loadeddata','canplay','error'],4000,null,live);
  if(!live())throw Error('Source replaced.');
  if(video.error)throw Error('Video decoder reported an error.');
  let duration=video.duration;
  if(!valid(duration)||duration<1||mismatch(duration,hint)){
   // Early seekable.end() can represent only the first encoded frame.
   // Probe the actual end and wait for the decoder; never substitute wall time.
   await wait(video,['seeked','error'],7000,()=>{video.currentTime=1e9;},live);
   if(!live())throw Error('Source replaced.');
   duration=video.duration;
   if(!valid(duration)&&!video.seeking&&valid(video.currentTime)&&video.readyState>=2)duration=video.currentTime;
   if(!valid(duration)&&!video.seeking&&video.readyState>=2&&video.seekable?.length){const end=video.seekable.end(video.seekable.length-1);if(valid(end)&&Math.abs(video.currentTime-end)<.2)duration=end;}
   if(!live())throw Error('Source replaced.');
   try{video.currentTime=0;}catch{}
   if(video.seeking)await wait(video,['seeked','error'],5000,null,live);
  }
  if(!live())throw Error('Source replaced.');
  if(!valid(duration)||video.error||video.readyState<2||video.seeking)throw Error('Unable to verify a decodable source duration.');
  if(mismatch(duration,hint))throw Error('Duration mismatch: decoder reports '+duration.toFixed(2)+'s, capture evidence indicates at least '+hint.toFixed(1)+'s.');
  return duration;
 }
 const api={expected,mismatch,resolve};root.MangoMediaDurationV0739=Object.freeze(api);if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
