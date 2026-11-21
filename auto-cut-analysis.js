/* Local-only browser analyzers for MangoShot AutoCut. No external models or APIs. */
(function(root){
 'use strict';
 const check=signal=>{if(signal?.aborted)throw new DOMException('Analysis cancelled.','AbortError');};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function audio(blob,url,options={},signal,progress=()=>{}){
  check(signal);
  if(!blob||!url)throw new Error('Import a video before starting audio analysis.');
  const Audio=root.AudioContext||root.webkitAudioContext;
  if(!Audio)throw new Error('Web Audio analysis is unavailable in this browser.');
  let context=new Audio();let decodeError=null;
  try{
   // Decode as PCM where the browser supports the audio stream inside a
   // recording container. Many Firefox/MP4 combinations cannot decode it.
   if(blob.size>300*1024*1024)throw new Error('File too large for full PCM decoding');
   progress(.03,'Decoding audio locally…');
   const ab=await blob.arrayBuffer();check(signal);
   const pcm=await context.decodeAudioData(ab);check(signal);
   const ranges=root.MangoAutoCut.silence(pcm,options);progress(1,'Audio analysis complete.');
   return {ranges,method:'decoded PCM',sourceDuration:pcm.duration};
  }catch(e){if(e.name==='AbortError')throw e;decodeError=e;}
  finally{await context.close().catch(()=>{});}
  // Fallback for MP4/WebM containers not accepted by decodeAudioData: analyze
  // the actual media element as it plays at 3x. This is a local accelerated
  // playback scan, not a remote service. It needs a user gesture to play.
  check(signal);context=new Audio();const video=document.createElement('video');let node=null,analyser=null;
  let audible=0,peak=0;
  try{
   video.src=url;video.preload='auto';video.playsInline=true;video.playbackRate=3;
   video.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;opacity:0;pointer-events:none';
   video.setAttribute('aria-hidden','true');document.body.appendChild(video);
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{clean();reject(new Error('Audio playback scan could not load the video.'));},10000);
    const clean=()=>{clearTimeout(timeout);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',fail);};
    const ready=()=>{clean();resolve();},fail=()=>{clean();reject(new Error('Media element could not decode this file.'));};
    video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',fail,{once:true});
    if(video.readyState>=1)ready();});check(signal);
   if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error('Cannot read audio stream duration.');
   node=context.createMediaElementSource(video);analyser=context.createAnalyser();analyser.fftSize=2048;
   const gain=context.createGain();gain.gain.value=0;
   node.connect(analyser);analyser.connect(gain);gain.connect(context.destination);
   await context.resume();check(signal);
   await video.play();
   const bins=new Float32Array(analyser.fftSize),threshold=Math.pow(10,(options.thresholdDb??-38)/20),samples=[];
   const started=Date.now();let last=0;
   while(!video.ended&&video.currentTime<video.duration-.02){
    check(signal);await sleep(65);check(signal);
    const t=Math.min(video.duration,video.currentTime);if(t<=last+.005){
     if(Date.now()-started>video.duration*1000+15000)throw new Error('Playback scan stalled.');continue;
    }
    analyser.getFloatTimeDomainData(bins);let rms2=0;for(let i=0;i<bins.length;i+=4)rms2+=bins[i]**2;
    const rms=Math.sqrt(rms2/(bins.length/4));peak=Math.max(peak,rms);
    if(rms>threshold)audible++;
    samples.push({start:last,end:t,inactive:rms<threshold});last=t;
    progress(Math.min(1,t/video.duration),'Scanning audio at up to 3× playback speed…');
   }
   if(audible===0)throw new Error('No measurable audio signal. Select Still screen detection for silent recordings.');
   const ranges=root.MangoAutoCut.intervalsFromFlags(samples,{minDuration:options.minDuration??1.2,padding:options.padding??.18,sourceDuration:video.duration,reason:'silence'});
   return {ranges,method:'accelerated playback',sourceDuration:video.duration};
  }catch(error){if(error.name==='AbortError')throw error;
   throw new Error('Audio scanning unavailable ('+error.message+'). Try Still screen mode.');}
  finally{video.pause();video.removeAttribute('src');video.load();video.remove();await context.close().catch(()=>{});}
 }
 function frameDifference(a,b){let sum=0,count=0;for(let i=0;i<a.length;i+=4){const da=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);sum+=da/(3*255);count++;}return count?sum/count:1;}
 function seek(video,t,signal){return new Promise((resolve,reject)=>{check(signal);
  const timer=setTimeout(()=>{clean();reject(new Error('Frame decoding timed out near '+t.toFixed(1)+' seconds.'));},6500);
  function clean(){clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',bad);}
  function done(){clean();resolve();}function bad(){clean();reject(new Error('Frame could not be decoded.'));}
  video.addEventListener('seeked',done,{once:true});video.addEventListener('error',bad,{once:true});
  try{video.currentTime=t;if(Math.abs(video.currentTime-t)<.008&&video.readyState>=2&&video.seeking===false)queueMicrotask(done);}catch(e){clean();reject(e);}
 });}
 async function still(url,sourceDuration,options={},signal,progress=()=>{}){
  check(signal);if(!url||!Number.isFinite(sourceDuration)||sourceDuration<=0)throw new Error('No valid video loaded.');
  const video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;video.src=url;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas frame analysis is unavailable.');let previous=null;const frames=[];
  const step=Math.max(.6,sourceDuration/900),end=Math.max(0,sourceDuration-.03),count=Math.ceil(end/step);
  try{
   video.style.cssText='position:fixed;left:-9999px;width:2px;height:2px';document.body.appendChild(video);
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{clean();reject(new Error('Video metadata did not load.'));},10000);
    function clean(){clearTimeout(timeout);video.removeEventListener('loadedmetadata',ok);video.removeEventListener('error',bad);}
    function ok(){clean();resolve();}function bad(){clean();reject(new Error('Cannot decode video frames.'));}
    video.addEventListener('loadedmetadata',ok,{once:true});video.addEventListener('error',bad,{once:true});if(video.readyState>=1)ok();});
   for(let i=0;i<=count;i++){
    check(signal);const target=Math.min(end,i*step);await seek(video,target,signal);
    ctx.drawImage(video,0,0,64,36);const current=ctx.getImageData(0,0,64,36).data;
    if(previous!==null){frames.push({start:Math.max(0,(i-1)*step),end:target,motion:frameDifference(previous,current)});}
    previous=current;
    if(i%4===0){progress((i+1)/(count+1),'Comparing screen motion locally…');await sleep(0);}
   }
   const ranges=root.MangoAutoCut.stillFrames(frames,{minDuration:options.minDuration??3,padding:options.padding??.25,threshold:options.motionThreshold??.009,sourceDuration});
   progress(1,'Still-screen analysis complete.');return {ranges,method:'video frame comparison',sourceDuration};
  }finally{video.pause();video.removeAttribute('src');video.load();video.remove();}
 }
 root.MangoAutoCutAnalysis={audio,still,frameDifference};
})(typeof globalThis!=='undefined'?globalThis:this);
