/* Permission-gated session-local post-record voiceover. */
(function(root){'use strict';
 function create({getUserMedia,Recorder,URLApi,clock,AudioFactory,onChange}={}){
  getUserMedia=getUserMedia||((c)=>root.navigator.mediaDevices.getUserMedia(c));Recorder=Recorder||root.MediaRecorder;
  URLApi=URLApi||root.URL;clock=clock||(()=>performance.now());AudioFactory=AudioFactory||((url)=>new Audio(url));onChange=onChange||(()=>{});
  let recorder=null,stream=null,clip=null,chunks=[],start=0,started=0,monitor=null;
  const recording=()=>!!recorder&&recorder.state!=='inactive',state=()=>({recording:recording(),clip});
  function dispose(){monitor?.pause?.();if(clip?.url)URLApi.revokeObjectURL(clip.url);clip=null;monitor=null;onChange(state());}
  async function begin(at){if(recording())throw Error('Voiceover is already recording');
   if(!Number.isFinite(at)||at<0)throw Error('Select a valid playhead time');
   if(!Recorder)throw Error('Voice recording is unsupported');
   let mic;try{mic=await getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(t=>Recorder.isTypeSupported?.(t));
    if(!mime)throw Error('No supported microphone audio encoder');
    const rec=new Recorder(mic,{mimeType:mime,audioBitsPerSecond:128000});
    if(clip)dispose();recorder=rec;stream=mic;chunks=[];start=at;started=clock();
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};rec.start(250);onChange(state());
   }catch(e){mic?.getTracks?.().forEach(t=>t.stop());recorder=null;stream=null;throw e;}
  }
  async function stop(){if(!recording())throw Error('Voiceover is not recording');
   const rec=recorder,duration=Math.max(.05,(clock()-started)/1000);
   const done=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||Error('Microphone recorder failed'));});
   rec.stop();try{await done;}finally{stream?.getTracks?.().forEach(t=>t.stop());recorder=null;stream=null;}
   const blob=new Blob(chunks,{type:rec.mimeType});chunks=[];if(!blob.size)throw Error('No microphone samples were recorded');
   clip={id:'voice-'+Date.now(),blob,url:URLApi.createObjectURL(blob),start,duration,mime:blob.type};
   monitor=AudioFactory(clip.url);onChange(state());return clip;
  }
  function syncAudio(audio,t,playing){if(!clip||!audio)return;const local=t-clip.start;
   if(!playing||local<0||local>=clip.duration){audio.pause?.();return;}
   const target=Math.max(0,Math.min(clip.duration-.01,local));
   if(!Number.isFinite(audio.currentTime)||Math.abs(audio.currentTime-target)>.18)audio.currentTime=target;
   if(audio.paused)audio.play?.()?.catch?.(()=>{});
  }
  function sync(t,playing){syncAudio(monitor,t,playing);}
  function attachExport(ctx,destination){if(!clip)return null;
   if(!ctx?.createMediaElementSource||!destination)throw Error('Cannot mix voiceover without Web Audio');
   const audio=AudioFactory(clip.url),node=ctx.createMediaElementSource(audio);node.connect(destination);
   return {sync:(t,playing=true)=>syncAudio(audio,t,playing),stop:()=>{audio.pause();node.disconnect?.();}};
  }
  return {begin,stop,dispose,sync,attachExport,state,hasClip:()=>!!clip};
 }
 root.MangoVoiceover={create};
})(typeof globalThis!=='undefined'?globalThis:this);
