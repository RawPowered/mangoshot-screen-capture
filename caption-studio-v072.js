/* MangoShot v0.7.2: native CC1 track editing and accessible caption controls.
 * No server, model download, transcription or credential access. */
(function(root){'use strict';
 if(typeof document==='undefined'||!root.MangoCaptionsV072)return;
 const doc=document,core=root.MangoCaptionsV072,el=id=>doc.getElementById(id),view=()=>root.MangoClipView;
 if(!el('caption-studio-panel')||!el('cc-track-cues'))return;
 let selected=null;
 const message=text=>{el('cc-status').textContent=text;};
 const fmt=seconds=>{const sec=Math.max(0,Number(seconds)||0);
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(Math.floor(sec%60)).padStart(2,'0')+'.'+String(Math.round(sec%1*100)).padStart(2,'0');};
 function current(){return view()?.captions?.().find(c=>c.id===selected)||null;}
 function select(id,seek=true){
  selected=id;refresh();
  const cue=current();if(cue&&seek)view()?.seekOutput?.(cue.start);
  el('cc-text')?.focus?.();
 }
 function refresh(){
  const v=view(),loaded=!!v?.original?.(),all=loaded?v.captions():[],total=v?.outputDuration?.()||0;
  const list=el('cc-list'),track=el('cc-track-cues');
  list.replaceChildren();track.replaceChildren();
  if(!all.some(c=>c.id===selected))selected=null;
  const active=current(),style=loaded?v.captionStyle():core.style(),burn=loaded?v.burnCaptions():true;
  el('cc-add').disabled=!loaded||v.exporting();
  for(const id of ['cc-export-srt','cc-export-vtt'])el(id).disabled=!all.length||v?.exporting();
  el('cc-burn').checked=burn;el('cc-burn').disabled=!loaded||v.exporting();
  el('cc-style').value=style.preset||'classic';
  el('cc-font').value=style.font||'sans';el('cc-size').value=style.size||44;
  el('cc-position').value=style.position||88;el('cc-color').value=style.color||'#ffffff';
  el('cc-outline').value=style.outline||'#050505';
  for(const id of ['cc-style','cc-font','cc-size','cc-position','cc-color','cc-outline'])
   el(id).disabled=!loaded||v.exporting();
  el('cc-current').textContent=active?'Selected '+fmt(active.start)+'–'+fmt(active.end):
   (all.length?'Select a caption to edit it.':'No CC1 cues yet. Import SRT/VTT or add at playhead.');
  for(const id of ['cc-in','cc-out','cc-text','cc-save','cc-delete'])el(id).disabled=!active||v.exporting();
  if(active){el('cc-in').value=active.start.toFixed(2);el('cc-out').value=active.end.toFixed(2);el('cc-text').value=active.text;}
  else{el('cc-in').value='';el('cc-out').value='';el('cc-text').value='';}
  if(!all.length){list.textContent='No timed captions yet.';return;}
  for(const c of all){
   const b=doc.createElement('button');b.type='button';b.className='v072-caption-row';
   b.setAttribute('aria-pressed',String(c.id===selected));
   b.textContent=fmt(c.start)+' – '+fmt(c.end)+'   '+c.text.replace(/\s+/g,' ').slice(0,80);
   b.title='Edit caption starting at '+fmt(c.start);b.onclick=()=>select(c.id);list.append(b);
   if(total>0){
    const chip=doc.createElement('button');chip.type='button';chip.className='v072-cc-chip';
    chip.style.left=(100*c.start/total)+'%';
    chip.style.width=Math.max(.5,100*(c.end-c.start)/total)+'%';
    chip.setAttribute('aria-label','Caption: '+c.text+' at '+fmt(c.start));
    chip.setAttribute('aria-pressed',String(c.id===selected));
    chip.textContent=c.text.replace(/\s+/g,' ');chip.title=c.text;
    chip.onclick=()=>select(c.id);track.append(chip);
   }
  }
 }
 const valid=()=>!!view()?.original?.()&&!view()?.exporting?.();
 el('cc-add').onclick=()=>{
  if(!valid())return;
  try{
   const v=view(),duration=v.outputDuration(),where=v.sequencePosition?.()??v.outputAt(v.video().currentTime)??0;
   const start=Math.min(Math.max(0,duration-.09),Math.max(0,where));
   const end=Math.min(duration,start+2);
   if(end-start<.04)throw new Error('Sequence is too short to hold a caption');
   const next=core.add(v.captions(),{start,end,text:'New caption'},duration);
   const ids=new Set(v.captions().map(x=>x.id));
   const added=next.find(x=>!ids.has(x.id));
   if(v.setCaptions(next,'Caption added. Change its text and timing below.')){
    selected=added?.id||null;refresh();el('cc-text').focus();el('caption-studio-panel').open=true;
   }
  }catch(error){message('Cannot add caption: '+error.message);}
 };
 el('cc-save').onclick=()=>{
  if(!valid()||!current())return;
  try{
   const v=view(),updated=core.update(v.captions(),selected,{start:Number(el('cc-in').value),
    end:Number(el('cc-out').value),text:el('cc-text').value},v.outputDuration());
   v.setCaptions(updated,'Caption text and timing updated.');refresh();
  }catch(error){message('Caption not saved: '+error.message);}
 };
 el('cc-delete').onclick=()=>{
  if(!valid()||!current())return;
  view().setCaptions(core.remove(view().captions(),selected),'Caption deleted. Ctrl+Z to restore.');
  selected=null;refresh();
 };
 el('cc-import').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file||!valid())return;
  try{
   if(file.size>1024*1024)throw new Error('Maximum subtitle file size is 1 MiB');
   const cues=core.parse(await file.text(),view().outputDuration());
   if(view().setCaptions(cues,'Imported '+cues.length+' '+(file.name.toLowerCase().endsWith('.vtt')?'WebVTT':'SRT')+' cues. Ctrl+Z restores earlier captions.')){
    selected=null;refresh();el('caption-studio-panel').open=true;
   }
  }catch(error){message('Cannot import subtitles: '+error.message);}
 });
 function download(kind){
  const v=view();if(!v?.captions?.().length)return;
  try{
   const text=core.serialize(v.captions(),kind);
   const blob=new Blob([text],{type:kind==='vtt'?'text/vtt;charset=utf-8':'text/plain;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;
   a.download='MangoShot-Captions-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+kind;
   doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   message('Saved '+kind.toUpperCase()+' subtitle sidecar. No audio or credentials uploaded.');
  }catch(error){message('Subtitle export failed: '+error.message);}
 }
 el('cc-export-srt').onclick=()=>download('srt');
 el('cc-export-vtt').onclick=()=>download('vtt');
 el('cc-burn').addEventListener('change',()=>{if(valid())view().setCaptionBurn(el('cc-burn').checked);});
 const props={font:'cc-font',size:'cc-size',position:'cc-position',color:'cc-color',outline:'cc-outline'};
 el('cc-style').addEventListener('change',()=>{
  if(!valid())return;
  try{view().setCaptionStyle(core.style({preset:el('cc-style').value,...core.presets[el('cc-style').value]}));}
  catch(error){message('Invalid style preset: '+error.message);}
 });
 for(const [prop,id] of Object.entries(props))el(id).addEventListener('change',()=>{
  if(!valid())return;
  try{
   const v=view(),value=['size','position'].includes(prop)?Number(el(id).value):el(id).value;
   v.setCaptionStyle({...v.captionStyle(),[prop]:value});
  }catch(error){message('Caption style not updated: '+error.message);}
 });
 function onPosition(time){
  for(const chip of el('cc-track-cues').children){
   const label=chip.getAttribute('aria-label'),c=view()?.captions?.().find(x=>label?.includes('Caption: '+x.text+' at '+fmt(x.start)));
   chip.classList.toggle('is-at-playhead',!!c&&time>=c.start&&time<c.end);
  }
 }
 el('caption-studio-panel').addEventListener('toggle',()=>{if(el('caption-studio-panel').open)refresh();});
 refresh();
 root.MangoCaptionUIV072={refresh,select,onPosition};
})(typeof globalThis!=='undefined'?globalThis:this);
