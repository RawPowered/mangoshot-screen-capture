/* MangoShot v0.3.2 - device-local recorder, bounded ink history, dolly zoom,
 * held-key scrolling and incremental recovery. No passive or remote capture. */
const api=globalThis.chrome??globalThis.browser;
const get=id=>document.getElementById(id);
const preview=get('preview'),ink=get('ink'),pen=ink.getContext('2d');
const status=get('status'),start=get('start'),stop=get('stop'),pause=get('pause');
const light=get('light'),elapsed=get('elapsed'),wrap=get('screen-wrap'),composite=get('live-composite');
const source=Number(new URLSearchParams(location.search).get('source'));
const mimeCandidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
 'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
let screen=null,mic=null,recorder=null,audio=null,controller=null,captureSource='';
let animation=0,timer=0,tracks=[],chunks=[],lastBlob=null;
let recording=false,stopping=false,finalized=false,partialShown=false,stopTimeout=0,recordingMime='',recordingToken=0;
let zoomState=MangoCamera.camera(),zoomRegion=false,gesture=null;
let ctrlHeld=false,altHeld=false,scrollPermission=false,forwardingActive=false,linkedAvailable=false;
let scrollBusy=false,queuedScroll=0,warnings=[],startedAt=0,pausedAt=0,pausedTotal=0;
let strokes=[],activeStroke=null,history=[],renderPending=false;
let recoverySession=null,recoveryQueue=Promise.resolve(),recoveryBroken=false,chunkIndex=0;
const label=text=>{status.textContent=text;};
const clock=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const call=(fn,...args)=>new Promise((resolve,reject)=>{
 try{fn(...args,value=>{const error=api.runtime.lastError;error?reject(new Error(error.message)):resolve(value);});}
 catch(error){reject(error);}
});
function active(){return !!screen&&!stopping&&recording;}
function normalized(event){const rect=ink.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width))),
   y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)))};
}
function zoom(value){zoomState=MangoCamera.fit(value);get('zoomReadout').textContent=Math.round(zoomState.zoom*100)+'%';}
function resetZoom(){zoom(MangoCamera.camera());}
function zoomBy(factor){if(active())zoom(MangoCamera.anchor(zoomState,zoomState.zoom*factor,{x:.5,y:.5}));}
function updateMode(){
 const held=ctrlHeld&&altHeld&&active();
 get('mode').textContent=held?'Interaction: HELD':'Interaction: OFF';
 get('mode').className=held?'control-readout interaction-held':'control-readout';
 ink.style.pointerEvents=held?'none':'auto';
 ink.style.cursor=zoomRegion?'crosshair':(ctrlHeld&&!altHeld?'ns-resize':'crosshair');
}
function regionEnabled(value){zoomRegion=!!value;get('zoomRegion').textContent='Zoom region: '+(value?'ON':'OFF');
 get('zoomRegion').setAttribute('aria-pressed',String(value));
 if(!value)get('zoom-selection').hidden=true;
 updateMode();
}
function showMarquee(a,b){const sel=get('zoom-selection');
 Object.assign(sel.style,{left:Math.min(a.x,b.x)*100+'%',top:Math.min(a.y,b.y)*100+'%',
 width:Math.abs(a.x-b.x)*100+'%',height:Math.abs(a.y-b.y)*100+'%'});
 sel.hidden=false;
}
function drawStroke(stroke){if(!stroke?.points?.length)return;
 const points=stroke.points;pen.save();pen.strokeStyle=stroke.color;pen.lineCap='round';pen.lineJoin='round';
 for(let index=1;index<points.length;index++){
  const a=points[index-1],b=points[index];
  pen.lineWidth=stroke.size*Math.max(.2,(a.p+b.p)/2);
  pen.beginPath();pen.moveTo(a.x,a.y);pen.lineTo(b.x,b.y);pen.stroke();
 }
 if(points.length===1){const p=points[0];pen.fillStyle=stroke.color;pen.beginPath();
  pen.arc(p.x,p.y,Math.max(.5,stroke.size*p.p/2),0,2*Math.PI);pen.fill();}
 pen.restore();
}
function redrawInk(){pen.clearRect(0,0,ink.width,ink.height);for(const stroke of strokes)drawStroke(stroke);
 if(activeStroke)drawStroke(activeStroke);
}
function scheduleInk(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;redrawInk();});}
function rememberInk(){history.push(strokes.slice());if(history.length>80)history.shift();}
function commitStroke(){if(!activeStroke)return;
 rememberInk();strokes.push(activeStroke);activeStroke=null;redrawInk();get('undo').disabled=false;
}
function undoInk(){if(activeStroke)commitStroke();if(!history.length)return;
 strokes=history.pop();redrawInk();get('undo').disabled=!history.length;label('Undo · '+history.length+' earlier steps available.');}
