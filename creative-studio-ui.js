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
  const total=Math.max(.01,view()?.outputDuration?.()||0);
  for(const e of currentZoom()){
   const row=document.createElement('div');row.className='v061-zoom-row';row.dataset.zoomId=e.id;row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label','Edit camera keyframe at '+e.start.toFixed(2)+' seconds');
   const label=document.createElement('span');label.textContent=e.start.toFixed(2)+'s · '+Math.round(e.scale*100)+'% · focus '+Math.round(e.x*100)+'% / '+Math.round(e.y*100)+'%';
   const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
   remove.disabled=!!view()?.exporting?.();remove.addEventListener('click',()=>view().removeZoomKeyframe(e.id));
   row.append(label,remove);list?.append(row);
   const pin=document.createElement('span');pin.className='v061-zoom-marker';pin.style.left=Math.min(100,100*e.start/total)+'%';pin.title=label.textContent;track?.append(pin);
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
   const clip=await controller.stop();notify('Narration recorded. Download the A2 source audio before closing Clip Studio.');
  }catch(e){notify(e.message);}finally{renderVoice();}}
 el('v061-voice-start')?.addEventListener('click',()=>{void record();});
 el('v061-voice-stop')?.addEventListener('click',()=>{void stop();});
 el('v061-voice-remove')?.addEventListener('click',()=>{controller.dispose();renderVoice();notify('Voiceover removed.');});
 el('v061-voice-download')?.addEventListener('click',()=>{const clip=controller.state().clip;if(!clip)return;
  const a=document.createElement('a');a.href=clip.url;a.download='MangoShot-Voiceover-'+Date.now()+'.'+(clip.mime.includes('ogg')?'ogg':clip.mime.includes('mp4')?'m4a':'webm');
  document.body.append(a);a.click();a.remove();});
 function renderVoice(){const s=controller.state(),c=s.clip;
  for(const [id,off] of [['v061-voice-start',s.recording||!view()?.original?.()||!!view()?.exporting?.()],['v061-voice-stop',!s.recording],['v061-voice-download',!c||s.recording],['v061-voice-remove',!c||s.recording]]){
   const b=el(id);if(b)b.disabled=!!off;
  }
  const note=el('v061-voice-status');if(note)note.textContent=s.recording?'● Recording microphone…':c?('A2 voiceover · '+c.start.toFixed(2)+'s–'+(c.start+c.duration).toFixed(2)+'s · download to preserve'):'No narration yet.';
  view()?.updateControls?.();
  const track=el('v061-voice-track');track?.replaceChildren();
  if(track&&c){const chip=document.createElement('span'),length=view()?.outputDuration?.()||1;
   chip.className='v061-voice-chip';chip.style.left=100*c.start/length+'%';chip.style.width=100*Math.min(c.duration,Math.max(0,length-c.start))/length+'%';chip.textContent='♫ A2 Voiceover';track.append(chip);}
 }
 function onPosition(t){controller.sync(t,!!view()?.isPlaying?.());}
 function onPlayback(playing){controller.sync(view()?.sequencePosition?.()||0,playing);}
 root.MangoCreativeUI={renderZoom,renderVoice,onPosition,onPlayback,voice:controller,hasVoice:()=>controller.hasClip(),attachExport:(ctx,dest)=>controller.attachExport(ctx,dest)};
 renderZoom();renderVoice();
})(typeof globalThis!=='undefined'?globalThis:this);
