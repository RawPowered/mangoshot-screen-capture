/* MangoShot v0.3.2 - device-local recorder, bounded ink history, dolly zoom,
 * held-key scrolling and incremental recovery. No passive or remote capture. */
const api=globalThis.chrome??globalThis.browser;
const get=id=>document.getElementById(id);
const preview=get('preview'),ink=get('ink'),pen=ink.getContext('2d');
const status=get('status'),start=get('start'),stop=get('stop'),pause=get('pause');
const light=get('light'),elapsed=get('elapsed'),wrap=get('screen-wrap'),composite=get('live-composite');
const control=globalThis.MangoRecorderControlV0710;
const source=Number(new URLSearchParams(location.search).get('source'));
const mimeCandidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
 'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
let screen=null,mic=null,recorder=null,audio=null,controller=null,captureSource='';
let animation=0,timer=0,tracks=[],chunks=[],lastBlob=null,lastSessionId=null;
let recording=false,stopping=false,finalized=false,partialShown=false,stopTimeout=0,recordingMime='',recordingToken=0;
let zoomState=MangoCamera.camera(),zoomRegion=false,gesture=null;
let ctrlHeld=false,altHeld=false,scrollPermission=false,forwardingActive=false,linkedAvailable=false,interaction=false,forwardBusy=false;
let sourceVideo=preview,audioDest=null,screenAudioNodes=[],sharedAudio=false,pendingSwitch=null,sourceChanges=0;
let scrollBusy=false,queuedScroll=0,warnings=[],startedAt=0,pausedAt=0,pausedTotal=0;
let strokes=[],activeStroke=null,history=[],renderPending=false;
// Every capture owns its own encoder/chunks/storage; late onstop cannot corrupt the next session.
let activeSession=null,lastCursorTrace=null;
const label=text=>{status.textContent=text;};
function recordState(value){const el=get('record-state');if(!el)return;el.dataset.state=value;el.textContent=({ready:'Ready',recording:'Recording',stopped:'Capture stopped',finalizing:'Finalizing video',recovery:'Recovery available',complete:'Ready to edit',error:'Capture error'})[value]||value;}
recordState('ready');
const clock=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const call=(fn,...args)=>new Promise((resolve,reject)=>{
 try{fn(...args,value=>{const error=api.runtime.lastError;error?reject(new Error(error.message)):resolve(value);});}
 catch(error){reject(error);}
});
function active(){return !!screen&&!stopping&&recording;}
function explainCaptureSurface(kind){
 const tag=get('source-surface'),info=get('source-guidance');
 if(!tag||!info)return;
 const types={browser:'BROWSER TAB',window:'APPLICATION WINDOW',monitor:'ENTIRE SCREEN'};
 tag.textContent='SOURCE · '+(types[kind]||'DISPLAY');
 tag.dataset.kind=kind||'unknown';
 if(kind==='browser')info.textContent='Captured-tab scrolling can be enabled in Chromium. Toggle Interaction for a consented linked-tab fallback. Clicks and typing happen in the actual tab.';
 else if(kind==='monitor')info.textContent='Entire-screen recording: no separate tab-interaction permission prompt is available. The preview cannot remote-click or type. Use the actual source application; for linked website scrolling, explicitly enable the consent checkbox and enable Interaction, then scroll.';
 else if(kind==='window')info.textContent='Window recording: there is no tab-interaction permission prompt for application windows. Use that window directly. The preview supports framing and annotation only.';
 else info.textContent='Recording source selected. Preview interaction depends on the selected browser surface.';
}

