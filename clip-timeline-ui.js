/* Local, non-destructive editing affordances. Media is NEVER modified by these controls. */
(() => {
 const ui=id=>document.getElementById(id);
 const format=seconds=>{const sec=Math.max(0,seconds||0),mins=Math.floor(sec/60);
   return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')+':'+String(Math.floor(sec%60)).padStart(2,'0');};
 let markers=[],generation=0,tool='select';
 const drawWaveform=async()=>{const st=state(),blob=st?.original?.();if(!blob)return;
  if(blob.size>130*1024*1024){st.message('Audio analysis is limited to files under 130 MB.');return;}
  const button=ui('analyze-audio');button.disabled=true;st.message('Decoding audio locally for waveform…');
  let context;try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw new Error('Web Audio is unavailable');
   context=new Audio();const audio=await context.decodeAudioData(await blob.arrayBuffer());
   if(!audio.numberOfChannels)throw new Error('No audio channels found');
   const canvas=ui('audio-waveform'),ctx=canvas.getContext('2d'),channel=audio.getChannelData(0),width=canvas.width,height=canvas.height;
   ctx.clearRect(0,0,width,height);ctx.fillStyle='#79bca0';const group=Math.max(1,Math.floor(channel.length/width));
   for(let x=0;x<width;x++){let max=0;for(let k=x*group;k<Math.min(channel.length,(x+1)*group);k+=Math.max(1,Math.floor(group/28)))max=Math.max(max,Math.abs(channel[k]));
    const bar=Math.max(1,max*height*.9);ctx.fillRect(x,(height-bar)/2,1,bar);}
   st.message('Audio waveform generated locally.');
  }catch(error){st.message('Waveform unavailable for this source/browser: '+error.message);}
  finally{if(context)void context.close().catch(()=>{});button.disabled=false;}
 };

 const state=()=>globalThis.MangoClipView;
 function playhead(){const st=state();if(!st)return;
   const d=st.outputDuration();const video=st.video();
   const point=st.outputAt(video.currentTime);
   ui('timeline-playhead').style.left=(d>0&&point!==null?Math.min(100,Math.max(0,point/d*100)):0)+'%';
   ui('current-time').textContent=format(video.currentTime);
 }
 function render(){const st=state();if(!st)return;
  const duration=st.outputDuration(),zoom=Number(ui('timeline-zoom').value)||1;
  ui('timeline-inner').style.width=(100*zoom)+'%';ui('timeline-mode').textContent=zoom===1?'Fit sequence':zoom.toFixed(1)+'× horizontal zoom';
  const ruler=ui('timeline-ruler');ruler.replaceChildren();
  if(duration>0){const count=Math.min(18,Math.max(4,Math.round(10*zoom)));
   for(let i=0;i<=count;i++){
    const tick=document.createElement('span');tick.className='ruler-tick';tick.style.left=(i/count*100)+'%';tick.textContent=format(i/count*duration);ruler.appendChild(tick);
   }
  }
  const layer=ui('marker-layer'),list=ui('marker-list');layer.replaceChildren();list.replaceChildren();
  if(!markers.length)list.textContent='No markers';
  for(const marker of markers){if(marker.time>duration)continue;
   const glyph=document.createElement('span');glyph.className='marker-glyph';glyph.style.left=(marker.time/duration*100)+'%';glyph.title=marker.label;layer.appendChild(glyph);
   const button=document.createElement('button');button.textContent=marker.label+' · '+format(marker.time);
   button.title='Jump to marker';button.onclick=()=>st.seekOutput(marker.time);list.appendChild(button);
  }
  playhead();
 }
 function addMarker(){const st=state();if(!st?.duration()||st.exporting())return;
  const t=st.outputAt(st.video().currentTime);if(t===null)return;const label='Marker '+(markers.length+1);
  markers.push({time:t,label});markers.sort((a,b)=>a.time-b.time);
  render();st.message(label+' added at '+format(t));
 }
 function split(){const st=state();if(!st?.duration()||st.exporting())return;
  const at=st.outputAt(st.video().currentTime),segments=st.segments();
  if(at===null){st.message('Move the playhead into a retained clip.');return;}
  const next=MangoEditOps.split(segments,at);
  if(next.length===segments.length){st.message('Move the playhead inside a clip to split it.');return;}
  st.commit(next,'Razor cut at '+format(at)+' (non-destructive).');
 }
 function seekFromRuler(event){const st=state();if(!st?.duration())return;
  const rect=ui('timeline-ruler').getBoundingClientRect();const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));
  st.seekOutput(x*st.outputDuration());playhead();
 }
 async function generateFrames(){const st=state(),source=st?.url();if(!source||!st.duration())return;
   const generationId=++generation;const button=ui('make-thumbnails');button.disabled=true;st.message('Generating local preview frames…');
   const frames=ui('thumbnail-strip');frames.replaceChildren();let thumbVideo;
   try{
    thumbVideo=document.createElement('video');thumbVideo.preload='auto';thumbVideo.muted=true;thumbVideo.playsInline=true;
    thumbVideo.src=source;
    const waitEvent=(event,ms=7000)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{clear();reject(new Error('Media '+event+' timed out'));},ms);
      function clear(){clearTimeout(timer);thumbVideo.removeEventListener(event,done);thumbVideo.removeEventListener('error',fail);}
      function done(){clear();resolve();}function fail(){clear();reject(thumbVideo.error||new Error('Media decoding failed'));}
      thumbVideo.addEventListener(event,done,{once:true});thumbVideo.addEventListener('error',fail,{once:true});
    });
    const meta=waitEvent('loadedmetadata');await meta;
    if(thumbVideo.readyState<2)await waitEvent('loadeddata');
    const width=150,height=Math.round(width*(thumbVideo.videoHeight||9)/(thumbVideo.videoWidth||16));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.max(50,height);
    const ctx=canvas.getContext('2d',{alpha:false});const n=Math.min(12,Math.max(5,Math.ceil(st.duration()/20)));
    for(let i=0;i<n;i++){
      if(generation!==generationId)return;
      const target=Math.min(Math.max(0,st.duration()-.08),((i+.35)/n)*st.duration());
      if(Math.abs(thumbVideo.currentTime-target)>.02){const seeked=waitEvent('seeked');thumbVideo.currentTime=target;await seeked;}
      ctx.drawImage(thumbVideo,0,0,canvas.width,canvas.height);
      const node=document.createElement('span');node.className='frame-thumb';node.style.backgroundImage='url('+canvas.toDataURL('image/jpeg',.64)+')';
      node.title=format(target);frames.appendChild(node);
      if(i%2===1)await new Promise(resolve=>setTimeout(resolve,0));
    }
    st.message('Generated '+n+' local thumbnails.');
   }catch(error){st.message('Thumbnails unavailable: '+error.message);}
   finally{if(thumbVideo){thumbVideo.pause();thumbVideo.removeAttribute('src');thumbVideo.load();}button.disabled=false;}
 }
 function setTool(name){tool=name;for(const id of ['tool-select','tool-razor']){
   const el=ui(id);if(!el)continue;el.setAttribute('aria-pressed',String(id==='tool-'+name));
 }ui('timeline').dataset.tool=name;state()?.message(name==='razor'?'Razor selected · click the video track to split.':'Selection tool enabled.');
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
   const a=Number(ui('in').value),b=Number(ui('out').value);
   if(b<=a||b-a<.04)return st.message('Set In and Out markers for the gap to close.');
   if(b-a>=st.outputDuration()-.04)return st.message('Cannot ripple-delete the entire sequence.');
   if(!st.rippleDelete(a,b))return;const delta=b-a;markers=markers.flatMap(m=>m.time<a?[m]:m.time>=b?[{...m,time:m.time-delta}]:[]);render();
 }
 ui('timeline').addEventListener('pointerdown',razorOnTimeline,true);
 ui('tool-select').addEventListener('click',()=>setTool('select'));
 ui('tool-razor').addEventListener('click',()=>setTool('razor'));
 ui('ripple-delete').addEventListener('click',rippleSelection);
 ui('timeline-ruler').addEventListener('pointerdown',seekFromRuler);
 ui('timeline-zoom').addEventListener('input',render);
 ui('add-marker').addEventListener('click',addMarker);
 ui('split').addEventListener('click',split);
 ui('make-thumbnails').addEventListener('click',generateFrames);
 ui('analyze-audio').addEventListener('click',drawWaveform);
 document.addEventListener('keydown',event=>{
  const st=state();if(!st?.duration()||event.target?.matches?.('input,textarea,select,[contenteditable]')||st.exporting())return;
  if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='z'){event.preventDefault();ui('undo').click();return;}
  if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='k'){event.preventDefault();split();return;}
  if(event.altKey&&!event.ctrlKey&&event.key==='Backspace'){rippleSelection();event.preventDefault();return;}
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  const key=event.key.toLowerCase();
  if(key==='v'){setTool('select');event.preventDefault();}
  else if(key==='c'){setTool('razor');event.preventDefault();}
  else if(key==='i'){ui('mark-in').click();event.preventDefault();}
  else if(key==='o'){ui('mark-out').click();event.preventDefault();}
  else if(key==='m'){addMarker();event.preventDefault();}
  else if(key==='k'){st.video().pause();event.preventDefault();}
  else if(key==='l'){void st.video().play();event.preventDefault();}
  else if(key==='j'){st.video().pause();st.seekOutput(Math.max(0,(st.outputAt(st.video().currentTime)||0)-2));event.preventDefault();}
  else if(event.altKey&&key==='backspace'){rippleSelection();event.preventDefault();}
 });
 globalThis.MangoClipTimeline={render,markers:()=>markers.map(m=>({...m})),loadMarkers(items){markers=items.map(m=>({...m}));render();},reset(){tool='select';setTool('select');generation++;markers=[];ui('thumbnail-strip').replaceChildren();const hint=document.createElement('span');hint.className='frame-thumb-label';hint.textContent='Generate thumbnails to inspect source frames';ui('thumbnail-strip').appendChild(hint);const wave=ui('audio-waveform');wave?.getContext?.('2d')?.clearRect(0,0,wave.width,wave.height);render();},playhead};
})();
