/* MangoShot recording 0.3. Screen picker is always user-initiated. */
const api=globalThis.chrome??globalThis.browser;
const get=id=>document.getElementById(id);
const preview=get('preview'),ink=get('ink'),pen=ink.getContext('2d');
const status=get('status'),start=get('start'),stop=get('stop'),pause=get('pause');
const light=get('light'),elapsed=get('elapsed'),wrap=get('screen-wrap'),liveComposite=get('live-composite');
const source=Number(new URLSearchParams(location.search).get('source'));
let screen=null,mic=null,recorder=null,audio=null,animation=0,timer=0,tracks=[],chunks=[],drawing=false,last=null;
let controller=null,captureSource='',interaction=false,zoomState=MangoCamera.camera(),controlPressed=false;
let zoomStart=null,zoomPointer=null,linkedAvailable=false,forwardingActive=false,queuedScroll=0,scrollBusy=false,lastBlob=null,zoomRegion=false;
let warnings=[],startedAt=0,pausedAt=0,pausedTotal=0;
const mimeCandidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
const label=text=>status.textContent=text;
const clock=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const call=(fn,...args)=>new Promise((resolve,reject)=>{try{fn(...args,value=>{const err=api.runtime.lastError;err?reject(new Error(err.message)):resolve(value);});}catch(e){reject(e)}});
function setZoom(next){zoomState=MangoCamera.fit(next);get('zoomReadout').textContent=Math.round(zoomState.zoom*100)+'%';
  // The live compositor draws the same zoomed image shown to the user and encoded to video.
}
function resetZoom(){setZoom(MangoCamera.camera());}
function normalized(event){const rect=ink.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};}
function canvasPoint(event){const p=normalized(event);return {x:p.x*ink.width,y:p.y*ink.height,p:event.pointerType==='pen'?Math.max(.2,event.pressure||.5):1};}
function clearInk(){pen.clearRect(0,0,ink.width,ink.height);}
function renderSelection(a,b){const n=normalized(b),start=normalized(a),r=ink.getBoundingClientRect(),sel=get('zoom-selection');
 Object.assign(sel.style,{left:(Math.min(n.x,start.x)*100)+'%',top:(Math.min(n.y,start.y)*100)+'%',width:(Math.abs(n.x-start.x)*100)+'%',height:(Math.abs(n.y-start.y)*100)+'%'});sel.hidden=false;}
function setSurfaceInteraction(value){interaction=!!value;
 if(interaction&&controller?.forwardWheel&&captureSource==='browser'&&!forwardingActive){
   controller.forwardWheel(preview).then(()=>{forwardingActive=true;label('Captured-tab scrolling enabled.');})
     .catch(error=>{forwardingActive=false;label('Browser denied direct scrolling ('+error.name+'). Use the linked-tab fallback if available.');});
 }
 get('mode').textContent='Interaction: '+(interaction?'ON':'OFF');get('mode').setAttribute('aria-pressed',String(interaction));syncPointer();
 if(interaction){label(linkedAvailable?'Interaction: preview wheel scrolls captured tab where supported; linked-tab fallback is available.':'Interaction: scrolling available for supported captured browser tabs.');}}
function syncPointer(){ink.style.pointerEvents=(interaction&&!controlPressed&&!zoomRegion)?'none':'auto';
  ink.style.cursor=zoomRegion?'crosshair':(interaction&&!controlPressed?'default':'crosshair');}
function resetUI(){start.disabled=false;stop.disabled=true;pause.disabled=true;pause.textContent='Pause';light.className='record-dot idle';clearInterval(timer);timer=0;
  for(const id of ['mode','resetZoom','zoomIn','zoomOut','zoomRegion'])get(id).disabled=true;
  zoomRegion=false;get('zoomRegion').textContent='Zoom region: OFF';get('zoomRegion').setAttribute('aria-pressed','false');setSurfaceInteraction(false);}
