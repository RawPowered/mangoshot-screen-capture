/* MangoShot v0.6.2 — single media lane and focused workspace controls.
   Existing recording, editing, and render operations remain the authority. */
(function(root){
 'use strict';
 const el=id=>document.getElementById(id);
 const q=(node,selector)=>node?.querySelector(selector)||null;
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 function button(label,click,cls){const b=make('button',cls,label);b.type='button';b.addEventListener('click',click);return b;}
 function notify(text){const status=el('status');if(status)status.textContent=text;}
 const layout=document.querySelector('.clip-layout'),props=document.querySelector('.clip-properties'),bin=document.querySelector('.clip-bin'),timeline=document.querySelector('.clip-timeline-panel');
 if(!layout||!props||!bin||!timeline)return;
 document.body.classList.add('v062-workspace');
 const panels={},buttons={};
 const toolbar=make('nav','v062-property-tabs');toolbar.setAttribute('aria-label','Properties categories');
 const groups=[['clip','Clip'],['graphics','Callouts'],['camera','Camera'],['cursor','Cursor'],['voice','Voiceover'],['autocut','AutoCut']];
 for(const [key,title] of groups){
  const panel=make('section','v062-tab-panel');panel.id='v062-'+key+'-panel';
  panel.setAttribute('aria-label',title+' properties');panel.hidden=key!=='clip';
  panels[key]=panel;
  const tab=button(title,()=>activate(key),'v062-tab');
  tab.dataset.v062Tab=key;tab.setAttribute('aria-controls',panel.id);
  tab.setAttribute('aria-pressed',String(key==='clip'));
  buttons[key]=tab;toolbar.appendChild(tab);
 }
 const tabsHost=make('div','v062-properties-body');
 const existing=[...props.querySelectorAll(':scope > .inspector-section')];
 const heading=section=>q(section,'h3')?.textContent.trim().toLowerCase()||'';
 const graphicsSection=q(bin,'.inspector-section:has(#layer-list)');
 const sourceSection=q(bin,'.inspector-section:has(#source-format)');
 const markersSection=q(bin,'.inspector-section:has(#marker-list)');
 if(sourceSection)panels.clip.append(sourceSection);
 for(const section of existing){
  if(section.id==='graphic-inspector')panels.graphics.append(section);
  else if(heading(section)==='finalize')continue; // already owned by File → Export dialog
  else panels.clip.append(section);
 }
 if(markersSection)panels.clip.append(markersSection);
 if(graphicsSection)panels.graphics.prepend(graphicsSection);
 for(const [key,id] of [['camera','v061-camera-panel'],['voice','v061-voice-panel'],['autocut','autocut-panel']]){
  const section=el(id);if(!section)continue;
  section.open=true;section.classList.add('v062-property-tool');
  panels[key].append(section);
 }
 for(const id of ['cursor-clip-v073','cursor-director-v074']){const section=el(id);if(section)panels.cursor.append(section);}
 for(const [key] of groups)tabsHost.appendChild(panels[key]);
 const header=q(props,':scope > .panel-heading');header?.after(toolbar,tabsHost);
 function activate(key){
  if(!panels[key])return;
  for(const [name] of groups){const on=key===name;panels[name].hidden=!on;buttons[name].setAttribute('aria-pressed',String(on));}
 }
 for(const id of ['add-text','add-callout','quick-text','quick-callout']){
  el(id)?.addEventListener('click',()=>activate('graphics'));
 }
 el('layer-list')?.addEventListener('click',()=>activate('graphics'));
 el('autocut-toggle')?.addEventListener('click',()=>activate('autocut'));
 const railAuto=document.querySelector('[data-v06-tool="autocut-toggle"]');
 railAuto?.addEventListener('click',()=>activate('autocut'));
 const originalRefresh=()=>{};
 root.MangoWorkspaceV062={activate,properties:()=>Object.keys(panels),refresh:originalRefresh};

 // One coherent timeline clip: the thumbnail strip and A1 waveform are
 // non-interactive visual layers inside the ACTUAL V1 segment control surface.
 // Razor/selection/trim remain dispatched to the parent clip buttons.
 const clips=el('timeline'),thumbs=el('thumbnail-strip'),wave=el('audio-waveform')?.closest('.waveform-strip');
 function rejoin(){if(!clips)return;
  if(thumbs&&thumbs.parentNode!==clips)clips.appendChild(thumbs);
  if(wave&&wave.parentNode!==clips)clips.appendChild(wave);
 }
 root.MangoUnifiedV062={rejoin,refresh(){rejoin();root.MangoClipTimeline?.render?.();}};
 rejoin();
 const timelineTitle=q(timeline,':scope > .panel-heading span');
 if(timelineTitle)timelineTitle.textContent='TIMELINE · G3 / G2 / V3 / V2 / V1+A1 / CAM / A2';
 const timelineHint=q(timeline,':scope > .panel-heading .panel-muted');
 if(timelineHint)timelineHint.textContent='Drag clips or trim their edges · Alt bypasses snap · Enter opens clip controls';
 const scroll=el('timeline-scroll');scroll?.setAttribute('aria-label','Razor, select and trim directly on the combined V1 video/audio clips');

 // Rehome Project actions into File > Projects… with dedicated modal controls.
 const projectModal=make('dialog','v062-modal v062-project-modal');
 projectModal.id='v062-project-dialog';projectModal.setAttribute('aria-label','Project files and media references');
 const ph=make('header','v062-modal-head');
 ph.append(make('h2','','Project Manager'),button('✕ Close',()=>close(projectModal),'v062-close'));
 projectModal.append(ph);
 const projectBody=make('div','v062-modal-body');
 const projectSection=q(bin,'.v06-section:has(#v06-project-title)');
 if(projectSection)projectBody.append(projectSection);
 const legacy=q(bin,'.inspector-section:has(#save-project)');
 if(legacy){const details=make('details','v062-legacy-project');
  details.append(make('summary','','Compatibility · legacy v1 project JSON'),legacy);
  projectBody.append(details);}
 projectModal.append(projectBody);
 const projectFoot=make('p','v062-modal-hint','Projects save edit decisions and source references, not video files. Export and preserve source media separately.');
 projectModal.append(projectFoot);
 document.body.append(projectModal);
 const fileMenu=q(document,'.v06-menu-bar .v06-menu:first-child .v06-menu-pop');
 if(fileMenu){
  for(const old of [...fileMenu.querySelectorAll('[data-command="save-project"],[data-command="v06-save-project"],[data-command="v06-open-project"]')])old.remove();
  const action=button('Projects · Open / Save…',()=>open(projectModal),'v062-menu-command');
  action.id='v062-project-menu';fileMenu.insertBefore(action,fileMenu.querySelector('.v06-menu-separator'));
 }
 function open(dialog){if(!dialog)return;try{dialog.showModal();}catch{dialog.setAttribute('open','');}}
 function close(dialog){if(!dialog)return;try{dialog.close();}catch{dialog.removeAttribute('open');}}
 projectModal.addEventListener('click',e=>{if(e.target===projectModal)close(projectModal);});
 // The v2 Open input is visually hidden but remains reachable through its label.
 const projectLabel=el('v06-open-project')?.closest('label');
 if(projectLabel)projectLabel.classList.add('v062-project-file-label');

 // Keyboard shortcuts belong under Edit > Preferences > Keyboard Shortcuts.
 const shortcutsModal=make('dialog','v062-modal v062-shortcuts-modal');shortcutsModal.id='v062-shortcuts-dialog';
 shortcutsModal.setAttribute('aria-label','Keyboard shortcuts');
 const sh=make('header','v062-modal-head');
 sh.append(make('h2','','Keyboard Shortcuts'),button('✕ Close',()=>close(shortcutsModal),'v062-close'));
 shortcutsModal.append(sh);
 const shortcuts=timeline.querySelector('.editor-shortcuts');
 if(shortcuts){shortcuts.open=true;shortcuts.classList.add('v062-shortcuts-content');shortcutsModal.append(shortcuts);}
 document.body.append(shortcutsModal);
 const editMenu=[...document.querySelectorAll('.v06-menu-bar .v06-menu')].find(m=>q(m,'summary')?.textContent.trim()==='Edit');
 const editMenuPop=q(editMenu,'.v06-menu-pop');
 if(editMenuPop){
  const pref=make('details','v062-preferences');
  pref.append(make('summary','','Preferences ▸'));
  const submenu=make('div','v062-preferences-list');
  submenu.append(button('Keyboard Shortcuts',()=>{editMenu.open=false;pref.open=false;open(shortcutsModal);},'v062-menu-command'));
  pref.append(submenu);editMenuPop.append(pref);
 }
 shortcutsModal.addEventListener('click',e=>{if(e.target===shortcutsModal)close(shortcutsModal);});
 // Escape closes only the top dialog by native browser behavior.

 // Compact asset-only dock below the timeline; no project controls or callouts.
 const binHeading=q(bin,':scope > .panel-heading');
 if(binHeading)binHeading.innerHTML='MEDIA BIN <span class="panel-muted">LOCAL IMPORTS · SESSION ASSETS</span>';
 bin.classList.add('v062-media-dock');
 layout.append(bin);
 const mediaMenu=[...document.querySelectorAll('.v06-menu-bar .v06-menu')].find(m=>q(m,'summary')?.textContent.trim()==='Layer');
 const mediaPop=q(mediaMenu,'.v06-menu-pop');
 mediaPop?.append(button('Show Media Bin',()=>{
   root.MangoMediaDock?.show?.(); // pinned dock; never scroll the editor document
   el('v06-media-input')?.focus?.();
   if(mediaMenu)mediaMenu.open=false;
 },'v062-menu-command'));
 if(thumbs)thumbs.setAttribute('aria-hidden','true');
 if(wave)wave.setAttribute('aria-hidden','true');
 notify('Clip Studio v0.6.2 workspace ready: one V1/A1 lane, docked Media Bin, tabbed Properties.');
})(typeof globalThis!=='undefined'?globalThis:this);
