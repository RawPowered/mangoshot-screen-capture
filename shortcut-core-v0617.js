/* MangoShot v0.6.17 — platform-safe, per-editor keyboard shortcut definitions.
 * Does not intercept browser-global keys and has zero external dependencies.
 */
(function(root){'use strict';
 const clip=[
  ['select','Tools','Select','V'],['razor','Tools','Razor','C'],['range','Tools','Range selection','R'],
  ['split','Timeline','Split at playhead','Ctrl+K'],['markIn','Timeline','Mark In','I'],['markOut','Timeline','Mark Out','O'],
  ['marker','Timeline','Insert marker','M'],['ripple','Timeline','Delete selected graphic / clip','Delete'],
  ['rippleAlternate','Timeline','Ripple delete range','Alt+Backspace'],['trim','Timeline','Trim to selected range',''],
  ['undo','Edit','Undo','Ctrl+Z'],['redo','Edit','Redo','Ctrl+Shift+Z'],['redoAlternate','Edit','Redo (alternate)','Ctrl+Y'],
  ['playPause','Playback','Play / Pause','Space'],['jogBackward','Playback','Jog backward','J'],
  ['pause','Playback','Pause','K'],['jogForward','Playback','Play forward','L'],
  ['workspaceEdit','Workspace','Edit workspace','Shift+1'],['workspaceGraphics','Workspace','Graphics workspace','Shift+2'],
  ['workspaceTimeline','Workspace','Timeline workspace','Shift+3'],['importMedia','File','Import media','Alt+I'],
  ['mediaBin','Workspace','Show / Hide Media Library','Alt+B'],['addText','Graphics','Add title','T'],
  ['addCallout','Graphics','Add callout','G'],['toggleSnap','Graphics','Toggle snapping','S'],
  ['exportVideo','File','Export / Render','Alt+E'],
  ['commandPalette','Help','Command search','Ctrl+Alt+K'],['showShortcuts','Help','Keyboard shortcut settings','Shift+/']
 ];
 const image=[
  ['select','Tools','Select / Move','V'],['marquee','Tools','Marquee selection',''],['pen','Tools','Pen','P'],['highlighter','Tools','Highlighter','H'],
  ['brushErase','Tools','Brush Erase','E'],['strokeErase','Tools','Whole Stroke Erase','Shift+E'],
  ['arrow','Shapes','Arrow','A'],['rectangle','Shapes','Rectangle','R'],['ellipse','Shapes','Ellipse','O'],
  ['line','Shapes','Line','L'],['star','Shapes','Star','Shift+S'],['text','Tools','Text','T'],
  ['maskErase','Tools','Mask Erase','M'],['maskRestore','Tools','Mask Restore','Shift+M'],
  ['brushSmaller','Tools','Decrease brush width','['],['brushLarger','Tools','Increase brush width',']'],
  ['undo','Edit','Undo','Ctrl+Z'],['redo','Edit','Redo','Ctrl+Shift+Z'],
  ['redoAlternate','Edit','Redo (alternate)','Ctrl+Y'],['deleteLayer','Layer','Delete selected layer','Delete'],
  ['duplicateLayer','Layer','Duplicate selected layer','Shift+D'],
  ['copyLayer','Layer','Copy selected layer','Ctrl+C'],
  ['cutLayer','Layer','Cut selected layer','Ctrl+X'],
  ['pasteLayer','Layer','Paste editable layer','Ctrl+V'],
  ['copyLayerStyle','Layer','Copy layer appearance','Alt+Shift+C'],
  ['pasteLayerStyle','Layer','Paste layer appearance','Alt+Shift+V'],
  ['nudgeLeft','Layer','Move layer left 1 px','ArrowLeft'],
  ['nudgeRight','Layer','Move layer right 1 px','ArrowRight'],
  ['nudgeUp','Layer','Move layer up 1 px','ArrowUp'],
  ['nudgeDown','Layer','Move layer down 1 px','ArrowDown'],
  ['nudgeLeftFast','Layer','Move layer left 10 px','Shift+ArrowLeft'],
  ['nudgeRightFast','Layer','Move layer right 10 px','Shift+ArrowRight'],
  ['nudgeUpFast','Layer','Move layer up 10 px','Shift+ArrowUp'],
  ['nudgeDownFast','Layer','Move layer down 10 px','Shift+ArrowDown'],
  ['layerForward','Layer','Move layer forward','Alt+ArrowUp'],
  ['layerBackward','Layer','Move layer backward','Alt+ArrowDown'],
  ['copyImage','File','Copy annotated screenshot','Alt+C'],
  ['importImage','File','Import image layer','Alt+I'],
  ['editClipboard','File','Edit clipboard image','Ctrl+Alt+V'],
  ['exportPng','File','Export PNG','Alt+P'],['exportPdf','File','Export PDF','Alt+Shift+P'],
  ['zoomFit','View','Fit screenshot to canvas','Shift+0'],
  ['zoomActual','View','Show at 100%','Shift+9'],
  ['penDiagnostics','View','Open pen diagnostic','Alt+Shift+W'],
  ['commandPalette','Help','Command search','Ctrl+Alt+K'],
  ['showShortcuts','Help','Keyboard shortcut settings','Shift+/']
 ];
 const definitions={
  clip:clip.map(([id,group,label,key])=>({id,group,label,key})),
  image:image.map(([id,group,label,key])=>({id,group,label,key}))
 };
 const reserved=new Set([
  'Ctrl+W','Ctrl+T','Ctrl+N','Ctrl+R','Ctrl+L','Ctrl+O','Ctrl+S',
  'Ctrl+P','Ctrl+F','Ctrl+D','Ctrl+U','Ctrl+H','Ctrl+J',
  'Ctrl+Shift+C','Ctrl+Shift+I','Ctrl+Shift+J','Ctrl+Shift+K',
  'Ctrl+Shift+P','Ctrl+Shift+T','Ctrl+Shift+N','Ctrl+Shift+W',
  'Ctrl+Shift+Delete','Ctrl+Shift+Backspace','Ctrl+Shift+B',
  'Alt+ArrowLeft','Alt+ArrowRight','Alt+F4',
  'F1','F3','F4','F5','F6','F10','F11','F12',
  'Meta+Q','Meta+W','Meta+R','Meta+T','Meta+N','Meta+O','Meta+S','Meta+P',
  'Meta+F','Meta+L','Meta+Shift+T','Meta+Shift+P',
  'Ctrl+0','Ctrl+-','Ctrl+=','Meta+0','Meta+-','Meta+='
 ]);
 const special=new Set(['Space','Backspace','Delete','ArrowLeft','ArrowRight',
  'ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Insert','[',']','/','-','=',';','.',',']);
 const modifiers=new Set(['Ctrl','Alt','Shift','Meta']);
 // Ctrl in existing portable profiles represents the primary editor modifier.
 // Keep stored profiles intact while using Command physically on macOS.
 function platformName(){
  const name=String(root.navigator?.userAgentData?.platform||root.navigator?.platform||'').toLowerCase();
  return /mac|iphone|ipad|ipod/.test(name)?'mac':'other';
 }
 function effective(combo,platform=platformName()){
  return platform==='mac'&&typeof combo==='string'&&combo.startsWith('Ctrl+')
   ?'Meta+'+combo.slice(5):combo;
 }
 const validKey=k=>/^[A-Z0-9]$/.test(k)||special.has(k)||/^F([1-9]|10)$/.test(k);
 function canonical(raw){
  if(typeof raw!=='string'||raw.length>42)return null;
  if(raw==='')return '';
  const parts=raw.split('+').map(v=>v.trim()).filter(Boolean),last=parts.pop();
  if(!last)return null;
  const aliases={Control:'Ctrl',Command:'Meta',Option:'Alt',Esc:'Escape',
   ' ':'Space',Spacebar:'Space',Plus:'=',Slash:'/',BracketLeft:'[',BracketRight:']'};
  const key=aliases[last]|| (last.length===1&&/[a-z]/i.test(last)?last.toUpperCase():last);
  const mods=new Set();
  for(const m of parts){const v=aliases[m]||m;if(!modifiers.has(v)||mods.has(v))return null;mods.add(v);}
  if(!validKey(key))return null;
  const value=[...['Ctrl','Meta','Alt','Shift'].filter(m=>mods.has(m)),key].join('+');
  if(reserved.has(value)||value.startsWith('Meta+')&&/^Meta\+(?:[A-Z]|Shift\+[A-Z])$/.test(value)&&
    !['Meta+Z','Meta+Shift+Z'].includes(value))return null;
  return value;
 }
 function normalize(event){
  if(!event||event.isComposing||event.key==='Dead'||['Control','Shift','Alt','Meta'].includes(event.key))return '';
  const code=event.code||'',keys={Space:'Space',Escape:'Escape',Backspace:'Backspace',Delete:'Delete',
   ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',
   Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown',Insert:'Insert',
   BracketLeft:'[',BracketRight:']',Slash:'/',Minus:'-',Equal:'=',Comma:',',Period:'.',Semicolon:';'};
  let key=keys[code]||keys[event.key]||event.key||'';
  if(/^Digit[0-9]$/.test(code))key=code.slice(5);
  if(/^Key[A-Z]$/.test(code))key=code.slice(3);
  if(key===' '||key==='Spacebar')key='Space';
  if(key==='?')key='/';
  if(key.length===1&&/[a-z]/i.test(key))key=key.toUpperCase();
  return [event.ctrlKey?'Ctrl':null,event.metaKey?'Meta':null,event.altKey?'Alt':null,
   event.shiftKey?'Shift':null,key].filter(Boolean).join('+');
 }
 function defaults(studio){return Object.fromEntries((definitions[studio]||[]).map(d=>[d.id,d.key]));}
 function check(bindings,studio,{allowMissing=true,platform=platformName()}={}){
  const defs=definitions[studio]||[];
  if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))return{ok:false,reason:'Invalid shortcut map'};
  const result=defaults(studio),used=new Map();
  for(const d of defs){
   if(!Object.hasOwn(bindings,d.id)&&!allowMissing)return{ok:false,reason:'Missing shortcut: '+d.label};
   const raw=Object.hasOwn(bindings,d.id)?bindings[d.id]:d.key;
   const value=canonical(raw);
   if(value===null)return{ok:false,reason:'Reserved or invalid shortcut for '+d.label};
   const physical=effective(value,platform);
   if(value&&used.has(physical))return{ok:false,reason:physical+' is already assigned to '+used.get(physical)+'.'};
   result[d.id]=value;
   if(value)used.set(physical,d.label);
  }
  if(Object.keys(bindings).some(id=>!defs.some(d=>d.id===id)))
   return{ok:false,reason:'Unknown shortcut action in imported settings'};
  return{ok:true,keys:result};
 }
 function rebind(current,id,combo,studio){
  const def=(definitions[studio]||[]).find(d=>d.id===id);
  if(!def)return{ok:false,reason:'Unknown shortcut action'};
  const value=canonical(combo);
  if(value===null)return{ok:false,reason:'Browser/system shortcut reserved or invalid'};
  return check({...current,[id]:value},studio,{allowMissing:true});
 }
 function editable(target){
  return !!(target?.isContentEditable||target?.closest?.(
   'input:not([type="hidden"]),textarea,select,[contenteditable],[role="textbox"],[role="combobox"],[role="searchbox"]'));
 }
 function eventEditable(event){
  const path=typeof event?.composedPath==='function'?event.composedPath():[event?.target];
  return path.some(node=>editable(node)||(
   ['INPUT','TEXTAREA','SELECT'].includes(node?.tagName)&&node?.type!=='hidden'));
 }
 function focusedControlAllows(event,{image=false,selectedLayer=false}={}){
  const control=event?.target?.closest?.('button,a,summary,[role="button"],[role="menuitem"]');
  if(!control||event.ctrlKey||event.metaKey||event.altKey)return true;
  if(!image||!selectedLayer)return false;
  return ![' ','Spacebar','Enter'].includes(event.key);
 }
 function resolve(bindings,event,platform=platformName()){
  const combo=normalize(event);
  if(!combo)return null;
  return Object.keys(bindings||{}).find(id=>bindings[id]&&effective(bindings[id],platform)===combo)||null;
 }
 function display(key,platform=platformName()){
  const physical=effective(key,platform);
  if(physical==='Shift+/')return '?';
  return physical?.startsWith('Meta+')?'Cmd+'+physical.slice(5):physical||'Unassigned';
 }
 root.MangoShortcutCoreV0617={definitions,reserved,canonical,normalize,defaults,check,rebind,editable,
  eventEditable,focusedControlAllows,platformName,effective,resolve,display};
})(typeof globalThis!=='undefined'?globalThis:this);
