const preview=document.querySelector("#preview"),ink=document.querySelector("#ink"),pen=ink.getContext("2d");
const status=document.querySelector("#status");const start=document.querySelector("#start"),stop=document.querySelector("#stop"),pause=document.querySelector("#pause");
let screen,microphone,audioCtx,recorder,canvas,animation,tracks=[],drawing=false,last=null,chunks=[];
const label=t=>status.textContent=t;
function supportedType(){return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t));}
const p=e=>{const r=ink.getBoundingClientRect();return {x:(e.clientX-r.left)*ink.width/r.width,y:(e.clientY-r.top)*ink.height/r.height,pressure:e.pointerType==="pen"?Math.max(.2,e.pressure||.5):1};};
ink.addEventListener("pointerdown",e=>{if(!screen)return;ink.setPointerCapture(e.pointerId);drawing=true;last=p(e);e.preventDefault();});
ink.addEventListener("pointermove",e=>{if(!drawing)return;const q=p(e);pen.strokeStyle=document.querySelector("#color").value;pen.lineCap="round";pen.lineJoin="round";pen.lineWidth=Number(document.querySelector("#size").value)*q.pressure*(ink.width/ink.getBoundingClientRect().width);pen.beginPath();pen.moveTo(last.x,last.y);pen.lineTo(q.x,q.y);pen.stroke();last=q;e.preventDefault();});
for(const ev of ["pointerup","pointercancel","lostpointercapture"])ink.addEventListener(ev,()=>drawing=false);
document.querySelector("#clear").addEventListener("click",()=>pen.clearRect(0,0,ink.width,ink.height));
function cleanup(){cancelAnimationFrame(animation);for(const t of tracks)t.stop();tracks=[];audioCtx?.close();audioCtx=null;screen=null;microphone=null;start.disabled=false;stop.disabled=true;pause.disabled=true;pause.textContent="Pause";}
start.addEventListener("click",async()=>{
  start.disabled=true;chunks=[];
  try{
    if(!navigator.mediaDevices?.getDisplayMedia)throw new Error("Screen recording unavailable in this browser/context.");
    screen=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:document.querySelector("#audio").checked});
    tracks.push(...screen.getTracks());
    if(document.querySelector("#mic").checked){microphone=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true}});tracks.push(...microphone.getTracks());}
    preview.srcObject=screen;await preview.play();
    const src=screen.getVideoTracks()[0].getSettings();const width=src.width||1280,height=src.height||720;
    ink.width=width;ink.height=height;
    canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const cx=canvas.getContext("2d",{alpha:false});
    function render(){if(!screen)return;cx.fillStyle="#000";cx.fillRect(0,0,width,height);if(preview.readyState>=2)cx.drawImage(preview,0,0,width,height);cx.drawImage(ink,0,0);animation=requestAnimationFrame(render);}render();
    const output=canvas.captureStream(30);
    const sources=[...screen.getAudioTracks(),...(microphone?.getAudioTracks()||[])];
    if(sources.length){
      audioCtx=new AudioContext();const dest=audioCtx.createMediaStreamDestination();
      for(const track of sources){const stream=new MediaStream([track]);audioCtx.createMediaStreamSource(stream).connect(dest);}
      for(const t of dest.stream.getAudioTracks())output.addTrack(t);
    }
    const mimeType=supportedType();if(!mimeType)throw new Error("No supported recording codec");
    recorder=new MediaRecorder(output,{mimeType,videoBitsPerSecond:5000000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type:mimeType});const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="MangoShot-"+Date.now()+(mimeType.includes("mp4")?".mp4":".webm");a.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);cleanup();label("Saved "+a.download+" · locally");
    };
    screen.getVideoTracks()[0].addEventListener("ended",()=>{if(recorder?.state!=="inactive")recorder.stop();},{once:true});
    recorder.start(1000);stop.disabled=false;pause.disabled=false;
    label("Recording "+width+" × "+height+" · "+(mimeType.includes("mp4")?"MP4":"WebM")+" · live ink enabled");
  }catch(e){cleanup();label("Could not record: "+e.message);}
});
stop.addEventListener("click",()=>{if(recorder&&recorder.state!=="inactive"){recorder.stop();stop.disabled=true;label("Finalizing video…");}});
pause.addEventListener("click",()=>{if(!recorder)return;if(recorder.state==="recording"){recorder.pause();pause.textContent="Resume";label("Recording paused");}else if(recorder.state==="paused"){recorder.resume();pause.textContent="Pause";label("Recording resumed");}});
