/* MangoShot Clip Studio: non-destructive cut list, local real-time export. */
const byId=id=>document.getElementById(id),video=byId('video'),status=byId('status');
let original=null,originalUrl=null,segments=[],layers=[],selectedLayerId=null,history=[],duration=0,sequencePlaying=false,exporting=false,cancelExport=false,originalFormat=null;
let previewSequenceTime=null,loadVersion=0,selectedClipIndex=null,rangeSelected=false,redoHistory=[],automationRevisionV075=0,automationLoadReadyV075=false;
let sequencePreview=null,zoomEvents=[],transitions=[],cursorTrace=null,cursorRegions=[],sourceGrade=[];
const compositor=globalThis.MangoCompositorV0714,MT=globalThis.MangoMultitrackV0716,PT=globalThis.MangoProfessionalTimelineV0717,ST=globalThis.MangoStreamingV0718;
let secondary=MT?.defaults()||{clips:[]},multiPreparing=false,multiRequest=null,multiAudioContext=null,multiPreviewMix=null,multiFrameRequest=null,streamGate=0,streamPriming=false;
const mediaAsset=id=>globalThis.MangoMediaBin?.registry.get(id),multiRuntime=MT?.createRuntime(mediaAsset),hasMulti=()=>secondary.clips.length>0;
const hasStreams=()=>!!multiRuntime?.hasStreams?.(secondary),playbackParts=()=>hasStreams()?ST.partition(segments,secondary,mediaAsset):segments;
const director=()=>globalThis.MangoCursorDirectorCoreV074;
const clone=o=>JSON.parse(JSON.stringify(o));
const hasGraphics=()=>layers.some(l=>l.visible&&l.end>l.start);
const cinematic=globalThis.MangoCinematicV0713?.createCache();let cinematicRequest=null,cinematicPlaybackPending=false;
const hasCreative=()=>hasMulti()||compositor?.active(sourceGrade)||transitions.length>0||cursorRegions.some(r=>r.enabled)||zoomEvents.length>0||!!globalThis.MangoCreativeUI?.hasVoice?.();
const snapshot=()=>({segments:clone(segments),layers:clone(layers),sourceGrade:clone(sourceGrade),secondary:clone(secondary),markers:globalThis.MangoClipTimeline?.markers?.()||[],
 selectedLayerId,selectedClipIndex,rangeSelected,zoomFrames:clone(zoomEvents),transitions:clone(transitions),cursorRegions:clone(cursorRegions),cursorTrace,selection:{start:Number(byId('in').value),end:Number(byId('out').value)}});
const remember=()=>{automationRevisionV075++;history.push(snapshot());if(history.length>80)history.shift();redoHistory=[];};
function restore(snap){automationRevisionV075++;segments=clone(snap.segments);layers=clone(snap.layers);sourceGrade=clone(snap.sourceGrade||[]);secondary=clone(snap.secondary||MT?.defaults()||{clips:[]});multiRequest=null;selectedClipIndex=snap.selectedClipIndex??null;selectedLayerId=snap.selectedLayerId??null;
 cursorRegions=clone(snap.cursorRegions||[]);cursorTrace=snap.cursorTrace||null;
 rangeSelected=!!snap.rangeSelected;zoomEvents=MangoCreativeZoom.check(snap.zoomFrames||[]);transitions=MangoMotion.checkTransitions(snap.transitions||[]);
 const length=MangoEditOps.length(segments),selection=snap.selection||{start:0,end:length};
 byId('in').max=byId('out').max=length.toFixed(2);
 byId('in').value=Math.min(length,selection.start).toFixed(2);
 byId('out').value=Math.min(length,selection.end).toFixed(2);
 globalThis.MangoClipTimeline?.loadMarkers?.(snap.markers||[]);
 refreshed();}
function refreshed(){render();sequencePreview?.update();previewSequenceTime=null;globalThis.MangoClipTimeline?.render?.();globalThis.MangoClipTimeline?.onSequenceChange?.();globalThis.MangoLayerUI?.render?.();paintPreview();globalThis.MangoAutoCutUI?.onEditorChange?.();globalThis.MangoMediaBin?.refresh?.();globalThis.MangoMultitrackUIV0716?.refresh?.();globalThis.MangoCreativeUI?.renderZoom?.();globalThis.MangoCreativeUI?.renderVoice?.();globalThis.MangoVisualClip?.refresh?.();globalThis.MangoMotionUI?.sync?.();}

