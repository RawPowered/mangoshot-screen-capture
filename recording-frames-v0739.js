/* Record the composite from a frame stream, not the editor's animation loop.
 * Legacy Chromium processor/generator are feature-detected; no new permissions. */
(function(root){'use strict';
 function create({canvas,track,draw,fail,warn}){
  let generator=null,writer=null,reader=null,clone=null,latest=null,worker=null,timer=null,running=false,disposed=false,inFlight=false,epoch=0,frames=0,inputFrames=0,last=0,first=0,lastStamp=-1,clockBase=null,frameBase=null,stream,output,mode;
  const now=()=>root.performance.now();
  function dropSource(){epoch++;const r=reader;reader=null;if(r)void r.cancel().catch(()=>{});if(clone)clone.stop();clone=null;latest?.close();latest=null;}
  function setSource(t){dropSource();if(!generator||disposed)return;const token=epoch;
   try{clone=t.clone();const processor=new root.MediaStreamTrackProcessor({track:clone,maxBufferSize:1});const r=processor.readable.getReader();reader=r;
    void(async()=>{try{while(!disposed&&epoch===token){const n=await r.read();if(n.done)break;if(disposed||epoch!==token){n.value.close();break;}latest?.close();latest=n.value;inputFrames++;}}catch(e){if(!disposed&&epoch===token)warn('Source frame reader unavailable; using decoded preview fallback.');}finally{try{r.releaseLock();}catch{}}})(); 
   }catch(e){warn('Source frame reader unavailable; using decoded preview fallback.');}
  }
  try{
   if(typeof root.MediaStreamTrackProcessor==='function'&&typeof root.MediaStreamTrackGenerator==='function'&&typeof root.VideoFrame==='function'){
    generator=new root.MediaStreamTrackGenerator({kind:'video'});writer=generator.writable.getWriter();stream=new root.MediaStream([generator]);output=generator;mode='frame stream';setSource(track);
   }
  }catch(e){dropSource();try{if(writer)void writer.abort().catch(()=>{});generator?.stop();}catch{}generator=writer=null;}
  if(!stream){stream=canvas.captureStream(30);output=stream.getVideoTracks()[0];mode='canvas fallback';warn('Native frame generator unavailable; canvas capture fallback remains browser-dependent.');}
  function stop(){if(disposed)return;disposed=true;running=false;clearTimeout(timer);if(worker){worker.terminate();worker=null;}dropSource();if(writer)void writer.abort().catch(()=>{});try{output?.stop();}catch{}}
  function schedule(){if(!running||disposed)return;if(worker)worker.postMessage('next');else timer=setTimeout(tick,32);}
  async function tick(){if(!running||disposed||inFlight)return;inFlight=true;
   try{const n=now();if(!first)first=n;if(generator&&latest&&clockBase===null){clockBase=n;frameBase=latest.timestamp;}
    // Wait for the first actual capture frame before feeding the generator.
    // Subsequent static frames are repeated with monotonic timestamps.
    if(generator&&clockBase===null){if(n-first>3000)throw Error('No source frames reached the recorder.');return;}
    draw(latest||undefined);
    if(generator){const stamp=Math.max(lastStamp+1,Math.round(frameBase+(n-clockBase)*1000));lastStamp=stamp;const frame=new root.VideoFrame(canvas,{timestamp:stamp,duration:33333});try{await writer.write(frame);}finally{frame.close();}}
    else output?.requestFrame?.();
    if(!disposed){frames++;last=now();}
   }catch(e){if(!disposed){stop();fail(e);}}finally{inFlight=false;schedule();}
  }
  function start(){if(running||disposed)return;running=true;first=now();
   try{worker=new root.Worker('recording-frame-clock-v0739.js');worker.onmessage=()=>{void tick();};worker.onerror=()=>{if(!disposed&&worker){worker.terminate();worker=null;warn('Worker clock unavailable; capture uses document timers.');if(!inFlight)schedule();}};worker.postMessage('start');}
   catch{worker=null;warn('Worker clock unavailable; capture uses document timers.');void tick();}
  }
  return {stream,start,stop,setSource,stats:()=>({driver:mode,frames,inputFrames,lagMs:Math.max(0,now()-(last||first||now()))})};
 }
 root.MangoRecordingFramesV0739=Object.freeze({create});
})(globalThis);