function clearInk(){if(strokes.length||activeStroke){if(activeStroke)commitStroke();rememberInk();strokes=[];redrawInk();get('undo').disabled=false;}
 label('Ink cleared · Ctrl+Z restores prior marks.');}
function penPoint(event){const p=normalized(event);return {x:p.x*ink.width,y:p.y*ink.height,
 p:event.pointerType==='pen'?Math.max(.15,event.pressure||.5):1};}
function paint(event){if(!activeStroke)return;
 const events=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[event];
 for(const e of events){if(activeStroke.points.length>=12000)break;
   activeStroke.points.push(penPoint(e));}
 scheduleInk();
}
function hideFeedback(){get('zoom-feedback').hidden=true;}
ink.addEventListener('pointerdown',event=>{
 if(!active()||event.button!==0||ctrlHeld&&altHeld)return;
 event.preventDefault();ink.setPointerCapture(event.pointerId);
 if(zoomRegion){gesture={type:'region',start:normalized(event)};
   showMarquee(gesture.start,gesture.start);return;}
 if(event.ctrlKey||ctrlHeld){gesture={type:'dolly',startY:event.clientY,origin:zoomState,
   anchor:normalized(event),height:ink.getBoundingClientRect().height};
   const feedback=get('zoom-feedback');feedback.hidden=false;feedback.textContent='Drag ↑ Zoom in · ↓ Zoom out';return;}
 activeStroke={color:get('color').value,
   size:Number(get('size').value)*ink.width/Math.max(1,ink.getBoundingClientRect().width),points:[penPoint(event)]};
});
ink.addEventListener('pointermove',event=>{
 if(gesture?.type==='region'){showMarquee(gesture.start,normalized(event));event.preventDefault();return;}
 if(gesture?.type==='dolly'){
   const delta=gesture.startY-event.clientY;const factor=Math.exp(delta/Math.max(90,gesture.height*.3));
   zoom(MangoCamera.anchor(gesture.origin,gesture.origin.zoom*factor,gesture.anchor));
   get('zoom-feedback').textContent=(delta>=0?'↑ Zoom in ':'↓ Zoom out ')+Math.round(zoomState.zoom*100)+'%';
   event.preventDefault();return;
 }
 if(activeStroke){paint(event);event.preventDefault();}
});
function finishPointer(event){
 if(gesture?.type==='region'){
   if(event?.clientX!==undefined)zoom(MangoCamera.box(zoomState,gesture.start,normalized(event)));
   regionEnabled(false);
 }
 if(gesture?.type==='dolly')hideFeedback();
 gesture=null;
 if(activeStroke)commitStroke();
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])ink.addEventListener(type,finishPointer);
get('undo').addEventListener('click',undoInk);
get('clear').addEventListener('click',clearInk);
get('resetZoom').addEventListener('click',resetZoom);
get('zoomIn').addEventListener('click',()=>zoomBy(1.3));
get('zoomOut').addEventListener('click',()=>zoomBy(1/1.3));
get('zoomRegion').addEventListener('click',()=>regionEnabled(!zoomRegion));
function stopRender(){if(animation)cancelAnimationFrame(animation);animation=0;}
function stopTracks(){stopRender();for(const track of tracks){try{track.stop();}catch{}}
 tracks=[];if(audio){audio.close().catch(()=>{});audio=null;}}
