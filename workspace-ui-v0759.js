/* Shared workspace navigation. Presentation only: existing controllers own edits, capture and permissions. */
(function(root){'use strict';
 const labels={capture:'Capture',cursor:'Cursor FX',tracking:'Tracking',ink:'Ink'};
 function nextTab(keys,current,key){if(!Array.isArray(keys)||!keys.length)return null;const i=Math.max(0,keys.indexOf(current));if(key==='Home')return keys[0];if(key==='End')return keys.at(-1);const delta=['ArrowRight','ArrowDown'].includes(key)?1:['ArrowLeft','ArrowUp'].includes(key)?-1:0;return delta?keys[(i+delta+keys.length)%keys.length]:null;}
 function captureSummary({phase='',surface='',mode='preview',native='idle',clean=false,retain=false}={}){
  const active=['recording','paused'].includes(phase),source=({browser:'Browser tab',window:'Application window',monitor:'Entire screen'})[surface]||'No source';
  let tracking='Not recording';
  if(active){if(phase==='paused')tracking='Tracking paused';else if(mode==='native'&&native==='active')tracking='Authorized monitor';else if(mode==='native'&&['pausing','paused','resuming'].includes(native))tracking='Native transition';else if(mode==='linked')tracking='Authorized linked tab';else if(native==='ready'||native==='connecting'||native==='starting')tracking='Native setup · awaiting approval';else tracking='Preview pointer only';}
  return {source:active?source:'No source',tracking,master:clean?'Clean master':'Composite',retention:clean||retain?'Retain path':'Path retention off',canConnect:phase==='recording'&&(surface==='browser'||surface==='monitor')&&mode==='preview'};
 }
 const api={nextTab,captureSummary};
 if(typeof module==='object'&&module.exports)module.exports=api;
 const d=root.document;if(!d?.body)return;const body=d.body,by=id=>d.getElementById(id),q=s=>d.querySelector(s),mk=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const text=(n,v)=>{if(n&&n.textContent!==v)n.textContent=v;},attr=(n,k,v)=>{if(n&&n.getAttribute(k)!==String(v))n.setAttribute(k,String(v));};
 function button(label,title,fn){const b=mk('button','ms59-action',label);b.type='button';b.title=title;b.addEventListener('click',fn);return b;}
 function invoke(id){const n=by(id);if(!n||n.disabled){text(by('status'),'This action is unavailable in the current state.');return false;}n.click();return true;}
 function section(name,bodyClass='ms59-section'){const n=mk('section',bodyClass);n.append(mk('h3','ms59-section-title',name));return n;}
 function disclosure(label,...nodes){const n=mk('details','ms59-disclosure');n.append(mk('summary','',label),...nodes.filter(Boolean));return n;}
 function makeTabs(host,entries,defaultKey){const nav=mk('nav','ms59-tabs'),panels={},buttons={};nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Recording properties');let current=defaultKey;
  const content=mk('div','ms59-tab-body');
  function activate(key,focus=false){if(!panels[key])return false;const changed=current!==key;current=key;for(const k of Object.keys(panels)){const on=k===key;panels[k].hidden=!on;attr(buttons[k],'aria-selected',on);attr(buttons[k],'aria-pressed',on);buttons[k].tabIndex=on?0:-1;}if(changed)content.scrollTop=0;if(focus)buttons[key].focus();return true;}
  for(const [key,title] of entries){const b=button(title,'Open '+title+' properties',()=>activate(key));b.id='ms59-record-tab-'+key;b.setAttribute('role','tab');const p=mk('section','ms59-record-page');p.id='ms59-record-page-'+key;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);b.setAttribute('aria-controls',p.id);buttons[key]=b;panels[key]=p;nav.append(b);content.append(p);}
  nav.addEventListener('keydown',e=>{const key=nextTab(Object.keys(panels),current,e.key);if(!key)return;e.preventDefault();e.stopPropagation();activate(key,true);});host.append(nav,content);activate(defaultKey);
  return {activate,panels,current:()=>current,nav,content};
 }
 if(body.classList.contains('studio-recorder')){
  const host=q('.studio-record-workspace>.studio-inspector'),H=root.MangoRecorderCursorHostV073,C=root.MangoRecorderCursorV073;if(!host||!H||!C)return;
  const capture=[...host.children].find(n=>n.querySelector('#mic')),ink=[...host.children].find(n=>n.querySelector('#color')),interaction=[...host.children].find(n=>n.querySelector('#enable-scroll')),keyboard=[...host.children].find(n=>n.querySelector('.shortcut-grid')),cursor=by('cursor-studio-v073'),tracking=by('cursor-tracking-v0710');
  if(!capture||!ink||!interaction||!keyboard||!cursor||!tracking)return;
  const tabs=makeTabs(host,Object.entries(labels),'capture');
  const state=mk('div','ms59-rec-summary'),sourceLine=mk('strong'),trackLine=mk('span'),masterLine=mk('span');state.append(sourceLine,trackLine,masterLine);tabs.nav.before(state);
  tabs.panels.capture.append(capture,disclosure('Keyboard reference',keyboard));tabs.panels.cursor.append(cursor);cursor.open=true;
  const trackingHead=section('Authorized pointer tracking'),tip=mk('p','ms59-hint','Connect only to the tab or monitor you selected for capture. Tracking the preview is not tracking the original application.');trackingHead.append(tip);tabs.panels.tracking.append(trackingHead,tracking,interaction);tracking.open=true;
  const actualStatus=by('cursor-status-v073');if(actualStatus)trackingHead.append(actualStatus);
  const inkNote=mk('p','ms59-hint');tabs.panels.ink.append(inkNote,ink);
  const statusLink=button('Tracking…','Review actual cursor source and permissions',()=>tabs.activate('tracking',true));statusLink.id='ms59-rec-tracking';state.append(statusLink);
  const goCursor=button('Cursor effects','Open live spotlight, ring and camera settings',()=>tabs.activate('cursor',true));goCursor.id='ms59-rec-cursor';const goTracking=button('Tracking / permissions','Open matching-source consent controls',()=>tabs.activate('tracking',true));capture.append(goCursor,goTracking);
  const monitorTools=q('.monitor-tools');if(monitorTools){const b=button('Cursor settings','Open live cursor properties',()=>tabs.activate('cursor',true));b.id='ms59-monitor-cursor';monitorTools.append(b);}
  const captureInfo=mk('p','ms59-hint');capture.append(captureInfo);
  let lastSession=null;
  function refresh(){
   const s=H.automationCapture(),cs=C.state(),phase=s.phase,clean=H.active()||phase==='paused'?H.cleanMaster():!!by('clean-master-v0752')?.checked;
   const v=captureSummary({phase,surface:H.surface(),mode:cs.mode,native:root.MangoNativeCursorV0753?.phase?.(),clean,retain:cs.retain});
   text(sourceLine,v.source);text(trackLine,v.tracking);text(masterLine,v.master+' · '+v.retention);
   attr(state,'data-tracking',v.tracking==='Authorized monitor'||v.tracking==='Authorized linked tab'?'authorized':phase==='paused'?'paused':'other');
   text(inkNote,clean?'Clean master: ink is unavailable during this recording. Add editable graphics in Clip Studio instead.':'Composite capture: ink is rendered into the recording. Ctrl+E clears temporary ink only.');
   text(captureInfo,['recording','paused'].includes(phase)?'Capture settings are locked until this session ends. Live cursor effects remain adjustable.':phase==='selecting'?'Confirm the source in the browser picker.':'Choose capture audio and the master type before recording.');
   if(phase==='recording'&&s.identity!==lastSession){lastSession=s.identity;if(v.canConnect)tabs.activate('tracking');}
  }
  let queued=false;const schedule=()=>{if(queued)return;queued=true;root.requestAnimationFrame(()=>{queued=false;refresh();});};
  if(root.MutationObserver){const obs=new root.MutationObserver(schedule);for(const id of ['record-state','source-surface','cursor-status-v073','native-status-v0753','cursor-state-v0710']){const n=by(id);if(n)obs.observe(n,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['data-state','data-kind','data-active']});}}
  for(const name of ['click','change','input'])d.addEventListener(name,schedule,true);
  body.classList.add('ms59-workspace');root.MangoWorkspaceUIV0759=Object.freeze({...api,refresh,activate:tabs.activate,current:tabs.current});refresh();return;
 }
 if(!body.classList.contains('studio-clip'))return;
 const V=root.MangoClipView,W=root.MangoWorkspaceV062,P=root.MangoProfessionalUIV070,properties=q('.clip-properties'),transport=q('.studio-transport'),toolbar=q('.v062-property-tabs');if(!V||!W||!properties||!transport||!toolbar)return;
 const selected=mk('div','ms59-selection'),selectedTitle=mk('strong'),selectedNote=mk('span');selected.append(selectedTitle,selectedNote);toolbar.after(selected);
 const quick=mk('div','ms59-quick-actions');
 const project=button('Projects','Open or save editable v2 projects',()=>invoke('v062-project-menu'));
 const exp=button('Export','Open export and render options',()=>invoke('v061-export-menu'));exp.classList.add('primary');
 const showProps=button('Properties','Show or hide contextual inspector',()=>{if(!P?.layout)return;P.setLayout({properties:!P.layout().properties});refresh();});
 showProps.setAttribute('aria-controls','ms59-properties');properties.id='ms59-properties';
 quick.append(project,exp,showProps);const actions=q('.studio-transport .transport-actions');if(actions)actions.after(quick);else transport.prepend(quick);
 const close=button('Hide','Hide Properties (use Properties to reopen)',()=>{P?.setLayout({properties:false});refresh();});close.classList.add('ms59-hide-props');properties.querySelector('.panel-heading')?.append(close);
 const editPage=by('v068-clip-panel-edit')||by('v062-clip-panel'),thumb=by('make-thumbnails'),wave=by('analyze-audio'),profile=by('performance-profile')?.closest('label');
 if(editPage&&thumb&&wave){const analysis=section('Source analysis');const buttons=mk('div','ms59-analysis-buttons');buttons.append(thumb,wave);analysis.append(buttons,mk('p','ms59-hint','Frame thumbnails and waveform are generated locally. Regenerate after an unavailable or failed analysis.'));editPage.append(analysis);}
 const renderMode=by('render-mode');if(profile&&renderMode){profile.classList.add('ms59-profile');renderMode.before(profile);}
 const clipAction=by('play-edited');if(clipAction)clipAction.classList.add('ms59-alias-hidden');
 // Keep commands addressable by the existing keyboard/automation dispatchers.
 const extraMenu=[...d.querySelectorAll('.v06-menu')].find(m=>m.querySelector('summary')?.textContent.trim()==='View')?.querySelector('.v06-menu-pop');
 if(extraMenu)extraMenu.append(button('Performance / export profile…','Open the export profile controls',()=>invoke('v061-export-menu')));
 const source=by('source-format');const projectSection=by('v06-project-title')?.closest('section');if(projectSection){const b=by('v06-restore-project');if(b)b.textContent='Restore editable timeline';}
 // The old quick tools stay as delegated command targets, not duplicate visual controls.
 for(const id of ['quick-text','quick-callout','autocut-toggle','range-tool'])by(id)?.classList.add('ms59-alias-hidden');
 const layerMenu=by('compositor-key-menu-v0714');if(layerMenu)layerMenu.title='Open selected graphic motion properties';
 const graphicAction=by('ux44-edit-selected-keys');if(graphicAction)graphicAction.title='Open selected graphic transform keyframes';
 function refresh(){
  const loaded=V.outputDuration()>0,l=V.layers().find(x=>x.id===V.selectedLayer()),range=V.range?.(),index=V.selectedClip?.(),voice=!!root.MangoCreativeUI?.voice?.state?.().recording;
  const busy=V.exporting()||V.multitrackBusy?.()||V.isPlaying()||voice,mode=W.current?.()||'clip';
  let title=loaded?'Sequence':'No media selected',note=loaded?'Select a clip, graphic or track event.':'Import a video or open the latest recording.';
  if(mode==='graphics'){title=l?l.name:'Graphics · no selection';note=l?(l.locked?'Locked graphic':l.kind==='shape'?'Shape overlay':'Title / callout')+' · G'+l.track+' · '+l.start.toFixed(2)+'–'+l.end.toFixed(2)+'s':'Add a title, callout or shape, or select a graphic on the timeline.';}
  else if(mode==='camera'){title='Camera · '+V.zoomFrames().length+' events';note='Click a CAM event to edit; use Camera Studio for precise framing.';}
  else if(mode==='cursor'){const t=V.cursorTrace?.();title='Cursor · '+V.cursorRegions().length+' effect regions';note=!t?'No recorded pointer data attached.':t.baked?'Original contains baked effects. Post effects remain editable.':'Source path and editable effects are separate.';}
  else if(mode==='voice'){title='Audio / narration';note=voice?'Microphone recording · use Stop in Audio properties.':'A2 narration and secondary audio are managed separately.';}
  else if(mode==='autocut'){title='AutoCut · review before applying';note='Analyze pauses or still frames; original footage is unchanged.';}
  else if(range?.active){title='Selected range';note=range.start.toFixed(2)+'–'+range.end.toFixed(2)+'s';}else if(Number.isInteger(index)){title='Clip '+(index+1);note='Edit retained range or select Transitions.';}
  if(busy)note=(V.exporting()?'Exporting':V.multitrackBusy?.()?'Preparing media':voice?'Recording narration':'Playback active')+' · '+note;
  text(selectedTitle,title);text(selectedNote,note);attr(selected,'data-busy',busy);
  project.disabled=!!V.exporting()||!!V.multitrackBusy?.();exp.disabled=!loaded||!!V.multitrackBusy?.()||voice;showProps.disabled=!P;attr(showProps,'aria-pressed',P?.layout?.().properties!==false);attr(showProps,'aria-expanded',P?.layout?.().properties!==false);close.disabled=!P;
  // These controls share their existing handler/model; their presentation follows the actual busy state.
  const lock=!!l?.locked||busy||!loaded;for(const id of ['graphic-front','graphic-back','graphic-delete','graphic-duplicate']){const b=by(id);if(b)b.disabled=!l||busy||(id!=='graphic-duplicate'&&lock);}
  for(const id of ['add-text','add-callout']){const b=by(id);if(b)b.disabled=!loaded||busy;}
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;root.requestAnimationFrame(()=>{queued=false;refresh();});};
 for(const name of ['click','change','input','pointerup'])d.addEventListener(name,schedule,true);
 if(root.MutationObserver){const obs=new root.MutationObserver(schedule);obs.observe(body,{attributes:true,attributeFilter:['class']});obs.observe(toolbar,{subtree:true,attributes:true,attributeFilter:['aria-selected']});}
 body.classList.add('ms59-workspace');root.MangoWorkspaceUIV0759=Object.freeze({...api,refresh,show:W.showContext});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
