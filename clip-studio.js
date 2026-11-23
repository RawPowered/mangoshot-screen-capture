/* MangoShot Clip Studio: non-destructive cut list, local real-time export. */
const byId=id=>document.getElementById(id),video=byId('video'),status=byId('status');
let original=null,originalUrl=null,segments=[],layers=[],selectedLayerId=null,history=[],duration=0,sequencePlaying=false,exporting=false,cancelExport=false,originalFormat=null;
let previewSequenceTime=null,loadVersion=0,selectedClipIndex=null,rangeSelected=false,redoHistory=[];
let sequencePreview=null,zoomEvents=[],transitions=[];
let captions=[],captionStyle={preset:'classic'},burnCaptions=true;
const captionsCore=()=>globalThis.MangoCaptionsV072;
const hasBurnedCaptions=()=>burnCaptions&&captions.length>0;
const clone=o=>JSON.parse(JSON.stringify(o));
const hasGraphics=()=>layers.some(l=>l.visible&&l.end>l.start)||hasBurnedCaptions();
const hasCreative=()=>zoomEvents.length>0||!!globalThis.MangoCreativeUI?.hasVoice?.();
const snapshot=()=>({segments:clone(segments),layers:clone(layers),markers:globalThis.MangoClipTimeline?.markers?.()||[],
 selectedLayerId,selectedClipIndex,rangeSelected,zoomFrames:clone(zoomEvents),transitions:clone(transitions),
 captions:clone(captions),captionStyle:clone(captionStyle),burnCaptions,selection:{start:Number(byId('in').value),end:Number(byId('out').value)}});
const remember=()=>{history.push(snapshot());if(history.length>80)history.shift();redoHistory=[];};
function restore(snap){segments=clone(snap.segments);layers=clone(snap.layers);selectedClipIndex=snap.selectedClipIndex??null;selectedLayerId=snap.selectedLayerId??null;
 rangeSelected=!!snap.rangeSelected;zoomEvents=MangoCreativeZoom.check(snap.zoomFrames||[]);transitions=MangoMotion.checkTransitions(snap.transitions||[]);
 captions=captionsCore()?.check(snap.captions||[],MangoEditOps.length(segments))||[];
 captionStyle=captionsCore()?.style(snap.captionStyle||{preset:'classic'})||{preset:'classic'};
 burnCaptions=snap.burnCaptions!==false;
 const length=MangoEditOps.length(segments),selection=snap.selection||{start:0,end:length};
 byId('in').max=byId('out').max=length.toFixed(2);
 byId('in').value=Math.min(length,selection.start).toFixed(2);
 byId('out').value=Math.min(length,selection.end).toFixed(2);
 globalThis.MangoClipTimeline?.loadMarkers?.(snap.markers||[]);
 refreshed();}
function refreshed(){render();sequencePreview?.update();previewSequenceTime=null;globalThis.MangoClipTimeline?.render?.();globalThis.MangoClipTimeline?.onSequenceChange?.();globalThis.MangoLayerUI?.render?.();paintPreview();globalThis.MangoAutoCutUI?.onEditorChange?.();globalThis.MangoMediaBin?.refresh?.();globalThis.MangoCreativeUI?.renderZoom?.();globalThis.MangoCreativeUI?.renderVoice?.();globalThis.MangoVisualClip?.refresh?.();globalThis.MangoMotionUI?.sync?.();globalThis.MangoCaptionUIV072?.refresh?.();}