function cameraPoint(p){const f=control.fitFrame(sourceVideo.videoWidth||composite.width,sourceVideo.videoHeight||composite.height,composite.width,composite.height);return {x:Math.max(0,Math.min(1,(p.x-f.x)/f.w)),y:Math.max(0,Math.min(1,(p.y-f.y)/f.h))};}
function normalized(event){const rect=ink.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width))),
   y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)))};
}
function zoom(value){if(active())globalThis.MangoRecorderCursorV073?.manualCamera?.();zoomState=MangoCamera.fit(value);get('zoomReadout').textContent=Math.round(zoomState.zoom*100)+'%';}
function resetZoom(){zoom(MangoCamera.camera());}
function zoomBy(factor){if(active())zoom(MangoCamera.anchor(zoomState,zoomState.zoom*factor,{x:.5,y:.5}));}
function updateMode(){
 const on=interaction&&active();
 get('mode').textContent=on?'Interaction: ON':'Interaction: OFF';
 get('mode').className=on?'control-readout interaction-held':'control-readout';
 get('mode').setAttribute('aria-pressed',String(on));get('mode').disabled=!active()||forwardBusy;
 ink.style.pointerEvents=on?'none':'auto';
 ink.style.cursor=zoomRegion?'crosshair':(ctrlHeld&&!altHeld?'ns-resize':'crosshair');
 get('enable-scroll').disabled=!on||forwardBusy||!(controller?.forwardWheel&&captureSource==='browser');
}
async function toggleInteraction(){
 if(!active()||forwardBusy)return;
 if(interaction&&forwardingActive){await nativeWheel(false);if(forwardingActive||!active())return;}
 if(!active())return;
 if(activeStroke)commitStroke();
 gesture=null;get('zoom-selection').hidden=true;hideFeedback();queuedScroll=0;
 interaction=!interaction;updateMode();
 label(interaction?'Interaction ON · scroll an explicitly consented linked page, or enable native tab wheel forwarding.':'Interaction OFF · annotate and frame the recording.');
}
get('mode').addEventListener('click',toggleInteraction);
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
 if(!active()||event.button!==0||interaction)return;
 event.preventDefault();ink.setPointerCapture(event.pointerId);
 if(zoomRegion){gesture={type:'region',start:normalized(event)};
   showMarquee(gesture.start,gesture.start);return;}
 if(event.ctrlKey||ctrlHeld){gesture={type:'dolly',startY:event.clientY,origin:zoomState,
   anchor:cameraPoint(normalized(event)),height:ink.getBoundingClientRect().height};
   const feedback=get('zoom-feedback');feedback.hidden=false;feedback.textContent='Drag ↑ Zoom in · ↓ Zoom out';return;}
 if(globalThis.MangoRecorderCursorV073?.focusTool?.())return;
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
   if(event?.clientX!==undefined)zoom(MangoCamera.box(zoomState,cameraPoint(gesture.start),cameraPoint(normalized(event))));
   // Keep the selected region tool engaged until the user exits it or chooses another tool.
   get('zoom-selection').hidden=true;
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
function disposeVideo(video){if(!video)return;try{video.pause?.();video.srcObject=null;}catch{}}
function stopStream(stream){for(const track of stream?.getTracks()||[])try{track.stop();}catch{}}
function disconnectNodes(nodes){for(const node of nodes)try{node.disconnect();}catch{}}
function cancelSwitch(close=true){
 const p=pendingSwitch;pendingSwitch=null;if(p){p.cancel?.();disposeVideo(p.video);stopStream(p.stream);disconnectNodes(p.nodes||[]);}
 get('source-choose-v0710').disabled=false;
 get('switch-source-v0710').disabled=!active();
 if(close&&get('source-dialog-v0710').open)get('source-dialog-v0710').close();
}
function stopTracks(){cancelSwitch();stopRender();disposeVideo(sourceVideo);for(const track of tracks){try{track.stop();}catch{}}
 tracks=[];disconnectNodes(screenAudioNodes);screenAudioNodes=[];audioDest=null;
 if(audio){audio.close().catch(()=>{});audio=null;}
}
function stopClock(){if(timer)clearInterval(timer);timer=0;
 const now=pausedAt||Date.now();if(startedAt)elapsed.textContent=clock(Math.max(0,now-startedAt-pausedTotal));
 light.className='record-dot idle';}
function resetControls(){start.disabled=false;stop.disabled=true;pause.disabled=true;pause.textContent='Pause';
 for(const id of ['zoomIn','zoomOut','zoomRegion'])get(id).disabled=true;
 get('resetZoom').disabled=false;regionEnabled(false);ctrlHeld=false;altHeld=false;interaction=false;forwardBusy=false;get('switch-source-v0710').disabled=true;updateMode();}