function stopClock(){if(timer)clearInterval(timer);timer=0;
 const now=pausedAt||Date.now();if(startedAt)elapsed.textContent=clock(Math.max(0,now-startedAt-pausedTotal));
 light.className='record-dot idle';}
function resetControls(){start.disabled=false;stop.disabled=true;pause.disabled=true;pause.textContent='Pause';
 for(const id of ['resetZoom','zoomIn','zoomOut','zoomRegion'])get(id).disabled=true;
 regionEnabled(false);ctrlHeld=false;altHeld=false;updateMode();}
function cleanup(){stopTracks();stopClock();screen=null;mic=null;
 preview.srcObject=null;recorder=null;controller=null;captureSource='';scrollPermission=false;forwardingActive=false;
 get('video-placeholder').hidden=false;composite.style.display='none';ink.style.opacity='1';
 recording=false;stopping=false;resetControls();}
function saveBlob(blob,labelType){if(!blob?.size){label('No encoded video available.');return false;}
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
 link.download='MangoShot-'+new Date().toISOString().replace(/[:.]/g,'-')+(blob.type.includes('mp4')?'.mp4':'.webm');
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 if(labelType)label(labelType);return true;
}
function supportedRecorder(output){for(const mimeType of mimeCandidates){if(!MediaRecorder.isTypeSupported(mimeType))continue;
 try{return new MediaRecorder(output,{mimeType,videoBitsPerSecond:4500000});}catch{}}
 throw new Error('No supported video encoder for this browser.');}
function showResult(blob,partial=false){if(!blob?.size){label('No encoded data received. Check Recover recording before closing.');return;}
 lastBlob=blob;get('result').hidden=false;
 get('result-meta').textContent=(blob.size/1048576).toFixed(1)+' MiB · '+(blob.type.includes('mp4')?'MP4':'WebM')+
 (partial?' · INCOMPLETE, attempt recovery':' · source capture stopped');
 if(!partial)saveBlob(blob,'Capture stopped. Original video download started; local recovery is retained.');
 else label('Encoder delayed: the flushed chunks are available for emergency saving; file may be incomplete.');
}
function queueChunk(blob){if(!blob?.size)return;chunks.push(blob);
 if(recoverySession&&!recoveryBroken){const index=chunkIndex++;
   recoveryQueue=recoveryQueue.then(()=>MangoRecovery.append(recoverySession,index,blob)).catch(error=>{
     recoveryBroken=true;warnings.push('Local recovery storage failed ('+error.message+').');
   });}
}
async function markRecovered(session,queue,status){if(!session)return;
 try{await queue;await MangoRecovery.mark(session,status);}catch(error){warnings.push('Recovery state update failed: '+error.message);}
}
function finalize(partial=false){if(finalized)return;finalized=true;partialShown=partial;
 if(stopTimeout)clearTimeout(stopTimeout);stopTimeout=0;
 const blob=new Blob(chunks,{type:recordingMime||'video/webm'});
 const session=recoverySession,queue=recoveryQueue;
 cleanup();showResult(blob,partial);
 void markRecovered(session,queue,partial?'interrupted':'finished').then(()=>refreshRecovery());
}
function stopCapture(reason='Stopped by user'){
 if(stopping||!recorder||recorder.state==='inactive')return;
 stopping=true;recording=false;stop.disabled=true;pause.disabled=true;
 stopClock();label('Capture stopped · saving encoded video…');
 const current=recorder;
 try{current.stop();}catch(error){warnings.push('Encoder stop: '+error.message);}
 // Unlike v0.3.1, stop the expensive video loop and all capture/audio tracks NOW,
 // not inside recorder.onstop, which may be delayed until encoder flushing completes.
 stopTracks();
 if(!finalized){stopTimeout=setTimeout(()=>{
   if(!finalized){label('Encoder did not complete within 8 seconds; exposing flushed fragments.');finalize(true);}
 },8000);}
}
async function tryLinkedTab(){linkedAvailable=false;
 if(!Number.isInteger(source)||source<1||!api?.scripting?.executeScript||!api.tabs?.sendMessage)return;
 try{const tab=await call(api.tabs.get.bind(api.tabs),source);if(!/^https?:/.test(tab?.url??''))return;
   await call(api.scripting.executeScript.bind(api.scripting),{target:{tabId:source},files:['linked-tab.js']});
   linkedAvailable=true;get('linked-label').textContent='Linked tab: '+new URL(tab.url).host+'. Hold Ctrl+Alt and scroll over the preview after enabling the linked-tab checkbox. Actual clicks and typing require the real tab.';
 }catch{get('linked-label').textContent='Linked-tab scrolling unavailable. Share a browser tab and use Enable tab scrolling (Chrome/Edge), or operate the source tab directly.';}
}
async function scrollLinked(dy,where){if(!linkedAvailable||!get('linked-consent').checked||!ctrlHeld||!altHeld)return;
 queuedScroll+=dy;if(scrollBusy)return;scrollBusy=true;
 try{while(Math.abs(queuedScroll)>.1){const amount=Math.max(-1600,Math.min(1600,queuedScroll));queuedScroll-=amount;
 const result=await call(api.tabs.sendMessage.bind(api.tabs),source,{type:'MANGO_LINKED_SCROLL',dx:0,dy:amount,x:where.x,y:where.y});
 if(result?.ok===false)throw new Error(result.error||'Linked tab scroll rejected');}}
 catch(error){label('Linked-tab scroll unavailable: '+error.message);queuedScroll=0;}finally{scrollBusy=false;}}
