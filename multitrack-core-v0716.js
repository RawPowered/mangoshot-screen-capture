/* Local secondary-media compositing. V1 defines duration; V2/V3 overlay, A2 mixes. */
(function(root){'use strict';
 const TRACKS=['V2','V3','A2'],FPS=15,MAX_FRAMES=150,MAX_RASTER=64*1024*1024,MAX_FILE=64*1024*1024,MAX_VIDEO_FILE=512*1024*1024,MAX_AUDIO=12000000;
 const copy=x=>JSON.parse(JSON.stringify(x)),finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
 const defaults=()=>({clips:[],tracks:{V2:{visible:true,locked:false,opacity:1},V3:{visible:true,locked:false,opacity:1},A2:{muted:false,locked:false,volume:1}}});
 const gif=a=>a.kind==='image'&&(/\.gif$/i.test(a.name)||a.mime==='image/gif');
 const visual=c=>c.track!=='A2',framesFor=(c,a)=>a.kind==='video'||gif(a)?Math.max(2,Math.ceil((c.end-c.start)*FPS)):1;
 function check(input,assets,length){
  if(!input||!Array.isArray(input.clips)||input.clips.length>16||!input.tracks||!finite(length,0,864000))throw Error('Invalid secondary sequence or 16 clip limit.');
  const out=defaults(),find=id=>Array.isArray(assets)?assets.find(a=>a.id===id):assets(id),ids=new Set();let samples=0;
  for(const t of TRACKS){const v=input.tracks[t];if(!v||typeof v.locked!=='boolean')throw Error('Invalid track settings.');
   if(t==='A2'){if(typeof v.muted!=='boolean'||!finite(v.volume,0,2))throw Error('Invalid audio track settings.');out.tracks[t]={muted:v.muted,locked:v.locked,volume:v.volume};}
   else{if(typeof v.visible!=='boolean'||!finite(v.opacity,0,1))throw Error('Invalid visual track settings.');out.tracks[t]={visible:v.visible,locked:v.locked,opacity:v.opacity};}}
  for(const c of input.clips){
   if(!c||typeof c.id!=='string'||!/^[\w-]{1,90}$/.test(c.id)||ids.has(c.id)||!TRACKS.includes(c.track)||c.assetId==='source-primary')throw Error('Invalid secondary clip identity.');
   const a=find(c.assetId);if(!a||!['image','video','audio'].includes(a.kind)||!finite(a.size,1,a.kind==='video'?MAX_VIDEO_FILE:MAX_FILE))throw Error('Secondary asset missing or exceeds file budget (512 MiB video; 64 MiB image/audio).');
   if((c.track==='A2')!==(a.kind==='audio'))throw Error('Audio uses A2; visual media uses V2 or V3.');
   if(!finite(c.start,0,length)||!finite(c.end,c.start+.09999,length+.00001)||!finite(c.sourceIn,0,864000)||!finite(c.sourceOut,c.sourceIn+.09999,864000)||Math.abs(c.end-c.start-(c.sourceOut-c.sourceIn))>.001)throw Error('Clip timing must fit the primary sequence and match source duration.');
   if(a.kind!=='image'&&(!finite(a.duration,.1,864000)||c.sourceOut>a.duration+.03))throw Error('Clip extends beyond source duration.');
   if(a.kind==='audio'&&a.duration>120)throw Error('Imported audio sources are limited to 120 seconds.');
   if(!finite(c.opacity,0,1)||!finite(c.volume,0,2)||typeof c.locked!=='boolean'||typeof c.visible!=='boolean'||!finite(c.x,-1,1)||!finite(c.y,-1,1)||!finite(c.width,.05,2)||!finite(c.height,.05,2)||!['contain','cover','stretch'].includes(c.fit))throw Error('Invalid clip appearance.');
   const grade=root.MangoCompositorV0714?root.MangoCompositorV0714.checkStack(c.grade||[]):(c.grade?.length?null:[]);if(!grade||a.kind==='audio'&&grade.length)throw Error('Invalid per-clip visual effects.');
   if(visual(c))samples+=framesFor(c,a);
   ids.add(c.id);out.clips.push({id:c.id,assetId:c.assetId,track:c.track,start:c.start,end:c.end,sourceIn:c.sourceIn,sourceOut:c.sourceOut,opacity:c.opacity,volume:c.volume,locked:c.locked,visible:c.visible,x:c.x,y:c.y,width:c.width,height:c.height,fit:c.fit,grade});
  }
  if(samples>MAX_FRAMES)throw Error('Secondary frame limit exceeded (about 10 seconds total of moving overlays at 15 fps).');
  out.clips.sort((a,b)=>TRACKS.indexOf(a.track)-TRACKS.indexOf(b.track)||a.start-b.start||a.id.localeCompare(b.id));
  for(let i=1;i<out.clips.length;i++){const a=out.clips[i-1],b=out.clips[i];if(a.track===b.track&&b.start<a.end-.00001)throw Error('Clips overlap on '+a.track+'. Change timing or track.');}
  return out;
 }
 function make(a,at,length,track=a.kind==='audio'?'A2':'V2'){
  const span=Math.min(a.kind==='image'?3:a.duration||0,a.kind==='video'||gif(a)?4:120,length-at);if(span<.1)throw Error('Move playhead earlier or wait for metadata.');
  return {id:root.crypto?.randomUUID?.()||'media-'+Date.now()+'-'+Math.random().toString(36).slice(2),assetId:a.id,track,start:at,end:at+span,sourceIn:0,sourceOut:span,opacity:1,volume:1,locked:false,visible:true,x:0,y:0,width:1,height:1,fit:'contain',grade:[]};
 }
 const active=(m,t)=>m.clips.filter(c=>c.start<=t&&t<c.end&&c.visible&&(visual(c)?m.tracks[c.track].visible&&m.tracks[c.track].opacity*c.opacity>0:!m.tracks.A2.muted&&m.tracks.A2.volume*c.volume>0));
 const hasAudio=m=>m.clips.some(c=>!visual(c)&&c.visible&&!m.tracks.A2.muted&&m.tracks.A2.volume*c.volume>0);
 function dimensions(w,h,count){const s=Math.min(1,960/w,540/h,Math.sqrt(MAX_RASTER/(Math.max(1,count)*4*w*h)));return {w:Math.max(1,Math.floor(w*s)),h:Math.max(1,Math.floor(h*s))};}
 function fitRect(sw,sh,dw,dh,fit){if(fit==='stretch')return {x:0,y:0,w:dw,h:dh};const k=(fit==='cover'?Math.max:Math.min)(dw/sw,dh/sh);return {x:(dw-sw*k)/2,y:(dh-sh*k)/2,w:sw*k,h:sh*k};}
 function wait(el,event,action,signal){return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',fail);signal?.removeEventListener('abort',abort);};const ok=()=>{clean();resolve();},fail=()=>{clean();reject(Error('Secondary media decode failed.'));},abort=()=>{clean();reject(Error('Media preparation cancelled.'));};timer=setTimeout(()=>{clean();reject(Error('Secondary media decode timed out.'));},8000);el.addEventListener(event,ok,{once:true});el.addEventListener('error',fail,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}try{action();}catch(e){clean();reject(e);}});}
 function raster(frame,w,h,count){if(!finite(w,1,16384)||!finite(h,1,16384)||w*h>24000000)throw Error('Secondary source exceeds 24 megapixels.');const d=dimensions(w,h,count),c=root.document.createElement('canvas');c.width=d.w;c.height=d.h;c.getContext('2d').drawImage(frame,0,0,d.w,d.h);return c;}
 function createRuntime(asset){
  let cache=new Map(),key=null,pending=null,controller=null,failed=null;
  const signature=m=>root.MangoProfessionalTimelineV0717?.decodeSignature(m,asset,framesFor,gif)||JSON.stringify([m,m.clips.map(c=>asset(c.assetId)?.url||null)]);
  function dispose(map){for(const x of map.values())for(const f of x.frames||[])f.width=f.height=0;}
  function clear(){controller?.abort();controller=null;dispose(cache);cache=new Map();key=null;pending=null;failed=null;}
  const ready=m=>!m.clips.length||key===signature(m)&&!pending&&!failed;
  async function prepare(raw,length,notify=()=>{}){
   const m=check(raw,asset,length),wanted=signature(m);
   for(const c of m.clips){const a=asset(c.assetId);if(!a||a.missing||!a.url||!a.blob)throw Error('Relink missing local asset: '+(a?.name||c.assetId));root.MangoCompositorV0714?.requireSupport(c.grade);}
   if(key===wanted){if(failed)throw failed;if(pending)await pending;for(const c of m.clips){if(!visual(c)&&c.sourceOut>(cache.get(c.id)?.audio?.duration??0)+.03)throw Error('Audio trim exceeds the prepared source duration.');}return m;}
   clear();key=wanted;if(!m.clips.length)return m;
   controller=new AbortController();const signal=controller.signal,local=new Map(),count=m.clips.reduce((n,c)=>n+(visual(c)?framesFor(c,asset(c.assetId)):0),0);
   pending=Promise.resolve().then(async()=>{let ac=null,totalAudio=0,progress=0;
    try{
     for(const c of m.clips){
      const a=asset(c.assetId);if(!a||a.missing||!a.url||!a.blob)throw Error('Relink missing local asset: '+(a?.name||c.assetId));
      root.MangoCompositorV0714?.requireSupport(c.grade);const entry={frames:[],audio:null};local.set(c.id,entry);
      if(a.kind==='audio'){
       const AC=root.AudioContext||root.webkitAudioContext;if(!AC)throw Error('Web Audio unavailable.');ac||=new AC();entry.audio=await ac.decodeAudioData(await a.blob.arrayBuffer());totalAudio+=entry.audio.length*entry.audio.numberOfChannels;
       if(totalAudio>MAX_AUDIO||c.sourceOut>entry.audio.duration+.03)throw Error('Decoded audio exceeds memory budget or source duration.');
      }else if(a.kind==='video'){
       const v=root.document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';
       try{await wait(v,'loadeddata',()=>{v.src=a.url;v.load();},signal);if(!finite(v.duration,.1,864000)||c.sourceOut>v.duration+.03)throw Error('Decoded video duration differs.');
        const n=framesFor(c,a);for(let i=0;i<n;i++){if(signal.aborted)throw Error('Media preparation cancelled.');const t=Math.min(v.duration-.002,c.sourceIn+i*(c.end-c.start)/n);
         if(Math.abs(v.currentTime-t)>.0005||v.seeking)await wait(v,'seeked',()=>{v.currentTime=t;},signal);
         if(v.readyState<2)throw Error('Secondary decoded frame unavailable.');entry.frames.push(raster(v,v.videoWidth,v.videoHeight,count));}
       }finally{v.pause();v.removeAttribute('src');v.load();}
      }else if(gif(a)){
       if(!root.ImageDecoder||!await root.ImageDecoder.isTypeSupported('image/gif'))throw Error('Animated GIF decoding unavailable. Convert to WebM or use a supporting browser.');
       const d=new root.ImageDecoder({data:await a.blob.arrayBuffer(),type:'image/gif'}),timings=[];
       try{await d.tracks.ready;await d.completed;const n=d.tracks.selectedTrack?.frameCount||0;if(n<1||n>120)throw Error('GIF frame limit is 120.');
        let cycle=0;for(let i=0;i<n;i++){if(signal.aborted)throw Error('Media preparation cancelled.');const {image}=await d.decode({frameIndex:i});try{const span=Math.max(.02,(image.duration||100000)/1e6);timings.push({i,start:cycle,end:cycle+span});cycle+=span;}finally{image.close();}}
        const samples=framesFor(c,a);for(let i=0;i<samples;i++){if(signal.aborted)throw Error('Media preparation cancelled.');const t=(c.sourceIn+i*(c.end-c.start)/samples)%cycle,at=timings.find(x=>t>=x.start&&t<x.end)||timings.at(-1),{image}=await d.decode({frameIndex:at.i});try{entry.frames.push(raster(image,image.displayWidth,image.displayHeight,count));}finally{image.close();}}
       }finally{d.close();}
      }else{const img=await root.createImageBitmap(a.blob);try{entry.frames.push(raster(img,img.width,img.height,count));}finally{img.close();}}
      if(signal.aborted)throw Error('Media preparation cancelled.');notify(++progress,m.clips.length);
     }
     if(signal.aborted||key!==wanted||controller?.signal!==signal)throw Error('Media preparation cancelled.');cache=local;return m;
    }catch(e){dispose(local);if(key===wanted&&controller?.signal===signal)failed=e;throw e;}finally{if(ac)void ac.close().catch(()=>{});if(key===wanted&&controller?.signal===signal){pending=null;controller=null;}}
   });return pending;
  }
  function paint(ctx,m,t,w,h){
   if(!m.clips.length)return true;if(!ready(m))return false;
   for(const c of active(m,t).filter(visual)){const f=cache.get(c.id)?.frames;if(!f?.length)throw Error('Prepared visual media missing.');const frame=f[Math.min(f.length-1,Math.floor((t-c.start)/(c.end-c.start)*f.length))],dw=c.width*w,dh=c.height*h,r=fitRect(frame.width,frame.height,dw,dh,c.fit);
    ctx.save();try{ctx.translate(c.x*w,c.y*h);ctx.beginPath();ctx.rect(0,0,dw,dh);ctx.clip();ctx.globalAlpha*=c.opacity*m.tracks[c.track].opacity;ctx.filter=root.MangoCompositorV0714?.filter(c.grade,h/1080)||'none';ctx.drawImage(frame,r.x,r.y,r.w,r.h);}finally{ctx.restore();}}
   return true;
  }
  function mixer(ctx,dest,m){
   if(!ready(m))throw Error('Prepare secondary audio first.');let current=null;
   const stop=()=>{if(current){try{current.node.stop();}catch{}current.node.disconnect();current.gain.disconnect();current=null;}};
   function sync(t,playing){const c=playing?active(m,t).find(x=>!visual(x)):null;if(!c){stop();return;}const target=c.sourceIn+t-c.start,now=ctx.currentTime;if(current?.id===c.id&&Math.abs(current.offset+now-current.started-target)<.18)return;
    stop();const buffer=cache.get(c.id)?.audio;if(!buffer)throw Error('Prepared audio clip missing.');const node=ctx.createBufferSource(),gain=ctx.createGain(),remain=Math.min(c.sourceOut-target,buffer.duration-target);if(remain<=.002)return;
    node.buffer=buffer;gain.gain.value=c.volume*m.tracks.A2.volume;node.connect(gain);gain.connect(dest);node.start(0,target,remain);current={id:c.id,node,gain,offset:target,started:now};}
   return {sync,stop};
  }
  return {prepare,ready,paint,mixer,clear};
 }
 const api=Object.freeze({TRACKS,FPS,MAX_FRAMES,MAX_RASTER,MAX_FILE,defaults,copy,check,make,gif,visual,active,hasAudio,framesFor,dimensions,fitRect,createRuntime});
 root.MangoMultitrackV0716=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
