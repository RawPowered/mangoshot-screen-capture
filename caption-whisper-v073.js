/* MangoShot v0.7.3 — on-device Whisper, timed words -> CC1 captions.
 * User consent is required before any model download; media bytes are never
 * uploaded. Audio decoding uses the browser and can fall back to realtime
 * silent media playback when decodeAudioData cannot decode a video container.
 */
(function(root){'use strict';
 const MAX_SECONDS=20*60,MAX_BYTES=300*1024*1024,SAMPLE_RATE=16000;
 const codeword=word=>String(word?.text||'').replace(/[\u0000-\u001f]/g,'').trim();
 const validateWord=w=>codeword(w)&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start;
 function inSequence(words,parts){
  const rows=root.MangoSequenceMedia.sections(parts),found=[];
  for(const word of words){
   if(!validateWord(word))continue;
   for(const row of rows){
    const a=Math.max(row.sourceStart,word.start),b=Math.min(row.sourceEnd,word.end);
    if(b-a<.035)continue;
    const start=row.outputStart+a-row.sourceStart,end=row.outputStart+b-row.sourceStart;
    found.push({text:codeword(word),start,end,row:row.index});break;
   }
  }
  return found.sort((a,b)=>a.start-b.start||a.end-b.end);
 }
 function toCues(words,segments,options={}){
  const mapped=inSequence(words,segments),maxWords=Math.max(1,Math.min(8,Number(options.maxWords)||4)),
   maxSeconds=Math.max(.55,Math.min(5,Number(options.maxSeconds)||2.5)),cues=[];let current=[];
  function flush(){
   if(!current.length)return;
   const start=current[0].start,end=current[current.length-1].end;
   const text=current.map(w=>w.text).join(' ').slice(0,350);
   if(end-start>=.04&&text)cues.push({id:'cc-whisper-'+(cues.length+1),start,end,text,
    words:current.map(w=>({text:w.text,start:w.start,end:w.end}))});
   current=[];
  }
  for(const word of mapped){
   const first=current[0],last=current[current.length-1];
   if(first&&(current.length>=maxWords||word.start-last.end>.45||
    word.end-first.start>maxSeconds||word.row!==first.row||/[.!?]$/.test(last.text)))flush();
   current.push(word);
  }
  flush();
  return root.MangoCaptionsV072.check(cues,root.MangoSequenceMedia.duration(segments));
 }
 function resample(buffer,rate){
  const from=Number(buffer.sampleRate),len=Number(buffer.length);
  if(!Number.isFinite(from)||from<8000||!Number.isInteger(len)||len<=0||!buffer.numberOfChannels)
   throw Error('No decoded source audio available');
  const result=new Float32Array(Math.ceil(len*rate/from)),channels=Math.min(2,buffer.numberOfChannels);
  const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<result.length;i++){
   const t=i*from/rate,lo=Math.min(len-1,Math.floor(t)),hi=Math.min(len-1,lo+1),delta=t-lo;
   let sum=0;for(const ch of data)sum+=ch[lo]*(1-delta)+ch[hi]*delta;
   result[i]=sum/channels;
  }
  return result;
 }
 function energy(pcm){
  const stride=Math.max(1,Math.floor(pcm.length/50000));
  let sum=0,n=0;
  for(let i=0;i<pcm.length;i+=stride){sum+=pcm[i]*pcm[i];n++;}
  return Math.sqrt(sum/Math.max(1,n));
 }
 const abortCheck=signal=>{if(signal.aborted)throw new Error('Transcription cancelled');};
 async function decode(blob,url,signal,status=()=>{}){
  const Audio=root.AudioContext||root.webkitAudioContext;
  if(!Audio)throw Error('Web Audio is not available in this browser');
  let pcm=null;
  if(blob.size<=MAX_BYTES){
   let ctx=null;
   try{
    status('Decoding the recording audio on this device…');
    ctx=new Audio();const data=await blob.arrayBuffer();abortCheck(signal);
    const audio=await ctx.decodeAudioData(data);abortCheck(signal);
    pcm=resample(audio,SAMPLE_RATE);
   }catch(err){
    if(signal.aborted)throw err;
    status('Container decoder unavailable; scanning the source audio locally in real time…');
   }finally{await ctx?.close?.().catch(()=>{});}
  }
  if(!pcm){
   // The same fallback pattern as MangoShot AutoCut: create an isolated media
   // element, capture decoded PCM into JS while staying completely silent.
   let ctx=null,media=null,processor=null;
   const chunks=[];let count=0;
   try{
    ctx=new Audio({sampleRate:SAMPLE_RATE});
    if(typeof ctx.createScriptProcessor!=='function')
     throw Error('This browser does not support local PCM extraction from the video file');
    media=root.document.createElement('video');media.src=url;media.preload='auto';media.playsInline=true;
    media.style.cssText='position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    media.setAttribute('aria-hidden','true');root.document.body.append(media);
    const meta=()=>new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>{clear();reject(Error('Audio source did not load'));},12000);
     const clear=()=>{clearTimeout(timeout);media.removeEventListener('loadedmetadata',ok);media.removeEventListener('error',fail);};
     const ok=()=>{clear();resolve();},fail=()=>{clear();reject(Error('Source video is not decodable'));};
     media.addEventListener('loadedmetadata',ok,{once:true});
     media.addEventListener('error',fail,{once:true});
     if(media.readyState>=1)ok();
    });
    await meta();abortCheck(signal);
    if(media.duration>MAX_SECONDS)throw Error('Transcription currently supports recordings up to 20 minutes');
    const source=ctx.createMediaElementSource(media),mute=ctx.createGain();mute.gain.value=0;
    processor=ctx.createScriptProcessor(4096,2,1);
    source.connect(processor);processor.connect(mute);mute.connect(ctx.destination);
    processor.onaudioprocess=e=>{
     if(signal.aborted)return;
     const input=e.inputBuffer,n=input.length,channels=Math.min(2,input.numberOfChannels);
     const slice=new Float32Array(n);
     const a=input.getChannelData(0),b=channels>1?input.getChannelData(1):null;
     for(let i=0;i<n;i++)slice[i]=b?(a[i]+b[i])*.5:a[i];
     if(count+n>MAX_SECONDS*ctx.sampleRate)return;
     chunks.push(slice);count+=n;
     status('Capturing source audio silently · '+Math.min(100,Math.round(media.currentTime/media.duration*100))+'%');
    };
    await ctx.resume();abortCheck(signal);
    await new Promise((resolve,reject)=>{
     const end=()=>{clear();resolve()},failed=()=>{clear();reject(Error('Audio capture failed'))};
     const cancelled=()=>{clear();reject(Error('Transcription cancelled'))};
     const clear=()=>{media.removeEventListener('ended',end);media.removeEventListener('error',failed);signal.removeEventListener('abort',cancelled);};
     media.addEventListener('ended',end,{once:true});media.addEventListener('error',failed,{once:true});
     signal.addEventListener('abort',cancelled,{once:true});
     media.play().catch(error=>{clear();reject(Error('Browser blocked local audio playback: '+error.message));});
    });
    abortCheck(signal);
    const samples=new Float32Array(count);let at=0;
    for(const chunk of chunks){samples.set(chunk,at);at+=chunk.length;}
    pcm=ctx.sampleRate===SAMPLE_RATE?samples:resample({
     sampleRate:ctx.sampleRate,length:samples.length,numberOfChannels:1,getChannelData:()=>samples
    },SAMPLE_RATE);
   }finally{
    if(processor)processor.onaudioprocess=null;
    try{media?.pause?.();media?.removeAttribute?.('src');media?.load?.();media?.remove?.();}catch{}
    try{processor?.disconnect?.();}catch{}
    await ctx?.close?.().catch(()=>{});
   }
  }
  abortCheck(signal);
  if(!pcm?.length||pcm.length/SAMPLE_RATE>MAX_SECONDS+1)
   throw Error('Recording is too long for local transcription');
  if(energy(pcm)<.0002)throw Error('No measurable spoken audio detected in this recording');
  return pcm;
 }
 function create(view,callbacks={}){
  if(!root.Worker)throw Error('This browser does not support background AI workers');
  if(!view?.original?.()||!view?.url?.())throw Error('Import a video first');
  const ctrl=new AbortController();let worker=null;
  const status=text=>callbacks.status?.(text);
  function cancel(){ctrl.abort();worker?.terminate?.();worker=null;}
  async function run(language='en-US',options={}){
   if(!options.consent)throw Error('Approve the one-time local model download before generating captions');
   const video=view.original(),url=view.url(),parts=view.segments().map(s=>({...s})),duration=view.duration();
   if(duration>MAX_SECONDS)throw Error('Transcription is limited to 20-minute source recordings in this preview');
   const pcm=await decode(video,url,ctrl.signal,status);abortCheck(ctrl.signal);
   status('Starting the local Whisper engine…');
   const completed=await new Promise((resolve,reject)=>{
    let settled=false;const finish=(err,result)=>{
     if(settled)return;settled=true;if(err)reject(err);else resolve(result);
    };
    try{worker=new root.Worker('asr-worker-v073.js',{type:'module'});}
    catch(error){finish(Error('Cannot start packaged offline Whisper worker: '+error.message));return;}
    worker.onerror=e=>{finish(Error('Whisper worker failed to start. Check extension model/WASM packaging.'));};
    worker.onmessage=e=>{
     const m=e.data||{};
     if(m.kind==='progress'){
      if(m.stage==='model'){
       const progress=m.total?Math.round(100*m.loaded/m.total):Math.round(m.progress)||0;
       status(progress?'Loading local Whisper model · '+Math.min(100,progress)+'%':'Preparing local Whisper model…');
      }else if(m.stage==='recognition')status('Detecting spoken words and aligning timestamps locally…');
     }else if(m.kind==='error')finish(Error(m.message||'Local word recognition failed'));
     else if(m.kind==='result')finish(null,m);
    };
    const abort=()=>finish(Error('Transcription cancelled'));
    ctrl.signal.addEventListener('abort',abort,{once:true});
    worker.postMessage({kind:'transcribe',pcm,language,device:options.device==='webgpu'?'webgpu':'wasm'},[pcm.buffer]);
   });
   abortCheck(ctrl.signal);
   if(view.original()!==video||JSON.stringify(view.segments())!==JSON.stringify(parts))
    throw Error('Source or edits changed; transcript was not applied');
   const cues=toCues(completed.words,parts,options);
   if(!cues.length)throw Error('No words fell within your retained video timeline');
   return {cues,words:completed.words.length,language,model:completed.model,
    approximate:false,source:'whisper-local',local:true};
  }
  return {run,cancel};
 }
 root.MangoWhisperV073={create,toCues,inSequence,resample,decode};
})(typeof globalThis!=='undefined'?globalThis:this);
