/* MangoShot v0.6.17 — shared shortcut manager and command search.
 * Clip Studio legacy v0.6.5 bindings migrate without altering their values.
 * Image Studio has its own local, non-cloud shortcut profile.
 */
(function(root){'use strict';
 const core=root.MangoShortcutCoreV0617;
 if(!core)return;
 const image=document.body?.classList?.contains?.('studio-image')===true;
 const studio=image?'image':'clip';
 const defs=core.definitions[studio],byId=Object.fromEntries(defs.map(d=>[d.id,d]));
 const storageKey='MangoShot.Shortcuts.'+(image?'Image':'Clip')+'.v2';
 const element=id=>document.getElementById(id);
 const modal=element(image?'image-shortcuts-dialog':'v062-shortcuts-dialog');
 const palette=element('studio-command-palette');
 const defaults=core.defaults(studio);
 const legacy=studio==='clip'?root.MangoShortcuts:null;
 let keys={...defaults},capturing=null,query='',category='All',paletteQuery='',selectedPalette=0;
 const groups=['All',...new Set(defs.map(d=>d.group))];
 function load(){
  let source=null;
  try{
   const saved=JSON.parse(root.localStorage?.getItem(storageKey)||'null');
   if(saved&&saved.version===2&&saved.studio===studio)source=saved.bindings;
   else if(studio==='clip')source=legacy?.keys?.()||null;
  }catch{}
  const checked=source?core.check(source,studio):null;
  keys=checked?.ok?checked.keys:{...defaults};
 }
 function persist(){
  try{root.localStorage?.setItem(storageKey,JSON.stringify({
   format:'MangoShot.Shortcuts',version:2,studio,bindings:keys
  }));}catch{}
 }
 load();
 function banner(text){
  const feedback=element('v0617-shortcut-feedback');
  if(feedback)feedback.textContent=text||'';
 }
 function menuClose(){
  for(const details of document.querySelectorAll?.('.v06-menu[open]')||[])details.open=false;
 }
 function run(id){
  if(id==='showShortcuts'){open();return true;}
  if(id==='commandPalette'){openPalette();return true;}
  if(image)return root.MangoImageActions?.run?.(id)===true;
  const st=root.MangoClipView;
  if(id==='importMedia'){root.MangoMediaDock?.show?.();const b=element('v06-media-input');if(b){b.click();return true;}return false;}
  if(id==='mediaBin'){root.MangoMediaDock?.toggle?.();return true;}
  const view={workspaceEdit:'edit',workspaceGraphics:'graphics',workspaceTimeline:'timeline'}[id];
  if(view){const b=document.querySelector?.('[data-workspace="'+view+'"]');if(!b)return false;b.click();return true;}
  if(!st?.original?.()||st.exporting?.())return false;
  const motionAction={motionStudio:'open',motionAddKey:'addKey',motionPrevKey:'previous',motionNextKey:'next'}[id];
  if(motionAction)return root.MangoMotionStudioV0750?.[motionAction]?.()===true;
  const targets={select:'tool-select',razor:'tool-razor',range:'range-tool',split:'split',
   markIn:'mark-in',markOut:'mark-out',marker:'add-marker',trim:'trim',
   undo:'undo',redo:'redo',redoAlternate:'redo',
   addText:'add-text',addCallout:'add-callout',toggleSnap:'graphics-snap',
   playPause:'program-play',exportVideo:'v061-export-menu'};
  const target=targets[id];
  if(target){const button=element(target);if(!button||button.disabled)return false;button.click();return true;}
  if(id==='ripple'){st.deleteSelected?.();return true;}
  if(id==='rippleAlternate'){st.deleteSelection?.();return true;}
  if(id==='jogBackward'){st.video().pause();st.seekOutput(Math.max(0,(st.sequencePosition?.()||0)-2));return true;}
  if(id==='pause'){st.video().pause();return true;}
  if(id==='jogForward'){if(!st.isPlaying?.())element('program-play')?.click();return true;}
  return false;
 }
 function bind(id,combo){
  const result=core.rebind(keys,id,combo,studio);
  if(!result.ok)return result;
  keys=result.keys;persist();refresh();paint();paintPalette();
  return{ok:true,combo:keys[id]};
 }
 function isOpen(dialog){return !!dialog?.open||!!dialog?.hasAttribute?.('open');}
 function display(combo){return core.display(combo);}
 function refresh(){
  root.MangoToolIcons?.refresh?.(keys,byId);
  for(const node of document.querySelectorAll?.('[data-key-for]')||[]){
   const id=node.dataset.keyFor;
   node.textContent=display(keys[id]||'');
   node.title=byId[id]?.label||'';
  }
  for(const button of document.querySelectorAll?.('[data-studio-action]')||[]){
   const id=button.dataset.studioAction;
   if(!byId[id])continue;
   button.title=byId[id].label+(keys[id]?' · '+display(keys[id]):'');
  }
  for(const button of document.querySelectorAll?.('[data-studio-tool]')||[]){
   const id=({select:'select',pen:'pen',highlighter:'highlighter',
    'erase-brush':'brushErase','erase-stroke':'strokeErase',
    arrow:'arrow',rectangle:'rectangle',ellipse:'ellipse',line:'line',
    star:'star',text:'text','mask-erase':'maskErase','mask-restore':'maskRestore'})[button.dataset.studioTool];
   if(!id)continue;button.title=(byId[id]?.label||'')+(keys[id]?' · '+display(keys[id]):'');
  }
  for(const button of document.querySelectorAll?.('[data-v06-tool]')||[]){
   const id=({'tool-select':'select','tool-razor':'razor','range-tool':'range',
    'add-text':'addText','add-callout':'addCallout'})[button.dataset.v06Tool];
   if(id&&byId[id])button.title=byId[id].label+(keys[id]?' · '+display(keys[id]):'');
  }
  root.MangoStudioMenusV0617?.refresh?.(keys);
 }
 let list=null,search=null,categoryPicker=null;
 function create(label,tag='div',cls=''){
  const n=document.createElement(tag);n.textContent=label;if(cls)n.className=cls;return n;
 }
 function makeButton(text,callback,cls=''){
  const b=create(text,'button',cls);b.type='button';b.addEventListener('click',callback);return b;
 }
 function paint(){
  if(!list)return;
  list.replaceChildren();
  const found=defs.filter(d=>(category==='All'||d.group===category)&&
    (d.label.toLowerCase().includes(query)||d.group.toLowerCase().includes(query)||
     display(keys[d.id]).toLowerCase().includes(query)));
  let last='';
  for(const d of found){
   if(d.group!==last){
    list.append(create(d.group,'h3','v0617-shortcut-section'));last=d.group;
   }
   const row=create('','div','v0617-shortcut-row');
   const info=create('','div','v0617-shortcut-name');
   info.append(create(d.label,'strong'),create(d.group,'small'));
   const record=makeButton(capturing===d.id?'Press shortcut…':display(keys[d.id]),()=>{
    capturing=d.id;banner('Press the new key combination · Escape to cancel.');
    paint();element('v0617-key-'+d.id)?.focus?.();
   },'v0617-shortcut-record');
   record.id='v0617-key-'+d.id;record.setAttribute('aria-label','Set shortcut for '+d.label);
   record.setAttribute('aria-pressed',String(capturing===d.id));
   const clear=makeButton('×',()=>{const result=bind(d.id,'');banner(result.ok?'Shortcut cleared.':result.reason);},'v0617-shortcut-clear');
   clear.title='Unassign '+d.label;clear.setAttribute('aria-label',clear.title);
   const reset=makeButton('↺',()=>{const result=bind(d.id,d.key);banner(result.ok?'Default restored.':result.reason);},'v0617-shortcut-reset');
   reset.title='Restore default for '+d.label;reset.setAttribute('aria-label',reset.title);
   row.append(info,record,clear,reset);list.append(row);
  }
  if(!found.length)list.append(create('No matching commands. Try another search.','p','v0617-shortcut-empty'));
 }
 function makeShortcutUI(){
  if(!modal)return;
  modal.querySelector?.('.v065-shortcut-manager')?.remove?.();
  modal.querySelector?.('.editor-shortcuts')?.remove?.();
  const shell=create('','section','v0617-shortcuts-ui');shell.id='v0617-shortcuts-ui';
  const top=create('','div','v0617-shortcut-top');
  search=document.createElement('input');search.type='search';search.placeholder='Find command, tool or key';
  search.setAttribute('aria-label','Search shortcut commands');
  search.addEventListener('input',()=>{query=search.value.toLowerCase().trim();paint();});
  categoryPicker=document.createElement('select');
  categoryPicker.setAttribute('aria-label','Shortcut category');
  for(const group of groups){const opt=create(group,'option');opt.value=group;categoryPicker.append(opt);}
  categoryPicker.addEventListener('change',()=>{category=categoryPicker.value;paint();});
  top.append(search,categoryPicker);
  const hint=create('Click a shortcut to record new keys. Invalid and conflicting bindings are rejected. Settings stay in this browser only.',
   'p','v0617-shortcut-help');
  list=create('','div','v0617-shortcut-results');list.setAttribute('aria-label','Editable shortcut bindings');
  const feedback=create('','p','v0617-shortcut-feedback');feedback.id='v0617-shortcut-feedback';
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const footer=create('','div','v0617-shortcut-footer');
  const reset=makeButton('Reset all',()=>{
   if(typeof root.confirm==='function'&&!root.confirm('Restore all '+(image?'Image Studio':'Clip Studio')+' shortcuts?'))return;
   keys={...defaults};capturing=null;persist();refresh();paint();paintPalette();banner('Defaults restored.');
  });
  const exportButton=makeButton('Export JSON',()=>{
   const blob=new Blob([JSON.stringify({format:'MangoShot.Shortcuts',version:2,studio,bindings:keys},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='MangoShot-'+(image?'Image':'Clip')+'-Shortcuts.json';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),15000);
  });
  const importLabel=create('Import JSON','label','v0617-shortcut-import');
  const importer=document.createElement('input');importer.type='file';importer.accept='.json,application/json';
  importer.setAttribute('aria-label','Import MangoShot shortcut bindings');
  importer.addEventListener('change',async()=>{
   const file=importer.files?.[0];importer.value='';if(!file)return;
   try{
    if(file.size>20000)throw Error('Import must be under 20 KB.');
    const raw=JSON.parse(await file.text());
    if(raw?.version!==2||raw?.studio!==studio||raw?.format!=='MangoShot.Shortcuts')
      throw Error('Import a v2 shortcut profile for this editor.');
    const result=core.check(raw.bindings,studio,{allowMissing:false});
    if(!result.ok)throw Error(result.reason);
    keys=result.keys;persist();refresh();paint();paintPalette();banner('Shortcut profile imported.');
   }catch(error){banner('Import rejected: '+error.message);}
  });
  importLabel.append(importer);
  footer.append(reset,exportButton,importLabel);
  shell.append(top,hint,list,feedback,footer);modal.append(shell);
  modal.querySelector?.('[data-shortcuts-close]')?.addEventListener?.('click',()=>{modal.close?.();capturing=null;});
  modal.addEventListener('close',()=>{capturing=null;paint();});
  paint();
 }
 makeShortcutUI();
 function open(){
  if(!modal)return false;
  closePalette();menuClose();
  if(!isOpen(modal)){
   try{modal.showModal();}catch{modal.setAttribute('open','');}
  }
  paint();search?.focus?.();return true;
 }
 function closePalette(){
  if(!palette)return;
  try{palette.close?.();}catch{}
  palette.removeAttribute?.('open');
  const restore=focusBeforePalette;focusBeforePalette=null;
  restore?.focus?.({preventScroll:true});
 }
 let paletteSearch=null,paletteResults=null,paletteFeedback=null,foundPalette=[],focusBeforePalette=null;
 function paintPalette(){
  if(!paletteResults)return;
  foundPalette=defs.filter(d=>
   (d.label+' '+d.group+' '+d.id+' '+display(keys[d.id])).toLowerCase().includes(paletteQuery)).slice(0,65);
  if(selectedPalette>=foundPalette.length)selectedPalette=0;
  paletteResults.replaceChildren();
  for(let i=0;i<foundPalette.length;i++){
   const d=foundPalette[i];
   const b=create('','button','v0617-command-row');
   b.type='button';b.id='v0617-command-'+i;b.dataset.commandId=d.id;
   b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===selectedPalette));
   b.append(create(d.label,'strong'),create(d.group,'small'),create(display(keys[d.id]),'kbd'));
   b.addEventListener('mouseenter',()=>{selectedPalette=i;highlightPalette();});
   b.addEventListener('click',()=>runPalette(d.id));
   paletteResults.append(b);
  }
  if(!foundPalette.length)paletteResults.append(create('No matching commands.','p','v0617-shortcut-empty'));
  if(paletteFeedback)paletteFeedback.textContent=foundPalette.length+' matching command'+(foundPalette.length===1?'':'s');
  highlightPalette();
 }
 function highlightPalette(){
  let activeId='';
  for(const b of paletteResults?.querySelectorAll?.('[data-command-id]')||[]){
   const idx=foundPalette.findIndex(d=>d.id===b.dataset.commandId);
   const selected=idx===selectedPalette;
   b.setAttribute('aria-selected',String(selected));
   if(selected){activeId=b.id;b.scrollIntoView?.({block:'nearest'});}
  }
  if(paletteSearch){
   if(activeId)paletteSearch.setAttribute('aria-activedescendant',activeId);
   else paletteSearch.removeAttribute?.('aria-activedescendant');
  }
 }
 function runPalette(id){
  if(id==='commandPalette')return true;
  const ok=run(id);
  if(ok)closePalette();
  else if(paletteFeedback)paletteFeedback.textContent='Unavailable: load media or select a compatible layer, then retry.';
  return ok;
 }
 function makePaletteUI(){
  if(!palette)return;
  const shell=create('','div','v0617-command-shell');
  const heading=create('','div','v0617-command-heading');
  heading.append(create('MangoShot Commands','strong'),makeButton('✕',closePalette,'v0617-command-close'));
  paletteSearch=document.createElement('input');paletteSearch.type='search';
  paletteSearch.placeholder='Search tools, actions or keyboard shortcuts…';
  paletteSearch.setAttribute('aria-label','Search MangoShot commands');
  paletteSearch.setAttribute('role','combobox');
  paletteSearch.setAttribute('aria-autocomplete','list');
  paletteSearch.setAttribute('aria-controls','v0617-command-results');
  paletteSearch.addEventListener('input',()=>{paletteQuery=paletteSearch.value.trim().toLowerCase();selectedPalette=0;paintPalette();});
  paletteResults=create('','div','v0617-command-results');paletteResults.id='v0617-command-results';paletteResults.setAttribute('role','listbox');
  paletteResults.setAttribute('aria-label','Available commands');
  paletteFeedback=create('','p','v0617-command-feedback');paletteFeedback.setAttribute('role','status');
  const help=create('↑ ↓ Navigate · Enter Run · Esc Close · ? Shortcut settings','p','v0617-command-help');
  shell.append(heading,paletteSearch,paletteResults,paletteFeedback,help);palette.append(shell);
  palette.addEventListener('click',event=>{if(event.target===palette)closePalette();});
  paintPalette();
 }
 makePaletteUI();
 function openPalette(){
  if(!palette)return false;
  if(isOpen(modal)){try{modal.close?.();}catch{modal.removeAttribute?.('open');}}
  menuClose();focusBeforePalette=document.activeElement;paletteQuery='';selectedPalette=0;if(paletteSearch)paletteSearch.value='';
  paintPalette();
  if(!isOpen(palette)){try{palette.showModal();}catch{palette.setAttribute('open','');}}
  paletteSearch?.focus?.();return true;
 }
 // Remember actual pointer focus, not merely the presence of a focused button.
 // Keyboard Tab navigation restores native activation and remains accessible.
 const focusControl=target=>target?.closest?.('button,a,summary,[role="button"],[role="menuitem"]')||null;
 let pointerOwner=null;
 document.addEventListener('pointerdown',event=>{
  pointerOwner=event.button===0&&['mouse','pen','touch'].includes(event.pointerType)?focusControl(event.target):null;
 },true);
 document.addEventListener('focusin',event=>{if(focusControl(event.target)!==pointerOwner)pointerOwner=null;},true);
 root.addEventListener?.('blur',()=>{pointerOwner=null;});
 function dispatch(event){
  if(!event||event.defaultPrevented||event.isComposing)return;
  if(event.key==='Tab')pointerOwner=null;
  if(capturing!==null){
   event.preventDefault?.();event.stopImmediatePropagation?.();
   if(event.key==='Escape'){capturing=null;banner('Rebinding cancelled.');paint();return;}
   const combo=core.normalize(event);
   if(!combo||['Control','Shift','Alt','Meta'].includes(event.key))return;
   // Store portable Ctrl-prefixed primary shortcuts when recording Command
   // on macOS, leaving the keymap reusable on Windows/Linux.
   const portable=core.platformName()==='mac'&&combo.startsWith('Meta+')
    ?'Ctrl+'+combo.slice(5):combo;
   const result=bind(capturing,portable);
   if(result.ok){banner('Assigned '+core.display(result.combo));capturing=null;}
   else banner(result.reason);
   paint();return;
  }
  if(isOpen(palette)){
   if(event.key==='Escape'){event.preventDefault?.();closePalette();return;}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault?.();
    if(foundPalette.length)selectedPalette=(selectedPalette+(event.key==='ArrowDown'?1:-1)+foundPalette.length)%foundPalette.length;
    highlightPalette();return;
   }
   if(event.key==='Enter'){event.preventDefault?.();const found=foundPalette[selectedPalette];if(found)runPalette(found.id);return;}
   return;
  }
  if(isOpen(modal))return;
  if(event.target?.closest?.('dialog[open],.v06-menu-pop'))return;
  if(core.eventEditable(event))return;
  // Layer rows may retain focus after canvas selection; preserve native
  // button activation with Space/Enter and route other tools as commands.
  const selected=image&&root.MangoImageActions?.state?.().layerSelected===true;
  const pointerOwned=!!pointerOwner&&focusControl(event.target)===pointerOwner;
  if(!core.focusedControlAllows(event,{image,selectedLayer:selected,pointerOwned}))return;
  const id=core.resolve(keys,event);
  if(!id)return;
  if(event.repeat&&!['jogBackward','jogForward','pause','brushSmaller','brushLarger'].includes(id)){
   if(!image&&pointerOwned){event.preventDefault?.();event.stopImmediatePropagation?.();}
   return;
  }
  if(run(id)){event.preventDefault?.();event.stopImmediatePropagation?.();}
 }
 document.addEventListener('keydown',dispatch,true);
 root.addEventListener?.('storage',event=>{
  if(event.key!==storageKey)return;
  try{
   const saved=JSON.parse(event.newValue||'null');
   const result=core.check(saved?.bindings,studio,{allowMissing:true});
   keys=result.ok?result.keys:{...defaults};
  }catch{keys={...defaults};}
  refresh();paint();paintPalette();
 });
 const api={active:true,version:17,studio,definitions:defs,defaults,keys:()=>({...keys}),
  normalize:core.normalize,validate:candidate=>core.check(candidate,studio).keys||{...defaults},
  bind,dispatch,open,openPalette,refresh,act:run,display:core.display,closePalette};
 root.MangoShortcutsV0617=api;
 root.MangoShortcuts=api;
 refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