const label=text=>status.textContent=text;
const time=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.round(t%1*100)).padStart(2,'0')}`;
const mp4Types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
const webmTypes=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
function supported(types){if(typeof MediaRecorder==='undefined')return null;return types.find(t=>MediaRecorder.isTypeSupported(t))||null;}
function setControls(){const loaded=!!original&&automationLoadReadyV075&&duration>0,busy=exporting||multiPreparing;
 byId('file').disabled=busy;byId('open-last').disabled=busy;byId('forget-last').disabled=busy;
 byId('save-original').disabled=!original||busy;byId('save-project').disabled=!loaded||busy;byId('open-project').disabled=!loaded||busy;
 for(const id of ['in','out','mark-in','mark-out','trim','cut','split','ripple-delete','range-tool','add-marker','make-thumbnails','analyze-audio','timeline-zoom','reset','play-edited','export-webm','export-mp4'])byId(id).disabled=!loaded||busy;
 byId('undo').disabled=!loaded||!history.length||busy;byId('redo').disabled=!loaded||!redoHistory.length||busy;
 byId('clear-range').disabled=!loaded||busy||(!rangeSelected&&selectedClipIndex===null);
 byId('export-webm').disabled=!loaded||busy||!supported(webmTypes)||!segments.length;
 byId('export-mp4').disabled=!loaded||busy|| (!supported(mp4Types)&&!(MangoFormat.fastCopy(originalFormat,'mp4',segments,duration)&&!hasGraphics()&&!hasCreative()))||!segments.length;
 byId('export-webm').disabled=!loaded||busy|| (!supported(webmTypes)&&!(MangoFormat.fastCopy(originalFormat,'webm',segments,duration)&&!hasGraphics()&&!hasCreative()))||!segments.length;
 byId('cancel-export').disabled=!exporting;
 const mp4Instant=!hasGraphics()&&!hasCreative()&&MangoFormat.fastCopy(originalFormat,'mp4',segments,duration);
 const webmInstant=!hasGraphics()&&!hasCreative()&&MangoFormat.fastCopy(originalFormat,'webm',segments,duration);
 byId('export-mp4').textContent=mp4Instant?'Save MP4 (instant)':'Convert & export MP4';
 byId('export-webm').textContent=webmInstant?'Save WebM (instant)':'Convert & export WebM';
 const hint=byId('export-hint');
 const profile=byId('performance-profile')?.value==='high'?'high':'balanced';
 const note=byId('render-mode');if(note)note.textContent=profile==='high'?
  'High-performance: up to 60 fps / 10 Mbps and larger canvas/RAM budget. Export still runs in real time; not a faster-than-realtime engine.':
  'Balanced: up to 30 fps / 4.5 Mbps. Export uses real-time MediaRecorder; High-performance does not shorten media duration.';
 if(mp4Instant||webmInstant)hint.textContent='No edits: matching-format export copies the original file instantly without quality loss. Changing formats will re-encode at approximately real-time playback speed.';
 else hint.textContent=supported(mp4Types)?
   'Edited or converted exports require re-encoding at approximately real-time playback speed. Preserve your original with Save original (instant).':
   'MP4 encoding unavailable in this browser; edited MP4 export is disabled. Save original (instant) does not convert the file.';
}
function render(){globalThis.MangoCursorDirectorV074?.refresh?.();const durationOut=MangoTimeline.outputDuration(segments);
 byId('duration').textContent=original?(duration>0?'Sequence '+time(durationOut)+' · Source '+time(duration):'Source duration unverified'):'No video loaded';
 byId('timeline').replaceChildren();
 for(const [i,s] of segments.entries()){
  const node=document.createElement('button');node.className='clip-segment';node.type='button';
  node.style.width=100*(s.end-s.start)/Math.max(.01,durationOut)+'%';node.title=`Clip ${i+1}: ${time(s.start)} – ${time(s.end)}`;
  node.textContent=String(i+1);node.classList.toggle('is-selected',selectedClipIndex===i);node.setAttribute('aria-pressed',String(selectedClipIndex===i));
  node.onclick=()=>{if(byId('timeline').dataset.tool==='razor')return;selectedClipIndex=i;selectedLayerId=null;rangeSelected=false;sequencePreview?.stop();sequencePreview?.seekOutput(MangoSequenceMedia.sections(segments)[i].outputStart);
   render();label('Selected Clip '+(i+1)+' · Ripple Delete removes the clip and closes the gap.');};
  for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='trim-grip trim-'+edge;handle.title='Drag inward to trim '+edge+' edge (undoable)';
   handle.addEventListener('pointerdown',event=>{if(exporting)return;event.preventDefault();event.stopPropagation();
    const originX=event.clientX,width=Math.max(1,byId('timeline').getBoundingClientRect().width),original={...segments[i]};
    const delta=ev=>((ev.clientX-originX)/width)*durationOut;
    const moving=ev=>{handle.title='Trim '+edge+' to '+time(Math.max(original.start,Math.min(original.end,edge==='start'?original.start+delta(ev):original.end+delta(ev))));};
    const finished=ev=>{window.removeEventListener('pointermove',moving);window.removeEventListener('pointerup',finished);
     try{const transaction=MangoSequenceOps.edge(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],i,edge,
      edge==='start'?original.start+delta(ev):original.end+delta(ev),duration);
      if(transaction)applyTransaction(transaction,'Clip edge trimmed and downstream timeline rippled. Ctrl+Z to undo.');
     }catch(error){label('Trim not applied: '+error.message);}};
    window.addEventListener('pointermove',moving);window.addEventListener('pointerup',finished,{once:true});
   });node.appendChild(handle);}
  byId('timeline').appendChild(node);
 }
 const list=byId('segments');list.replaceChildren();
 for(const [i,s] of segments.entries()){
  const row=document.createElement('button');row.className='segment-row';row.textContent=`Clip ${i+1}: ${time(s.start)} → ${time(s.end)} (${time(s.end-s.start)})`;
  row.onclick=()=>{selectedClipIndex=i;rangeSelected=false;sequencePreview?.stop();sequencePreview?.seekOutput(MangoSequenceMedia.sections(segments)[i].outputStart);render();};list.appendChild(row);
 }
 globalThis.MangoUnifiedV062?.rejoin?.();setControls();globalThis.MangoClipTimeline?.render?.();globalThis.MangoMotionUI?.sync?.();
}
function waitVideoEvent(type,timeout=8000){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{clear();reject(new Error('Video '+type+' timed out.'));},timeout);
 const clear=()=>{clearTimeout(timer);video.removeEventListener(type,done);video.removeEventListener('error',failed);};
 const done=()=>{clear();resolve();};const failed=()=>{clear();reject(video.error||new Error('Video decoding failed.'));};
 video.addEventListener(type,done,{once:true});video.addEventListener('error',failed,{once:true});
 });}
async function load(blob,attachedCursorTrace=null,capture=null){if(exporting||multiPreparing)throw new Error('Finish the current export first.');
 globalThis.MangoBridgeV077?.disconnect?.('Source changed');automationLoadReadyV075=false;automationRevisionV075++;const request=++loadVersion;cursorTrace=null;cursorRegions=[];globalThis.MangoCursorClipV073?.refresh?.();
 if(!(blob instanceof Blob)||!blob.size)throw new Error('Select a nonempty video.');
 sequencePlaying=false;sequencePreview?.stop();video.pause();stopMultiPreview();multiRuntime?.clear();multiRequest=null;secondary=MT?.defaults()||{clips:[]};cinematic?.clear();cinematicRequest=null;if(originalUrl)URL.revokeObjectURL(originalUrl);
 globalThis.MangoCreativeUI?.voice?.dispose?.();zoomEvents=[];duration=0;segments=[];layers=[];selectedLayerId=null;selectedClipIndex=null;history=[];redoHistory=[];
  const format=await MangoFormat.detect(blob);if(request!==loadVersion)return;original=blob;originalFormat=format;originalUrl=URL.createObjectURL(blob);const metadata=waitVideoEvent('loadedmetadata');video.src=originalUrl;const gate=globalThis.MangoMediaDurationV0739;const expected=gate?.expected(capture,attachedCursorTrace)||0;const notice=byId('media-check-v0739');if(notice){notice.hidden=false;notice.dataset.state='checking';byId('media-check-message-v0739').textContent='Checking source duration'+(expected?' against '+expected.toFixed(1)+'s of capture evidence':'')+'…';}setControls();
 byId('source-format').textContent='Source container: '+(originalFormat?.toUpperCase()||'UNKNOWN')+' · '+(blob.size/1048576).toFixed(1)+' MiB';
 try{await metadata;if(request!==loadVersion)return;
  if(gate)duration=await gate.resolve(video,expected,()=>request===loadVersion);
  else duration=video.duration;
  if(request!==loadVersion)return;
  if(!Number.isFinite(duration)||duration<=0||duration>86400)throw Error('The browser could not determine a valid source duration.');
  if(notice){notice.hidden=true;notice.dataset.state='verified';}
 }catch(error){if(request!==loadVersion)return;duration=0;segments=[];render();if(notice){notice.hidden=false;notice.dataset.state='error';byId('media-check-message-v0739').textContent=error.message+' Original bytes retained. Save original or try a finalized/remuxed file.';}label('Source not qualified: '+error.message);return;}
 if(attachedCursorTrace&&globalThis.MangoCursorCoreV073){try{cursorTrace=globalThis.MangoCursorCoreV073.trace(attachedCursorTrace);}catch{cursorTrace=null;}}
 segments=[{start:0,end:duration}];layers=[];zoomEvents=[];transitions=[];sourceGrade=[];selectedLayerId=null;selectedClipIndex=null;rangeSelected=false;history=[];redoHistory=[];byId('in').value='0';byId('out').value=duration.toFixed(2);
 byId('in').max=byId('out').max=duration.toFixed(2);
 const frame=byId('clip-preview-frame');if(frame&&video.videoWidth>0&&video.videoHeight>0){
   const aspect=video.videoWidth/video.videoHeight;frame.style.setProperty('--mango-ratio',String(aspect));frame.style.setProperty('--mango-aspect',video.videoWidth+' / '+video.videoHeight);
  }
  automationLoadReadyV075=true;render();globalThis.MangoCursorClipV073?.refresh?.();sequencePreview?.seekOutput(0);globalThis.MangoClipTimeline?.reset?.();globalThis.MangoLayerUI?.render?.();paintPreview();globalThis.MangoAutoCutUI?.onEditorChange?.();label('Loaded '+time(duration)+' video · original is unchanged.');
}
function readRange(){const clip=selectedClipIndex!==null&&!rangeSelected?MangoSequenceOps.bounds(segments,selectedClipIndex):null;
 return clip||MangoTimeline.range(Number(byId('in').value),Number(byId('out').value),MangoEditOps.length(segments));}
function commitSequence(next,message,newLayers=layers){
 if(!original||exporting||multiPreparing||!next.length)return false;
 if(hasMulti()&&Math.abs(MangoEditOps.length(next)-MangoEditOps.length(segments))>.00001){label('Remove secondary clips before changing primary sequence duration.');return false;}
 remember();segments=clone(next);layers=clone(newLayers);transitions=reconcileTransitions(transitions,segments);selectedClipIndex=null;rangeSelected=false;
 const out=MangoEditOps.length(segments);byId('out').max=out.toFixed(2);byId('in').max=out.toFixed(2);
 byId('in').value='0';byId('out').value=out.toFixed(2);
 refreshed();label(message);return true;
}
function applyTransaction(transaction,message,removedRanges=null){
 if(!transaction||!original||exporting||multiPreparing)return false;
 let nextSecondary=secondary;const oldLength=MangoEditOps.length(segments),newLength=MangoEditOps.length(transaction.segments);
 if(hasMulti()&&Math.abs(newLength-oldLength)>.00001){
  if(globalThis.MangoCreativeUI?.hasVoice?.())throw Error('Remove recorded voiceover before duration-changing multitrack edits.');
  const ranges=removedRanges||transaction.removedRanges;if(!PT||!ranges)throw Error('Primary edit does not provide a secondary timing mapping.');
  nextSecondary=MT.check(PT.ripple(secondary,ranges,oldLength,newLength),mediaAsset,newLength);
 }
 const same=JSON.stringify(segments)===JSON.stringify(transaction.segments)&&JSON.stringify(layers)===JSON.stringify(transaction.layers)
  &&JSON.stringify(globalThis.MangoClipTimeline?.markers?.()||[])===JSON.stringify(transaction.markers);
 if(same){label('Nothing changed. Choose a different range or clip.');return false;}
 remember();secondary=nextSecondary;multiRequest=null;stopMultiPreview();
 if(Array.isArray(removedRanges)&&removedRanges.length){
  for(const range of [...removedRanges].sort((a,b)=>b.start-a.start))zoomEvents=MangoCreativeZoom.ripple(zoomEvents,range.start,range.end);
 }
 segments=clone(transaction.segments);layers=clone(transaction.layers);transitions=reconcileTransitions(transitions,segments);
 selectedClipIndex=null;rangeSelected=false;
 const length=MangoEditOps.length(segments);
 byId('in').max=byId('out').max=length.toFixed(2);
 byId('in').value='0';byId('out').value=length.toFixed(2);
 globalThis.MangoClipTimeline?.loadMarkers?.(transaction.markers);
 const at=Math.min(Math.max(0,transaction.playhead),Math.max(0,length-.005));
 const src=MangoEditOps.toSource(segments,at);if(src!==null)video.currentTime=src;
 refreshed();label(message);return true;
}
function reconcileTransitions(items,parts){
 const valid=new Set(parts.slice(1).map((p,i)=>parts[i].end.toFixed(5)+':'+p.start.toFixed(5)));
 return MangoMotion.checkTransitions(items.filter(t=>valid.has(t.fromEnd.toFixed(5)+':'+t.toStart.toFixed(5))));
}
function rippleDelete(a,b){
 if(!original||exporting)return false;
 try{const transaction=MangoSequenceOps.range(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],a,b);
  return applyTransaction(transaction,'Ripple deleted '+time(transaction.removed)+' and closed the gap. Undo restores video, graphics and markers.',[{start:a,end:b}]);
 }catch(e){label('Ripple delete failed: '+e.message);return false;}
}
function deleteSelection(){if(!original||exporting)return false;
 try{
  const transaction=rangeSelected?
   MangoSequenceOps.range(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],Number(byId('in').value),Number(byId('out').value)):
   MangoSequenceOps.clip(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],selectedClipIndex);
  const range=rangeSelected?{start:Number(byId('in').value),end:Number(byId('out').value)}:MangoSequenceOps.bounds(segments,selectedClipIndex);
   return applyTransaction(transaction,'Ripple deleted '+time(transaction.removed)+' and closed the gap. Undo restores everything.',[range]);
 }catch(e){label('Ripple Delete: '+e.message);return false;}
}
function setRange(a,b){if(!original||exporting)return;
 const length=MangoEditOps.length(segments);
 byId('in').value=Math.max(0,Math.min(length,a)).toFixed(2);byId('out').value=Math.max(0,Math.min(length,b)).toFixed(2);
 selectedClipIndex=null;rangeSelected=true;refreshed();
}
function clearSelection(){selectedClipIndex=null;rangeSelected=false;byId('in').value='0';byId('out').value=MangoEditOps.length(segments).toFixed(2);refreshed();}
function cinematicActive(items=transitions){return items.some(t=>globalThis.MangoCinematicV0713?.isType(t.type));}
function prepareCinematic(items=transitions,notify=()=>{}){
 if(!cinematicActive(items))return Promise.resolve(null);
 return cinematic.prepare(originalUrl,duration,segments,items,video.videoWidth,video.videoHeight,notify);
}
function paintCinematic(ctx,items,time,w,h){
 return cinematic?.paint(ctx,originalUrl,duration,segments,items,time,w,h,zoomEvents)===true;
}
function queueCinematicPreview(){
 const key=JSON.stringify([originalUrl,segments,transitions]);
 if(exporting||document.getElementById('cinematic-studio-v0713')?.open||cinematicRequest===key||cinematic?.ready(originalUrl,duration,segments,transitions))return;
 cinematicRequest=key;
 prepareCinematic().then(()=>{if(cinematicRequest===key&&!exporting)paintPreview();}).catch(e=>{if(cinematicRequest===key&&!exporting)label('Cinematic preview unavailable: '+e.message);});
}
function stopMultiPreview(){multiPreviewMix?.stop();multiPreviewMix=null;multiFrameRequest=null;++streamGate;streamPriming=false;multiRuntime?.pauseStreams?.();}
function queueMultiPreview(){
 if(!hasMulti()||multiPreparing||exporting||multiRuntime.ready(secondary))return;
 const stamp=JSON.stringify([loadVersion,secondary,secondary.clips.map(c=>mediaAsset(c.assetId)?.url||null)]);if(multiRequest===stamp)return;multiRequest=stamp;
 const model=clone(secondary);label('Preparing secondary preview media…');multiRuntime.prepare(model,MangoEditOps.length(segments)).then(()=>{if(multiRequest===stamp&&!exporting){paintPreview();label('Secondary media ready.');}}).catch(e=>{if(multiRequest===stamp&&!exporting)label('Secondary preview incomplete: '+e.message);});
}
function queueMultiFrame(t){
 if(exporting||multiPreparing||streamPriming||sequencePreview?.isPlaying()||!hasStreams()||!multiRuntime.ready(secondary))return;
 const model=clone(secondary),key=JSON.stringify([loadVersion,model,t]),old=multiFrameRequest;if(old?.key===key)return;
 const ticket={key};multiFrameRequest=ticket;
 requestAnimationFrame(async()=>{if(multiFrameRequest!==ticket||exporting||sequencePreview?.isPlaying())return;
  try{await multiRuntime.primeStreams(model,t);if(multiFrameRequest===ticket&&!exporting&&!sequencePreview?.isPlaying()){multiFrameRequest=null;paintPreview();}}
  catch(e){if(multiFrameRequest===ticket&&!exporting){label('Secondary frame unavailable: '+e.message);}}
 });
}
async function primeStreamPlayback(t,isCurrent){
 if(!hasStreams())return;const g=++streamGate;streamPriming=true;multiFrameRequest=null;
 try{await multiRuntime.prepare(secondary,MangoEditOps.length(segments));if(!isCurrent()||g!==streamGate)return;
  await multiRuntime.primeStreams(secondary,t);if(!isCurrent()||g!==streamGate)return;
  await multiRuntime.startStreams(secondary,t);if(!isCurrent()&&g===streamGate)multiRuntime.pauseStreams();
 }finally{if(g===streamGate)streamPriming=false;}
}
function pendingMedia(ctx,w,h,message){ctx.save();ctx.fillStyle='#11151add';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e3e9ef';ctx.font='600 '+Math.max(12,Math.round(h*.036))+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(message,w/2,h/2);ctx.restore();}
function paintMulti(ctx,t,w,h,strict=false,running=false){
 if(!hasMulti())return true;
 if(multiRuntime.paint(ctx,secondary,t,w,h,running))return true;
 if(strict)throw Error('Secondary video frame unavailable or outside synchronization tolerance. Export aborted.');
 if(!multiRuntime.ready(secondary))queueMultiPreview();
 else if(!running)queueMultiFrame(t);
 else if(!streamPriming){sequencePreview?.stop();label('Playback paused: secondary source fell outside synchronization tolerance. Seek or resume to retry.');}
 pendingMedia(ctx,w,h,running?'Secondary media synchronizing…':'Decoding secondary frame…');return false;
}
async function toggleSequence(){
 if(!original||exporting)return;
 if(sequencePreview?.isPlaying()){sequencePreview.stop();return;}
 if(cinematicPlaybackPending||multiPreparing)return;
 if(!cinematicActive()&&!hasMulti()){void sequencePreview?.toggle();return;}
 cinematicPlaybackPending=true;const stamp=JSON.stringify([loadVersion,segments,transitions,secondary,automationRevisionV075]);
 try{if(hasMulti()&&MT.hasAudio(secondary)){multiAudioContext||=new AudioContext();await multiAudioContext.resume();}
  label('Preparing timeline media…');await prepareCinematic();if(hasMulti())await multiRuntime.prepare(secondary,MangoEditOps.length(segments));
  if(stamp!==JSON.stringify([loadVersion,segments,transitions,secondary,automationRevisionV075])||exporting)return;
  stopMultiPreview();if(hasMulti()&&MT.hasAudio(secondary))multiPreviewMix=multiRuntime.mixer(multiAudioContext,multiAudioContext.destination,secondary);
  label('Timeline media ready.');void sequencePreview?.toggle();
 }catch(e){label('Playback not started: '+e.message);}finally{cinematicPlaybackPending=false;}
}
function paintPreview(){
 const canvas=byId('graphics-preview');if(!canvas||!original||exporting)return;
 const w=video.videoWidth||1280,h=video.videoHeight||720;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
 const mapped=previewSequenceTime===null?MangoSequenceMedia.atSource(segments,video.currentTime)?.output??null:previewSequenceTime;
 if(mapped!==null){const z=MangoCreativeZoom.preview(video,zoomEvents,mapped);const active=MangoMotion.transitionAt(segments,transitions,mapped);let inTransition=false;if(active&&globalThis.MangoCinematicV0713?.isType(active.type)){inTransition=paintCinematic(ctx,transitions,mapped,w,h);if(!inTransition)queueCinematicPreview();}else inTransition=MangoMotion.paintTransition(ctx,video,zoomEvents,segments,transitions,mapped,w,h);if(compositor?.active(sourceGrade)&&video.readyState>=2){if(!inTransition)MangoCreativeZoom.draw(ctx,video,zoomEvents,mapped,w,h);compositor.gradeFrame(ctx,sourceGrade);}if(!inTransition)director()?.paint(ctx,cursorTrace,cursorRegions,segments,mapped,z,w,h);if(!paintMulti(ctx,mapped,w,h,false,!!sequencePreview?.isPlaying()&&!video.paused&&!streamPriming))return;MangoGraphics.render(ctx,layers,mapped,w,h);}
 globalThis.MangoLayerUI?.selectionOutline?.(ctx,mapped,w,h);
}

function edit(kind){if(!original||exporting)return;
 try{const selection=readRange();
  if(kind==='cut'){rippleDelete(selection.start,selection.end);return;}
  const tx=MangoSequenceOps.trim(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],selection.start,selection.end);
  const zoomTrim=zoomEvents.filter(e=>e.start>=selection.start&&e.start<selection.end).map(e=>({...e,start:e.start-selection.start}));
   if(applyTransaction(tx,'Trimmed sequence to the selected range.')){zoomEvents=MangoCreativeZoom.check(zoomTrim);refreshed();}
 }catch(error){label('Edit not applied: '+error.message);}}

byId('mark-in').onclick=()=>setRange(MangoEditOps.toOutput(segments,video.currentTime)??0,Number(byId('out').value));
byId('mark-out').onclick=()=>setRange(Number(byId('in').value),MangoEditOps.toOutput(segments,video.currentTime)??0);
for(const id of ['in','out'])byId(id).addEventListener('change',()=>setRange(Number(byId('in').value),Number(byId('out').value)));
byId('clear-range').onclick=clearSelection;
byId('trim').onclick=()=>edit('trim');byId('cut').onclick=()=>{
 if(rangeSelected||selectedClipIndex!==null)deleteSelection();else edit('cut');
};
byId('undo').onclick=()=>{if(exporting||multiPreparing||!history.length)return;redoHistory.push(snapshot());restore(history.pop());label('Undo complete.');};
byId('redo').onclick=()=>{if(exporting||multiPreparing||!redoHistory.length)return;history.push(snapshot());restore(redoHistory.pop());label('Redo complete.');};
byId('reset').onclick=()=>{if(!original||exporting||multiPreparing)return;remember();segments=[{start:0,end:duration}];layers=[];zoomEvents=[];cursorRegions=[];transitions=[];sourceGrade=[];secondary=MT?.defaults()||{clips:[]};stopMultiPreview();multiRequest=null;multiRuntime?.clear();cinematic?.clear();cinematicRequest=null;selectedLayerId=null;
 selectedClipIndex=null;rangeSelected=false;byId('in').value='0';byId('out').value=duration.toFixed(2);
 globalThis.MangoClipTimeline?.loadMarkers?.([]);refreshed();label('Source, graphics and markers reset.');};
byId('file').addEventListener('change',event=>{if(event.target.files?.[0])load(event.target.files[0]).catch(e=>label('Open failed: '+e.message));});
byId('open-last').onclick=async()=>{try{const record=await MangoClips.load();if(!record?.blob)throw new Error('No stored recording found.');await load(record.blob,record.cursorTrace||null,record.capture||null);}catch(e){label('Cannot open last recording: '+e.message);}};
byId('forget-last').onclick=async()=>{try{await MangoClips.clear();label('Last locally stored recording deleted.');}catch(e){label('Cannot remove stored video: '+e.message);}};
async function seek(timepoint,v=video){v.pause();if(Math.abs(v.currentTime-timepoint)<.025)return;
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{v.removeEventListener('seeked',done);reject(new Error('Seeking timed out.'));},8000);
 function done(){clearTimeout(timer);resolve();}v.addEventListener('seeked',done,{once:true});});
 v.currentTime=timepoint;await ready;}
async function playRanges(ranges,shouldStop,onProgress,v=video,onGap=()=>{}){let used=0,total=MangoTimeline.outputDuration(ranges);
 for(const clip of ranges){if(shouldStop())break;
  onGap();await seek(clip.start,v);await v.play();onProgress?.(used/total*100,used);
  while(v.currentTime < clip.end-.012 && !v.ended){
   if(shouldStop() || (v.paused && !exporting))break;
   const out=used+Math.max(0,v.currentTime-clip.start);onProgress?.(Math.min(100,out/total*100),out);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  v.pause();onGap();used+=clip.end-clip.start;
 }
 v.pause();onProgress?.(100,total);onGap();
}
byId('play-edited').onclick=()=>{void toggleSequence();};

function download(blob,extension,untouched=false){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
 link.download='MangoShot-'+(untouched?'original-':'edited-')+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportClip(format){if(!original||!segments.length||exporting||multiPreparing)return;
 sequencePreview?.stop();stopMultiPreview();
 const types=format==='mp4'?mp4Types:webmTypes;
 if(!hasGraphics()&&!hasCreative()&&MangoFormat.fastCopy(originalFormat,format,segments,duration)){
   // No editing or transcoding. The exact uploaded/recorded bytes are downloaded unchanged.
   download(original,format,true);label('Saved unchanged '+format.toUpperCase()+' instantly; no encoding or quality loss.');return;
 }
 if(!supported(types)){label(format.toUpperCase()+' export cannot run because this browser lacks the encoder.');return;}
 exporting=true;cancelExport=false;sequencePlaying=false;render();byId('progress').hidden=false;byId('progress').value=0;
 let ctx=null,rec=null,exportStream=null,paintHandle=0,recorded=[],tempTracks=[],exportVideo=null,voiceExport=null,multiExport=null;
 try{
  globalThis.MangoCreativeV079?.requireFonts(layers.map(l=>l.font));
  compositor?.requireProject(layers,sourceGrade,video.videoWidth,video.videoHeight);
  exportVideo=document.createElement('video');exportVideo.preload='auto';exportVideo.playsInline=true;exportVideo.src=originalUrl;
  exportVideo.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none';document.body.appendChild(exportVideo);
  await new Promise((resolve,reject)=>{exportVideo.onloadedmetadata=resolve;exportVideo.onerror=()=>reject(new Error('Could not decode export source.'));});
  const width=exportVideo.videoWidth,height=exportVideo.videoHeight;
  const pixelLimit=byId('performance-profile')?.value==='high'?33000000:16000000;
  if(!width||!height||width*height>pixelLimit)throw new Error('Canvas dimensions exceed the selected performance profile; reduce resolution or select High-performance.');
  if(cinematicActive()){label('Preparing decoded cinematic frames before export…');await prepareCinematic(transitions,(n,total)=>{byId('progress').value=n/total*100;});if(cancelExport){label('Export cancelled.');return;}byId('progress').value=0;}
  if(hasMulti()){label('Preparing secondary media before export…');await multiRuntime.prepare(secondary,MangoEditOps.length(segments),(n,total)=>{byId('progress').value=n/total*100;});if(cancelExport)return;byId('progress').value=0;}
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const paint=canvas.getContext('2d',{alpha:false});
  let exportSequenceTime=0;
  let renderFailure=null;
  const streaming=hasStreams();
  function renderAt(output,running=false){exportSequenceTime=output;paint.fillStyle='#000';paint.fillRect(0,0,width,height);
   if(exportVideo.readyState>=2){const inTransition=paintCinematic(paint,transitions,output,width,height)||MangoMotion.paintTransition(paint,exportVideo,zoomEvents,segments,transitions,output,width,height);const z=inTransition?null:MangoCreativeZoom.draw(paint,exportVideo,zoomEvents,output,width,height);compositor?.gradeFrame(paint,sourceGrade);if(!inTransition)director()?.paint(paint,cursorTrace,cursorRegions,segments,output,z,width,height);}
   else if(streaming)throw Error('Primary source frame unavailable during export.');
   paintMulti(paint,output,width,height,true,running);MangoGraphics.render(paint,layers,output,width,height);
  }
  function draw(){try{renderAt(exportSequenceTime);paintHandle=requestAnimationFrame(draw);}catch(e){renderFailure=e;cancelExport=true;}}
  if(!streaming){draw();if(renderFailure)throw renderFailure;}
  if(!canvas.captureStream)throw new Error('Canvas encoding unavailable.');
  const profile=byId('performance-profile')?.value==='high'?'high':'balanced';
  const fps=profile==='high'?60:30,bitrate=profile==='high'?10000000:4500000;
  exportStream=canvas.captureStream(fps);tempTracks.push(...exportStream.getVideoTracks());
  try{ctx=new AudioContext();const destination=ctx.createMediaStreamDestination();const source=ctx.createMediaElementSource(exportVideo);
   source.connect(destination);
    if(globalThis.MangoCreativeUI?.hasVoice?.())voiceExport=globalThis.MangoCreativeUI.attachExport(ctx,destination);
    if(hasMulti()&&MT.hasAudio(secondary))multiExport=multiRuntime.mixer(ctx,destination,secondary);
    for(const track of destination.stream.getAudioTracks())exportStream.addTrack(track);
   tempTracks.push(...destination.stream.getAudioTracks());await ctx.resume();
  }catch(error){if(globalThis.MangoCreativeUI?.hasVoice?.()||hasMulti()&&MT.hasAudio(secondary))throw Error('Audio mixing unavailable; export aborted rather than dropping audio: '+error.message);label('Audio track unavailable ('+error.name+'); exporting video only.');}
  for(const mime of types){if(!MediaRecorder.isTypeSupported(mime))continue;
   try{rec=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:bitrate});break;}catch{}}
  if(!rec)throw new Error('Failed to initialize '+format.toUpperCase()+' encoder.');
  rec.ondataavailable=e=>{if(e.data.size)recorded.push(e.data);};
  const done=new Promise((resolve,reject)=>{rec.onstop=()=>resolve();rec.onerror=e=>{cancelExport=true;reject(e.error||new Error('Encoding failed.'));};});void done.catch(()=>{});
  if(streaming){
   if(exportVideo.readyState<2)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('Primary export frame timed out.'));},8000);const cleanup=()=>{clearTimeout(timer);exportVideo.removeEventListener('loadeddata',ok);exportVideo.removeEventListener('error',bad);};const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(Error('Primary export decode failed.'));};exportVideo.addEventListener('loadeddata',ok,{once:true});exportVideo.addEventListener('error',bad,{once:true});});
   const started=await ST.exportRanges({parts:ST.partition(segments,secondary,mediaAsset),primary:exportVideo,recorder:rec,seekPrimary:t=>ST.seek(exportVideo,t),prime:t=>multiRuntime.primeStreams(secondary,t),start:t=>multiRuntime.startStreams(secondary,t),
    pause:()=>{multiRuntime.pauseStreams();multiExport?.stop();voiceExport?.sync?.(exportSequenceTime,false);},draw:renderAt,progress:(output,total)=>{byId('progress').value=output/total*100;voiceExport?.sync?.(output,output<total);multiExport?.sync(output,output<total);},stop:()=>cancelExport});
   if(!started){if(cancelExport){label('Export cancelled.');return;}throw Error('No streaming export ranges encoded.');}
  }else{
   await seek(segments[0].start,exportVideo);if(exportVideo.readyState>=2)renderAt(0);rec.start(800);
   await playRanges(segments,()=>cancelExport,(value,output)=>{byId('progress').value=value;exportSequenceTime=output;voiceExport?.sync?.(output,true);multiExport?.sync(output,true);},exportVideo,()=>multiExport?.stop());
  }
  if(rec.state!=='inactive')rec.stop();await done;
  if(renderFailure)throw renderFailure;
  if(cancelExport){label('Export cancelled.');return;}
  const mime=rec.mimeType||types[0];
  if(format==='mp4'&&!mime.includes('mp4'))throw new Error('Browser returned non-MP4 media. Export was rejected.');
  const blob=new Blob(recorded,{type:mime});if(!blob.size)throw new Error('No encoded data was produced.');
  download(blob,format);label('Exported '+format.toUpperCase()+' with '+segments.length+' clip(s) · '+(blob.size/1048576).toFixed(1)+' MiB.');
 }catch(error){label('Export failed: '+error.message);if(rec&&rec.state!=='inactive')rec.stop();}
 finally{multiRuntime?.pauseStreams?.();multiExport?.stop();voiceExport?.stop?.();cancelAnimationFrame(paintHandle);for(const t of tempTracks)t.stop();exportVideo?.pause();exportVideo?.removeAttribute('src');exportVideo?.remove();
  if(ctx)ctx.close().catch(()=>{});exporting=false;multiFrameRequest=null;byId('progress').hidden=true;render();paintPreview();}
}
byId('save-original').onclick=()=>{if(!original||exporting)return;
 if(!originalFormat){label('Unknown source format. Cannot safely assign a video extension.');return;}
 download(original,originalFormat,true);label('Saved original '+originalFormat.toUpperCase()+' immediately, byte-for-byte unchanged.');
};
byId('export-webm').onclick=()=>exportClip('webm');byId('export-mp4').onclick=()=>exportClip('mp4');
byId('cancel-export').onclick=()=>{cancelExport=true;label('Stopping export…');};
byId('performance-profile').addEventListener('change',()=>{setControls();globalThis.MangoClipTimeline?.setProfile?.(byId('performance-profile').value);});
window.addEventListener('beforeunload',event=>{if(exporting){event.preventDefault();event.returnValue='';}});
setControls();
// An editor opened by the recorder must load precisely that recording, never
// silently fall back to another session's stale `latest` entry.
const requestedRecording=new URLSearchParams(location.search).get('recording');
if(requestedRecording){
 MangoClips.load(requestedRecording).then(record=>{
  if(loadVersion>0)return; // user already imported a different file
  if(!record?.blob)throw new Error('This recording is no longer in the local clip library. Use Import video to open its downloaded file.');
  return load(record.blob,record.cursorTrace||null,record.capture||null);
 }).catch(error=>label('Recording handoff failed: '+error.message));
}else{
 MangoClips.load().then(record=>{if(record?.blob&&loadVersion===0)return load(record.blob,record.cursorTrace||null,record.capture||null);})
   .catch(error=>label('Could not auto-open latest video: '+error.message));
}

/* Read-only view model for the professional timeline. Mutations flow through
 * this editor's existing non-destructive edit decision list. */
globalThis.MangoCreativeClipV079=Object.freeze({
 state(){const v=globalThis.MangoClipView,l=v?.layers().find(x=>x.id===v.selectedLayer());return {ready:v?.automationCapture().ready===true,selected:!!l&&!l.locked&&l.kind!=='shape',font:l?.font||'sans',weight:l?.weight||'600',text:l?.kind==='shape'?'':l?.text||''};},
 apply(kind,id,w){const c=globalThis.MangoCreativeV079,v=globalThis.MangoClipView;if(!this.state().ready||!this.state().selected)throw Error('Select an unlocked graphic and pause the video.');
  const patch=kind==='fonts'?{font:id,weight:c.weight(id,w),preset:'none'}:c.videoPatch(id);c.requireFonts([patch.font]);v.updateLayer(v.selectedLayer(),patch);label('Creative style applied. Ctrl+Z to undo.');return true;},
 insert(kind,id,w,text){const c=globalThis.MangoCreativeV079,v=globalThis.MangoClipView;if(!this.state().ready)throw Error('Load and pause a video first.');
  if(layers.length>=200)throw Error('Portable project graphic limit reached');
  const length=MangoEditOps.length(segments);if(length<.1)throw Error('Sequence too short for text');
  const at=Math.max(0,Math.min(v.sequencePosition()??0,length-.1)),p=kind==='fonts'?{font:id,weight:c.weight(id,w)}:c.videoPatch(id);
  c.requireFonts([p.font]);const l=MangoGraphics.create('text',kind==='fonts'?'title':id,at,{...p,name:kind==='fonts'?c.font(id).name:c.preset(id).name,text:String(text).slice(0,400),end:Math.min(length,at+4)});
  const checked=MangoProject.check(MangoProject.pack({size:original.size,format:originalFormat,duration},segments,[l],[],[]),{size:original.size,format:originalFormat,duration});
  remember();layers.push(checked.layers[0]);selectedLayerId=l.id;selectedClipIndex=null;rangeSelected=false;refreshed();label('Editable creative graphic inserted. Ctrl+Z to undo.');return true;
 }
});
globalThis.MangoClipView={
 automationCapture(){
  const voiceState=globalThis.MangoCreativeUI?.voice?.state?.(),busy=exporting||multiPreparing||!!sequencePreview?.isPlaying?.()||!!voiceState?.recording;
  return {ready:!!original&&automationLoadReadyV075&&!busy,reason:busy?'Pause playback, voice recording or export before applying edits.':'Load a video first.',
   identity:original,trace:cursorTrace,voice:voiceState?.clip||null,
   stamp:JSON.stringify([automationRevisionV075,loadVersion,segments,layers,sourceGrade,secondary,zoomEvents,transitions,cursorRegions,globalThis.MangoClipTimeline?.markers?.()||[],selectedLayerId,selectedClipIndex,rangeSelected,byId('in').value,byId('out').value,voiceState?.clip?.start,voiceState?.clip?.duration])};
 },
 automationInspect(){return {studio:'clip',ready:!!original&&automationLoadReadyV075,sourceDuration:duration,sequenceDuration:MangoEditOps.length(segments),
  exporting,playing:!!sequencePreview?.isPlaying?.(),segments:clone(segments),graphics:layers.map(l=>({id:l.id,kind:l.kind,start:l.start,end:l.end,opacity:l.opacity??1,locked:!!l.locked})),cameraEvents:clone(zoomEvents),
  cursorPath:cursorTrace?{samples:cursorTrace.samples.length,clicks:cursorTrace.clicks?.length||0,baked:cursorTrace.baked}:null,cursorRegions:cursorRegions.map(r=>({id:r.id,start:r.start,end:r.end,enabled:r.enabled}))};},
 sequenceDraft(){
  const state=this.automationCapture();if(!state.ready)throw Error(state.reason);
  return {...snapshot(),source:{size:original.size,format:originalFormat,duration},hasVoice:!!state.voice};
 },
 commitSequenceAutomation(draft,expected){
  const engine=globalThis.MangoSequenceEngineV076,actual=this.automationCapture();
  if(!engine||!actual.ready||!engine.equal(actual,expected))throw Error('Sequence review is stale');
  if(draft.source.size!==original.size||draft.source.format!==originalFormat||draft.source.duration!==duration||draft.hasVoice!==!!actual.voice)throw Error('Source identity mismatch');
  if(actual.voice&&JSON.stringify(draft.segments)!==JSON.stringify(segments))throw Error('Cannot change timeline timing while voiceover exists');
  if(hasMulti()&&(JSON.stringify(draft.secondary)!==JSON.stringify(secondary)||Math.abs(MangoEditOps.length(draft.segments)-MangoEditOps.length(segments))>.00001))throw Error('Secondary media must be edited in Multitrack Studio; remove it before changing primary duration.');
  const checked=engine.validateDraft(draft);compositor?.requireProject(checked.layers,checked.sourceGrade||[],video.videoWidth,video.videoHeight);const previous=snapshot(),beforeHistory=history.slice(),beforeRedo=redoHistory.slice(),at=sequencePreview?.current?.()??0;
  const next={...checked,selectedLayerId:null,selectedClipIndex:null,rangeSelected:false,selection:{start:0,end:MangoEditOps.length(checked.segments)}};
  try{
   remember();restore(next);
   sequencePreview?.seekOutput(Math.max(0,Math.min(at,MangoEditOps.length(segments)-.005)));
   label('MangoScript sequence committed. One Ctrl+Z restores the prior edit.');return true;
  }catch(error){
   // Restore the authoritative model and both history stacks even if a UI refresh failed.
   history=beforeHistory;redoHistory=beforeRedo;
   try{restore(previous);sequencePreview?.seekOutput(Math.max(0,Math.min(at,MangoEditOps.length(segments)-.005)));}
   catch{throw Error('Commit failed; prior model restored, but interface refresh failed. Reload the saved project if needed.');}
   throw Error('Sequence rolled back: '+error.message);
  }
 },
 commitAutomationGraphic(draft){
  if(!original||!automationLoadReadyV075||exporting||layers.length>=1500||!draft||!['text','callout'].includes(draft.kind)||!Number.isFinite(draft.start)||!Number.isFinite(draft.end)||draft.start<0||draft.end-draft.start<.09999||draft.end>MangoEditOps.length(segments)+.000001)return false;
  remember();layers.push(clone(draft));selectedLayerId=draft.id;selectedClipIndex=null;rangeSelected=false;refreshed();label('Automation graphic added. Ctrl+Z to undo.');return true;
 },
 cursorTrace:()=>cursorTrace, cursorRegions:()=>clone(cursorRegions), cursorDirectorState:()=>({schema:'mangoshot.cursor.director.v1',regions:clone(cursorRegions),trace:cursorTrace}),
 commitCursorDirector({regions:nextRegions=cursorRegions,zoomFrames:nextZoom=zoomEvents,trace:nextTrace=cursorTrace}={}){
  if(!original||exporting||!director())throw Error('Load the source and finish export first');
  const checked=director().check({schema:director().SCHEMA,regions:nextRegions,trace:nextTrace},duration),z=MangoCreativeZoom.check(nextZoom);
  if(z.some(e=>e.start>=MangoEditOps.length(segments)))throw Error('Camera event outside edited sequence');
  remember();cursorRegions=checked.regions;cursorTrace=nextTrace===cursorTrace?cursorTrace:checked.trace;zoomEvents=z;refreshed();return true;
 }, duration:()=>duration,outputDuration:()=>MangoEditOps.length(segments),video:()=>video,
 segments:()=>segments,layers:()=>layers,transitions:()=>clone(transitions),selectedLayer:()=>selectedLayerId,url:()=>originalUrl,original:()=>original,
 exporting:()=>exporting,isPlaying:()=>sequencePreview?.isPlaying?.()||false,updateControls:setControls,
  multitrack:()=>clone(secondary),
  multitrackBusy:()=>multiPreparing,
  async commitSecondaryTimeline(id,candidate,expected){const s=this.automationCapture();if(!s.ready||s.stamp!==expected)throw Error('Timeline edit is stale.');return this.applyMultitrack(PT.change(secondary,id,candidate),expected);},
  commitGraphicKeyTime(id,index,at,expected){const s=this.automationCapture(),i=layers.findIndex(l=>l.id===id);if(!s.ready||s.stamp!==expected||i<0||layers[i].locked)throw Error('Keyframe edit is stale or locked.');const next=compositor.checkKeys(PT.keyTime(layers[i].keyframes,index,at));if(PT.eq(next,layers[i].keyframes))return false;remember();layers[i]={...layers[i],keyframes:next};selectedLayerId=id;refreshed();label('Keyframe time updated. Ctrl+Z to undo.');return true;},
  secondaryReferences:id=>[secondary,...history.map(x=>x.secondary),...redoHistory.map(x=>x.secondary)].some(m=>m?.clips.some(c=>c.assetId===id)),
  async applyMultitrack(model,expected,notify=()=>{},allowed=()=>true){
   const before=this.automationCapture();if(!before.ready||before.stamp!==expected)throw Error('Editor changed. Reopen Multitrack Studio.');
   const next=MT.check(model,mediaAsset,MangoEditOps.length(segments));
   if(JSON.stringify(next)===JSON.stringify(secondary))return false;
   for(const c of secondary.clips){const n=next.clips.find(x=>x.id===c.id),locked=(c.locked&&n?.locked!==false)||(secondary.tracks[c.track].locked&&next.tracks[c.track].locked);
    if(locked&&JSON.stringify(n)!==JSON.stringify(c))throw Error('Unlock the existing clip and track before editing it.');}
   multiPreparing=true;stopMultiPreview();setControls();
   try{await multiRuntime.prepare(next,MangoEditOps.length(segments),notify);multiPreparing=false;
    const after=this.automationCapture();if(!allowed()||!after.ready||after.stamp!==before.stamp||after.identity!==before.identity)throw Error('Multitrack draft cancelled or stale.');
    remember();secondary=next;multiRequest=null;refreshed();label('Secondary media applied. Ctrl+Z to undo.');return true;
   }catch(e){multiPreparing=false;multiRuntime.clear();multiRequest=null;paintPreview();throw e;}finally{multiPreparing=false;setControls();}
  },
  async prepareSecondary(model=secondary,length=MangoEditOps.length(segments)){if(!model.clips.length)return;await multiRuntime.prepare(model,length);},
  async paintSecondary(ctx,model,t,w,h){if(model?.clips.length)await multiRuntime.paintExact(ctx,model,t,w,h);},
  streamingStats:()=>multiRuntime?.stats?.()||{},
  sourceGrade:()=>clone(sourceGrade),
  setSourceGrade(stack,expected){
   const s=this.automationCapture();if(!s.ready||s.stamp!==expected)throw Error('Source or editor changed. Reopen Compositor.');
   compositor.requireProject(layers,stack,video.videoWidth,video.videoHeight);const next=compositor.checkStack(stack);if(JSON.stringify(next)===JSON.stringify(sourceGrade))return false;
   remember();sourceGrade=next;refreshed();label('Source color grade applied. Ctrl+Z to undo.');return true;
  },
  previewSourceGrade(canvas,stack,expected){
   const s=this.automationCapture();if(!s.ready||s.stamp!==expected||video.readyState<2)throw Error('Source frame unavailable or editor changed.');
   compositor.requireSupport(stack);const p=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min(w/video.videoWidth,h/video.videoHeight),rw=Math.round(video.videoWidth*scale),rh=Math.round(video.videoHeight*scale);
   p.fillStyle='#000';p.fillRect(0,0,w,h);p.drawImage(video,(w-rw)/2,(h-rh)/2,rw,rh);compositor.gradeFrame(p,stack);
  },
  prepareCinematic:items=>prepareCinematic(items),
  updateTransition(index,patch){
   if(!original||exporting)return false;
   try{if(globalThis.MangoCinematicV0713?.isType(patch.type)&&patch.allowHandles!==true)throw Error('Use Cinematic Studio to review source handles and prepare the two-frame transition.');const next=MangoMotion.setTransition(transitions,segments,index,patch);
    if(globalThis.MangoCinematicV0713){globalThis.MangoCinematicV0713.plans(segments,next,duration);if(globalThis.MangoCinematicV0713.isType(patch.type)&&!cinematic.ready(originalUrl,duration,segments,next))throw Error('Prepare the complete cinematic transition set first.');}
    if(JSON.stringify(next)===JSON.stringify(transitions))return false;
    remember();transitions=next;refreshed();label('Clip opening transition updated.');return true;
   }catch(error){label(error.message);return false;}
  },
  zoomFrames:()=>clone(zoomEvents),setZoomFrames(items){zoomEvents=MangoCreativeZoom.check(items);refreshed();},
  addZoomKeyframe(at,scale,x,y,ease){if(!original||exporting)throw Error('Load a video first');const next=MangoCreativeZoom.add(zoomEvents,at,scale,x,y,ease);if(next.some(e=>e.start>=MangoEditOps.length(segments)))throw Error('Camera keyframe must start inside the edited sequence');remember();zoomEvents=next;refreshed();},
  commitZoomStudio(items,expected){const actual=this.automationCapture();if(!actual.ready||actual.identity!==expected?.identity||actual.stamp!==expected?.stamp)throw Error('Camera draft is stale. Close and reopen Zoom Studio.');const checked=MangoCreativeZoom.check(items);if(checked.some(e=>e.start>=MangoEditOps.length(segments)))throw Error('Camera keyframe must start inside the edited sequence');if(new Set(checked.map(e=>e.id)).size!==checked.length)throw Error('Duplicate camera keyframe ID');if(JSON.stringify(checked)===JSON.stringify(zoomEvents))return false;remember();zoomEvents=checked;refreshed();label('Camera animation applied. Ctrl+Z restores the previous camera edit.');return true;},
  removeZoomKeyframe(id){if(exporting)return;remember();zoomEvents=MangoCreativeZoom.remove(zoomEvents,id);refreshed();},
  updateZoomKeyframe(id,patch){
   if(!original||exporting)throw Error('Load video and stop export to edit camera');
   if(!zoomEvents.some(e=>e.id===id))throw Error('Camera keyframe no longer exists');
   const next=zoomEvents.map(e=>e.id===id?{...e,...patch,id:e.id}:e);
   const checked=MangoCreativeZoom.check(next);
   if(checked.some(e=>e.start>=MangoEditOps.length(segments)))throw Error('Camera keyframe must start inside the edited sequence');
   remember();zoomEvents=checked;refreshed();
  },
  addZoomRange(start,end,scale,x,y,duration=.4){
   if(!original||exporting)throw Error('Load a video first');
   const length=MangoEditOps.length(segments);
   if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>=length-.005||end<=start+duration)
    throw Error('Zoom In/Out must be within the edited sequence and separated by the transition time');
   let next=MangoCreativeZoom.add(zoomEvents,start,scale,x,y,duration);
   next=MangoCreativeZoom.add(next,end,1,.5,.5,duration);
   remember();zoomEvents=next;refreshed();
  },
  sourceFormat:()=>originalFormat,
 restoreLegacyProject(data,creative=null,nextSecondary=null){
  if(!original||exporting)throw new Error('Load the matching source video before restoring a project.');
  const validated=MangoProject.check(data,{size:original.size,format:originalFormat,duration});compositor?.requireProject(validated.layers,validated.sourceGrade||[],video.videoWidth,video.videoHeight);
  if(hasMulti()&&!nextSecondary)throw Error('Use the v2 project restore or remove active secondary clips first.');
  const restoredSecondary=nextSecondary?MT.check(nextSecondary,mediaAsset,MangoEditOps.length(validated.segments)):MT?.defaults()||{clips:[]};
  if(restoredSecondary.clips.length&&!multiRuntime.ready(restoredSecondary))throw Error('Relink and prepare all secondary media before restoring.');
  const savedDirector=creative?.cursorDirector?director().check(creative.cursorDirector,duration):null;
  const savedZoom=MangoCreativeZoom.check(creative?.zoomFrames||[]);
  if(savedZoom.some(e=>e.start>=MangoEditOps.length(validated.segments)))throw Error('Saved camera event outside sequence');
  remember();secondary=restoredSecondary;multiRequest=null;cursorRegions=savedDirector?.regions||[];if(savedDirector)cursorTrace=savedDirector.trace;zoomEvents=savedZoom;segments=validated.segments;layers=validated.layers;sourceGrade=clone(validated.sourceGrade||[]);transitions=reconcileTransitions(validated.transitions||[],segments);
  selectedLayerId=null;selectedClipIndex=null;rangeSelected=false;
  const length=MangoEditOps.length(segments);
  byId('out').max=byId('in').max=length.toFixed(2);
  byId('in').value='0';byId('out').value=length.toFixed(2);
  globalThis.MangoClipTimeline?.loadMarkers?.(validated.markers);
  refreshed();label('v1 edit decisions restored inside the v2 workspace.');
  return true;
 },message:label,paintPreview,
 outputAt:source=>MangoSequenceMedia.atSource(segments,source)?.output??null,
 sequencePosition:()=>sequencePreview?.current()??null,
 seekOutput:point=>{if(sequencePreview){if(sequencePreview.isPlaying())sequencePreview.stop();sequencePreview.seekOutput(point);}
  else{const source=MangoSequenceMedia.atOutput(segments,point)?.source;if(source!==undefined&&source!==null)video.currentTime=source;}
  paintPreview();},
 commit(next,message){commitSequence(next,message);},
 commitMarkers(next,message){if(!original||exporting)return false;remember();globalThis.MangoClipTimeline?.loadMarkers?.(next);refreshed();label(message);return true;},
 commitAutoCut(ranges){
   if(!original||exporting)return false;
   try{const tx=MangoAutoCut.apply(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],ranges);
    return applyTransaction(tx,'AutoCut removed '+tx.applied+' inactive sections ('+time(tx.removed)+') with zero gaps. Ctrl+Z restores everything.',ranges);
   }catch(error){label('AutoCut not applied: '+error.message);return false;}
 },
 rippleDelete,deleteSelection,deleteSelected(){
  if(selectedLayerId&&!rangeSelected&&selectedClipIndex===null)return this.deleteLayer(selectedLayerId);
  return deleteSelection();
 },setRange,clearSelection,range:()=>({active:rangeSelected,start:Number(byId('in').value),end:Number(byId('out').value)}),
 selectedClip:()=>selectedClipIndex,selectClip(index){if(!Number.isInteger(index)||index<0||index>=segments.length)return;selectedClipIndex=index;selectedLayerId=null;rangeSelected=false;render();globalThis.MangoLayerUI?.render?.();globalThis.MangoVisualClip?.refresh?.();},
 addPremiumComposition(presetId){
   if(!original||exporting||!globalThis.MangoPremium?.byId?.[presetId])return false;
   const at=MangoEditOps.toOutput(segments,video.currentTime)??0;
   const left=Math.max(0,MangoEditOps.length(segments)-at);
   if(left<.12){label('Move the playhead earlier to insert a premium composition.');return false;}
   const span=Math.min(4,left),primary=globalThis.MangoPremium.make('text',presetId,at,span);
   const second=globalThis.MangoPremium.secondary(primary);
   const groupId='premium-'+primary.id;
   primary.premium.groupId=groupId;
   if(second)second.premium.groupId=groupId;
   remember();layers.push(primary);if(second)layers.push(second);
   selectedLayerId=primary.id;selectedClipIndex=null;rangeSelected=false;refreshed();label('Premium composition inserted: '+primary.name);return true;
 },
 applyShapeDraft(draft,expected,id=null){const state=this.automationCapture();if(!state.ready||state.identity!==expected?.identity||state.stamp!==expected?.stamp)throw Error('Editor changed. Reopen Shape Studio.');const next={...draft,shape:globalThis.MangoClipShapesV0742.check(draft.shape)};if(next.kind!=='shape')throw Error('Expected a shape overlay.');let list=layers.slice();if(id){const i=list.findIndex(l=>l.id===id&&l.kind==='shape');if(i<0||list[i].locked||next.id!==id)throw Error('Select an unlocked shape.');list[i]=next;}else{if(list.length>=200||list.some(l=>l.id===next.id))throw Error('Graphic layer limit or duplicate ID.');list.push(next);}const source={size:original.size,format:originalFormat,duration};MangoProject.check(MangoProject.pack(source,segments,list,globalThis.MangoClipTimeline?.markers?.()||[],transitions,sourceGrade),source);compositor?.requireProject(list,sourceGrade,video.videoWidth,video.videoHeight);remember();layers=list;selectedLayerId=next.id;selectedClipIndex=null;rangeSelected=false;refreshed();label('Shape overlay applied. Ctrl+Z to undo.');return next.id;},
 addLayer(kind,preset='none'){
   if(!original||exporting)return;
   const at=MangoEditOps.toOutput(segments,video.currentTime)??0;
   const layer=MangoGraphics.create(kind,preset,Math.min(at,Math.max(0,MangoEditOps.length(segments)-.1)));
   layer.end=Math.min(layer.end,MangoEditOps.length(segments));
   remember();layers.push(layer);selectedLayerId=layer.id;selectedClipIndex=null;rangeSelected=false;refreshed();label(layer.name+' layer added.');
 },
 selectLayer(id,quiet=false){selectedLayerId=id;
   if(id){selectedClipIndex=null;rangeSelected=false;}
   if(!quiet){render();globalThis.MangoLayerUI?.render?.();}
   paintPreview();
 },
 updateLayer(id,changes){const index=layers.findIndex(l=>l.id===id);
   if(index<0||exporting||layers[index].locked)return;
   remember();layers[index]={...layers[index],...changes};refreshed();
 },
 deleteLayer(id){
   const index=layers.findIndex(l=>l.id===id);
   if(exporting||index<0)return false;
   if(layers[index].locked){label('Unlock this graphic layer before deleting it.');return false;}
   const name=layers[index].name;
   remember();layers.splice(index,1);
   selectedLayerId=layers[Math.min(index,layers.length-1)]?.id||null;
   selectedClipIndex=null;rangeSelected=false;
   refreshed();label('Deleted '+name+'. Undo (Ctrl+Z) restores it.');return true;
 },
 duplicateLayer(id){const source=layers.find(l=>l.id===id);if(!source||exporting)return;
   remember();const dup={...clone(source),id:(globalThis.crypto?.randomUUID?.()||String(Date.now())),name:source.name+' copy'};
   layers.push(dup);selectedLayerId=dup.id;selectedClipIndex=null;rangeSelected=false;refreshed();},
 beginLayerMove(id){if(exporting)return;const l=layers.find(x=>x.id===id);if(l&&!l.locked)remember();},
 moveLayer(id,x,y){const l=layers.find(x=>x.id===id);if(!l||l.locked)return;l.x=x;l.y=y;paintPreview();},
 resizeLayer(id,width,fontSize,height=null){const l=layers.find(x=>x.id===id);if(!l||l.locked)return;
  l.width=Math.max(.1,Math.min(1-l.x,width));if(l.kind==='shape'&&Number.isFinite(height))l.shape={...l.shape,height:Math.max(.03,Math.min(1-l.y,height))};else l.fontSize=Math.max(12,Math.min(220,fontSize));paintPreview();},
 moveShapeGeometry(id,patch){const l=layers.find(x=>x.id===id);if(!l||l.locked||l.kind!=='shape'||exporting)return;const S=globalThis.MangoClipShapesV0742,shape=S.check(patch.shape);for(const k of ['x','y','width'])if(Object.hasOwn(patch,k)&&(!Number.isFinite(patch[k])||patch[k]<0||patch[k]>1))return;Object.assign(l,patch,{shape});paintPreview();},
 endLayerMove(){refreshed();},
 setLayerHidden(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.visible=!value;refreshed();},
 setLayerLocked(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.locked=!!value;refreshed();},
 styleLayer(id,preset){const index=layers.findIndex(l=>l.id===id);if(index<0||layers[index].locked||exporting)return;
   remember();layers[index]=MangoGraphics.style(layers[index],preset);refreshed();},
 reorderLayer(id,direction){const source=layers.find(l=>l.id===id);
   if(!source||source.locked||exporting)return false;
   const next=MangoLayerOps.reorder(layers,id,direction);
   if(next.every((l,i)=>l.id===layers[i].id)){label('Layer is already at the end of this stack.');return false;}
   remember();layers=next;selectedLayerId=id;refreshed();label('Graphic stacking order changed.');return true;
 },
 placeLayerAbove(id,targetId){const a=layers.find(l=>l.id===id),b=layers.find(l=>l.id===targetId);
   if(!a||!b||a.locked||exporting||id===targetId)return false;
   const next=MangoLayerOps.placeAbove(layers,id,targetId);
   if(next.every((l,i)=>l.id===layers[i].id&&l.track===layers[i].track))return false;
   remember();layers=next;selectedLayerId=id;refreshed();label('Layer moved above '+b.name+' on G'+b.track+'.');return true;
 },
 commitLayerTimeline(id,candidate){const index=layers.findIndex(l=>l.id===id);
   if(index<0||layers[index].locked||exporting)return false;
   const original=layers[index],sequenceLength=MangoEditOps.length(segments);
   if(!Number.isFinite(candidate.start)||!Number.isFinite(candidate.end)||!Number.isFinite(candidate.track)||
      candidate.start<0||candidate.end>sequenceLength+.001||candidate.end-candidate.start<MangoLayerOps.MIN-.001||
      ![2,3].includes(candidate.track)){label('Invalid graphic time range or track.');return false;}
   if(!MangoLayerOps.changed(original,candidate))return false;
   remember();layers[index]={...original,start:candidate.start,end:candidate.end,track:candidate.track};
   selectedLayerId=id;refreshed();label('Graphic timing updated: '+candidate.start.toFixed(2)+'–'+candidate.end.toFixed(2)+' s on G'+candidate.track+'. Ctrl+Z to undo.');return true;
 },
};

globalThis.MangoLayerClipV0712=Object.freeze({
 state(){const s=globalThis.MangoClipView.automationCapture();return {ready:s.ready,reason:s.reason,stamp:automationRevisionV075+':'+loadVersion,layers:layers.map(l=>MangoLayerStudioV0712.describe('clip',l)),selection:selectedLayerId?[selectedLayerId]:[]};},
 apply(command,ids,args,stamp){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Clip changed or is busy. Reopen Layer Studio.');
  const r=MangoLayerStudioV0712.plan('clip',layers,ids,command,args,()=>crypto.randomUUID());
  if(!r.changed)return {changed:false,selection:r.selection};
  const source={size:original.size,format:originalFormat,duration};
  MangoProject.check(MangoProject.pack(source,segments,r.layers,globalThis.MangoClipTimeline?.markers?.()||[],transitions),source);
  compositor?.requireProject(r.layers,sourceGrade,video.videoWidth,video.videoHeight);
  remember();layers=r.layers;selectedLayerId=r.selection.at(-1)||null;selectedClipIndex=null;rangeSelected=false;refreshed();label('Layer Studio edit applied. Ctrl+Z to undo.');
  return {changed:true,selection:r.selection};
 },
 applyCombined(ids,args,grade,expected){
  const s=globalThis.MangoClipView.automationCapture();if(!s.ready||s.identity!==expected?.identity||s.stamp!==expected?.stamp)throw Error('Clip or selection changed. Reopen Effects Studio.');
  const hasLayer=Object.keys(args).length>0,plan=hasLayer?MangoLayerStudioV0712.plan('clip',layers,ids,'effects',args):{layers,selection:ids,changed:false};
  const nextGrade=grade===null?sourceGrade:compositor.checkStack(grade);
  if(!plan.changed&&JSON.stringify(nextGrade)===JSON.stringify(sourceGrade))return {changed:false,selection:ids};
  const source={size:original.size,format:originalFormat,duration};
  MangoProject.check(MangoProject.pack(source,segments,plan.layers,globalThis.MangoClipTimeline?.markers?.()||[],transitions,nextGrade),source);
  compositor.requireProject(plan.layers,nextGrade,video.videoWidth,video.videoHeight);
  remember();layers=plan.layers;sourceGrade=nextGrade;if(hasLayer){selectedLayerId=plan.selection.at(-1)||null;selectedClipIndex=null;rangeSelected=false;}refreshed();label('Effects Studio applied. Ctrl+Z restores layer and footage changes.');
  return {changed:true,selection:plan.selection};
 },
 select(ids){if(!this.state().ready)throw Error('Clip editor is not ready.');globalThis.MangoClipView.selectLayer(ids.at(-1)||null);},
 preview(canvas,ids,args,stamp,progress=.5,options=null){
  const s=this.state();if(!s.ready||s.stamp!==stamp)throw Error('Clip changed or is busy. Reopen Layer Studio.');
  let draft=layers;if(ids.length&&Object.keys(args).length)draft=MangoLayerStudioV0712.plan('clip',layers,ids,'effects',args).layers;
  const selected=draft.filter(l=>ids.includes(l.id)),aspect=video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9,w=Math.max(1,Math.round(Math.min(720,400*aspect))),h=Math.max(1,Math.round(w/aspect));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d'),reference=MangoSequenceMedia.atSource(segments,video.currentTime)?.output??globalThis.MangoClipView.sequencePosition()??0,grade=options?.grade??sourceGrade;ctx.fillStyle='#202630';ctx.fillRect(0,0,w,h);if(video.readyState>=2){MangoCreativeZoom.draw(ctx,video,zoomEvents,reference,w,h);if(compositor?.active(grade))compositor.gradeFrame(ctx,grade);}const first=selected[0],at=options?.follow||!first?reference:first.start+(first.end-first.start)*Math.min(.999999,Math.max(0,progress));MangoGraphics.render(ctx,draft,at,w,h);
 }
});

sequencePreview=MangoSequencePreview.create(video,playbackParts,
 output=>{previewSequenceTime=output;globalThis.MangoClipTimeline?.playhead?.();paintPreview();globalThis.MangoCreativeUI?.onPosition?.(output);try{multiPreviewMix?.sync(output,sequencePreview?.isPlaying()&&!video.paused);}catch(e){sequencePreview?.stop();label('Secondary audio preview failed: '+e.message);}},
 (playing,error)=>{if(!playing)stopMultiPreview();globalThis.MangoCreativeUI?.onPlayback?.(playing);byId('program-play').textContent=playing?'❚❚ Pause':'▶ Play';if(error)label('Preview paused: '+error);},{beforePlay:primeStreamPlayback,onPause:()=>{multiRuntime?.pauseStreams?.();multiPreviewMix?.stop();}});
video.addEventListener('timeupdate',()=>{globalThis.MangoClipTimeline?.playhead?.();paintPreview();});
video.addEventListener('pause',()=>{multiPreviewMix?.stop();if(!streamPriming)multiRuntime?.pauseStreams?.();});video.addEventListener('seeked',paintPreview);video.addEventListener('loadeddata',paintPreview);
let cursorFramePending=false;
function cursorFrame(){cursorFramePending=false;if(!video.paused&&!video.ended){if(cursorRegions.some(r=>r.enabled))paintPreview();scheduleCursorFrame();}}
function scheduleCursorFrame(){if(cursorFramePending||video.paused||video.ended||!director())return;cursorFramePending=true;if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(cursorFrame);else requestAnimationFrame(cursorFrame);}
video.addEventListener('play',scheduleCursorFrame);

// Premiere-style transport in place of native over-video controls, which are
// obscured by the editable graphics canvas.
byId('program-play').addEventListener('click',()=>{void toggleSequence();});
for(const [id,delta] of [['program-back',-1/30],['program-forward',1/30]])
 byId(id).addEventListener('click',()=>{if(!original||exporting)return;sequencePreview?.stop();
  const current=sequencePreview?.current()??0;globalThis.MangoClipView.seekOutput(Math.max(0,Math.min(MangoEditOps.length(segments)-.005,current+delta)));});
video.addEventListener('ended',()=>sequencePreview?.stop());
document.addEventListener('keydown',e=>{if(byId('automation-dialog-v075')?.open||globalThis.MangoShortcuts?.active)return;if(e.key!==' '||e.ctrlKey||e.altKey||e.metaKey||e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
 e.preventDefault();byId('program-play').click();});

byId('save-project').addEventListener('click',()=>{if(!original||exporting)return;
 if(hasMulti()||cursorRegions.length||zoomEvents.length){label('Use Project Manager → Save v2 project to preserve secondary media, cursor and camera effects.');return;}
 const project=MangoProject.pack({size:original.size,format:originalFormat,duration},segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],transitions,sourceGrade);
 const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='MangoShot-Project-'+Date.now()+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 label('Edit project saved (source video is separate).');
});
byId('open-project').addEventListener('change',async event=>{if(!original||exporting)return;if(hasMulti()){label('Remove secondary clips or use Project v2 restore.');event.target.value='';return;}
 try{const file=event.target.files?.[0];if(!file||file.size>1000000)throw new Error('Select a project under 1 MB.');
  const data=JSON.parse(await file.text());const project=MangoProject.check(data,{size:original.size,format:originalFormat,duration});
  compositor?.requireProject(project.layers,project.sourceGrade||[],video.videoWidth,video.videoHeight);remember();segments=project.segments;layers=project.layers;sourceGrade=clone(project.sourceGrade||[]);transitions=reconcileTransitions(project.transitions||[],segments);cursorRegions=[];zoomEvents=[];selectedLayerId=null;selectedClipIndex=null;rangeSelected=false;
  byId('out').max=MangoEditOps.length(segments).toFixed(2);byId('in').max=byId('out').max;
  byId('in').value='0';byId('out').value=byId('out').max;refreshed();globalThis.MangoClipTimeline?.loadMarkers?.(project.markers);label('Project decisions restored. Original video unchanged.');
 }catch(error){label('Cannot open project: '+error.message);}finally{event.target.value='';}
});

globalThis.MangoCreativeV079?.ready.then(()=>{if(original)paintPreview();});