get('enable-scroll').addEventListener('click',()=>{
 if(!controller?.forwardWheel||captureSource!=='browser'){
   label('Direct scrolling needs a shared browser tab; for full-screen capture use the linked-tab fallback.');return;
 }
 // A button click provides the transient activation required by forwardWheel.
 controller.forwardWheel(preview).then(()=>{forwardingActive=true;scrollPermission=true;
   get('enable-scroll').textContent='Tab scroll enabled';label('Hold Ctrl+Alt and wheel over the preview to scroll the shared tab.');})
   .catch(error=>label('Browser rejected scrolling ('+error.name+'). Enable the linked-tab fallback if appropriate.'));
});
wrap.addEventListener('wheel',event=>{
 if(!active())return;
 if(ctrlHeld&&altHeld){
   if(!forwardingActive||event.target!==preview){event.preventDefault();scrollLinked(event.deltaY,normalized(event));}
   return;
 }
 if(ctrlHeld&&!altHeld){event.preventDefault();event.stopImmediatePropagation?.();
   const factor=event.deltaY<0?1.14:1/1.14;
   zoom(MangoCamera.anchor(zoomState,zoomState.zoom*factor,normalized(event)));return;
 }
 // No interaction gesture: leave normal page scrolling alone.
},{capture:true,passive:false});
window.addEventListener('keydown',event=>{
 const ignored=event.target?.matches?.('input,textarea,select,[contenteditable]');
 ctrlHeld=!!event.ctrlKey;altHeld=!!event.altKey;updateMode();
 if(ignored)return;
 if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='z'){
   event.preventDefault();undoInk();return;
 }
 if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='e'){
   event.preventDefault();clearInk();return;
 }
 if(event.ctrlKey&&event.altKey&&(event.key==='0'||event.code==='Digit0'||event.code==='Numpad0')){
   event.preventDefault();resetZoom();
 }
},true);
window.addEventListener('keyup',event=>{ctrlHeld=!!event.ctrlKey;altHeld=!!event.altKey;updateMode();});
window.addEventListener('blur',()=>{ctrlHeld=false;altHeld=false;updateMode();});
async function checkRecovery(){
 try{const latest=await MangoRecovery.latest();if(!latest)return;
   const banner=get('recovery-banner');banner.hidden=false;banner.dataset.id=latest.id;
   get('recovery-meta').textContent='Local '+(latest.status==='finished'?'saved':'interrupted')+
      ' session from '+new Date(latest.created).toLocaleString()+'. Recover flushed fragments if needed.';
 }catch{get('recovery-meta').textContent='Local recovery storage unavailable in this browser.';}
}
async function refreshRecovery(){try{await checkRecovery();}catch{}}
get('recover').addEventListener('click',async()=>{
 const button=get('recover');button.disabled=true;label('Loading local recording fragments…');
 try{const latest=await MangoRecovery.latest();const blob=await MangoRecovery.restore(latest);
   lastBlob=blob;get('result').hidden=false;
   get('result-meta').textContent=(blob.size/1048576).toFixed(1)+' MiB · recovered '+(blob.type.includes('mp4')?'MP4':'WebM');
   label('Recovered stored video fragments. Choose Save original; interrupted MP4 fragments may not be playable.');
 }catch(error){label('Cannot recover: '+error.message);}finally{button.disabled=false;}
});
get('dismiss-recovery').addEventListener('click',async()=>{
 const button=get('dismiss-recovery');button.disabled=true;
 try{const session=await MangoRecovery.latest();if(session)await MangoRecovery.discard(session);
 get('recovery-banner').hidden=true;}catch(error){label('Could not clear recovered recording: '+error.message);}finally{button.disabled=false;}
});
start.addEventListener('click',async()=>{
 if(start.disabled)return;start.disabled=true;chunks=[];chunkIndex=0;lastBlob=null;
 recoverySession=null;recoveryQueue=Promise.resolve();recoveryBroken=false;
 recording=false;stopping=false;finalized=false;partialShown=false;recordingToken++;const token=recordingToken;
 get('result').hidden=true;
 elapsed.textContent='00:00';warnings=[];resetZoom();history=[];strokes=[];activeStroke=null;redrawInk();get('undo').disabled=true;
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined')throw new Error('Screen capture APIs are unavailable.');
  label('Choose the browser tab, window or display to record…');
  const options={video:{frameRate:30,displaySurface:'browser'},audio:get('audio').checked};
  if(typeof CaptureController==='function'){
   try{controller=new CaptureController();options.controller=controller;}catch{controller=null;}
  }
  // No await before the native user-gesture screen picker.
  screen=await navigator.mediaDevices.getDisplayMedia(options);
  if(!screen?.getVideoTracks().length)throw new Error('No video track was granted.');
  tracks.push(...screen.getTracks());captureSource=screen.getVideoTracks()[0].getSettings()?.displaySurface||'';
  await tryLinkedTab();
  if(get('mic').checked){label('Requesting microphone permission…');try{
     mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
     tracks.push(...mic.getTracks());
   }catch(error){warnings.push('Microphone unavailable ('+error.name+'). Video continues.');}}
  preview.srcObject=screen;await preview.play();get('video-placeholder').hidden=true;
  const settings=screen.getVideoTracks()[0].getSettings();const w=settings.width||preview.videoWidth||1280;
  const h=settings.height||preview.videoHeight||720;
  if(w*h>16000000)throw new Error('Screen exceeds safe recording dimensions; choose a smaller window.');
  ink.width=w;ink.height=h;composite.width=w;composite.height=h;
  composite.style.display='block';ink.style.opacity='0';
  const ctx=composite.getContext('2d',{alpha:false});
  const render=()=>{if(!screen||stopping)return;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    if(preview.readyState>=2){const crop=MangoCamera.crop(zoomState,w,h);
      ctx.drawImage(preview,crop.sx,crop.sy,crop.sw,crop.sh,0,0,w,h);}
    ctx.drawImage(ink,0,0);animation=requestAnimationFrame(render);};render();
  if(typeof composite.captureStream!=='function')throw new Error('Canvas recording unsupported.');
  const output=composite.captureStream(30);tracks.push(...output.getVideoTracks());
  const inputs=[...screen.getAudioTracks(),...(mic?.getAudioTracks()||[])];
  if(inputs.length){try{audio=new AudioContext();const dest=audio.createMediaStreamDestination();
    for(const track of inputs)audio.createMediaStreamSource(new MediaStream([track])).connect(dest);
    for(const track of dest.stream.getAudioTracks())output.addTrack(track);
    tracks.push(...dest.stream.getTracks());await audio.resume();
   }catch(error){warnings.push('Audio mixing unavailable ('+error.name+').');audio?.close().catch(()=>{});audio=null;}}
  recorder=supportedRecorder(output);recordingMime=recorder.mimeType||'video/webm';
  try{recoverySession=await MangoRecovery.begin(recordingMime);}
  catch(error){warnings.push('Storage unavailable: download original immediately when finished.');}
  recorder.ondataavailable=event=>{if(token===recordingToken)queueChunk(event.data);};
  recorder.onerror=event=>{
    warnings.push('Encoder error ('+(event.error?.message||'unknown')+').');
    label('Encoder error. Preserving flushed chunks…');
  };
  recorder.onstop=()=>{if(token!==recordingToken)return;
    if(partialShown){
      // A late encoder stop can contain the missing end-of-file metadata.
      const complete=new Blob(chunks,{type:recordingMime||'video/webm'});
      if(complete.size>(lastBlob?.size||0)){showResult(complete,false);
        const session=recoverySession,queue=recoveryQueue;
        void markRecovered(session,queue,'finished').then(()=>refreshRecovery());}
      partialShown=false;return;
    }
    finalize(false);
  };
  screen.getVideoTracks()[0].addEventListener('ended',()=>stopCapture('Screen sharing ended'),{once:true});
  recorder.start(1000);recording=true;
  stop.disabled=false;pause.disabled=false;
  for(const id of ['resetZoom','zoomIn','zoomOut','zoomRegion'])get(id).disabled=false;
  get('enable-scroll').disabled=!(controller?.forwardWheel&&captureSource==='browser');
  startedAt=Date.now();pausedAt=0;pausedTotal=0;light.className='record-dot active';
  timer=setInterval(()=>{const now=pausedAt||Date.now();elapsed.textContent=clock(now-startedAt-pausedTotal);},200);
  label('Recording '+w+'×'+h+' · '+(captureSource||'display')+' · '+(audio?'audio':'no audio')+
    (warnings.length?' · '+warnings.join(' '):''));
  if(controller?.setFocusBehavior)try{controller.setFocusBehavior('focus-capturing-application');}catch{}
 }catch(error){cleanup();label('Could not record: '+(error.name==='NotAllowedError'?'Permission denied or picker closed.':error.message));}
});
stop.addEventListener('click',()=>stopCapture());
pause.addEventListener('click',()=>{
 if(!recorder||stopping)return;
 if(recorder.state==='recording'){recorder.pause();pausedAt=Date.now();pause.textContent='Resume';light.className='record-dot idle';label('Recording paused');}
 else if(recorder.state==='paused'){recorder.resume();pausedTotal+=Date.now()-pausedAt;pausedAt=0;
   pause.textContent='Pause';light.className='record-dot active';label('Recording resumed');}
});
get('save-raw').addEventListener('click',()=>saveBlob(lastBlob,'Saved original recording.'));
get('discard').addEventListener('click',()=>{lastBlob=null;get('result').hidden=true;label('Recording removed from memory; local recovery remains until cleared.');});
get('edit').addEventListener('click',async()=>{
 if(!lastBlob)return;get('edit').disabled=true;label('Opening Clip Studio…');
 try{await MangoClips.save(lastBlob);await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('clip-studio.html')});
 label('Clip Studio opened. Original recording remains available.');}
 catch(error){label('Could not open Clip Studio: '+error.message+'. Save original instead.');}
 finally{get('edit').disabled=false;}
});
window.addEventListener('beforeunload',event=>{
 if((recording||stopping)&&!finalized){event.preventDefault();event.returnValue='';}
});
window.addEventListener('pagehide',()=>{stopTracks();stopClock();});
if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined'){
 label('Screen capture APIs unavailable here.');start.disabled=true;
}
void checkRecovery();