function cleanup(){globalThis.MangoRecorderCursorV073?.end?.();stopTracks();stopClock();screen=null;mic=null;
 preview.srcObject=null;sourceVideo=preview;wrap.dataset.recording='false';wrap.style.aspectRatio='';wrap.style.removeProperty?.('--record-aspect');recorder=null;controller=null;captureSource='';scrollPermission=false;forwardingActive=false;sharedAudio=false;
 get('video-placeholder').hidden=false;composite.style.display='none';ink.style.opacity='1';
 get('enable-scroll').disabled=true;get('enable-scroll').textContent='Enable captured-tab wheel control';
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
function showResult(blob,partial=false,sessionId=null){if(!blob?.size){label('No encoded data received. Check Recover recording before closing.');return;}
 lastBlob=blob;lastSessionId=sessionId;get('result').hidden=false;
 get('result-meta').textContent=(blob.size/1048576).toFixed(1)+' MiB · '+(blob.type.includes('mp4')?'MP4':'WebM')+
 (partial?' · INCOMPLETE, attempt recovery':' · source capture stopped');
 if(!partial)saveBlob(blob,'Video finalized. Original download requested; confirm it in your Downloads folder.');
 else label('Encoder delayed: the flushed chunks are available for emergency saving; file may be incomplete.');
}
function createSession(token,mime,encoder){
 return {id:(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+token),token,mime,encoder,chunks:[],chunkIndex:0,storage:null,queue:Promise.resolve(),storageError:false,
  stopped:false,partial:false,complete:false,watchdog:0};
}
function queueChunkFor(session,blob){
 if(!blob?.size)return;
 session.chunks.push(blob);
 if(activeSession===session&&get('chunk-info'))get('chunk-info').textContent=session.chunks.length+' encoded fragment(s) available locally';
 if(session.storage&&!session.storageError){const index=session.chunkIndex++;
  session.queue=session.queue.then(()=>MangoRecovery.append(session.storage,index,blob)).catch(error=>{
   session.storageError=true;warnings.push('Recovery storage failed: '+error.message);
   if(activeSession===session)label('Recording continues, but recovery storage failed. Save the video when complete.');
  });
 }
}
async function markRecovered(session,queue,status){if(!session)return;
 try{await queue;await MangoRecovery.mark(session,status);}catch(error){warnings.push('Recovery state update failed: '+error.message);}
}
function finishSession(session,partial=false){
 if(!session||session.complete||partial&&session.partial)return;
 if(session.watchdog)clearTimeout(session.watchdog);session.watchdog=0;
 if(partial)session.partial=true;else session.complete=true;
 const blob=new Blob(session.chunks,{type:session.mime||'video/webm'});
 const isCurrent=activeSession===session;
 if(isCurrent){
  finalized=true;partialShown=partial;cleanup();recordState(partial?'recovery':'complete');
  lastCursorTrace=partial?null:session.cursorTrace||null;
  showResult(blob,partial,session.id);
 }else if(!partial&&blob.size){
  // This belongs to a former session. Do not replace the current recording's UI.
  // Recovery storage also retains this result even if the automatic download is blocked.
  saveBlob(blob,null);
 }
 void markRecovered(session.storage,session.queue,partial?'interrupted':'finished').then(()=>refreshRecovery());
}
function stopCapture(reason='Stopped by user'){
 const session=activeSession;
 if(!session||session.stopped||!recorder)return;
 session.cursorTrace=globalThis.MangoRecorderCursorV073?.end?.()||null;
 session.stopped=true;stopping=true;recording=false;stop.disabled=true;pause.disabled=true;
 stopClock();recordState('stopped');label('Capture stopped. Finalizing video file separately…');
 try{if(session.encoder.state!=='inactive')session.encoder.stop();}
 catch(error){warnings.push('Encoder stop failed: '+error.message);}
 stopTracks();
 if(session.complete)return; // onstop may fire synchronously in some implementations
 recordState('finalizing');
 if(!session.complete&&!session.partial){
  session.watchdog=setTimeout(()=>{if(!session.complete){
   label('Encoder delayed. Available fragments are accessible through recovery; they may be incomplete.');
   finishSession(session,true);
  }},8000);
 }
}
async function tryLinkedTab(){linkedAvailable=false;get('source-focus').disabled=true;
 if(!Number.isInteger(source)||source<1||!api?.scripting?.executeScript||!api.tabs?.sendMessage)return;
 try{const tab=await call(api.tabs.get.bind(api.tabs),source);if(!/^https?:/.test(tab?.url??''))return;
   await call(api.scripting.executeScript.bind(api.scripting),{target:{tabId:source},files:['linked-tab.js']});
   linkedAvailable=true;get('source-focus').disabled=false;
   get('linked-label').textContent='Linked source: '+new URL(tab.url).host+'. This is the page that launched MangoShot and may differ from the tab selected in the browser picker.';
 }catch{get('source-focus').disabled=true;get('linked-label').textContent='Linked-tab access unavailable. Open the real application yourself, or start MangoShot from an ordinary webpage.';}
}
async function scrollLinked(dy,where){if(!active()||!linkedAvailable||!get('linked-consent').checked||!interaction)return;
 const current=screen;
 queuedScroll+=dy;if(scrollBusy)return;scrollBusy=true;
 try{while(active()&&screen===current&&interaction&&get('linked-consent').checked&&Math.abs(queuedScroll)>.1){const amount=Math.max(-1600,Math.min(1600,queuedScroll));queuedScroll-=amount;
 const result=await call(api.tabs.sendMessage.bind(api.tabs),source,{type:'MANGO_LINKED_SCROLL',dx:0,dy:amount,x:where.x,y:where.y});
 if(result?.ok===false)throw new Error(result.error||'Linked tab scroll rejected');}}
 catch(error){label('Linked-tab scroll unavailable: '+error.message);queuedScroll=0;}finally{scrollBusy=false;}}
get('source-focus').addEventListener('click',async()=>{
 if(!linkedAvailable||!Number.isInteger(source)||source<1){label('No authorized linked source tab. Start MangoShot from a webpage.');return;}
 try{
   const tab=await call(api.tabs.get.bind(api.tabs),source);
   if(!/^https?:/.test(tab?.url||''))throw new Error('Linked source is no longer a webpage.');
   await call(api.tabs.update.bind(api.tabs),source,{active:true});
   if(tab.windowId!=null&&api.windows?.update)await call(api.windows.update.bind(api.windows),tab.windowId,{focused:true}).catch(()=>{});
   label('Switched to linked source tab. Interact there; MangoShot keeps recording.');
 }catch(error){label('Cannot focus linked tab: '+error.message+' · Open the source manually.');}
});
get('linked-consent').addEventListener('change',()=>{
 const checked=get('linked-consent').checked;
 label(checked?'Linked-tab scroll enabled for the page that launched MangoShot (not necessarily the screen picker source). Enable Interaction (Ctrl + backtick) to scroll it.':'Linked-tab scroll consent turned off.');
});
async function nativeWheel(enable){
 const c=controller,owner=screen;
 if(forwardBusy||!active()||!c?.forwardWheel||captureSource!=='browser'||(enable&&!interaction))return;
 forwardBusy=true;updateMode();
 try{await c.forwardWheel(enable?wrap:null);if(screen!==owner||controller!==c||!active())return;
  forwardingActive=enable;scrollPermission=enable;
  get('enable-scroll').textContent=enable?'Tab wheel forwarding ON':'Enable captured-tab wheel control';
  label(enable?'Native captured-tab wheel forwarding ON. Turn Interaction off to disable it.':'Native tab wheel forwarding OFF.');
 }catch(error){if(screen===owner&&controller===c)label('Browser rejected wheel control ('+error.name+'). Existing state retained.');}
 finally{if(screen===owner&&controller===c){forwardBusy=false;updateMode();}}
}
get('enable-scroll').addEventListener('click',()=>nativeWheel(!forwardingActive));
wrap.addEventListener('wheel',event=>{
 if(!active())return;
 if(interaction){
   // Only one forwarding path: never forward the same wheel through both APIs.
   if(forwardingActive)return;
   // An explicitly linked tab can be used if native forwarding is off:
   // Ctrl modifiers, which some pages interpret as page zoom rather than scroll.
   if(linkedAvailable&&get('linked-consent').checked){
     event.preventDefault();scrollLinked(event.deltaY,normalized(event));return;
   }
   event.preventDefault();
   label('Interaction is ON. Enable captured-tab wheel control or authorize linked-tab scrolling.');
   return;
 }
 if(ctrlHeld&&!altHeld){event.preventDefault();event.stopImmediatePropagation?.();
   const factor=event.deltaY<0?1.14:1/1.14;
   zoom(MangoCamera.anchor(zoomState,zoomState.zoom*factor,cameraPoint(normalized(event))));return;
 }
 // Interaction is off: preserve ordinary page scrolling.
},{capture:true,passive:false});
window.addEventListener('keydown',event=>{
 const modal=get('automation-dialog-v075')?.open||get('source-dialog-v0710')?.open;
 const ignored=control.editable(event.target);
 ctrlHeld=!!event.ctrlKey;altHeld=!!event.altKey;updateMode();
 if(modal||ignored||event.isComposing)return;
 if(control.backtick(event)&&!event.altKey&&!event.metaKey){
  if(event.ctrlKey&&!event.shiftKey){event.preventDefault();if(!event.repeat)void toggleInteraction();return;}
  if(event.shiftKey&&!event.ctrlKey){event.preventDefault();if(!event.repeat)openSourceDialog();return;}
 }
 const key=control.key(event);
 if(key&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey){
  event.preventDefault();globalThis.MangoRecorderCursorV073?.spotlightDown?.(key,!!event.repeat);return;
 }
 if(event.key==='Escape'&&gesture){gesture=null;get('zoom-selection').hidden=true;hideFeedback();label('Selection cancelled.');return;}
 if(event.key==='Escape'&&zoomRegion){regionEnabled(false);return;}
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
window.addEventListener('keyup',event=>{ctrlHeld=!!event.ctrlKey;altHeld=!!event.altKey;updateMode();const key=control.key(event);if(key&&globalThis.MangoRecorderCursorV073?.spotlightUp?.(key))event.preventDefault();});
function releaseTransient(){ctrlHeld=false;altHeld=false;globalThis.MangoRecorderCursorV073?.spotlightCancel?.();updateMode();}
window.addEventListener('blur',releaseTransient);
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)releaseTransient();});
get('automation-open-v075').addEventListener('click',releaseTransient);

