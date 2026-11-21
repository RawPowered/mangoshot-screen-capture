/* MangoShot Clip Studio: non-destructive cut list, local real-time export. */
const byId=id=>document.getElementById(id),video=byId('video'),status=byId('status');
let original=null,originalUrl=null,segments=[],layers=[],selectedLayerId=null,history=[],duration=0,sequencePlaying=false,exporting=false,cancelExport=false,originalFormat=null;
let previewSequenceTime=null;
const clone=o=>JSON.parse(JSON.stringify(o));
const hasGraphics=()=>layers.some(l=>l.visible&&l.end>l.start);
const snapshot=()=>({segments:clone(segments),layers:clone(layers)});
const remember=()=>{history.push(snapshot());if(history.length>80)history.shift();};
function refreshed(){render();globalThis.MangoClipTimeline?.render?.();globalThis.MangoLayerUI?.render?.();paintPreview();}

const label=text=>status.textContent=text;
const time=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.round(t%1*100)).padStart(2,'0')}`;
const mp4Types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
const webmTypes=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
function supported(types){if(typeof MediaRecorder==='undefined')return null;return types.find(t=>MediaRecorder.isTypeSupported(t))||null;}
function setControls(){const loaded=!!original;
 byId('file').disabled=exporting;byId('open-last').disabled=exporting;byId('forget-last').disabled=exporting;
 byId('save-original').disabled=!loaded||exporting;byId('save-project').disabled=!loaded||exporting;byId('open-project').disabled=!loaded||exporting;
 for(const id of ['in','out','mark-in','mark-out','trim','cut','split','add-marker','make-thumbnails','analyze-audio','timeline-zoom','reset','play-edited','export-webm','export-mp4'])byId(id).disabled=!loaded||exporting;
 byId('undo').disabled=!loaded||!history.length||exporting;
 byId('export-webm').disabled=!loaded||exporting||!supported(webmTypes)||!segments.length;
 byId('export-mp4').disabled=!loaded||exporting|| (!supported(mp4Types)&&!(MangoFormat.fastCopy(originalFormat,'mp4',segments,duration)&&!hasGraphics()))||!segments.length;
 byId('export-webm').disabled=!loaded||exporting|| (!supported(webmTypes)&&!(MangoFormat.fastCopy(originalFormat,'webm',segments,duration)&&!hasGraphics()))||!segments.length;
 byId('cancel-export').disabled=!exporting;
 const mp4Instant=!hasGraphics()&&MangoFormat.fastCopy(originalFormat,'mp4',segments,duration);
 const webmInstant=!hasGraphics()&&MangoFormat.fastCopy(originalFormat,'webm',segments,duration);
 byId('export-mp4').textContent=mp4Instant?'Save MP4 (instant)':'Convert & export MP4';
 byId('export-webm').textContent=webmInstant?'Save WebM (instant)':'Convert & export WebM';
 const hint=byId('export-hint');
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
  node.textContent=String(i+1);node.onclick=()=>{video.currentTime=s.start;};
  for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='trim-grip trim-'+edge;handle.title='Drag inward to trim '+edge+' edge (undoable)';
   handle.addEventListener('pointerdown',event=>{if(exporting)return;event.preventDefault();event.stopPropagation();
    const originX=event.clientX,width=Math.max(1,byId('timeline').getBoundingClientRect().width),original={...segments[i]};
    const delta=ev=>((ev.clientX-originX)/width)*durationOut;
    const moving=ev=>{handle.title='Trim '+edge+' to '+time(Math.max(original.start,Math.min(original.end,edge==='start'?original.start+delta(ev):original.end+delta(ev))));};
    const finished=ev=>{window.removeEventListener('pointermove',moving);window.removeEventListener('pointerup',finished);
     try{const updated=MangoTimeline.resize(segments,i,edge,edge==='start'?original.start+delta(ev):original.end+delta(ev),duration);
      if(updated[i].start!==original.start||updated[i].end!==original.end){
        const clipStart=segments.slice(0,i).reduce((n,s)=>n+s.end-s.start,0);
        const changed=edge==='start'?updated[i].start-original.start:original.end-updated[i].end;
        const from=edge==='start'?clipStart:clipStart+(original.end-original.start)-changed;
        const shifted=MangoGraphics.ripple(layers,from,from+Math.max(0,changed));
        commitSequence(updated,'Trim handle applied. Ctrl+Z to undo.',shifted);
      }
     }catch(error){label('Trim not applied: '+error.message);}};
    window.addEventListener('pointermove',moving);window.addEventListener('pointerup',finished,{once:true});
   });node.appendChild(handle);}
  byId('timeline').appendChild(node);
 }
 const list=byId('segments');list.replaceChildren();
 for(const [i,s] of segments.entries()){
  const row=document.createElement('button');row.className='segment-row';row.textContent=`Clip ${i+1}: ${time(s.start)} → ${time(s.end)} (${time(s.end-s.start)})`;
  row.onclick=()=>{video.currentTime=s.start;};list.appendChild(row);
 }
 setControls();globalThis.MangoClipTimeline?.render?.();
}
function waitVideoEvent(type,timeout=8000){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{clear();reject(new Error('Video '+type+' timed out.'));},timeout);
 const clear=()=>{clearTimeout(timer);video.removeEventListener(type,done);video.removeEventListener('error',failed);};
 const done=()=>{clear();resolve();};const failed=()=>{clear();reject(video.error||new Error('Video decoding failed.'));};
 video.addEventListener(type,done,{once:true});video.addEventListener('error',failed,{once:true});
 });}
async function load(blob){if(exporting)throw new Error('Finish the current export first.');
 if(!(blob instanceof Blob)||!blob.size)throw new Error('Select a nonempty video.');
 sequencePlaying=false;video.pause();if(originalUrl)URL.revokeObjectURL(originalUrl);
 original=blob;originalFormat=await MangoFormat.detect(blob);originalUrl=URL.createObjectURL(blob);video.src=originalUrl;
 byId('source-format').textContent='Source container: '+(originalFormat?.toUpperCase()||'UNKNOWN')+' · '+(blob.size/1048576).toFixed(1)+' MiB';
 await waitVideoEvent('loadedmetadata');duration=video.duration;
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
 segments=[{start:0,end:duration}];layers=[];selectedLayerId=null;history=[];byId('in').value='0';byId('out').value=duration.toFixed(2);
 byId('in').max=byId('out').max=duration.toFixed(2);
 render();globalThis.MangoClipTimeline?.reset?.();globalThis.MangoLayerUI?.render?.();paintPreview();label('Loaded '+time(duration)+' video · original is unchanged.');
}
function readRange(){return MangoTimeline.range(Number(byId('in').value),Number(byId('out').value),MangoEditOps.length(segments));}
function commitSequence(next,message,newLayers=layers){
 if(!original||exporting||!next.length)return false;
 remember();segments=clone(next);layers=clone(newLayers);
 const out=MangoEditOps.length(segments);byId('out').max=out.toFixed(2);byId('in').max=out.toFixed(2);
 byId('out').value=Math.min(Number(byId('out').value)||out,out).toFixed(2);
 refreshed();label(message);return true;
}
function rippleDelete(a,b){
 if(!original||exporting)return;
 try{const next=MangoEditOps.remove(segments,a,b);
  if(!next.length)throw new Error('Cannot remove the entire sequence');
  commitSequence(next,'Ripple deleted '+time(b-a)+' and closed the gap.',MangoGraphics.ripple(layers,a,b));
  byId('in').value=Math.min(a,MangoEditOps.length(next)).toFixed(2);
  byId('out').value=Math.min(b,MangoEditOps.length(next)).toFixed(2);return true;
 }catch(e){label('Ripple delete failed: '+e.message);return false;}
}
function paintPreview(){
 const canvas=byId('graphics-preview');if(!canvas||!original)return;
 const w=video.videoWidth||1280,h=video.videoHeight||720;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
 const mapped=previewSequenceTime===null?MangoEditOps.toOutput(segments,video.currentTime):previewSequenceTime;
 if(mapped!==null)MangoGraphics.render(ctx,layers,mapped,w,h);
 globalThis.MangoLayerUI?.selectionOutline?.(ctx,mapped,w,h);
}

function edit(kind){if(!original||exporting)return;
 try{const selection=readRange();
  if(kind==='cut'){rippleDelete(selection.start,selection.end);return;}
  const updated=MangoEditOps.trim(segments,selection.start,selection.end);
  if(!updated.length)throw new Error('Edits would remove the whole video.');
  commitSequence(updated,'Trim applied.',MangoGraphics.trim(layers,selection.start,selection.end));
 }catch(error){label('Edit not applied: '+error.message);}}

byId('mark-in').onclick=()=>byId('in').value=(MangoEditOps.toOutput(segments,video.currentTime)??0).toFixed(2);
byId('mark-out').onclick=()=>byId('out').value=(MangoEditOps.toOutput(segments,video.currentTime)??0).toFixed(2);
byId('trim').onclick=()=>edit('trim');byId('cut').onclick=()=>edit('cut');
byId('undo').onclick=()=>{if(!history.length)return;const old=history.pop();segments=old.segments;layers=old.layers;selectedLayerId=null;refreshed();label('Undo complete.');};
byId('reset').onclick=()=>{if(!original)return;remember();segments=[{start:0,end:duration}];layers=[];selectedLayerId=null;refreshed();label('Source and graphics reset.');};
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
byId('play-edited').onclick=async()=>{if(sequencePlaying||exporting||!segments.length)return;sequencePlaying=true;
 try{await playRanges(segments,()=>!sequencePlaying,(_percent,output)=>{previewSequenceTime=output;paintPreview();});}
 catch(e){label('Preview error: '+e.message);}finally{sequencePlaying=false;previewSequenceTime=null;paintPreview();}};

function download(blob,extension,untouched=false){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
 link.download='MangoShot-'+(untouched?'original-':'edited-')+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportClip(format){if(!original||!segments.length||exporting)return;
 const types=format==='mp4'?mp4Types:webmTypes;
 if(!hasGraphics()&&MangoFormat.fastCopy(originalFormat,format,segments,duration)){
   // No editing or transcoding. The exact uploaded/recorded bytes are downloaded unchanged.
   download(original,format,true);label('Saved unchanged '+format.toUpperCase()+' instantly; no encoding or quality loss.');return;
 }
 if(!supported(types)){label(format.toUpperCase()+' export cannot run because this browser lacks the encoder.');return;}
 exporting=true;cancelExport=false;sequencePlaying=false;render();byId('progress').hidden=false;byId('progress').value=0;
 let ctx=null,rec=null,exportStream=null,paintHandle=0,recorded=[],tempTracks=[],exportVideo=null;
 try{
  exportVideo=document.createElement('video');exportVideo.preload='auto';exportVideo.playsInline=true;exportVideo.src=originalUrl;
  exportVideo.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none';document.body.appendChild(exportVideo);
  await new Promise((resolve,reject)=>{exportVideo.onloadedmetadata=resolve;exportVideo.onerror=()=>reject(new Error('Could not decode export source.'));});
  const width=exportVideo.videoWidth,height=exportVideo.videoHeight;
  if(!width||!height||width*height>16000000)throw new Error('Unsupported resolution; choose a smaller video.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const paint=canvas.getContext('2d',{alpha:false});
  let exportSequenceTime=0;
  function draw(){paint.fillStyle='#000';paint.fillRect(0,0,width,height);
   if(exportVideo.readyState>=2)paint.drawImage(exportVideo,0,0,width,height);
   MangoGraphics.render(paint,layers,exportSequenceTime,width,height);
   paintHandle=requestAnimationFrame(draw);}draw();
  if(!canvas.captureStream)throw new Error('Canvas encoding unavailable.');
  exportStream=canvas.captureStream(30);tempTracks.push(...exportStream.getVideoTracks());
  try{ctx=new AudioContext();const destination=ctx.createMediaStreamDestination();const source=ctx.createMediaElementSource(exportVideo);
   source.connect(destination);for(const track of destination.stream.getAudioTracks())exportStream.addTrack(track);
   tempTracks.push(...destination.stream.getAudioTracks());await ctx.resume();
  }catch(error){label('Audio track unavailable ('+error.name+'); exporting video only.');}
  for(const mime of types){if(!MediaRecorder.isTypeSupported(mime))continue;
   try{rec=new MediaRecorder(exportStream,{mimeType:mime,videoBitsPerSecond:4500000});break;}catch{}}
  if(!rec)throw new Error('Failed to initialize '+format.toUpperCase()+' encoder.');
  rec.ondataavailable=e=>{if(e.data.size)recorded.push(e.data);};
  const done=new Promise((resolve,reject)=>{rec.onstop=()=>resolve();rec.onerror=e=>reject(e.error||new Error('Encoding failed.'));});
  await seek(segments[0].start,exportVideo);if(exportVideo.readyState>=2)paint.drawImage(exportVideo,0,0,width,height);
  rec.start(800);
  await playRanges(segments,()=>cancelExport,(value,output)=>{byId('progress').value=value;exportSequenceTime=output;},exportVideo);
  if(rec.state!=='inactive')rec.stop();await done;
  if(cancelExport){label('Export cancelled.');return;}
  const mime=rec.mimeType||types[0];
  if(format==='mp4'&&!mime.includes('mp4'))throw new Error('Browser returned non-MP4 media. Export was rejected.');
  const blob=new Blob(recorded,{type:mime});if(!blob.size)throw new Error('No encoded data was produced.');
  download(blob,format);label('Exported '+format.toUpperCase()+' with '+segments.length+' clip(s) · '+(blob.size/1048576).toFixed(1)+' MiB.');
 }catch(error){label('Export failed: '+error.message);if(rec&&rec.state!=='inactive')rec.stop();}
 finally{cancelAnimationFrame(paintHandle);for(const t of tempTracks)t.stop();exportVideo?.pause();exportVideo?.removeAttribute('src');exportVideo?.remove();
  if(ctx)ctx.close().catch(()=>{});exporting=false;byId('progress').hidden=true;render();}
}
byId('save-original').onclick=()=>{if(!original||exporting)return;
 if(!originalFormat){label('Unknown source format. Cannot safely assign a video extension.');return;}
 download(original,originalFormat,true);label('Saved original '+originalFormat.toUpperCase()+' immediately, byte-for-byte unchanged.');
};
byId('export-webm').onclick=()=>exportClip('webm');byId('export-mp4').onclick=()=>exportClip('mp4');
byId('cancel-export').onclick=()=>{cancelExport=true;label('Stopping export…');};
window.addEventListener('beforeunload',event=>{if(exporting){event.preventDefault();event.returnValue='';}});
setControls();MangoClips.load().then(record=>record?.blob&&load(record.blob)).catch(()=>{});

/* Read-only view model for the professional timeline. Mutations flow through
 * this editor's existing non-destructive edit decision list. */
globalThis.MangoClipView={
 duration:()=>duration,outputDuration:()=>MangoEditOps.length(segments),video:()=>video,
 segments:()=>segments,layers:()=>layers,selectedLayer:()=>selectedLayerId,url:()=>originalUrl,original:()=>original,
 exporting:()=>exporting,message:label,paintPreview,
 outputAt:source=>MangoEditOps.toOutput(segments,source),
 seekOutput:time=>{const source=MangoEditOps.toSource(segments,time);if(source!==null)video.currentTime=source;},
 commit(next,message){commitSequence(next,message);},rippleDelete,
 addLayer(kind,preset='none'){
   if(!original||exporting)return;
   const at=MangoEditOps.toOutput(segments,video.currentTime)??0;
   const layer=MangoGraphics.create(kind,preset,Math.min(at,Math.max(0,MangoEditOps.length(segments)-.1)));
   layer.end=Math.min(layer.end,MangoEditOps.length(segments));
   remember();layers.push(layer);selectedLayerId=layer.id;refreshed();label(layer.name+' layer added.');
 },
 selectLayer(id){selectedLayerId=id;globalThis.MangoLayerUI?.render?.();paintPreview();},
 updateLayer(id,changes){const index=layers.findIndex(l=>l.id===id);
   if(index<0||exporting||layers[index].locked)return;
   remember();layers[index]={...layers[index],...changes};refreshed();
 },
 deleteLayer(id){if(exporting)return;remember();layers=layers.filter(l=>l.id!==id);selectedLayerId=null;refreshed();},
 duplicateLayer(id){const source=layers.find(l=>l.id===id);if(!source||exporting)return;
   remember();const dup={...clone(source),id:(globalThis.crypto?.randomUUID?.()||String(Date.now())),name:source.name+' copy'};
   layers.push(dup);selectedLayerId=dup.id;refreshed();},
 beginLayerMove(id){if(exporting)return;const l=layers.find(x=>x.id===id);if(l&&!l.locked)remember();},
 moveLayer(id,x,y){const l=layers.find(x=>x.id===id);if(!l||l.locked)return;l.x=x;l.y=y;paintPreview();},
 endLayerMove(){refreshed();},
 setLayerHidden(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.visible=!value;refreshed();},
 setLayerLocked(id,value){const l=layers.find(x=>x.id===id);if(!l)return;remember();l.locked=!!value;refreshed();},
 styleLayer(id,preset){const index=layers.findIndex(l=>l.id===id);if(index<0||layers[index].locked)return;
   remember();layers[index]=MangoGraphics.style(layers[index],preset);refreshed();},
};
video.addEventListener('timeupdate',()=>{globalThis.MangoClipTimeline?.playhead?.();paintPreview();});
video.addEventListener('seeked',paintPreview);video.addEventListener('loadeddata',paintPreview);

// Premiere-style transport in place of native over-video controls, which are
// obscured by the editable graphics canvas.
byId('program-play').addEventListener('click',()=>{if(!original)return;
 if(video.paused)void video.play().catch(e=>label('Playback failed: '+e.message));else video.pause();});
for(const [id,delta] of [['program-back',-1/30],['program-forward',1/30]])
 byId(id).addEventListener('click',()=>{if(!original)return;video.pause();
 video.currentTime=Math.max(0,Math.min(duration,video.currentTime+delta));});
video.addEventListener('play',()=>{byId('program-play').textContent='❚❚ Pause';});
video.addEventListener('pause',()=>{byId('program-play').textContent='▶ Play';});
document.addEventListener('keydown',e=>{if(e.key!==' '||e.ctrlKey||e.altKey||e.metaKey||e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
 e.preventDefault();byId('program-play').click();});

byId('save-project').addEventListener('click',()=>{if(!original||exporting)return;
 const project=MangoProject.pack({size:original.size,format:originalFormat,duration},segments,layers,globalThis.MangoClipTimeline?.markers?.()||[]);
 const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='MangoShot-Project-'+Date.now()+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 label('Edit project saved (source video is separate).');
});
byId('open-project').addEventListener('change',async event=>{if(!original||exporting)return;
 try{const file=event.target.files?.[0];if(!file||file.size>1000000)throw new Error('Select a project under 1 MB.');
  const data=JSON.parse(await file.text());const project=MangoProject.check(data,{size:original.size,format:originalFormat,duration});
  remember();segments=project.segments;layers=project.layers;selectedLayerId=null;
  byId('out').max=MangoEditOps.length(segments).toFixed(2);byId('in').max=byId('out').max;
  byId('in').value='0';byId('out').value=byId('out').max;refreshed();globalThis.MangoClipTimeline?.loadMarkers?.(project.markers);label('Project decisions restored. Original video unchanged.');
 }catch(error){label('Cannot open project: '+error.message);}finally{event.target.value='';}
});