function cleanup(){cancelAnimationFrame(animation);animation=0;for(const track of tracks)track.stop();tracks=[];
 audio?.close().catch(()=>{});audio=null;screen=null;mic=null;preview.srcObject=null;recorder=null;controller=null;forwardingActive=false;
 get('video-placeholder').hidden=false;liveComposite.style.display='none';ink.style.opacity='1';resetUI();resetZoom();controlPressed=false;}
function saveBlob(blob){if(!blob?.size)return label('No recorded video available.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
 a.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+(blob.type.includes('mp4')?'.mp4':'.webm');
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);label('Saved original recording.');}
function supportedRecorder(stream){for(const type of mimeCandidates){if(!MediaRecorder.isTypeSupported(type))continue;
 try{return new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000});}catch{}}
 throw new Error('This browser cannot encode the selected video stream.');}
function showResult(blob){lastBlob=blob;get('result').hidden=false;get('result-meta').textContent=(blob.size/1048576).toFixed(1)+' MiB · '+(blob.type.includes('mp4')?'MP4':'WebM');
 label('Recording complete. Edit or save the original before closing this tab.');}
async function tryLinkedTab(){linkedAvailable=false;
 if(!Number.isInteger(source)||source<1||!api?.scripting?.executeScript||!api.tabs?.sendMessage)return;
 try{const tab=await call(api.tabs.get.bind(api.tabs),source);if(!/^https?:/.test(tab?.url??''))return;
   await call(api.scripting.executeScript.bind(api.scripting),{target:{tabId:source},files:['linked-tab.js']});
   linkedAvailable=true;get('linked-label').textContent='Linked source tab: '+new URL(tab.url).host+'. Browser control applies only to this tab, not necessarily the source you picked in the sharing dialog.';
 }catch{get('linked-label').textContent='No linked-tab permission. On Firefox, scroll the real source tab or relaunch MangoShot directly from it.';}
}
async function scrollLinked(dy,where){if(!linkedAvailable||!get('linked-consent').checked||!interaction)return;
 queuedScroll+=dy;if(scrollBusy)return;scrollBusy=true;
 try{while(Math.abs(queuedScroll)>0.1){const amount=Math.max(-1600,Math.min(1600,queuedScroll));queuedScroll-=amount;
   await call(api.tabs.sendMessage.bind(api.tabs),source,{type:'MANGO_LINKED_SCROLL',dx:0,dy:amount,x:where.x,y:where.y});}}
 catch(error){label('Linked-tab scroll unavailable: '+error.message);queuedScroll=0;}finally{scrollBusy=false;}}
ink.addEventListener('pointerdown',event=>{
 if(!screen||event.button!==0)return;event.preventDefault();ink.setPointerCapture(event.pointerId);
 if(event.ctrlKey||controlPressed||zoomRegion){zoomStart={...normalized(event)};zoomPointer=event;get('zoom-selection').hidden=false;return;}
 if(interaction)return;
 drawing=true;last=canvasPoint(event);});
ink.addEventListener('pointermove',event=>{
 if(zoomStart){const start={clientX:ink.getBoundingClientRect().left+zoomStart.x*ink.getBoundingClientRect().width,clientY:ink.getBoundingClientRect().top+zoomStart.y*ink.getBoundingClientRect().height};renderSelection(start,event);return;}
 if(!drawing)return;const q=canvasPoint(event);pen.strokeStyle=get('color').value;pen.lineCap='round';pen.lineJoin='round';
 pen.lineWidth=Number(get('size').value)*q.p*(ink.width/ink.getBoundingClientRect().width);
 pen.beginPath();pen.moveTo(last.x,last.y);pen.lineTo(q.x+.01,q.y+.01);pen.stroke();last=q;event.preventDefault();});