const label=text=>status.textContent=text;
const time=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.round(t%1*100)).padStart(2,'0')}`;
const mp4Types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
const webmTypes=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
function supported(types){if(typeof MediaRecorder==='undefined')return null;return types.find(t=>MediaRecorder.isTypeSupported(t))||null;}
function setControls(){const loaded=!!original;
 byId('file').disabled=exporting;byId('open-last').disabled=exporting;byId('forget-last').disabled=exporting;
 byId('save-original').disabled=!loaded||exporting;byId('save-project').disabled=!loaded||exporting;byId('open-project').disabled=!loaded||exporting;
 for(const id of ['in','out','mark-in','mark-out','trim','cut','split','ripple-delete','range-tool','add-marker','make-thumbnails','analyze-audio','timeline-zoom','reset','play-edited','export-webm','export-mp4'])byId(id).disabled=!loaded||exporting;
 byId('undo').disabled=!loaded||!history.length||exporting;byId('redo').disabled=!loaded||!redoHistory.length||exporting;
 byId('clear-range').disabled=!loaded||exporting||(!rangeSelected&&selectedClipIndex===null);
 byId('export-webm').disabled=!loaded||exporting||!supported(webmTypes)||!segments.length;
 byId('export-mp4').disabled=!loaded||exporting|| (!supported(mp4Types)&&!(MangoFormat.fastCopy(originalFormat,'mp4',segments,duration)&&!hasGraphics()&&!hasCreative()))||!segments.length;
 byId('export-webm').disabled=!loaded||exporting|| (!supported(webmTypes)&&!(MangoFormat.fastCopy(originalFormat,'webm',segments,duration)&&!hasGraphics()&&!hasCreative()))||!segments.length;
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
function render(){const durationOut=MangoTimeline.outputDuration(segments);
 byId('duration').textContent=original?'Sequence '+time(durationOut)+' · Source '+time(duration):'No video loaded';
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
      if(transaction)applyTransaction(transaction,'Clip edge trimmed and downstream timeline rippled. Ctrl+Z to undo.',
      [{start:transaction.playhead,end:transaction.playhead+transaction.removed}]);
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
async function load(blob){if(exporting)throw new Error('Finish the current export first.');
 const request=++loadVersion;
 if(!(blob instanceof Blob)||!blob.size)throw new Error('Select a nonempty video.');
 sequencePlaying=false;sequencePreview?.stop();video.pause();if(originalUrl)URL.revokeObjectURL(originalUrl);
 globalThis.MangoCreativeUI?.voice?.dispose?.();zoomEvents=[];
  original=blob;originalFormat=await MangoFormat.detect(blob);originalUrl=URL.createObjectURL(blob);video.src=originalUrl;
 byId('source-format').textContent='Source container: '+(originalFormat?.toUpperCase()||'UNKNOWN')+' · '+(blob.size/1048576).toFixed(1)+' MiB';
 await waitVideoEvent('loadedmetadata');if(request!==loadVersion)return;duration=video.duration;
 if(!Number.isFinite(duration)||duration<=0){
   // WebM files from MediaRecorder sometimes omit explicit duration metadata.
   if(video.seekable.length){const t=video.seekable.end(video.seekable.length-1);if(Number.isFinite(t)&&t>0)duration=t;}
   if(!Number.isFinite(duration)||duration<=0){
     const recovered=new Promise(resolve=>{const done=()=>{video.removeEventListener('seeked',done);resolve();};
       video.addEventListener('seeked',done,{once:true});setTimeout(done,3000);});
     try{video.currentTime=1e9;await recovered;duration=Number.isFinite(video.duration)?video.duration:video.currentTime;}catch{}
   }
   try{video.currentTime=0;}catch{}
 }
 if(!Number.isFinite(duration)||duration<=0||duration>86400)throw new Error('The browser could not determine video duration. Try importing a finalized MP4/WebM file.');
 segments=[{start:0,end:duration}];layers=[];captions=[];captionStyle={preset:'classic'};burnCaptions=true;zoomEvents=[];transitions=[];selectedLayerId=null;selectedClipIndex=null;rangeSelected=false;history=[];redoHistory=[];byId('in').value='0';byId('out').value=duration.toFixed(2);
 byId('in').max=byId('out').max=duration.toFixed(2);
 const frame=byId('clip-preview-frame');if(frame&&video.videoWidth>0&&video.videoHeight>0){
   const aspect=video.videoWidth/video.videoHeight;frame.style.setProperty('--mango-ratio',String(aspect));frame.style.setProperty('--mango-aspect',video.videoWidth+' / '+video.videoHeight);
  }
  render();sequencePreview?.seekOutput(0);globalThis.MangoClipTimeline?.reset?.();globalThis.MangoLayerUI?.render?.();paintPreview();globalThis.MangoAutoCutUI?.onEditorChange?.();label('Loaded '+time(duration)+' video · original is unchanged.');
}
function readRange(){const clip=selectedClipIndex!==null&&!rangeSelected?MangoSequenceOps.bounds(segments,selectedClipIndex):null;
 return clip||MangoTimeline.range(Number(byId('in').value),Number(byId('out').value),MangoEditOps.length(segments));}
function commitSequence(next,message,newLayers=layers){
 if(!original||exporting||!next.length)return false;
 remember();segments=clone(next);layers=clone(newLayers);transitions=reconcileTransitions(transitions,segments);selectedClipIndex=null;rangeSelected=false;
 const out=MangoEditOps.length(segments);byId('out').max=out.toFixed(2);byId('in').max=out.toFixed(2);
 byId('in').value='0';byId('out').value=out.toFixed(2);
 refreshed();label(message);return true;
}
function applyTransaction(transaction,message,removedRanges=null,trimBounds=null){
 if(!transaction||!original||exporting)return false;
 const same=JSON.stringify(segments)===JSON.stringify(transaction.segments)&&JSON.stringify(layers)===JSON.stringify(transaction.layers)
  &&JSON.stringify(globalThis.MangoClipTimeline?.markers?.()||[])===JSON.stringify(transaction.markers);
 if(same){label('Nothing changed. Choose a different range or clip.');return false;}
 remember();
 if(Array.isArray(removedRanges)&&removedRanges.length){
  for(const range of [...removedRanges].sort((a,b)=>b.start-a.start))zoomEvents=MangoCreativeZoom.ripple(zoomEvents,range.start,range.end);
 }
 // Apply caption operations to the same committed edit as V1/G2/G3/markers.
 // Editing is sequence-time: a removed interval always closes the cue gap.
 if(captionsCore()){
  if(trimBounds)captions=captionsCore().trim(captions,trimBounds.start,trimBounds.end);
  else if(Array.isArray(removedRanges))
   for(const cut of [...removedRanges].sort((a,b)=>b.start-a.start))
    captions=captionsCore().ripple(captions,cut.start,cut.end);
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
function paintPreview(){
 const canvas=byId('graphics-preview');if(!canvas||!original)return;
 const w=video.videoWidth||1280,h=video.videoHeight||720;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext('2d');
 const mapped=previewSequenceTime===null?
  (MangoSequenceMedia.atSource(segments,video.currentTime)?.output??sequencePreview?.current()??null):previewSequenceTime;
 // Do NOT blank the entire graphics/video overlay while the HTMLVideoElement
 // is seeking or is without a decoded frame. Selection and cut jumps can drop
 // readyState below HAVE_CURRENT_DATA; the previous valid composite must stay.
 if(!ctx||mapped===null||video.seeking||video.readyState<2)return;
 ctx.clearRect(0,0,w,h);
 MangoCreativeZoom.preview(video,zoomEvents,mapped);
 // Make the overlay a complete decoded frame, not just transparent graphics.
 // This avoids black/blank native-video frames during selection and scrubbing.
 if(typeof ctx.drawImage==='function'){
  if(!MangoMotion.paintTransition(ctx,video,zoomEvents,segments,transitions,mapped,w,h))
   MangoCreativeZoom.draw(ctx,video,zoomEvents,mapped,w,h);
 }else MangoMotion.paintTransition(ctx,video,zoomEvents,segments,transitions,mapped,w,h);
 MangoGraphics.render(ctx,layers,mapped,w,h);
 if(burnCaptions)captionsCore()?.draw(ctx,captions,mapped,w,h,captionsCore().style(captionStyle));
 globalThis.MangoLayerUI?.selectionOutline?.(ctx,mapped,w,h);
}

function edit(kind){if(!original||exporting)return;
 try{const selection=readRange();
  if(kind==='cut'){rippleDelete(selection.start,selection.end);return;}
  const tx=MangoSequenceOps.trim(segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],selection.start,selection.end);
  const zoomTrim=zoomEvents.filter(e=>e.start>=selection.start&&e.start<selection.end).map(e=>({...e,start:e.start-selection.start}));
   if(applyTransaction(tx,'Trimmed sequence to the selected range.',null,selection)){zoomEvents=MangoCreativeZoom.check(zoomTrim);refreshed();}
 }catch(error){label('Edit not applied: '+error.message);}}

byId('mark-in').onclick=()=>setRange(MangoEditOps.toOutput(segments,video.currentTime)??0,Number(byId('out').value));
byId('mark-out').onclick=()=>setRange(Number(byId('in').value),MangoEditOps.toOutput(segments,video.currentTime)??0);
for(const id of ['in','out'])byId(id).addEventListener('change',()=>setRange(Number(byId('in').value),Number(byId('out').value)));
byId('clear-range').onclick=clearSelection;
byId('trim').onclick=()=>edit('trim');byId('cut').onclick=()=>{
 if(rangeSelected||selectedClipIndex!==null)deleteSelection();else edit('cut');
};
byId('undo').onclick=()=>{if(!history.length)return;redoHistory.push(snapshot());restore(history.pop());label('Undo complete.');};
byId('redo').onclick=()=>{if(!redoHistory.length)return;history.push(snapshot());restore(redoHistory.pop());label('Redo complete.');};
byId('reset').onclick=()=>{if(!original)return;remember();segments=[{start:0,end:duration}];layers=[];captions=[];zoomEvents=[];selectedLayerId=null;
 selectedClipIndex=null;rangeSelected=false;byId('in').value='0';byId('out').value=duration.toFixed(2);
 globalThis.MangoClipTimeline?.loadMarkers?.([]);refreshed();label('Source, graphics and markers reset.');};
byId('file').addEventListener('change',event=>{if(event.target.files?.[0])load(event.target.files[0]).catch(e=>label('Open failed: '+e.message));});
byId('open-last').onclick=async()=>{try{const record=await MangoClips.load();if(!record?.blob)throw new Error('No stored recording found.');await load(record.blob);}catch(e){label('Cannot open last recording: '+e.message);}};
byId('forget-last').onclick=async()=>{try{await MangoClips.clear();label('Last locally stored recording deleted.');}catch(e){label('Cannot remove stored video: '+e.message);}};
async function seek(timepoint,v=video){v.pause();if(Math.abs(v.currentTime-timepoint)<.025)return;
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{v.removeEventListener('seeked',done);reject(new Error('Seeking timed out.'));},8000);
 function done(){clearTimeout(timer);resolve();}v.addEventListener('seeked',done,{once:true});});
 v.currentTime=timepoint;await ready;}
async function playRanges(ranges,shouldStop,onProgress,v=video){let used=0,total=MangoTimeline.outputDuration(ranges);
 for(const clip of ranges){if(shouldStop())break;
  await seek(clip.start,v);onProgress?.(used/total*100,used);await v.play();
  while(v.currentTime < clip.end-.012 && !v.ended){
   if(shouldStop() || (v.paused && !exporting))break;
   const out=used+Math.max(0,v.currentTime-clip.start);onProgress?.(Math.min(100,out/total*100),out);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  v.pause();used+=clip.end-clip.start;
 }
 v.pause();onProgress?.(100,total);
}
byId('play-edited').onclick=()=>{if(!original||exporting)return;void sequencePreview?.toggle();};

function download(blob,extension,untouched=false){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
 link.download='MangoShot-'+(untouched?'original-':'edited-')+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportClip(format){if(!original||!segments.length||exporting)return;
 const types=format==='mp4'?mp4Types:webmTypes;
 if(!hasGraphics()&&!hasCreative()&&MangoFormat.fastCopy(originalFormat,format,segments,duration)){
   // No editing or transcoding. The exact uploaded/recorded bytes are downloaded unchanged.
   download(original,format,true);label('Saved unchanged '+format.toUpperCase()+' instantly; no encoding or quality loss.');return;
 }
 if(!supported(types)){label(format.toUpperCase()+' export cannot run because this browser lacks the encoder.');return;}
 exporting=true;cancelExport=false;sequencePlaying=false;render();byId('progress').hidden=false;byId('progress').value=0;
 let ctx=null,rec=null,exportStream=null,paintHandle=0,recorded=[],tempTracks=[],exportVideo=null,voiceExport=null;
 try{
  exportVideo=document.createElement('video');exportVideo.preload='auto';exportVideo.playsInline=true;exportVideo.src=originalUrl;
  exportVideo.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none';document.body.appendChild(exportVideo);
  await new Promise((resolve,reject)=>{exportVideo.onloadedmetadata=resolve;exportVideo.onerror=()=>reject(new Error('Could not decode export source.'));});
  const width=exportVideo.videoWidth,height=exportVideo.videoHeight;
  const pixelLimit=byId('performance-profile')?.value==='high'?33000000:16000000;
  if(!width||!height||width*height>pixelLimit)throw new Error('Canvas dimensions exceed the selected performance profile; reduce resolution or select High-performance.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const paint=canvas.getContext('2d',{alpha:false});
  let exportSequenceTime=0;
  // Initialize once; never clear to black between AutoCut segments. A seek can
  // remove decoded frames for 1-3 ticks even though the edit decision list has
  // zero sequence-time gaps. Hold the previous frame until the decoder recovers.
  paint.fillStyle='#000';paint.fillRect(0,0,width,height);
  function draw(){
   if(exportVideo.readyState>=2&&!exportVideo.seeking){
    if(!MangoMotion.paintTransition(paint,exportVideo,zoomEvents,segments,transitions,exportSequenceTime,width,height))
     MangoCreativeZoom.draw(paint,exportVideo,zoomEvents,exportSequenceTime,width,height);
    MangoGraphics.render(paint,layers,exportSequenceTime,width,height);
    if(burnCaptions)captionsCore()?.draw(paint,captions,exportSequenceTime,width,height,captionsCore().style(captionStyle));
   }
   paintHandle=requestAnimationFrame(draw);
  }draw();
  if(!canvas.captureStream)throw new Error('Canvas encoding unavailable.');
  const profile=byId('performance-profile')?.value==='high'?'high':'balanced';
  const fps=profile==='high'?60:30,bitrate=profile==='high'?10000000:4500000;
  exportStream=canvas.captureStream(fps);tempTracks.push(...exportStream.getVideoTracks());
  try{ctx=new AudioContext();const destination=ctx.createMediaStreamDestination();const source=ctx.createMediaElementSource(exportVideo);
   source.connect(destination);
    if(globalThis.MangoCreativeUI?.hasVoice?.())voiceExport=globalThis.MangoCreativeUI.attachExport(ctx,destination);
    for(const track of destination.stream.getAudioTracks())exportStream.addTrack(track);
   tempTracks.push(...destination.stream.getAudioTracks());await ctx.resume();
  }catch(error){if(globalThis.MangoCreativeUI?.hasVoice?.())throw Error('Voiceover mixing unavailable; export aborted rather than dropping narration: '+error.message);label('Audio track unavailable ('+error.name+'); exporting video only.');}
  for(const mime of types){if(!MediaRecorder.isTypeSupported(mime))continue;
   try{rec=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:bitrate});break;}catch{}}
  if(!rec)throw new Error('Failed to initialize '+format.toUpperCase()+' encoder.');
  rec.ondataavailable=e=>{if(e.data.size)recorded.push(e.data);};
  const done=new Promise((resolve,reject)=>{rec.onstop=()=>resolve();rec.onerror=e=>reject(e.error||new Error('Encoding failed.'));});
  await seek(segments[0].start,exportVideo);
  if(exportVideo.readyState>=2&&!exportVideo.seeking){
   if(!MangoMotion.paintTransition(paint,exportVideo,zoomEvents,segments,transitions,exportSequenceTime,width,height))
    MangoCreativeZoom.draw(paint,exportVideo,zoomEvents,exportSequenceTime,width,height);
   MangoGraphics.render(paint,layers,exportSequenceTime,width,height);
   if(burnCaptions)captionsCore()?.draw(paint,captions,exportSequenceTime,width,height,captionsCore().style(captionStyle));
  }
  rec.start(800);
  await playRanges(segments,()=>cancelExport,(value,output)=>{byId('progress').value=value;exportSequenceTime=output;voiceExport?.sync?.(output,true);},exportVideo);
  if(rec.state!=='inactive')rec.stop();await done;
  if(cancelExport){label('Export cancelled.');return;}
  const mime=rec.mimeType||types[0];
  if(format==='mp4'&&!mime.includes('mp4'))throw new Error('Browser returned non-MP4 media. Export was rejected.');
  const blob=new Blob(recorded,{type:mime});if(!blob.size)throw new Error('No encoded data was produced.');
  download(blob,format);label('Exported '+format.toUpperCase()+' with '+segments.length+' clip(s) · '+(blob.size/1048576).toFixed(1)+' MiB.');
 }catch(error){label('Export failed: '+error.message);if(rec&&rec.state!=='inactive')rec.stop();}
 finally{voiceExport?.stop?.();cancelAnimationFrame(paintHandle);for(const t of tempTracks)t.stop();exportVideo?.pause();exportVideo?.removeAttribute('src');exportVideo?.remove();
  if(ctx)ctx.close().catch(()=>{});exporting=false;byId('progress').hidden=true;render();}
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
  return load(record.blob);
 }).catch(error=>label('Recording handoff failed: '+error.message));
}else{
 MangoClips.load().then(record=>{if(record?.blob&&loadVersion===0)return load(record.blob);})
   .catch(error=>label('Could not auto-open latest video: '+error.message));
}

/* Read-only view model for the professional timeline. Mutations flow through
 * this editor's existing non-destructive edit decision list. */
globalThis.MangoClipView={
 duration:()=>duration,outputDuration:()=>MangoEditOps.length(segments),video:()=>video,
 segments:()=>segments,layers:()=>layers,transitions:()=>clone(transitions),selectedLayer:()=>selectedLayerId,url:()=>originalUrl,original:()=>original,
 exporting:()=>exporting,isPlaying:()=>sequencePreview?.isPlaying?.()||false,updateControls:setControls,
  updateTransition(index,patch){
   if(!original||exporting)return false;
   try{const next=MangoMotion.setTransition(transitions,segments,index,patch);
    if(JSON.stringify(next)===JSON.stringify(transitions))return false;
    remember();transitions=next;refreshed();label('Clip opening transition updated.');return true;
   }catch(error){label(error.message);return false;}
  },
  zoomFrames:()=>clone(zoomEvents),setZoomFrames(items){zoomEvents=MangoCreativeZoom.check(items);refreshed();},
  addZoomKeyframe(at,scale,x,y,ease){if(!original||exporting)throw Error('Load a video first');remember();zoomEvents=MangoCreativeZoom.add(zoomEvents,at,scale,x,y,ease);refreshed();},
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
  captions:()=>clone(captions),captionStyle:()=>clone(captionStyle),burnCaptions:()=>burnCaptions,
  setCaptions(next,message='Caption track updated.'){
   if(!original||exporting||!captionsCore())return false;
   const checked=captionsCore().check(next,MangoEditOps.length(segments));
   remember();captions=checked;refreshed();label(message);return true;
  },
  setCaptionStyle(next){
   if(!original||exporting||!captionsCore())return false;
   const checked=captionsCore().style(next);
   remember();captionStyle=checked;refreshed();label('Caption style updated.');return true;
  },
  setCaptionBurn(value){
   if(!original||exporting)return false;
   if(burnCaptions===!!value)return true;
   remember();burnCaptions=!!value;refreshed();label(burnCaptions?'On-screen captions enabled.':'Captions kept for SRT/VTT sidecar only.');return true;
  },
 restoreLegacyProject(data){
  if(!original||exporting)throw new Error('Load the matching source video before restoring a project.');
  const validated=MangoProject.check(data,{size:original.size,format:originalFormat,duration});
  remember();segments=validated.segments;layers=validated.layers;
  captions=validated.captions||[];captionStyle=validated.captionStyle||{preset:'classic'};
  burnCaptions=validated.burnCaptions!==false;transitions=reconcileTransitions(validated.transitions||[],segments);
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
 resizeLayer(id,width,fontSize){const l=layers.find(x=>x.id===id);if(!l||l.locked)return;
  l.width=Math.max(.1,Math.min(1-l.x,width));l.fontSize=Math.max(12,Math.min(220,fontSize));paintPreview();},
 endLayerMove(){refreshed();},
 setLayerHidden(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.visible=!value;refreshed();},
 setLayerLocked(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.locked=!!value;refreshed();},
 styleLayer(id,preset){const index=layers.findIndex(l=>l.id===id);if(index<0||layers[index].locked)return;
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
sequencePreview=MangoSequencePreview.create(video,()=>segments,
 output=>{previewSequenceTime=output;globalThis.MangoClipTimeline?.playhead?.();paintPreview();
  globalThis.MangoCaptionUIV072?.onPosition?.(output);globalThis.MangoCreativeUI?.onPosition?.(output);},
 (playing,error)=>{globalThis.MangoCreativeUI?.onPlayback?.(playing);byId('program-play').textContent=playing?'❚❚ Pause':'▶ Play';if(error)label('Preview paused: '+error);});
video.addEventListener('timeupdate',()=>{globalThis.MangoClipTimeline?.playhead?.();paintPreview();});
video.addEventListener('seeked',()=>{previewSequenceTime=null;paintPreview();});
video.addEventListener('loadeddata',paintPreview);
video.addEventListener('canplay',paintPreview);
if(typeof video.requestVideoFrameCallback==='function'){
 const redrawFrame=()=>{if(!original)return;paintPreview();video.requestVideoFrameCallback(redrawFrame);};
 video.requestVideoFrameCallback(redrawFrame);
}

// Premiere-style transport in place of native over-video controls, which are
// obscured by the editable graphics canvas.
byId('program-play').addEventListener('click',()=>{if(!original||exporting)return;void sequencePreview?.toggle();});
for(const [id,delta] of [['program-back',-1/30],['program-forward',1/30]])
 byId(id).addEventListener('click',()=>{if(!original||exporting)return;sequencePreview?.stop();
  const current=sequencePreview?.current()??0;globalThis.MangoClipView.seekOutput(Math.max(0,Math.min(MangoEditOps.length(segments)-.005,current+delta)));});
video.addEventListener('ended',()=>sequencePreview?.stop());
document.addEventListener('keydown',e=>{if(globalThis.MangoShortcuts?.active)return;if(e.key!==' '||e.ctrlKey||e.altKey||e.metaKey||e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
 e.preventDefault();byId('program-play').click();});

byId('save-project').addEventListener('click',()=>{if(!original||exporting)return;
 const project=MangoProject.pack({size:original.size,format:originalFormat,duration},segments,layers,globalThis.MangoClipTimeline?.markers?.()||[],transitions,captions,captionStyle,burnCaptions);
 const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='MangoShot-Project-'+Date.now()+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 label('Edit project saved (source video is separate).');
});
byId('open-project').addEventListener('change',async event=>{if(!original||exporting)return;
 try{const file=event.target.files?.[0];if(!file||file.size>1000000)throw new Error('Select a project under 1 MB.');
  const data=JSON.parse(await file.text());const project=MangoProject.check(data,{size:original.size,format:originalFormat,duration});
  remember();segments=project.segments;layers=project.layers;captions=project.captions||[];
  captionStyle=project.captionStyle||{preset:'classic'};burnCaptions=project.burnCaptions!==false;
  selectedLayerId=null;selectedClipIndex=null;rangeSelected=false;
  byId('out').max=MangoEditOps.length(segments).toFixed(2);byId('in').max=byId('out').max;
  byId('in').value='0';byId('out').value=byId('out').max;refreshed();globalThis.MangoClipTimeline?.loadMarkers?.(project.markers);label('Project decisions restored. Original video unchanged.');
 }catch(error){label('Cannot open project: '+error.message);}finally{event.target.value='';}
});
