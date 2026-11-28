/* Cursor Director user interface and declarative command adapter. */
(function(root){'use strict';
const d=root.MangoCursorDirectorCoreV074,doc=root.document,el=id=>doc.getElementById(id),panel=el('cursor-director-v074');if(!d||!panel)return;
const ui=k=>el('cd-'+k+'-v074'),view=()=>root.MangoClipView,trace=()=>view()?.cursorTrace?.()||null,regions=()=>view()?.cursorRegions?.()||[],report=t=>ui('note').textContent=t;
const fields=['spotlight','ring','pulse','marker','radius','dim','feather','smooth','markerSize','color'];
const id=()=>root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),copy=x=>JSON.parse(JSON.stringify(x)),live=x=>root.MangoCleanMasterV0752?.isLive(x)===true;
let selected=null,proposal=null,lastStamp=null,lastTrace=null,profiles=[],lastSelectedState=null;
const key='MangoShotCursorDirectorPresetsV1';
try{const a=JSON.parse(root.localStorage.getItem(key)||'[]');if(Array.isArray(a))profiles=a.slice(0,30).map(d.presetFile);}catch{}
function readStyle(){return d.style(Object.fromEntries(fields.map(k=>{const n=ui(k);return [k,n.type==='checkbox'?n.checked:['marker','color'].includes(k)?n.value:Number(n.value)];})));}
function putStyle(s){for(const k of fields){const n=ui(k);if(n.type==='checkbox')n.checked=s[k];else n.value=s[k];}}
function page(name){for(const p of panel.querySelectorAll('[data-cd-page]'))p.hidden=p.dataset.cdPage!==name;for(const b of panel.querySelectorAll('[data-cd-tab]'))b.setAttribute('aria-pressed',String(b.dataset.cdTab===name));}
for(const b of panel.querySelectorAll('[data-cd-tab]'))b.addEventListener('click',()=>page(b.dataset.cdTab));
function commitSelectedStyle(){try{const r=regions().find(x=>x.id===selected);if(!r){report('Effect draft updated. Apply to a range or retained footage.');return;}const v=ready();if(v.isPlaying?.())throw Error('Pause playback before editing this effect.');action('effects.update',{id:r.id,style:readStyle(),enabled:ui('enabled').checked});report('Selected cursor effect committed to timeline · Ctrl+Z to undo.');}catch(e){report(e.message);const r=regions().find(x=>x.id===selected);if(r){putStyle(r.style);ui('enabled').checked=r.enabled;}}}
ui('preset').addEventListener('change',()=>{if(ui('preset').value!=='custom'){putStyle(d.preset(ui('preset').value));commitSelectedStyle();}});
for(const k of fields)ui(k).addEventListener('change',()=>{ui('preset').value='custom';commitSelectedStyle();});
ui('enabled').addEventListener('change',commitSelectedStyle);
function stamp(){const v=view();return JSON.stringify([v?.segments?.()||[],v?.zoomFrames?.()||[],regions(),v?.duration?.()||0]);}
function ready(){const v=view();if(!v?.original?.()||v.exporting()||!trace())throw Error('Load a recording with cursor path retention and finish export first');return v;}
function run(raw){
 const r=d.recipe(raw),v=ready(),list=regions();
 if(r.action==='effects.add'){const next=d.addRange(list,v.segments(),r.start,r.end,r.style,'cursor-'+id(),v.duration());v.commitCursorDirector({regions:next});report('Cursor effects added. Undo restores prior edits.');return {regions:next};}
 if(r.action==='effects.update'||r.action==='effects.remove'){if(!list.some(x=>x.id===r.id))throw Error('Region no longer exists');const next=r.action==='effects.remove'?list.filter(x=>x.id!==r.id):list.map(x=>x.id===r.id?{...x,...Object.fromEntries(Object.entries(r).filter(([k])=>['style','enabled','start','end'].includes(k)))}:x);v.commitCursorDirector({regions:next});report('Cursor region '+(r.action==='effects.remove'?'removed':'updated'));return {regions:next};}
 if(r.action==='smartZoom.propose'){const items=d.suggest(trace(),v.segments(),v.zoomFrames(),r.settings);proposal={id:id(),stamp:stamp(),trace:trace(),items};renderProposal();report(items.length+' candidate zooms. Review before applying.');return {proposalId:proposal.id,items:copy(items)};}
 if(r.action==='smartZoom.apply'){
  if(!proposal||proposal.id!==r.proposalId||proposal.stamp!==stamp()||proposal.trace!==trace())throw Error('Proposal is stale. Analyze again.');
  if(r.selected.some(x=>!proposal.items.some(i=>i.id===x)))throw Error('Unknown candidate');
  let z=v.zoomFrames();for(const i of proposal.items.filter(i=>r.selected.includes(i.id))){z=root.MangoCreativeZoom.add(z,i.start,i.scale,i.x,i.y,i.transition);z=root.MangoCreativeZoom.add(z,i.start+i.transition+i.hold,1,.5,.5,i.transition);}
  v.commitCursorDirector({zoomFrames:z});proposal=null;renderProposal();report(r.selected.length+' zoom ranges applied as one undoable edit.');return {applied:r.selected.length};
 }
}
const action=(a,fields={})=>run({schema:d.RECIPE,action:a,...fields}),safe=fn=>()=>{try{fn();}catch(e){report(e.message);}};
const btn=(label,fn)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',safe(fn));return b;};
function choose(id,at){const r=regions().find(x=>x.id===id);if(!r)return;selected=id;putStyle(r.style);ui('preset').value='custom';ui('source-start').value=r.start;ui('source-end').value=r.end;ui('enabled').checked=r.enabled;page('effects');root.MangoWorkspaceV062?.activate?.('cursor');if(Number.isFinite(at))view().seekOutput(at);lastStamp=null;refresh();}
function renderProposal(){const host=ui('proposals');host.replaceChildren();if(proposal)for(const i of proposal.items){const row=doc.createElement('div');row.className='cd-row-v074';const label=doc.createElement('label'),check=doc.createElement('input');check.type='checkbox';check.checked=true;check.dataset.proposal=i.id;label.append(check,doc.createTextNode(i.start.toFixed(2)+'s · '+i.reason+' · '+i.scale+'×'));row.append(label,btn('Seek',()=>view().seekOutput(i.start)));host.append(row);}ui('apply').disabled=!proposal?.items.length||!!view()?.exporting?.();}
function refresh(){
 const v=view(),t=trace(),list=regions(),loaded=!!v?.original?.(),busy=!!v?.exporting?.();ui('source').textContent=t?t.samples.filter(s=>s[1]!==null).length+' frame samples · '+(t.clicks?.length||0)+' clicks'+(t.truncated||t.capture?.truncated?' · TRUNCATED':'')+(t.baked?' · recorded pixels contain baked changes':''):'No cursor path';
 for(const k of ['add','use-range','propose','update','remove','run'])ui(k).disabled=!loaded||!t||busy;
 const rebuild=el('restore-live-v0752');if(rebuild)rebuild.disabled=!loaded||busy||t?.baked||t?.capture?.master!=='clean'||list.some(r=>live(r.id))&&!!v?.zoomFrames?.().length;
 const tracked=el('cd-tracked-v0755');if(tracked)tracked.disabled=!loaded||busy||!t?.samples.some(s=>s[1]!==null)||list.some(r=>!live(r.id));
 if(proposal&&(proposal.stamp!==stamp()||proposal.trace!==t)){proposal=null;renderProposal();}
 ui('apply').disabled=busy||!proposal?.items.length;if(!list.some(x=>x.id===selected))selected=null;ui('edit').hidden=!selected;
 const current=list.find(x=>x.id===selected),selectedStamp=current?JSON.stringify(current):null;if(selectedStamp!==lastSelectedState){lastSelectedState=selectedStamp;if(current){putStyle(current.style);ui('source-start').value=current.start;ui('source-end').value=current.end;ui('enabled').checked=current.enabled;}}const draft=el('cd-new-draft-v0755');if(draft)draft.disabled=busy||!loaded;
 const sig=JSON.stringify([v?.segments?.()||[],list,selected,busy,loaded]);if(sig===lastStamp&&t===lastTrace)return;lastStamp=sig;lastTrace=t;
 const host=ui('regions'),track=ui('track'),liveTrack=el('live-fx-track-v0752');host.replaceChildren();track.replaceChildren();liveTrack?.replaceChildren();const parts=v?.segments?.()||[],length=v?.outputDuration?.()||0,projected=d.project(parts,list);
 for(const r of list){const row=doc.createElement('div');row.className='cd-row-v074';const p=projected.find(x=>x.id===r.id);const b=btn((live(r.id)?'Live · ':'Post · ')+(r.enabled?'':'Disabled · ')+r.start.toFixed(2)+'–'+r.end.toFixed(2)+'s source'+(!p?' · not retained':''),()=>choose(r.id,p?.start));b.setAttribute('aria-pressed',String(r.id===selected));row.append(b);host.append(row);}
 if(!list.length)host.textContent='No cursor effects on timeline.';
 if(length>0)for(const p of projected){const lane=live(p.id)&&liveTrack?liveTrack:track,r=list.find(x=>x.id===p.id),b=doc.createElement('button');b.type='button';b.textContent=live(p.id)?'Live FX':'Post FX';b.dataset.motionId='cursor-'+p.id+'-'+p.start.toFixed(6);b.style.left=100*p.start/length+'%';b.style.width=100*(p.end-p.start)/length+'%';b.dataset.disabled=String(!p.enabled);b.setAttribute('aria-pressed',String(p.id===selected));const sections=root.MangoSequenceMedia.sections(parts),section=sections.find(x=>p.start>=x.outputStart-.000001&&p.end<=x.outputEnd+.000001),whole=!!section&&Math.abs((p.end-p.start)-(r.end-r.start))<.00001&&projected.filter(x=>x.id===p.id).length===1;b.title='Cursor effect '+p.start.toFixed(2)+'–'+p.end.toFixed(2)+'s'+(whole?' · Drag within retained source; arrows nudge':' · Click to edit source range (cross-cut region)');b.setAttribute('aria-label',b.title);lane.append(b);const G=root.MangoTimelineMotionGestureV0758;if(G&&whole)G.bind(b,{view:v,lane,initial:p.start,total:length,limits:()=>[section.outputStart,section.outputEnd-(p.end-p.start)],commit:(t,stamp)=>v.commitCursorTiming(r.id,r.start+t-p.start,r.end+t-p.start,stamp),activate:()=>choose(p.id,p.start)});else b.addEventListener('click',()=>choose(p.id,p.start));}track.hidden=!list.some(r=>!live(r.id));if(liveTrack)liveTrack.hidden=!list.some(r=>live(r.id));
}
el('cd-new-draft-v0755')?.addEventListener('click',()=>{selected=null;lastSelectedState=null;lastStamp=null;refresh();report('New effect draft. Choose settings, then apply to the desired range.');});
el('restore-live-v0752')?.addEventListener('click',safe(()=>{const v=ready();report(v.restoreCapturedLive());}));
ui('use-range').addEventListener('click',safe(()=>{ui('start').value=el('in').value;ui('end').value=el('out').value;}));
ui('add').addEventListener('click',safe(()=>action('effects.add',{start:Number(ui('start').value),end:Number(ui('end').value),style:readStyle()})));
el('cd-tracked-v0755')?.addEventListener('click',safe(()=>{const v=ready(),t=trace(),s=readStyle();if(regions().some(r=>!live(r.id)))throw Error('Edit or remove existing Post FX regions first.');if(!t.samples.some(p=>p[1]!==null))throw Error('No retained cursor movement.');const next=d.addRange(regions(),v.segments(),0,v.outputDuration(),s,'cursor-'+id(),v.duration());v.commitCursorDirector({regions:next});report('Applied current style to all retained footage; effects appear only where movement is recorded.');}));
ui('update').addEventListener('click',safe(()=>action('effects.update',{id:selected,start:Number(ui('source-start').value),end:Number(ui('source-end').value),style:readStyle(),enabled:ui('enabled').checked})));
ui('remove').addEventListener('click',safe(()=>action('effects.remove',{id:selected})));
ui('propose').addEventListener('click',safe(()=>action('smartZoom.propose',{settings:{mode:ui('smart-mode').value,scale:Number(ui('smart-scale').value),transition:Number(ui('smart-transition').value),hold:Number(ui('smart-hold').value)}})));
ui('apply').addEventListener('click',safe(()=>action('smartZoom.apply',{proposalId:proposal?.id,selected:[...ui('proposals').querySelectorAll('input:checked')].map(n=>n.dataset.proposal)})));
function persist(next){root.localStorage.setItem(key,JSON.stringify(next));profiles=next;renderProfiles();}
function savePreset(p){const next=[...profiles.filter(x=>x.name!==p.name),p];if(next.length>30)throw Error('Save up to 30 presets');persist(next);}
function renderProfiles(){const host=ui('presets');host.replaceChildren();for(const p of profiles){const row=doc.createElement('div');row.className='cd-row-v074';row.append(btn(p.name,()=>{putStyle(p.style);ui('preset').value='custom';page('effects');report('Loaded '+p.name);}),btn('Export',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='MangoShot-cursor-preset.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}),btn('Delete',()=>persist(profiles.filter(x=>x.name!==p.name))));host.append(row);}}
ui('save-preset').addEventListener('click',safe(()=>{savePreset(d.presetFile({schema:d.PRESET,name:ui('preset-name').value,style:readStyle()}));report('Preset saved locally.');}));
ui('import-preset').addEventListener('click',()=>ui('preset-file').click());
ui('preset-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>4096)throw Error('Preset exceeds 4 KB');savePreset(d.presetFile(JSON.parse(await file.text())));report('Preset imported.');}catch(err){report(err.message);}});
ui('run').addEventListener('click',safe(()=>{if(ui('recipe').value.length>8192)throw Error('Recipe exceeds 8 KB');ui('result').value=JSON.stringify(run(JSON.parse(ui('recipe').value)),null,2);}));
ui('recipe').value=JSON.stringify({schema:d.RECIPE,action:'smartZoom.propose',settings:{mode:'auto',scale:1.75,transition:.4,hold:1.2}},null,2);
const title=doc.querySelector('.clip-timeline-panel > .panel-heading span');if(title)title.textContent='TIMELINE · G3 / G2 / V1+A1 / CAM / CUR PATH / LIVE HISTORY / LIVE FX / POST FX / A2';
putStyle(d.preset('spotlight'));renderProfiles();refresh();
root.MangoCursorDirectorV074=Object.freeze({run,refresh,inspect:()=>({regions:regions(),proposal:proposal?{id:proposal.id,items:copy(proposal.items)}:null})});
})(typeof globalThis!=='undefined'?globalThis:this);