function watchSource(stream,session){
 stream.getVideoTracks()[0].addEventListener('ended',()=>{if(screen===stream&&activeSession===session)stopCapture('Screen sharing ended');},{once:true});
}
function sourceName(kind){return ({monitor:'Entire screen',browser:'Browser tab',window:'Application window'})[kind]||'Display';}
function openSourceDialog(){
 if(!active()||pendingSwitch||forwardBusy)return;
 const dialog=get('source-dialog-v0710');if(dialog.open)return;
 releaseTransient();get('source-current-v0710').textContent=sourceName(captureSource);
 get('source-resolution-v0710').textContent=composite.width+' × '+composite.height;
 get('source-switch-status-v0710').textContent='Current capture continues until a replacement is ready.';
 get('source-choose-v0710').textContent=captureSource==='monitor'?'Choose another monitor…':'Choose capture source…';
 dialog.showModal();
}
get('switch-source-v0710').addEventListener('click',openSourceDialog);
get('source-cancel-v0710').addEventListener('click',()=>cancelSwitch());
get('source-dialog-v0710').addEventListener('cancel',e=>{e.preventDefault();cancelSwitch();});
get('source-dialog-v0710').addEventListener('close',()=>{if(!get('source-dialog-v0710').open&&pendingSwitch)cancelSwitch(false);});
function waitFrame(video,request){
 return new Promise((resolve,reject)=>{
  let done=false;
  function finish(error){if(done)return;done=true;clearTimeout(timer);request.cancel=null;error?reject(error):resolve();}
  const timer=setTimeout(()=>finish(Error('Replacement source did not produce a video frame')),12000);
  request.cancel=()=>finish(Error('Source switch canceled'));
  Promise.resolve().then(()=>video.play()).then(()=>{
   if(video.readyState<2||!video.videoWidth||!video.videoHeight)throw Error('Replacement source has no decoded frame');
   finish();
  }).catch(finish);
 });
}
async function switchSource(){
 if(!active()||pendingSwitch||forwardBusy||!get('source-dialog-v0710').open)return;
 const old=screen,session=activeSession,kind=captureSource,request={stream:null,video:null,nodes:[],cancel:null};
 pendingSwitch=request;get('source-choose-v0710').disabled=true;get('switch-source-v0710').disabled=true;
 const message=t=>{get('source-switch-status-v0710').textContent=t;};
 const current=()=>pendingSwitch===request&&screen===old&&activeSession===session&&active();
 let nextController=null;
 try{
  const options={video:{frameRate:30,displaySurface:kind||'monitor'},audio:sharedAudio};
  if(typeof CaptureController==='function')try{nextController=new CaptureController();options.controller=nextController;}catch{}
  message('Choose a new source in the browser picker. The old source is still recording.');
  // No await before the explicitly clicked, browser-controlled picker.
  const candidate=await navigator.mediaDevices.getDisplayMedia(options);
  if(!current()){stopStream(candidate);return;}
  request.stream=candidate;
  const track=candidate.getVideoTracks()[0],settings=track?.getSettings()||{};
  if(!track||track.readyState==='ended')throw Error('No live replacement video track');
  if(kind==='monitor'&&settings.displaySurface&&settings.displaySurface!=='monitor')throw Error('Choose a monitor when switching an entire-screen recording');
  const video=document.createElement('video');request.video=video;video.muted=true;video.playsInline=true;video.srcObject=candidate;
  message('Preparing replacement frames and audio…');await waitFrame(video,request);
  if(!current())return;
  if(track.readyState==='ended'||video.videoWidth*video.videoHeight>16000000)throw Error('Replacement source ended or exceeds safe dimensions');
  // Connect only to the existing audio destination. The encoder track set never changes.
  if(audioDest&&sharedAudio)for(const a of candidate.getAudioTracks()){
   const node=audio.createMediaStreamSource(new MediaStream([a]));request.nodes.push(node);node.connect(audioDest);
  }
  if(!current())return;
  const formerVideo=sourceVideo,formerTracks=old.getTracks(),formerNodes=screenAudioNodes;
  // Atomic synchronous commit: render loop reads the new decoder, old ended events
  // cannot stop the new capture, and the original encoder/recovery session stays live.
  screen=candidate;sourceVideo=video;screenAudioNodes=request.nodes;controller=nextController;captureSource=settings.displaySurface||kind;
  tracks=tracks.filter(t=>!formerTracks.includes(t));tracks.push(...candidate.getTracks());
  pendingSwitch=null;sourceChanges++;watchSource(candidate,session);
  disconnectNodes(formerNodes);disposeVideo(formerVideo);stopStream(old);
  interaction=false;forwardingActive=false;scrollPermission=false;forwardBusy=false;queuedScroll=0;
  get('linked-consent').checked=false;get('enable-scroll').textContent='Enable captured-tab wheel control';
  resetZoom();regionEnabled(false);globalThis.MangoRecorderCursorV073?.sourceChanged?.();explainCaptureSurface(captureSource);updateMode();
  get('switch-source-v0710').disabled=false;get('source-choose-v0710').disabled=false;get('source-dialog-v0710').close();
  label('Switched to '+sourceName(captureSource)+' · same recording, '+composite.width+'×'+composite.height+(sharedAudio&&(!audioDest||!candidate.getAudioTracks().length)?' · no replacement shared audio; microphone unchanged':''));
  if(nextController?.setFocusBehavior)try{nextController.setFocusBehavior('focus-capturing-application');}catch{}
 }catch(error){
  if(pendingSwitch===request){
   cancelSwitch(false);message(error.name==='NotAllowedError'?'Picker canceled or permission denied. Existing recording unchanged.':'Source switch failed: '+error.message+'. Existing recording unchanged.');
  }
 }
}
get('source-choose-v0710').addEventListener('click',switchSource);
globalThis.MangoRecorderSessionV0710=Object.freeze({inspect:()=>({active:active(),state:recorder?.state||'inactive',sessionId:activeSession?.id||null,sourceChanges,source:captureSource,outputWidth:composite.width,outputHeight:composite.height,interaction,switching:!!pendingSwitch,sharedAudioNodes:screenAudioNodes.length,audioOutput:!!audioDest})});
async function checkRecovery(){
 try{
  const sessions=typeof MangoRecovery.list==='function'?await MangoRecovery.list():[await MangoRecovery.latest()].filter(Boolean);
  const banner=get('recovery-banner'),select=get('recovery-select');
  if(!sessions.length){banner.hidden=true;return;}
  const previous=select?.value;
  if(select){select.replaceChildren();for(const item of sessions){
   const option=document.createElement('option');option.value=item.id;
   option.textContent=new Date(item.created).toLocaleString()+' · '+item.status+' · '+(item.mime?.includes('mp4')?'MP4':'WebM');
   select.appendChild(option);
  }
  if(sessions.some(item=>item.id===previous))select.value=previous;
  }
  banner.hidden=false;
  get('recovery-meta').textContent=sessions.length+' locally stored recording session(s). Choose a session to recover. Video fragments stay on this device.';
 }catch(error){get('recovery-meta').textContent='Local recovery unavailable: '+error.message;}
}
async function refreshRecovery(){try{await checkRecovery();}catch{}}
get('recover').addEventListener('click',async()=>{
 const button=get('recover');button.disabled=true;label('Loading local recording fragments…');
 try{const sessions=typeof MangoRecovery.list==='function'?await MangoRecovery.list():[await MangoRecovery.latest()].filter(Boolean);
  const target=sessions.find(item=>item.id===get('recovery-select')?.value)||sessions[0];
  if(!target)throw new Error('No recording selected.');
  const blob=await MangoRecovery.restore(target);lastBlob=blob;lastSessionId=target.id;lastCursorTrace=null;get('result').hidden=false;
  get('result-meta').textContent=(blob.size/1048576).toFixed(1)+' MiB · '+(target.status==='finished'?'finalized':'INCOMPLETE')+' · '+(blob.type.includes('mp4')?'MP4':'WebM');
  label('Recovered local fragments. Save original to download; interrupted MP4 may lack final playback metadata.');
 }catch(error){label('Cannot recover: '+error.message);}finally{button.disabled=false;}
});
get('dismiss-recovery').addEventListener('click',async()=>{
 const button=get('dismiss-recovery');button.disabled=true;
 try{await MangoRecovery.clearAll();get('recovery-banner').hidden=true;
 label('All locally stored recovery fragments deleted.');}catch(error){label('Could not clear recovery: '+error.message);}finally{button.disabled=false;}
});
start.addEventListener('click',async()=>{
 if(start.disabled)return;start.disabled=true;lastBlob=null;lastSessionId=null;lastCursorTrace=null;
 recording=false;stopping=false;finalized=false;partialShown=false;recordingToken++;const token=recordingToken;
 // Never overwrite a previous encoder's chunks or callbacks.
 activeSession=null;sourceChanges=0;interaction=false;sharedAudio=get('audio').checked;recordState('ready');
 get('result').hidden=true;
 elapsed.textContent='00:00';warnings=[];resetZoom();history=[];strokes=[];activeStroke=null;redrawInk();get('undo').disabled=true;
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined')throw new Error('Screen capture APIs are unavailable.');
  label('Choose the browser tab, window or display to record…');
  const options={video:{frameRate:30,displaySurface:'browser'},audio:sharedAudio};
  if(typeof CaptureController==='function'){
   try{controller=new CaptureController();options.controller=controller;}catch{controller=null;}
  }
  // No await before the native user-gesture screen picker.
  screen=await navigator.mediaDevices.getDisplayMedia(options);
  if(!screen?.getVideoTracks().length)throw new Error('No video track was granted.');
  tracks.push(...screen.getTracks());captureSource=screen.getVideoTracks()[0].getSettings()?.displaySurface||'';
  explainCaptureSurface(captureSource);
  await tryLinkedTab();
  if(get('mic').checked){label('Requesting microphone permission…');try{
     mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
     tracks.push(...mic.getTracks());
   }catch(error){warnings.push('Microphone unavailable ('+error.name+'). Video continues.');}}
  sourceVideo=preview;preview.srcObject=screen;await preview.play();get('video-placeholder').hidden=true;
  const settings=screen.getVideoTracks()[0].getSettings();const w=settings.width||preview.videoWidth||1280;
  const h=settings.height||preview.videoHeight||720;
  if(w*h>16000000)throw new Error('Screen exceeds safe recording dimensions; choose a smaller window.');
  ink.width=w;ink.height=h;composite.width=w;composite.height=h;wrap.style.aspectRatio=w+' / '+h;wrap.style.setProperty?.('--record-aspect',String(w/h));wrap.dataset.recording='true';
  composite.style.display='block';ink.style.opacity='0';
  const ctx=composite.getContext('2d',{alpha:false});
  const render=()=>{if(!screen||stopping)return;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    const cursor=globalThis.MangoRecorderCursorV073;
    if(cursor&&recording){
      const seconds=recorder?.state==='recording'?Math.max(0,(Date.now()-startedAt-pausedTotal)/1000):null;
      const effective=cursor.frame(ctx,sourceVideo,zoomState,w,h,seconds);
      get('zoomReadout').textContent=Math.round(effective.zoom*100)+'%';
    }else control.drawSource(ctx,sourceVideo,zoomState,w,h);
    ctx.drawImage(ink,0,0);animation=requestAnimationFrame(render);};render();
  if(typeof composite.captureStream!=='function')throw new Error('Canvas recording unsupported.');
  const output=composite.captureStream(30);tracks.push(...output.getVideoTracks());
  const inputs=[...screen.getAudioTracks(),...(mic?.getAudioTracks()||[])];
  // Reserve a stable destination when shared audio is requested, even if this
  // particular monitor does not provide it. Later swaps can feed the same track.
  if(inputs.length||sharedAudio){try{audio=new AudioContext();audioDest=audio.createMediaStreamDestination();
    for(const track of screen.getAudioTracks()){const node=audio.createMediaStreamSource(new MediaStream([track]));screenAudioNodes.push(node);node.connect(audioDest);}
    for(const track of mic?.getAudioTracks()||[])audio.createMediaStreamSource(new MediaStream([track])).connect(audioDest);
    await audio.resume();
    for(const track of audioDest.stream.getAudioTracks())output.addTrack(track);
    tracks.push(...audioDest.stream.getTracks());
   }catch(error){warnings.push('Audio mixing unavailable ('+error.name+').');disconnectNodes(screenAudioNodes);screenAudioNodes=[];stopStream(audioDest?.stream);audioDest=null;audio?.close().catch(()=>{});audio=null;}}
  recorder=supportedRecorder(output);recordingMime=recorder.mimeType||'video/webm';
  const session=createSession(token,recordingMime,recorder);activeSession=session;
  try{session.storage=await MangoRecovery.begin(recordingMime);}
  catch(error){warnings.push('Storage unavailable: download original immediately when finished.');}
  recorder.ondataavailable=event=>queueChunkFor(session,event.data);
  recorder.onerror=event=>{
    warnings.push('Encoder error ('+(event.error?.message||'unknown')+').');
    label('Encoder error. Preserving flushed chunks…');
  };
  recorder.onstop=()=>{
    // A late stop from session N still finalizes N, even if session N+1 has started.
    // It must not reset the controls or replace the preview of the newer session.
    finishSession(session,false);
  };
  watchSource(screen,session);
  recorder.start(1000);recording=true;recordState('recording');
  stop.disabled=false;pause.disabled=false;
  for(const id of ['resetZoom','zoomIn','zoomOut','zoomRegion'])get(id).disabled=false;
  get('switch-source-v0710').disabled=false;updateMode();
  get('enable-scroll').title='Enable Interaction first. Native forwarding is available only for a captured browser tab.';
  startedAt=Date.now();pausedAt=0;pausedTotal=0;globalThis.MangoRecorderCursorV073?.begin?.();light.className='record-dot active';
  timer=setInterval(()=>{const now=pausedAt||Date.now();elapsed.textContent=clock(now-startedAt-pausedTotal);},200);
  label('Recording '+w+'×'+h+' · '+(captureSource||'display')+' · '+(audio?(inputs.length?'audio':'audio track reserved · no granted source audio yet'):'NO AUDIO TRACK — waveform unavailable')+
    (warnings.length?' · '+warnings.join(' '):''));
  if(controller?.setFocusBehavior)try{controller.setFocusBehavior('focus-capturing-application');}catch{}
 }catch(error){cleanup();recordState('error');label('Could not record: '+(error.name==='NotAllowedError'?'Permission denied or picker closed.':error.message));}
});
stop.addEventListener('click',()=>stopCapture());
pause.addEventListener('click',()=>{
 if(!recorder||stopping)return;
 if(recorder.state==='recording'){recorder.pause();globalThis.MangoRecorderCursorV073?.suspend?.();pausedAt=Date.now();pause.textContent='Resume';light.className='record-dot idle';label('Recording paused');}
 else if(recorder.state==='paused'){recorder.resume();pausedTotal+=Date.now()-pausedAt;pausedAt=0;
   pause.textContent='Pause';light.className='record-dot active';label('Recording resumed');}
});
get('save-raw').addEventListener('click',()=>saveBlob(lastBlob,'Saved original recording.'));
get('discard').addEventListener('click',()=>{lastBlob=null;lastSessionId=null;lastCursorTrace=null;get('result').hidden=true;label('Recording removed from memory; local recovery remains until cleared.');});
get('edit').addEventListener('click',async()=>{
 if(!lastBlob)return;get('edit').disabled=true;label('Opening Clip Studio…');
 try{const recordingId=await MangoClips.save(lastBlob,lastSessionId||undefined,lastCursorTrace);
  await call(api.tabs.create.bind(api.tabs),{url:api.runtime.getURL('clip-studio.html')+'?recording='+encodeURIComponent(recordingId)});
 label('Clip Studio opened. Original recording remains available.');}
 catch(error){label('Could not open Clip Studio: '+error.message+'. Save original instead.');}
 finally{get('edit').disabled=false;}
});
window.addEventListener('beforeunload',event=>{
 if((recording||stopping)&&!finalized){event.preventDefault();event.returnValue='';}
});
window.addEventListener('pagehide',()=>{globalThis.MangoRecorderCursorV073?.end?.();stopTracks();stopClock();});
if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined'){
 label('Screen capture APIs unavailable here.');start.disabled=true;
}
globalThis.MangoRecorderCursorHostV073=Object.freeze({active:()=>active()&&recorder?.state==='recording',camera:()=>({...zoomState}),frame:()=>control.fitFrame(sourceVideo.videoWidth||composite.width,sourceVideo.videoHeight||composite.height,composite.width,composite.height),surface:()=>captureSource,linked:()=>linkedAvailable,source:()=>source,automationCapture:()=>({ready:!stopping&&(!start.disabled||recording)&&(!recording||recorder?.state==='recording'||recorder?.state==='paused'),reason:'Capture is starting or finalizing.',identity:recordingToken,phase:recorder?.state||get('record-state').dataset.state||'ready'})});
void checkRecovery();
