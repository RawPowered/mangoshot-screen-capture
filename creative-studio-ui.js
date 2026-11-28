/* v0.6.1 professional File→Export, camera animation and post-record A2 voiceover. */
(function(root){'use strict';
 const el=id=>document.getElementById(id),view=()=>root.MangoClipView;
 const notify=t=>{if(el('status'))el('status').textContent=t;};
 const controller=root.MangoVoiceover.create({onChange:()=>renderVoice()});
 const dialog=el('v061-export-dialog'),finalize=[...document.querySelectorAll('.clip-properties .inspector-section')].find(n=>n.querySelector('h3')?.textContent==='Finalize');
 if(dialog&&finalize){finalize.querySelector('h3').textContent='Export recording';dialog.querySelector('.v061-export-content').append(finalize);}
 el('v061-export-menu')?.addEventListener('click',()=>{if(!view()?.original?.())return notify('Import a video before exporting.');
   dialog?.showModal?dialog.showModal():dialog?.setAttribute('open','');});
 el('v061-close-export')?.addEventListener('click',()=>{dialog?.close?dialog.close():dialog?.removeAttribute('open');});
 dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog?.close?.();});
 const currentZoom=()=>view()?.zoomFrames?.()||[];
 function renderZoom(){const list=el('v061-zoom-events'),track=el('v061-zoom-track');list?.replaceChildren();track?.replaceChildren();
  const v=view(),total=Math.max(.01,v?.outputDuration?.()||0);
  const select=e=>{if(v?.exporting?.())return;v.seekOutput(Math.min(e.start,Math.max(0,total-.001)));root.MangoWorkspaceV062?.activate?.('camera');root.MangoZoomStudioV0738?.openAt?.(e.id);};
  for(const e of currentZoom()){
   const row=document.createElement('div');row.className='v061-zoom-row';row.dataset.zoomId=e.id;
   const label=document.createElement('button');label.type='button';label.className='ms58-camera-select';label.textContent=e.start.toFixed(2)+'s · '+Math.round(e.scale*100)+'% · '+(e.boundary?'Cut pose':e.duration.toFixed(2)+'s move')+' · X '+Math.round(e.x*100)+' / Y '+Math.round(e.y*100);
   label.title='Edit selected camera event';label.addEventListener('click',()=>select(e));
   const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.disabled=!!v?.exporting?.();remove.addEventListener('click',()=>v.removeZoomKeyframe(e.id));
   row.append(label,remove);list?.append(row);
   if(track){const pin=document.createElement('button');pin.type='button';pin.className='v061-zoom-marker ms58-camera-marker';pin.dataset.cameraId=e.id;pin.dataset.motionId='camera-'+e.id;pin.dataset.boundary=String(!!e.boundary);pin.style.left=Math.min(100,100*e.start/total)+'%';pin.style.width=Math.max(.001,100*e.duration/total)+'%';pin.title=label.textContent+' · Click to edit, drag to retime, arrows nudge';pin.setAttribute('aria-label',pin.title);pin.disabled=!!v?.exporting?.();track.append(pin);
    const G=root.MangoTimelineMotionGestureV0758;if(G)G.bind(pin,{view:v,lane:track,initial:e.start,total,limits:()=>[0,Math.max(0,total-Math.max(.001,e.duration))],commit:(t,stamp)=>v.commitCameraTiming(e.id,t,stamp),activate:()=>select(e)});else pin.addEventListener('click',()=>select(e));
   }
  }
  if(list&&!currentZoom().length)list.textContent='No camera animations yet.';
  root.MangoZoomHUD?.refresh?.();
 }
 function addZoom(scale,x,y){const st=view();if(!st?.original?.()||st.exporting())return notify('Import a video first.');
  try{st.addZoomKeyframe(st.sequencePosition?.()||0,scale,x,y,Number(el('v061-zoom-duration').value));}
  catch(e){notify(e.message);}
 }
 el('v061-zoom-add')?.addEventListener('click',()=>addZoom(Number(el('v061-zoom-scale').value),Number(el('v061-zoom-x').value)/100,Number(el('v061-zoom-y').value)/100));
 el('v061-zoom-reset')?.addEventListener('click',()=>addZoom(1,.5,.5));
 let wasMuted=null;
 async function record(){const v=view();if(!v?.original?.()||v.exporting())return notify('Import a video before recording voiceover.');
  try{const at=v.sequencePosition?.()||0;if(at>=v.outputDuration()-.1)throw Error('Move the playhead before the end of the video.');
   if(v.isPlaying?.())el('program-play').click();
   await controller.begin(at);wasMuted=v.video().muted;if(el('v061-voice-mute').checked)v.video().muted=true;
   el('program-play').click();renderVoice();notify('Recording voiceover on A2. Press Stop when finished.');
  }catch(e){notify('Microphone unavailable: '+e.message);renderVoice();}
 }
 async function stop(){try{if(wasMuted!==null&&view()?.video?.()){view().video().muted=wasMuted;wasMuted=null;}
   if(view()?.isPlaying?.())el('program-play').click();
   const clip=await controller.stop();notify('Narration recorded. Save Project to preserve narration, or download its audio.');
  }catch(e){notify(e.message);}finally{renderVoice();}}
 el('v061-voice-start')?.addEventListener('click',()=>{void record();});
 el('v061-voice-stop')?.addEventListener('click',()=>{void stop();});
 el('v061-voice-remove')?.addEventListener('click',()=>{if(view()?.exporting?.()||controller.state().recording)return;controller.dispose();renderVoice();notify('Voiceover removed.');});
 el('v061-voice-download')?.addEventListener('click',()=>{const clip=controller.state().clip;if(!clip)return;
  const a=document.createElement('a');a.href=clip.url;a.download='MangoShot-Voiceover-'+Date.now()+'.'+(clip.mime.includes('ogg')?'ogg':clip.mime.includes('mp4')?'m4a':'webm');
  document.body.append(a);a.click();a.remove();});
 function renderVoice(){const s=controller.state(),c=s.clip;
  for(const [id,off] of [['v061-voice-start',s.recording||!view()?.original?.()||!!view()?.exporting?.()],['v061-voice-stop',!s.recording],['v061-voice-download',!c||s.recording],['v061-voice-remove',!c||s.recording||!!view()?.exporting?.()]]){
   const b=el(id);if(b)b.disabled=!!off;
  }
  const note=el('v061-voice-status');if(note)note.textContent=s.recording?'● Recording microphone…':c?('A2 voiceover · '+c.start.toFixed(2)+'s–'+(c.start+c.duration).toFixed(2)+'s · Save Project to preserve'):'No narration yet.';
  view()?.updateControls?.();
  const track=el('v061-voice-track');track?.replaceChildren();
  if(track&&c){const chip=document.createElement('button'),length=view()?.outputDuration?.()||1;chip.type='button';chip.title='Open narration properties';chip.setAttribute('aria-label','Open narration properties at '+c.start.toFixed(2)+' seconds');chip.addEventListener('click',()=>{if(view()?.exporting?.())return;view()?.seekOutput?.(c.start);root.MangoWorkspaceV062?.showContext?.('voice');});
   chip.className='v061-voice-chip';chip.style.left=100*c.start/length+'%';chip.style.width=100*Math.min(c.duration,Math.max(0,length-c.start))/length+'%';chip.textContent='♫ A2 Voiceover';track.append(chip);}
 }
 function onPosition(t){controller.sync(t,!!view()?.isPlaying?.());}
 function onPlayback(playing){controller.sync(view()?.sequencePosition?.()||0,playing);}
 root.MangoCreativeUI={renderZoom,renderVoice,onPosition,onPlayback,voice:controller,hasVoice:()=>controller.hasClip(),attachExport:(ctx,dest)=>controller.attachExport(ctx,dest)};
 renderZoom();renderVoice();
})(typeof globalThis!=='undefined'?globalThis:this);
