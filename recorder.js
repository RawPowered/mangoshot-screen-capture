const preview=document.querySelector('#preview'),ink=document.querySelector('#ink'),pen=ink.getContext('2d');
const status=document.querySelector('#status'),start=document.querySelector('#start'),stop=document.querySelector('#stop'),pause=document.querySelector('#pause');
const light=document.querySelector('#light'),elapsed=document.querySelector('#elapsed');
let screen=null,mic=null,recorder=null,audio=null,animation=0,timer=0,tracks=[],chunks=[],drawing=false,last=null;
const label=text=>status.textContent=text;
const clock=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
let startedAt=0,pausedAt=0,pausedTotal=0;
const mimeCandidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
function resetUI(){start.disabled=false;stop.disabled=true;pause.disabled=true;pause.textContent='Pause';light.className='record-dot idle';clearInterval(timer);timer=0;}
function cleanup(){cancelAnimationFrame(animation);animation=0;for(const t of tracks)t.stop();tracks=[];
  audio?.close().catch(()=>{});audio=null;screen=null;mic=null;preview.srcObject=null;recorder=null;resetUI();}
function download(blob,mime){if(!blob.size){label('Recording produced no video.');return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+(mime.includes('mp4')?'.mp4':'.webm');
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  label('Saved '+a.download+' locally ('+(blob.size/1048576).toFixed(1)+' MiB).');}
const point=e=>{const rect=ink.getBoundingClientRect();return {x:(e.clientX-rect.left)*ink.width/rect.width,
  y:(e.clientY-rect.top)*ink.height/rect.height,p:e.pointerType==='pen'?Math.max(.2,e.pressure||.5):1};};
ink.addEventListener('pointerdown',e=>{if(!screen||e.button!==0)return;ink.setPointerCapture(e.pointerId);drawing=true;last=point(e);e.preventDefault();});
ink.addEventListener('pointermove',e=>{if(!drawing)return;const q=point(e);pen.strokeStyle=document.querySelector('#color').value;
  pen.lineCap='round';pen.lineJoin='round';pen.lineWidth=Number(document.querySelector('#size').value)*q.p*(ink.width/ink.getBoundingClientRect().width);
  pen.beginPath();pen.moveTo(last.x,last.y);pen.lineTo(q.x+.01,q.y+.01);pen.stroke();last=q;e.preventDefault();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(type,()=>drawing=false);
document.querySelector('#clear').addEventListener('click',()=>pen.clearRect(0,0,ink.width,ink.height));
function supportedRecorder(stream){for(const type of mimeCandidates){if(!MediaRecorder.isTypeSupported(type))continue;
  try{return {media:new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000}),mime:type};}catch{}}
  throw new Error('This browser has no compatible video recorder.');}
start.addEventListener('click',async()=>{
  if(start.disabled)return;start.disabled=true;chunks=[];elapsed.textContent='00:00';
  try{
    if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder)throw new Error('Screen recording is unavailable here.');
    // This call must be directly inside a user-initiated click handler.
    screen=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:document.querySelector('#audio').checked});
    tracks.push(...screen.getTracks());
    if(document.querySelector('#mic').checked){mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});tracks.push(...mic.getTracks());}
    preview.srcObject=screen;await preview.play();
    const settings=screen.getVideoTracks()[0].getSettings();const w=settings.width||preview.videoWidth||1280,h=settings.height||preview.videoHeight||720;
    ink.width=w;ink.height=h;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});
    const render=()=>{if(!screen)return;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
      if(preview.readyState>=2)ctx.drawImage(preview,0,0,w,h);ctx.drawImage(ink,0,0);
      animation=requestAnimationFrame(render);};render();
    const output=canvas.captureStream(30);
    const inputTracks=[...screen.getAudioTracks(),...(mic?.getAudioTracks()||[])];
    if(inputTracks.length){audio=new AudioContext();const destination=audio.createMediaStreamDestination();
      for(const track of inputTracks)audio.createMediaStreamSource(new MediaStream([track])).connect(destination);
      for(const track of destination.stream.getAudioTracks())output.addTrack(track);
      await audio.resume();
    }
    const configured=supportedRecorder(output);recorder=configured.media;
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=event=>label('Recorder error: '+(event.error?.message||'Unknown error'));
    recorder.onstop=()=>{const blob=new Blob(chunks,{type:configured.mime});cleanup();download(blob,configured.mime);};
    screen.getVideoTracks()[0].addEventListener('ended',()=>{if(recorder?.state!=='inactive')recorder?.stop();},{once:true});
    recorder.start(1000);stop.disabled=false;pause.disabled=false;
    startedAt=Date.now();pausedAt=0;pausedTotal=0;light.className='record-dot active';
    timer=setInterval(()=>{const now=pausedAt||Date.now();elapsed.textContent=clock(now-startedAt-pausedTotal);},200);
    label('Recording '+w+' × '+h+' · '+(configured.mime.includes('mp4')?'MP4':'WebM')+
      ' · '+(inputTracks.length?'audio included':'no audio track supplied'));
  }catch(error){cleanup();label('Could not record: '+error.message);}
});
stop.addEventListener('click',()=>{if(!recorder||recorder.state==='inactive')return;
  stop.disabled=true;pause.disabled=true;label('Finalizing recording…');recorder.stop();});
pause.addEventListener('click',()=>{if(!recorder)return;
  if(recorder.state==='recording'){recorder.pause();pausedAt=Date.now();pause.textContent='Resume';light.className='record-dot idle';label('Recording paused');}
  else if(recorder.state==='paused'){recorder.resume();pausedTotal+=Date.now()-pausedAt;pausedAt=0;pause.textContent='Pause';light.className='record-dot active';label('Recording resumed');}
});
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();cleanup();});
