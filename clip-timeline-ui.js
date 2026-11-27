/* Local, non-destructive editing affordances. Media is NEVER modified by these controls. */
(() => {
 const ui=id=>document.getElementById(id);
 const format=(seconds,precise=false)=>{const sec=Math.max(0,seconds||0),mins=Math.floor(sec/60);
   return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')+':'+String(Math.floor(sec%60)).padStart(2,'0')+(precise?'.'+String(Math.min(99,Math.floor((sec%1)*100+.00001))).padStart(2,'0'):'');};
 let markers=[],generation=0,tool='select',draggingPlayhead=false,draggingRange=false,rangeAnchor=0;
 // Caches are keyed by SOURCE time. Every render reprojects them into
 // sequence time, so edited gaps never appear in the A1 or thumbnail strips.
 let thumbnailUrls=[],thumbnailCache=[],generated=false,renderTimer=0,sourceUrl=null,sequenceSignature='',activeGeneration=0;
 let waveformPeaks=null,waveformDuration=0,profile='balanced';
 const thumbCount=duration=>profile==='high'?Math.min(80,Math.max(16,Math.ceil(duration/5))):Math.min(36,Math.max(12,Math.ceil(duration/10)));
 function reflowThumbnails(){
  const st=state(),frameStrip=ui('thumbnail-strip');if(!frameStrip)return;
  const duration=st?.outputDuration()||0;
  frameStrip.replaceChildren();if(!generated||!duration)return;
  const plan=globalThis.MangoSequenceMedia.thumbnailPlan(st.segments(),thumbCount(duration));
  for(const frame of plan){
   const node=document.createElement('span');node.className='frame-thumb';
   node.title='Sequence '+format(frame.output)+' · source '+format(frame.source);
   // Do not show a frame captured from a deleted source range. Placeholder
   // until reanalysis is preferable to a deceptive pre-cut thumbnail.
   let nearest=null,distance=Infinity;
   for(const item of thumbnailCache){const diff=Math.abs(item.source-frame.source);
    if(diff<distance){nearest=item;distance=diff;}}
   const tolerance=Math.min(1.5,Math.max(.12,duration/plan.length*.16));
   const retained=globalThis.MangoSequenceMedia.sections(st.segments())[frame.index];
   if(nearest&&distance<=tolerance&&nearest.source>=retained.sourceStart-.0001&&nearest.source<=retained.sourceEnd+.0001){node.style.backgroundImage='url('+nearest.url+')';const img=document.createElement('img');img.alt='';img.src=nearest.url;img.draggable=false;node.appendChild(img);}
   else {node.className+=' frame-thumb-pending';node.textContent=format(frame.output);}
   frameStrip.appendChild(node);
  }
 }
 function redrawWaveform(){
  const st=state(),canvas=ui('audio-waveform');if(!canvas)return;
  const ctx=canvas.getContext?.('2d');if(!ctx)return;
  const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);
  if(!waveformPeaks||!st?.outputDuration())return;
  const display=globalThis.MangoSequenceMedia.peakSeries(st.segments(),waveformPeaks,waveformDuration,width);
  ctx.fillStyle='#79bca0';
  for(let x=0;x<width;x++){
   const bar=Math.max(1,Math.min(height*.92,display[x]*height*.9));
   ctx.fillRect(x,(height-bar)/2,1,bar);
  }
  // Small guide lines keep A1's cut boundaries aligned with V1.
  const rows=globalThis.MangoSequenceMedia.sections(st.segments());
  ctx.fillStyle='rgba(235,204,137,.75)';
  for(const row of rows.slice(1))ctx.fillRect(Math.round(row.outputStart/st.outputDuration()*width),0,1,height);
 }
 const drawWaveform=async()=>{
  const st=state(),blob=st?.original();if(!blob)return;
  const max=profile==='high'?700:130;
  if(blob.size>max*1024*1024){st.message('Audio analysis exceeds '+max+' MB in '+profile+' mode. Select High-performance to raise the limit.');return;}
  const button=ui('analyze-audio');button.disabled=true;st.message('Decoding local source audio; the waveform will follow the edited sequence…');
  let context;
  try{
   const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Audio)throw new Error('Web Audio is unavailable');
   context=new Audio();const decoded=await context.decodeAudioData(await blob.arrayBuffer());
   if(!decoded.numberOfChannels)throw new Error('No audio channels found');
   waveformDuration=decoded.duration;
   waveformPeaks=globalThis.MangoSequenceMedia.audioPeaks(decoded.getChannelData(0),
    profile==='high'?16000:6500);
   redrawWaveform();st.message('A1 waveform projected onto '+st.segments().length+' retained video clips.');
  }catch(error){waveformPeaks=null;redrawWaveform();
   st.message('Waveform unavailable: the source may have no audio, or this browser cannot decode the container ('+error.message+').');}
  finally{if(context)void context.close().catch(()=>{});button.disabled=false;}
 };

 const state=()=>globalThis.MangoClipView;
 function playhead(){const st=state();if(!st)return;
   const d=st.outputDuration();const video=st.video();
   const point=st.sequencePosition?.()??st.outputAt(video.currentTime);
   ui('timeline-playhead').style.left=(d>0&&point!==null?Math.min(100,Math.max(0,point/d*100)):0)+'%';
   ui('current-time').textContent=format(point===null?video.currentTime:point,true);
   const slider=ui('timeline-playhead');slider.setAttribute?.('aria-valuemin','0');
   slider.setAttribute?.('aria-valuemax',String(Math.max(0,d)));
   slider.setAttribute?.('aria-valuenow',String(Math.max(0,point??0)));
   slider.setAttribute?.('aria-valuetext',format(point??0));
 }
 function render(){const st=state();if(!st)return;
  const duration=st.outputDuration(),zoom=Number(ui('timeline-zoom').value)||1;
  ui('timeline-inner').style.width=(100*zoom)+'%';ui('timeline-mode').textContent=zoom===1?'Fit sequence':zoom.toFixed(1)+'× horizontal zoom';
  const ruler=ui('timeline-ruler');ruler.replaceChildren();
  if(duration>0){const count=Math.min(18,Math.max(4,Math.round(10*zoom)),Math.max(1,Math.ceil(duration/.01)));
   for(let i=0;i<=count;i++){
    const tick=document.createElement('span');tick.className='ruler-tick';tick.style.left=(i/count*100)+'%';tick.textContent=format(i/count*duration,duration/count<1);ruler.appendChild(tick);
   }
  }
  const layer=ui('marker-layer'),list=ui('marker-list');layer.replaceChildren();list.replaceChildren();
  if(!markers.length)list.textContent='No markers';
  for(const marker of markers){if(marker.time>duration)continue;
   const glyph=document.createElement('span');glyph.className='marker-glyph';glyph.style.left=(marker.time/duration*100)+'%';glyph.title=marker.label;layer.appendChild(glyph);
   const button=document.createElement('button');button.textContent=marker.label+' · '+format(marker.time);
   button.title='Jump to marker';button.onclick=()=>st.seekOutput(marker.time);list.appendChild(button);
  }
  const current=st.range?.();const box=ui('timeline-range');
  if(box){const show=current?.active&&current.end-current.start>=.04&&duration>0;
   box.classList.toggle('is-active',!!show);
   if(show){box.style.left=(current.start/duration*100)+'%';box.style.width=(Math.max(0,current.end-current.start)/duration*100)+'%';}}
  reflowThumbnails();redrawWaveform();playhead();
 }
 function addMarker(){const st=state();if(!st?.duration()||st.exporting())return;
  const t=st.outputAt(st.video().currentTime);if(t===null)return;const label='Marker '+(markers.length+1);
  const next=[...markers,{time:t,label}].sort((a,b)=>a.time-b.time);
  if(st.commitMarkers)st.commitMarkers(next,label+' added at '+format(t));
  else{markers=next;render();st.message(label+' added at '+format(t));}
 }
 function split(){const st=state();if(!st?.duration()||st.exporting())return;
  const at=st.outputAt(st.video().currentTime),segments=st.segments();
  if(at===null){st.message('Move the playhead into a retained clip.');return;}
  const next=MangoEditOps.split(segments,at);
  if(next.length===segments.length){st.message('Move the playhead inside a clip to split it.');return;}
  st.commit(next,'Razor cut at '+format(at)+' (non-destructive).');
 }
 // Sequence-time seeking remains accurate through Razor and ripple edits.
 function timeAt(clientX){const st=state();if(!st?.outputDuration())return 0;const rect=ui('timeline-inner').getBoundingClientRect();return Math.max(0,Math.min(st.outputDuration(),(clientX-rect.left)/Math.max(1,rect.width)*st.outputDuration()));}
 function seekAt(clientX){const st=state();if(!st?.outputDuration()||st.exporting())return;
  const rect=ui('timeline-inner').getBoundingClientRect();
  const fraction=Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width)));
  st.video().pause?.();st.seekOutput(fraction*st.outputDuration());playhead();
 }
 function keepPlayheadVisible(){const scroll=ui('timeline-scroll'),inner=ui('timeline-inner'),st=state();
  if(!scroll||!inner||!st?.outputDuration())return;
  const mapped=st.outputAt(st.video().currentTime);if(mapped===null)return;
  const width=inner.getBoundingClientRect().width,point=width*mapped/st.outputDuration();
  const visible=scroll.clientWidth||scroll.getBoundingClientRect().width;
  if(point<scroll.scrollLeft+22)scroll.scrollLeft=Math.max(0,point-visible*.2);
  else if(point>scroll.scrollLeft+visible-22)scroll.scrollLeft=Math.max(0,point-visible*.8);
 }
 function startScrub(event){const st=state();if(!st?.outputDuration()||st.exporting())return;
  if(event.button!==undefined&&event.button!==0)return;
  event.preventDefault?.();
  draggingRange=event.currentTarget===ui('timeline-ruler')&&(event.shiftKey||tool==='range');
  draggingPlayhead=!draggingRange;
  try{event.currentTarget?.setPointerCapture?.(event.pointerId);}catch{}
  if(draggingRange){rangeAnchor=timeAt(event.clientX);st.setRange?.(rangeAnchor,rangeAnchor);}
  else{seekAt(event.clientX);keepPlayheadVisible();}
 }
 function moveScrub(event){if(!draggingPlayhead&&!draggingRange)return;
  event.preventDefault?.();
  if(draggingRange){const t=timeAt(event.clientX);state()?.setRange?.(Math.min(t,rangeAnchor),Math.max(t,rangeAnchor));return;}const scroll=ui('timeline-scroll');
  const box=scroll.getBoundingClientRect();
  // Near either edge, pan an enlarged timeline while dragging the playhead.
  if(event.clientX>box.right-28)scroll.scrollLeft+=Math.min(35,(event.clientX-box.right+28)*1.8);
  else if(event.clientX<box.left+28)scroll.scrollLeft-=Math.min(35,(box.left+28-event.clientX)*1.8);
  seekAt(event.clientX);keepPlayheadVisible();
 }
 function endScrub(event){if(!draggingPlayhead&&!draggingRange)return;draggingPlayhead=false;draggingRange=false;
  try{event.currentTarget?.releasePointerCapture?.(event.pointerId);}catch{}
 }
 function wheelScrub(event){const st=state();if(!st?.outputDuration()||st.exporting())return;
  event.preventDefault?.();
  const delta=(event.deltaY||event.deltaX||0)*(event.deltaMode===1?16:event.deltaMode===2?250:1);
  const current=st.outputAt(st.video().currentTime)??0;
  const step=st.outputDuration()/180; // one ordinary wheel notch ≈ 1/180 of the sequence
  const next=Math.max(0,Math.min(st.outputDuration()-.005,current+Math.sign(delta)*Math.min(3,Math.abs(delta)/100)*step));
  st.video().pause?.();st.seekOutput(next);playhead();keepPlayheadVisible();
 }

 async function generateFrames(automatic=false){
  const st=state(),source=st?.url();if(!source||!st.duration())return;
  const myGeneration=++generation,button=ui('make-thumbnails');
  generated=true;sourceUrl=source;activeGeneration=myGeneration;
  button.disabled=true;button.textContent='Generating…';reflowThumbnails();
  if(!automatic)st.message('Generating sequence-aligned preview frames locally…');
  const plan=globalThis.MangoSequenceMedia.thumbnailPlan(st.segments(),thumbCount(st.outputDuration()));
  let thumbVideo;
  const wait=(el,event,ms=10000)=>new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{clean();reject(new Error('Media '+event+' timed out'));},ms);
   function clean(){clearTimeout(timer);el.removeEventListener(event,done);el.removeEventListener('error',fail);}
   function done(){clean();resolve();}function fail(){clean();reject(el.error||new Error('Media decode failed'));}
   el.addEventListener(event,done,{once:true});el.addEventListener('error',fail,{once:true});
  });
  try{
   thumbVideo=document.createElement('video');thumbVideo.preload='auto';thumbVideo.muted=true;thumbVideo.playsInline=true;
   thumbVideo.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;pointer-events:none;opacity:0';document.body.appendChild(thumbVideo);
   const metadata=wait(thumbVideo,'loadedmetadata');thumbVideo.src=source;thumbVideo.load();await metadata;
   if(globalThis.MangoMediaDurationV0739)await globalThis.MangoMediaDurationV0739.resolve(thumbVideo,st.duration(),()=>generation===myGeneration&&st.url()===source);else if(thumbVideo.readyState<2)await wait(thumbVideo,'loadeddata');
   const width=150,height=Math.max(50,Math.round(width*(thumbVideo.videoHeight||9)/(thumbVideo.videoWidth||16)));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{alpha:false});
   for(let i=0;i<plan.length;i++){
    if(generation!==myGeneration||st.url()!==source)return;
    const sourceTime=Math.max(0,Math.min(st.duration()-.005,plan[i].source));
    const existing=thumbnailCache.find(c=>Math.abs(c.source-sourceTime)<.06);
    if(existing)continue;
    if(Math.abs(thumbVideo.currentTime-sourceTime)>.018){const done=wait(thumbVideo,'seeked');thumbVideo.currentTime=sourceTime;await done;}
    if(generation!==myGeneration||st.url()!==source)return;
    if(thumbVideo.readyState<2)await wait(thumbVideo,'loadeddata');if(thumbVideo.seeking||Math.abs(thumbVideo.currentTime-sourceTime)>.15)throw Error('Thumbnail frame not synchronized');
    ctx.drawImage(thumbVideo,0,0,width,height);
    let url;if(canvas.toBlob&&globalThis.URL?.createObjectURL){
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.72));
     if(blob)url=URL.createObjectURL(blob);
    }
    if(!url)url=canvas.toDataURL('image/jpeg',.72);
    if(generation!==myGeneration||st.url()!==source){if(url.startsWith('blob:'))URL.revokeObjectURL(url);return;}
    thumbnailCache.push({source:sourceTime,url});thumbnailUrls.push(url);button.textContent='Thumbnails '+(i+1)+'/'+plan.length;
    if(thumbnailCache.length>200){const stale=thumbnailCache.shift();
     if(stale.url.startsWith('blob:'))URL.revokeObjectURL(stale.url);thumbnailUrls=thumbnailUrls.filter(url=>url!==stale.url);}
    if(i%4===0)reflowThumbnails();
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(generation===myGeneration){reflowThumbnails();
    if(!automatic)st.message('Sequence-synchronized thumbnails ready. Cuts remain aligned after edits.');}
  }catch(error){if(generation===myGeneration)st.message('Thumbnail analysis unavailable: '+error.message);}
  finally{thumbVideo?.pause?.();thumbVideo?.removeAttribute?.('src');thumbVideo?.load?.();thumbVideo?.remove?.();if(activeGeneration===myGeneration){activeGeneration=0;button.textContent='Generate thumbnails';st.updateControls?.();}}
 }
 function scheduleRegeneration(){
  if(!generated)return;
  clearTimeout(renderTimer);renderTimer=setTimeout(()=>{const st=state();
   if(st?.url()&&st.outputDuration()&&!st.exporting())void generateFrames(true);
  },550);
 }

 function setTool(name){
  if(!['select','razor','range'].includes(name))return false;
  tool=name;
  const ids={select:'tool-select',razor:'tool-razor',range:'range-tool'};
  const titles={select:'SELECT',razor:'RAZOR',range:'RANGE'};
  const hints={select:'Move / trim clips',razor:'Click V1 to split',range:'Drag timeline range'};
  for(const [kind,id] of Object.entries(ids)){
   const active=kind===name,legacy=ui(id);
   if(legacy){
    legacy.setAttribute('aria-pressed',String(active));
    legacy.classList?.toggle?.('is-active',active);
   }
   for(const button of document.querySelectorAll?.('[data-v06-tool="'+id+'"]')||[]){
    button.setAttribute('aria-pressed',String(active));
    button.classList?.toggle?.('is-active',active);
   }
  }
  const timeline=ui('timeline');if(timeline)timeline.dataset.tool=name;
  if(document.body?.dataset)document.body.dataset.clipTool=name;
  const indicator=ui('v0615-active-tool');
  if(indicator){
   indicator.dataset.tool=name;
   const strong=indicator.querySelector?.('strong');if(strong)strong.textContent=titles[name];
   const small=indicator.querySelector?.('small');if(small)small.textContent=hints[name];
  }
  state()?.message(name==='razor'?'Razor selected · click V1 to split.':
   name==='range'?'Range tool · drag along ruler, then Ripple Delete.':'Selection tool enabled.');
  return true;
 }
 function razorOnTimeline(event){if(tool!=='razor')return;
   if(event.target?.classList?.contains('trim-grip'))return;
   const st=state();if(!st?.outputDuration()||st.exporting())return;
   const rect=ui('timeline').getBoundingClientRect();const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));
   const at=x*st.outputDuration(),next=MangoEditOps.split(st.segments(),at);
   event.preventDefault();event.stopPropagation();
   if(next.length!==st.segments().length)st.commit(next,'Razor cut at '+format(at));
   else st.message('Choose a point inside a clip to cut.');
 }
 function rippleSelection(){const st=state();if(!st?.outputDuration()||st.exporting())return;
  if(st.deleteSelection){st.deleteSelection();return;}
  // Compatibility for mocked / older editors only.
  const a=Number(ui('in').value),b=Number(ui('out').value);
  if(b-a<.04)return st.message('Select a video clip or In/Out range first.');
  st.rippleDelete?.(a,b);
 }
 ui('timeline').addEventListener('pointerdown',razorOnTimeline,true);
 ui('tool-select').addEventListener('click',()=>setTool('select'));
 ui('tool-razor').addEventListener('click',()=>setTool('razor'));
 ui('range-tool').addEventListener('click',()=>setTool(tool==='range'?'select':'range'));
 ui('ripple-delete').addEventListener('click',rippleSelection);
 for(const id of ['timeline-ruler','timeline-playhead']){
  const target=ui(id);target.addEventListener('pointerdown',startScrub);
  target.addEventListener('pointermove',moveScrub);
  target.addEventListener('pointerup',endScrub);
  target.addEventListener('pointercancel',endScrub);
  target.addEventListener('lostpointercapture',endScrub);
 }
 ui('timeline-ruler').addEventListener('wheel',wheelScrub,{passive:false});
 ui('timeline-playhead').addEventListener('wheel',wheelScrub,{passive:false});
 ui('timeline-playhead').addEventListener('keydown',event=>{
  const st=state();if(!st?.outputDuration())return;
  const t=st.outputAt(st.video().currentTime)??0;
  let next=null;
  if(event.key==='ArrowRight')next=t+(event.shiftKey?1:1/30);
  else if(event.key==='ArrowLeft')next=t-(event.shiftKey?1:1/30);
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=st.outputDuration()-.005;
  if(next===null)return;event.preventDefault();st.video().pause?.();
  st.seekOutput(Math.max(0,Math.min(st.outputDuration()-.005,next)));playhead();keepPlayheadVisible();
 });
 ui('timeline-zoom').addEventListener('input',render);
 ui('add-marker').addEventListener('click',addMarker);
 ui('split').addEventListener('click',split);
 ui('make-thumbnails').addEventListener('click',()=>{void generateFrames(false);});
 ui('analyze-audio').addEventListener('click',drawWaveform);
 document.addEventListener('keydown',event=>{
  if(globalThis.MangoShortcuts?.active)return; // centralized, editable shortcuts
  const st=state();if(!st?.duration()||event.target?.matches?.('input,textarea,select,[contenteditable],[role="slider"]')||st.exporting())return;
  if(event.ctrlKey&&!event.altKey&&event.shiftKey&&event.key.toLowerCase()==='z'){event.preventDefault();ui('redo').click();return;}
  if(event.ctrlKey&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='z'){event.preventDefault();ui('undo').click();return;}
  if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='y'){event.preventDefault();ui('redo').click();return;}
  if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='k'){event.preventDefault();split();return;}
  if(event.altKey&&!event.ctrlKey&&event.key==='Backspace'){rippleSelection();event.preventDefault();return;}
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='v'){setTool('select');event.preventDefault();}
  else if(key==='r'){setTool('range');event.preventDefault();}
  else if(key==='delete'||key==='backspace'){if(st.deleteSelected)st.deleteSelected();else rippleSelection();event.preventDefault();}
  else if(key==='c'){setTool('razor');event.preventDefault();}
  else if(key==='i'){ui('mark-in').click();event.preventDefault();}
  else if(key==='o'){ui('mark-out').click();event.preventDefault();}
  else if(key==='m'){addMarker();event.preventDefault();}
  else if(key==='k'){st.video().pause();event.preventDefault();}
  else if(key==='l'){void st.video().play();event.preventDefault();}
  else if(key==='j'){st.video().pause();st.seekOutput(Math.max(0,(st.outputAt(st.video().currentTime)||0)-2));event.preventDefault();}
  else if(event.altKey&&key==='backspace'){rippleSelection();event.preventDefault();}
 });
 globalThis.MangoClipTimeline={render,isGenerating:()=>!!activeGeneration,markers:()=>markers.map(m=>({...m})),loadMarkers(items){markers=items.map(m=>({...m}));render();},onSequenceChange(){const signature=JSON.stringify(state()?.segments()||[]);if(signature===sequenceSignature)return;sequenceSignature=signature;++generation;reflowThumbnails();redrawWaveform();scheduleRegeneration();},setProfile(next){profile=next==='high'?'high':'balanced';reflowThumbnails();scheduleRegeneration();},reset(){tool='select';setTool('select');generation++;activeGeneration=0;ui('make-thumbnails').textContent='Generate thumbnails';markers=[];draggingPlayhead=false;draggingRange=false;generated=false;waveformPeaks=null;waveformDuration=0;sourceUrl=null;sequenceSignature=JSON.stringify(state()?.segments()||[]);clearTimeout(renderTimer);thumbnailCache=[];
  for(const url of thumbnailUrls)if(url.startsWith('blob:'))try{URL.revokeObjectURL(url);}catch{}thumbnailUrls=[];ui('thumbnail-strip').replaceChildren();const hint=document.createElement('span');hint.className='frame-thumb-label';hint.textContent='Generate thumbnails to inspect source frames';ui('thumbnail-strip').appendChild(hint);const wave=ui('audio-waveform');wave?.getContext?.('2d')?.clearRect(0,0,wave.width,wave.height);render();},playhead};
})();