function finishPointer(event){if(zoomStart){if(event?.clientX!==undefined)setZoom(MangoCamera.box(zoomState,zoomStart,normalized(event)));
 zoomStart=null;zoomPointer=null;get('zoom-selection').hidden=true;}drawing=false;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(type,finishPointer);
get('clear').addEventListener('click',clearInk);get('mode').addEventListener('click',()=>setSurfaceInteraction(!interaction));get('resetZoom').addEventListener('click',resetZoom);
function zoomBy(factor){if(!screen)return;setZoom(MangoCamera.anchor(zoomState,zoomState.zoom*factor,{x:.5,y:.5}));}
get('zoomIn').addEventListener('click',()=>zoomBy(1.35));get('zoomOut').addEventListener('click',()=>zoomBy(1/1.35));
get('zoomRegion').addEventListener('click',()=>{zoomRegion=!zoomRegion;get('zoomRegion').textContent='Zoom region: '+(zoomRegion?'ON':'OFF');
 get('zoomRegion').setAttribute('aria-pressed',String(zoomRegion));syncPointer();});
wrap.addEventListener('wheel',event=>{
 if(!screen)return;
 if(event.ctrlKey||controlPressed){event.preventDefault();event.stopImmediatePropagation();const amount=event.deltaY<0?1.14:1/1.14;
   setZoom(MangoCamera.anchor(zoomState,zoomState.zoom*amount,normalized(event)));return;}
 if(!interaction)return;
 // Captured Surface Control forwards trusted wheel events from the actual video element.
 // When unsupported, only the explicitly consented linked page receives fallback scrolling.
 if(!forwardingActive){
   event.preventDefault();scrollLinked(event.deltaY,normalized(event));
 }
},{capture:true,passive:false});
window.addEventListener('keydown',event=>{
 if(event.key==='Control'){controlPressed=true;syncPointer();}
 const input=event.target?.matches?.('input,textarea,select,[contenteditable]');if(input)return;
 if(!event.ctrlKey)return;
 if(!event.altKey&&event.key.toLowerCase()==='e'){event.preventDefault();clearInk();label('Ink cleared.');}
 if(event.altKey&&event.key.toLowerCase()==='c'){event.preventDefault();if(!get('mode').disabled)setSurfaceInteraction(!interaction);}
 if(event.altKey&&(event.key==='0'||event.code==='Digit0'||event.code==='Numpad0')){event.preventDefault();resetZoom();}
},true);
window.addEventListener('keyup',e=>{if(e.key==='Control'){controlPressed=false;syncPointer();}});
window.addEventListener('blur',()=>{controlPressed=false;syncPointer();});
start.addEventListener('click',async()=>{
 if(start.disabled)return;start.disabled=true;chunks=[];lastBlob=null;get('result').hidden=true;elapsed.textContent='00:00';warnings=[];resetZoom();clearInk();
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined')throw new Error('Screen capture APIs are unavailable.');
  label('Choose the browser tab, window or display to record…');
  const options={video:{frameRate:30,displaySurface:'browser'},audio:get('audio').checked};
  if(typeof CaptureController==='function'){
   try{controller=new CaptureController();options.controller=controller;}catch{controller=null;}
  }
  // No await before the native user-gesture screen picker.
  screen=await navigator.mediaDevices.getDisplayMedia(options);
  if(!screen?.getVideoTracks().length)throw new Error('No video track was granted.');tracks.push(...screen.getTracks());
  captureSource=screen.getVideoTracks()[0].getSettings()?.displaySurface||'';
  await tryLinkedTab();
  if(get('mic').checked){label('Requesting microphone permission…');try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    tracks.push(...mic.getTracks());}catch(error){warnings.push('Microphone unavailable ('+error.name+'). Recording continues.');}}
  preview.srcObject=screen;await preview.play();get('video-placeholder').hidden=true;
  const settings=screen.getVideoTracks()[0].getSettings();const w=settings.width||preview.videoWidth||1280,h=settings.height||preview.videoHeight||720;
  if(w*h>16000000)throw new Error('The source exceeds safe recording limits. Choose a smaller window.');
  ink.width=w;ink.height=h;
  // The visible canvas and the recorded stream are now the exact same composition.
  // Keep the video element underneath for captured-tab wheel forwarding.
  const composite=liveComposite;composite.width=w;composite.height=h;composite.style.display='block';
  ink.style.opacity='0';
  const ctx=composite.getContext('2d',{alpha:false});
  const render=()=>{if(!screen)return;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    if(preview.readyState>=2){const c=MangoCamera.crop(zoomState,w,h);ctx.drawImage(preview,c.sx,c.sy,c.sw,c.sh,0,0,w,h);}
    ctx.drawImage(ink,0,0);animation=requestAnimationFrame(render);};render();
  if(typeof composite.captureStream!=='function')throw new Error('Canvas recording is unavailable in this browser.');
  const output=composite.captureStream(30);tracks.push(...output.getVideoTracks());
  const sources=[...screen.getAudioTracks(),...(mic?.getAudioTracks()||[])];
  if(sources.length){try{audio=new AudioContext();const dest=audio.createMediaStreamDestination();
    for(const track of sources)audio.createMediaStreamSource(new MediaStream([track])).connect(dest);
    for(const track of dest.stream.getAudioTracks())output.addTrack(track);tracks.push(...dest.stream.getTracks());await audio.resume();
   }catch(error){warnings.push('Audio mixing unavailable ('+error.name+').');audio?.close().catch(()=>{});audio=null;}}
  recorder=supportedRecorder(output);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=e=>label('Recorder error: '+(e.error?.message||'Unknown error'));
  recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});cleanup();showResult(blob);};
  screen.getVideoTracks()[0].addEventListener('ended',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();},{once:true});
  recorder.start(1000);stop.disabled=false;pause.disabled=false;
  for(const id of ['mode','resetZoom','zoomIn','zoomOut','zoomRegion'])get(id).disabled=false;
  startedAt=Date.now();pausedAt=0;pausedTotal=0;light.className='record-dot active';
  timer=setInterval(()=>{const now=pausedAt||Date.now();elapsed.textContent=clock(now-startedAt-pausedTotal);},200);
  label('Recording '+w+'×'+h+' · '+(captureSource||'display')+' · '+(audio?'audio':'no audio')+(warnings.length?' · '+warnings.join(' '):''));
  if(controller?.setFocusBehavior)try{controller.setFocusBehavior('focus-capturing-application');}catch{}
  // Direct captured-tab wheel forwarding is requested when Interaction is enabled by the user.
 }catch(error){cleanup();label('Could not record: '+(error.name==='NotAllowedError'?'Permission denied or picker closed.':error.message)+' ['+(error.name||'Error')+']');}
});
stop.addEventListener('click',()=>{if(!recorder||recorder.state==='inactive')return;stop.disabled=true;pause.disabled=true;label('Finalizing recording…');recorder.stop();});
pause.addEventListener('click',()=>{if(!recorder)return;if(recorder.state==='recording'){recorder.pause();pausedAt=Date.now();pause.textContent='Resume';light.className='record-dot idle';label('Paused');}
 else if(recorder.state==='paused'){recorder.resume();pausedTotal+=Date.now()-pausedAt;pausedAt=0;pause.textContent='Pause';light.className='record-dot active';label('Recording resumed');}});
get('save-raw').addEventListener('click',()=>saveBlob(lastBlob));
get('discard').addEventListener('click',()=>{lastBlob=null;get('result').hidden=true;label('Recording discarded from memory.');});
get('edit').addEventListener('click',async()=>{if(!lastBlob)return;get('edit').disabled=true;label('Saving recording locally for Clip Studio…');
 try{await MangoClips.save(lastBlob);await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('clip-studio.html')});label('Clip Studio opened in a new tab.');}
 catch(error){label('Cannot open Clip Studio: '+error.message+'. Save original before closing.');}finally{get('edit').disabled=false;}});
window.addEventListener('beforeunload',event=>{if(recorder&&['recording','paused'].includes(recorder.state)){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',cleanup);
if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined'){label('Screen capture APIs unavailable here.');start.disabled=true;}
