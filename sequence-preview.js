/* Edited sequence playback using a native video element for synchronized A/V.
 * Uses source seeks at every edit boundary and frame callbacks where available.
 * A single <video> cannot guarantee frame-exact hard cuts; see docs.
 */
(function(root){
 'use strict';
 function create(video,getParts,onPosition,onState){
  let playing=false,token=0,active=0,lastOutput=0,raf=0,frameId=null,busy=false;
  let pausedForJump=false;
  const rows=()=>root.MangoSequenceMedia.sections(getParts());
  const nextFrame=fn=>{if(typeof video.requestVideoFrameCallback==='function')frameId=video.requestVideoFrameCallback(fn);
   else raf=requestAnimationFrame(fn);};
  const cancel=()=>{if(frameId!==null&&video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameId);
   if(raf)cancelAnimationFrame(raf);frameId=null;raf=0;};
  function current(){const ranges=rows(),row=ranges[active];
   if(playing&&row)return Math.min(row.outputEnd,row.outputStart+Math.max(0,video.currentTime-row.sourceStart));
   if(lastOutput>=root.MangoSequenceMedia.duration(getParts())-.001)return lastOutput;
   return root.MangoSequenceMedia.atSource(getParts(),video.currentTime)?.output??lastOutput;}
  function stop(){++token;playing=false;busy=false;pausedForJump=false;cancel();video.pause();onState?.(false);}
  function seekOutput(seconds){const map=root.MangoSequenceMedia.atOutput(getParts(),seconds);
   if(!map)return false;active=map.index;lastOutput=map.output;
   // Preserve the last decoded Program Monitor frame before the decoder jumps.
   // The overlay holds that frame until the newly selected frame is ready.
   onPosition?.(map.output);
   if(Math.abs(video.currentTime-map.source)>.002)video.currentTime=map.source;
   return true;
  }
  function loop(){if(!playing)return;
   cancel();nextFrame(()=>{if(!playing)return;
    const ranges=rows(),row=ranges[active];if(!row){stop();return;}
    const source=video.currentTime;
    if(source>=row.sourceEnd-.028&&!busy){void advance();return;}
    const output=Math.max(row.outputStart,Math.min(row.outputEnd,row.outputStart+Math.max(0,source-row.sourceStart)));
    lastOutput=output;onPosition?.(output);
    loop();
   });
  }
  async function advance(){if(!playing||busy)return;
   const ranges=rows(),next=ranges[active+1];if(!next){lastOutput=ranges[ranges.length-1].outputEnd;onPosition?.(lastOutput);stop();return;}
   busy=true;const captured=token;
   video.pause();pausedForJump=true;
   try{
    active+=1;lastOutput=next.outputStart;
    onPosition?.(next.outputStart); // keep last frame visible across the cut
    if(Math.abs(video.currentTime-next.sourceStart)>.002){
      const ready=new Promise((resolve,reject)=>{
       const timeout=setTimeout(()=>{cleanup();reject(new Error('Preview seek timeout'));},4500);
       function cleanup(){clearTimeout(timeout);video.removeEventListener?.('seeked',done);video.removeEventListener?.('error',failed);}
       function done(){cleanup();resolve();}function failed(){cleanup();reject(new Error('Preview media error'));}
       video.addEventListener?.('seeked',done,{once:true});video.addEventListener?.('error',failed,{once:true});
      });
      video.currentTime=next.sourceStart;await ready;
    }
    if(!playing||token!==captured)return;
    pausedForJump=false;busy=false;onPosition?.(next.outputStart);
    await video.play();if(playing&&token===captured)loop();
   }catch(error){if(playing&&token===captured){stop();onState?.(false,error.message);}}
  }
  async function play(){if(playing)return;
   const ranges=rows();if(!ranges.length)return;
   if(lastOutput>=ranges[ranges.length-1].outputEnd-.025)lastOutput=0;
   // Don't resume within a deleted source interval after a manual edit.
   const mapped=root.MangoSequenceMedia.atSource(getParts(),video.currentTime);
   const at=lastOutput>0?lastOutput:(mapped?.output??lastOutput);
   seekOutput(at);playing=true;busy=false;pausedForJump=false;token++;const my=token;
   onState?.(true);
   try{await video.play();if(playing&&token===my)loop();}
   catch(error){if(playing&&token===my){stop();onState?.(false,error.message);}}
  }
  function toggle(){if(playing){stop();return Promise.resolve();}return play();}
  function update(){const was=playing;if(was)stop();const map=root.MangoSequenceMedia.atSource(getParts(),video.currentTime);
   const length=root.MangoSequenceMedia.duration(getParts());
   const out=Math.max(0,Math.min(Math.max(0,length-.005),map?.output??lastOutput));
   seekOutput(out);}
  return {play,toggle,stop,seekOutput,update,current,isPlaying:()=>playing};
 }
 root.MangoSequencePreview={create};
})(typeof globalThis!=='undefined'?globalThis:this);
