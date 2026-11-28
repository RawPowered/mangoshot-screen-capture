/* Permission-gated session-local post-record voiceover. */
(function(root){'use strict';
 const MAX_PORTABLE=8*1024*1024;
 function validatePortable(raw,span=86400){if(raw==null)return null;if(!raw||raw.schema!=='mangoshot.voice.v1'||typeof raw.id!=='string'||!/^voice-[\w-]{1,80}$/.test(raw.id)||!Number.isFinite(raw.start)||raw.start<0||raw.start>=span||!Number.isFinite(raw.duration)||raw.duration<.05||raw.duration>86400||typeof raw.mime!=='string'||!/^audio\/(?:webm|ogg|mp4)(?:;codecs=[a-zA-Z0-9.,-]+)?$/.test(raw.mime)||!Number.isSafeInteger(raw.bytes)||raw.bytes<1||raw.bytes>MAX_PORTABLE||typeof raw.base64!=='string'||raw.base64.length!==4*Math.ceil(raw.bytes/3)||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw.base64))throw Error('Invalid or oversized saved narration');const padding=raw.base64.endsWith('==')?2:raw.base64.endsWith('=')?1:0;if(raw.base64.length/4*3-padding!==raw.bytes)throw Error('Narration byte count mismatch');return raw;}
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
  async function portable(span){if(recording())throw Error('Stop narration before saving');const current=clip;if(!current)return null;if(current.blob.size>MAX_PORTABLE)throw Error('Narration exceeds 8 MiB portable limit. Download it separately and import as an audio asset before saving.');const bytes=new Uint8Array(await current.blob.arrayBuffer());if(clip!==current||recording())throw Error('Narration changed during save');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return validatePortable({schema:'mangoshot.voice.v1',id:current.id,start:current.start,duration:current.duration,mime:current.mime,bytes:bytes.length,base64:root.btoa(binary)},span);}
  function preparePortable(raw,span){if(recording())throw Error('Stop narration before opening a project');const data=validatePortable(raw,span);if(!data)return null;const binary=root.atob(data.base64);if(binary.length!==data.bytes)throw Error('Narration byte count mismatch');const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return {id:data.id,start:data.start,duration:data.duration,mime:data.mime,blob:new Blob([bytes],{type:data.mime})};}
  function restorePortable(prepared){if(recording())throw Error('Stop narration before opening a project');if(!prepared){dispose();return;}const url=URLApi.createObjectURL(prepared.blob);let next;try{next=AudioFactory(url);}catch(error){URLApi.revokeObjectURL(url);throw error;}monitor?.pause?.();if(clip?.url)URLApi.revokeObjectURL(clip.url);clip={...prepared,url};monitor=next;onChange(state());}
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
  return {begin,stop,dispose,sync,attachExport,state,portable,preparePortable,restorePortable,hasClip:()=>!!clip};
 }
 root.MangoVoiceover={create,validatePortable};
})(typeof globalThis!=='undefined'?globalThis:this);
