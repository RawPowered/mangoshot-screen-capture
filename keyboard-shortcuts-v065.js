/* MangoShot v0.6.5: single keymap dispatcher and user-editable local bindings.
 * Saved only to this extension's localStorage. All actual editor actions still
 * call existing buttons/edit operations; no duplicate editing implementation. */
(function(root){'use strict';
 const definitions=[
  ['select','Tools','Select','V'],['razor','Tools','Razor','C'],['range','Tools','Range selection','R'],
  ['split','Timeline','Split at playhead','Ctrl+K'],['markIn','Timeline','Mark In','I'],['markOut','Timeline','Mark Out','O'],
  ['marker','Timeline','Insert marker','M'],['ripple','Timeline','Delete selected graphic or clip','Delete'],
  ['rippleAlternate','Timeline','Ripple Delete (alternate)','Alt+Backspace'],['trim','Timeline','Trim to range',''],
  ['undo','Timeline','Undo','Ctrl+Z'],['redo','Timeline','Redo','Ctrl+Shift+Z'],
  ['redoAlternate','Timeline','Redo (alternate)','Ctrl+Y'],
  ['playPause','Playback','Play / Pause','Space'],['jogBackward','Playback','Jog backward','J'],
  ['pause','Playback','Pause','K'],['jogForward','Playback','Play forward','L'],
  ['workspaceEdit','Workspace','Edit layout','Shift+1'],['workspaceGraphics','Workspace','Graphics layout','Shift+2'],
  ['workspaceTimeline','Workspace','Timeline layout','Shift+3'],
  ['importMedia','Media','Import secondary media','Alt+I'],
  ['mediaBin','Media','Expand / Collapse Media Library','Alt+B'],
  ['addText','Graphics','Add text graphic','T'],['addCallout','Graphics','Add callout','G'],
  ['toggleSnap','Graphics','Toggle snapping','S'],
  ['showShortcuts','Workspace','Keyboard Shortcuts','Shift+/']
 ].map(([id,group,label,key])=>({id,group,label,key}));
 const defaults=Object.fromEntries(definitions.map(x=>[x.id,x.key])),byId=Object.fromEntries(definitions.map(x=>[x.id,x]));
 const storeKey='MangoShot.ClipStudio.Keymap.v1',element=id=>document.getElementById(id);
 function normalize(e){
  if(!e||e.isComposing||e.key==='Dead'||['Control','Shift','Alt','Meta'].includes(e.key))return '';
  const codes={Space:'Space',Escape:'Escape',Backspace:'Backspace',Delete:'Delete',Enter:'Enter',Tab:'Tab',
   ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown'};
  let key=codes[e.code]||codes[e.key]||e.key||'';
  if(e.code?.startsWith('Digit')&&/^Digit\d$/.test(e.code))key=e.code.slice(5);
  if(e.code==='Slash'||key==='?')key='/';
  if(key===' ')key='Space';
  if(key.length===1&&/[a-z]/i.test(key))key=key.toUpperCase();
  if(!key)return '';
  return [e.ctrlKey?'Ctrl':null,e.metaKey?'Meta':null,e.altKey?'Alt':null,e.shiftKey?'Shift':null,key].filter(Boolean).join('+');
 }
 const blocked=new Set(['Ctrl+L','Ctrl+W','Ctrl+T','Ctrl+N','Ctrl+R','Ctrl+O','Ctrl+S','Ctrl+P','Ctrl+F',
  'Ctrl+Shift+I','Ctrl+Shift+J','Ctrl+Shift+T','Alt+F4','F5','F11','F12','Meta+Q','Meta+W','Meta+R','Meta+T']);
 const allowedKey=k=>!k||(!blocked.has(k)&&!/^Meta\+(?!Shift\+\/)/.test(k)&&!['Escape','Tab','Enter'].includes(k));
 let keys={...defaults};
 function validate(candidate){
  if(!candidate||typeof candidate!=='object')return {...defaults};
  const next={...defaults},used=new Set();
  for(const def of definitions){
   const value=Object.hasOwn(candidate,def.id)?candidate[def.id]:def.key;
   // If persisted bindings are corrupted or collide, restore the safe known
   // defaults rather than silently installing overlapping editor actions.
   if(typeof value!=='string'||value.length>35||!allowedKey(value)||(value&&used.has(value)))
    return {...defaults};
   next[def.id]=value;if(value)used.add(value);
  }
  return next;
 }
 function load(){
  try{const saved=JSON.parse(root.localStorage?.getItem(storeKey)||'null');keys=validate(saved);}catch{keys={...defaults};}
 }
 function persist(){try{root.localStorage?.setItem(storeKey,JSON.stringify(keys));}catch{}}
 function bind(id,combo){
  if(!byId[id])return {ok:false,reason:'Unknown action'};
  if(typeof combo!=='string'||combo.length>35||!allowedKey(combo))return {ok:false,reason:'Browser or operating-system shortcut is reserved'};
  const conflict=Object.keys(keys).find(x=>x!==id&&combo&&keys[x]===combo);
  if(conflict)return {ok:false,reason:combo+' is already assigned to '+byId[conflict].label+'. Clear that binding first.'};
  keys[id]=combo;persist();refresh();return {ok:true};
 }
 function act(id){
  const st=root.MangoClipView;
  if(id==='showShortcuts'){open();return true;}
  if(id==='importMedia'){root.MangoMediaDock?.show?.();element('v06-media-input')?.click();return true;}
  if(id==='mediaBin'){root.MangoMediaDock?.toggle?.();return true;}
  const layout={workspaceEdit:'edit',workspaceGraphics:'graphics',workspaceTimeline:'timeline'}[id];
  if(layout){document.querySelector('[data-workspace="'+layout+'"]')?.click();return true;}
  if(!st?.original?.()||st.exporting?.())return false;
  const click={
   select:'tool-select',razor:'tool-razor',range:'range-tool',split:'split',
   markIn:'mark-in',markOut:'mark-out',marker:'add-marker',trim:'trim',
   undo:'undo',redo:'redo',redoAlternate:'redo',
   addText:'add-text',addCallout:'add-callout',toggleSnap:'graphics-snap',playPause:'program-play'
  }[id];
  if(click){const b=element(click);if(b&&!b.disabled){b.click();return true;}return false;}
  if(id==='ripple'){st.deleteSelected?.();return true;}
  if(id==='rippleAlternate'){st.deleteSelection?.();return true;}
  if(id==='jogBackward'){st.video().pause();st.seekOutput(Math.max(0,(st.sequencePosition?.()||0)-2));return true;}
  if(id==='pause'){st.video().pause();return true;}
  if(id==='jogForward'){if(!st.isPlaying?.())element('program-play')?.click();return true;}
  return false;
 }
 const modal=element('v062-shortcuts-dialog');
 let capturing=null;
 const active=()=>!!modal?.open;
 function dispatch(e){
  if(root.MangoShortcutsV0617?.active)return;
  if(!e||e.defaultPrevented)return;
  if(capturing){
   e.preventDefault();e.stopImmediatePropagation();
   if(e.key==='Escape'){capturing=null;paint();return;}
   const combo=normalize(e);
   if(!combo||['Control','Shift','Alt','Meta'].includes(e.key))return;
   const outcome=bind(capturing,combo);
   if(outcome.ok)capturing=null;
   announce(outcome.ok?'Shortcut saved: '+combo:outcome.reason);
   paint();return;
  }
  if(active())return;
  if(e.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"],dialog[open]'))return;
  if(e.target?.closest?.('button,a,summary,[role="button"]'))return;
  const combo=normalize(e);
  if(!combo)return;
  const id=Object.keys(keys).find(k=>keys[k]===combo);
  if(!id)return;
  if(e.repeat&&!['jogBackward','jogForward','pause'].includes(id))return;
  if(act(id)){e.preventDefault();e.stopImmediatePropagation();}
 }
 // Legacy listeners are explicitly gated by MangoShortcuts.active, so one
 // keyboard event can never execute the same action twice.
 load();
 let query='',currentGroup='All';
 const wrapper=modal?document.createElement('section'):null;
 let results=null,feedback=null,filter=null;
 const groups=['All',...new Set(definitions.map(d=>d.group))];
 function announce(message){if(feedback)feedback.textContent=message||'';}
 function displayCombo(combo){return combo==='Shift+/'?'?':combo||'Unassigned';}
 function refresh(){
  root.MangoToolIcons?.refresh?.(keys,byId);
  for(const menu of document.querySelectorAll('.v06-menu [data-command]')){
   const action={undo:'undo',redo:'redo',split:'split','ripple-delete':'ripple'}[menu.dataset.command];
   if(action){const key=keys[action]||'';menu.title=byId[action].label+(key?' · '+displayCombo(key):'');}
  }
 }
 function paint(){
  if(!results)return;
  results.replaceChildren();
  let last='';
  const visible=definitions.filter(d=>(currentGroup==='All'||d.group===currentGroup)&&
   (d.label.toLowerCase().includes(query)||d.group.toLowerCase().includes(query)||displayCombo(keys[d.id]).toLowerCase().includes(query)));
  for(const d of visible){
   if(d.group!==last){const h=document.createElement('h3');h.textContent=d.group;h.className='v065-shortcut-group';results.append(h);last=d.group;}
   const row=document.createElement('div');row.className='v065-shortcut-row';
   const name=document.createElement('span');name.textContent=d.label;name.className='v065-shortcut-name';
   const key=document.createElement('button');key.type='button';key.className='v065-shortcut-key';key.id='v065-binding-'+d.id;
   key.textContent=capturing===d.id?'Press a key combination…':displayCombo(keys[d.id]);
   key.setAttribute('aria-label','Change shortcut for '+d.label);key.setAttribute('aria-pressed',String(capturing===d.id));
   key.onclick=()=>{capturing=d.id;announce('Press the new shortcut. Escape cancels.');paint();element('v065-binding-'+d.id)?.focus();};
   const clear=document.createElement('button');clear.type='button';clear.textContent='×';clear.className='v065-shortcut-clear';
   clear.title='Unassign '+d.label;clear.setAttribute('aria-label','Unassign shortcut for '+d.label);clear.onclick=()=>{
    const outcome=bind(d.id,'');announce(outcome.ok?'Shortcut cleared.':outcome.reason);paint();
   };
   const reset=document.createElement('button');reset.type='button';reset.textContent='↺';reset.className='v065-shortcut-reset';
   reset.title='Restore default for '+d.label;reset.setAttribute('aria-label','Restore default for '+d.label);reset.onclick=()=>{
    const outcome=bind(d.id,d.key);announce(outcome.ok?'Default shortcut restored.':outcome.reason);paint();
   };
   row.append(name,key,clear,reset);results.append(row);
  }
  if(!visible.length){const none=document.createElement('p');none.textContent='No shortcuts match your search.';results.append(none);}
 }
 function open(){if(!modal)return;
  if(!modal.open){try{modal.showModal();}catch{modal.setAttribute('open','');}}
  paint();filter?.focus();
 }
 if(modal&&wrapper){
  modal.querySelector('.editor-shortcuts')?.remove();
  wrapper.className='v065-shortcut-manager';wrapper.id='v065-shortcut-manager';
  const searchRow=document.createElement('div');searchRow.className='v065-shortcut-search';
  filter=document.createElement('input');filter.type='search';filter.placeholder='Search commands or keys';filter.setAttribute('aria-label','Find shortcuts');
  filter.oninput=()=>{query=filter.value.trim().toLowerCase();paint();};
  const categories=document.createElement('select');categories.setAttribute('aria-label','Shortcut category');
  for(const g of groups){const o=document.createElement('option');o.value=g;o.textContent=g;categories.append(o);}
  categories.onchange=()=>{currentGroup=categories.value;paint();};
  searchRow.append(filter,categories);
  const note=document.createElement('p');note.className='v065-shortcut-help';
  note.textContent='Click a key to reassign it. Conflicts and reserved browser shortcuts are blocked. Bindings are saved locally, not synced to the cloud.';
  results=document.createElement('div');results.className='v065-shortcut-results';results.setAttribute('role','group');results.setAttribute('aria-label','Editable keyboard shortcuts');
  feedback=document.createElement('p');feedback.className='v065-shortcut-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const controls=document.createElement('div');controls.className='v065-shortcut-actions';
  function action(label,handler){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=handler;return button;}
  controls.append(action('Reset all to defaults',()=>{
   if(typeof root.confirm==='function'&&!root.confirm('Restore all MangoShot keyboard shortcuts to defaults?'))return;
   keys={...defaults};persist();capturing=null;announce('Default shortcuts restored.');refresh();paint();
  }),action('Export bindings',()=>{
   const file=new Blob([JSON.stringify({version:1,bindings:keys},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='MangoShot-Keyboard-Shortcuts.json';
   document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
  }));
  const importLabel=document.createElement('label');importLabel.className='v065-shortcut-import';importLabel.textContent='Import bindings';
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.setAttribute('aria-label','Import keyboard shortcut bindings');
  fileInput.onchange=async()=>{const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
   try{
    if(file.size>16384)throw Error('Shortcuts file exceeds 16 KiB');
    const parsed=JSON.parse(await file.text());
    if(parsed?.version!==1||!parsed.bindings||typeof parsed.bindings!=='object')throw Error('Not a MangoShot shortcuts v1 export');
    const candidate={...defaults},used=new Map();
    for(const d of definitions){
     const value=parsed.bindings[d.id];
     if(typeof value!=='string'||!allowedKey(value))throw Error('Reserved or invalid shortcut for '+d.label);
     if(value&&used.has(value))throw Error('Duplicate shortcut '+value+' for '+d.label);
     if(value)used.set(value,d.id);candidate[d.id]=value;
    }
    keys=candidate;persist();refresh();paint();announce('Keyboard shortcuts imported.');
   }catch(error){announce('Import rejected: '+error.message);}
  };
  importLabel.append(fileInput);controls.append(importLabel);
  wrapper.append(searchRow,note,results,feedback,controls);
  modal.append(wrapper);
  modal.addEventListener('close',()=>{capturing=null;paint();});
 }
 document.addEventListener('keydown',dispatch,true);
 root.MangoShortcuts={active:true,definitions,defaults,keys:()=>({...keys}),normalize,validate,bind,dispatch,open,refresh};
 refresh();paint();
})(typeof globalThis!=='undefined'?globalThis:this);
