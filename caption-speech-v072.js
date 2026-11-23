/* MangoShot Caption Studio v0.7.2: opt-in browser ON-DEVICE speech recognition.
 * Fail closed: processLocally=true is mandatory; no microphone or remote API
 * fallback. Browser support is experimental and result timing is estimated.
 */
(function(root){'use strict';
 const safeLang=lang=>/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(String(lang||''))?lang:'en-US';
 const cls=()=>root.SpeechRecognition;
 function supported(){
  const C=cls();
  if(typeof C!=='function'||typeof C.available!=='function'||!(root.AudioContext||root.webkitAudioContext))return false;
  try{return 'processLocally' in new C();}catch{return false;}
 }
 async function availability(language='en-US'){
  if(!supported())return 'unsupported';
  try{
   const result=await cls().available({langs:[safeLang(language)],processLocally:true});
   return ['available','downloadable','downloading','unavailable'].includes(result)?result:'unavailable';
  }catch{return 'unsupported';}
 }
 async function install(language='en-US'){
  const C=cls();
  if(!supported()||typeof C.install!=='function')throw new Error('This browser does not support on-device speech language packs');
  return !!(await C.install({langs:[safeLang(language)],processLocally:true}));
 }
 function mapSourceInterval(segments,start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
  const rows=root.MangoSequenceMedia.sections(segments);
  const hits=rows.map(row=>({
   start:row.outputStart+Math.max(0,Math.max(row.sourceStart,start)-row.sourceStart),
   end:row.outputStart+Math.min(row.length,end-row.sourceStart),
   intersects:start<row.sourceEnd&&end>row.sourceStart
  })).filter(x=>x.intersects&&x.end-x.start>.03);
  if(!hits.length)return null;
  return {start:hits[0].start,end:hits[hits.length-1].end};
 }
 function estimateUtterance(text,sourceEnd,previousEnd,sourceDuration,segments){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length||!Number.isFinite(sourceEnd))return null;
  const end=Math.max(0,Math.min(sourceDuration,sourceEnd));
  const estimated=Math.max(.45,Math.min(9.5,words.length*.42));
  const start=Math.max(0,Math.max(previousEnd,end-estimated));
  const mapped=mapSourceInterval(segments,start,end);
  if(!mapped||mapped.end-mapped.start<.07)return null;
  return {...mapped,text:words.join(' ').slice(0,350)};
 }
 function create(view,callbacks={}){
  if(!supported())throw new Error('This browser lacks the on-device audio-track speech recognizer');
  if(!view?.original?.()||!view?.url?.())throw new Error('Load a primary recording first');
  const C=cls(),Audio=root.AudioContext||root.webkitAudioContext;
  let cancelled=false,recognition=null,media=null,context=null,destination=null,timeout=0;
  let finished=false,previousEnd=0,results=[],finalize=null;
  const status=(msg)=>callbacks.status?.(msg);
  function cancel(){
   cancelled=true;
   try{recognition?.abort?.();}catch{}
   try{media?.pause?.();}catch{}
   clearTimeout(timeout);
   if(finalize)finalize(new Error('Transcription cancelled'));
  }
  async function cleanup(){
   clearTimeout(timeout);
   try{recognition?.abort?.();}catch{}
   try{media?.pause?.();}catch{}
   try{destination?.stream?.getTracks?.().forEach(t=>t.stop());}catch{}
   try{await context?.close?.();}catch{}
   try{media?.removeAttribute?.('src');media?.load?.();media?.remove?.();}catch{}
  }
  async function run(language='en-US'){
   const lang=safeLang(language);
   if(await availability(lang)!=='available')
    throw new Error('On-device language pack is not installed; use Install Language Pack first');
   if(cancelled)throw new Error('Transcription cancelled');
   const originalSegments=view.segments().map(x=>({...x}));
   const sourceDuration=view.duration();
   try{
    media=root.document.createElement('video');media.preload='auto';media.playsInline=true;
    media.style.cssText='position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    root.document.body.appendChild(media);
    const meta=new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(new Error('Source media could not load for transcription')),12000);
     media.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
     media.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Source cannot be decoded for transcription'));},{once:true});
    });
    media.src=view.url();await meta;
    if(cancelled)throw new Error('Transcription cancelled');
    context=new Audio();
    const source=context.createMediaElementSource(media);
    destination=context.createMediaStreamDestination();
    // Deliberately DO NOT connect to speakers (no feedback during transcribe).
    source.connect(destination);
    await context.resume();
    const track=destination.stream.getAudioTracks()[0];
    if(!track||track.kind!=='audio'||track.readyState!=='live')
     throw new Error('Cannot supply source audio track to local speech recognizer');
    recognition=new C();if(!('processLocally' in recognition))
     throw new Error('The browser cannot guarantee offline speech recognition');
    recognition.processLocally=true;recognition.lang=lang;recognition.continuous=true;
    recognition.interimResults=false;recognition.maxAlternatives=1;
    // The only recognized input is an explicit track from the current source.
    // Never call start() with no argument: that could activate a microphone.
    const promise=new Promise((resolve,reject)=>{
     let ended=false;
     finalize=error=>{
      if(ended)return;ended=true;
      if(error)reject(error);
      else if(!results.length)reject(new Error('No speech recognized; try SRT/VTT import or manual captions'));
      else resolve({cues:results.map((r,i)=>({...r,id:'cc-asr-'+(i+1)})),
       approximate:true,source:'browser-on-device',language:lang});
     };
     recognition.onresult=event=>{
      for(let i=event.resultIndex;i<event.results.length;i++){
       const result=event.results[i];if(!result.isFinal)continue;
       const transcript=String(result[0]?.transcript||'').trim();
       if(!transcript)continue;
       const sourceEnd=Math.max(0,Math.min(sourceDuration,Number(media.currentTime)||0));
       const cue=estimateUtterance(transcript,sourceEnd,previousEnd,sourceDuration,originalSegments);
       previousEnd=sourceEnd;
       if(cue){results.push(cue);status('Recognized '+results.length+' timed phrases · timing approximate');}
      }
     };
     recognition.onerror=event=>finalize(new Error('Local speech engine: '+String(event.error||'error')));
     recognition.onend=()=>{
      if(cancelled)return finalize(new Error('Transcription cancelled'));
      finalize(media?.ended?null:new Error('Speech engine stopped before source finished; no partial transcript applied'));
     };
     media.addEventListener('timeupdate',()=>{
      callbacks.progress?.(Math.min(1,(media.currentTime||0)/Math.max(1,sourceDuration)));
     });
     media.addEventListener('ended',()=>{finished=true;status('Finishing local transcript…');
      try{recognition.stop();}catch{}
      timeout=setTimeout(()=>finalize(null),2500);
     },{once:true});
    });
    recognition.start(track);
    await media.play();
    status('Recognizing primary source on this device in real time · timing approximate…');
    const result=await promise;
    if(cancelled)throw new Error('Transcription cancelled');
    result.cues=root.MangoCaptionsV072.check(result.cues,view.outputDuration());
    return result;
   }finally{await cleanup();}
  }
  return {run,cancel,isCancelled:()=>cancelled};
 }
 root.MangoCaptionSpeechV072={supported,availability,install,create,mapSourceInterval,estimateUtterance};
})(typeof globalThis!=='undefined'?globalThis:this);
