/* MangoShot v0.6.5: consistent SVG tools without changing button identity.
   Keyboard hint updates are driven by the configurable keymap. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const NS='http://www.w3.org/2000/svg',make=document.createElementNS.bind(document,NS);
 const paths={
  select:['M5 3l12 17 1.7-7.3 5.3-2.4L5 3z'],razor:['M14 8L5 17','M14 16L5 7','M19 3L8 14','M5 21a2 2 0 1 0 0-4a2 2 0 0 0 0 4z','M5 7a2 2 0 1 0 0-4a2 2 0 0 0 0 4z'],
  range:['M4 4h16v16H4z','M4 11h16','M11 4v16'],text:['M4 5h16','M12 5v15','M7 20h10'],
  callout:['M20 15a4 4 0 0 1-4 4H9l-5 3v-6a4 4 0 0 1-2-4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z'],
  autocut:['M13 2L4 14h7l-1 8 10-12h-7z'],
  split:['M11 3v18','M3 6h5','M3 18h5','M14 6h7','M14 18h7','M8 11h8'],
  ripple:['M3 6h7v12H3z','M15 6l5 6-5 6','M10 12h10'],trim:['M7 3v18','M17 3v18','M2 7h20','M2 17h20'],
  undo:['M8 7L3 12l5 5','M4 12h10a6 6 0 0 1 0 12','M14 18a6 6 0 0 0 0-12h-7'],
  redo:['M16 7l5 5-5 5','M20 12H10a6 6 0 0 0 0 12','M10 18a6 6 0 0 1 0-12h7'],
  media:['M3 5h7l2 3h9v12H3z','M12 11v7','M8.5 14.5h7'],
  collapse:['M5 9l7 7 7-7'],expand:['M5 16l7-7 7 7'],
  film:['M3 4h18v16H3z','M7 4v16','M17 4v16','M3 9h4','M17 9h4','M3 15h4','M17 15h4'],
  wave:['M3 12h2','M7 8v8','M11 4v16','M15 7v10','M19 10v4','M22 12h-1'],
  keyboard:['M3 6h18v12H3z','M6 9h1','M10 9h1','M14 9h1','M18 9h1','M6 13h1','M10 13h1','M14 13h1','M18 13h1','M8 16h8']
 };
 const targets=[
  ['[data-v06-tool="tool-select"]','select','select','Select tool'],
  ['[data-v06-tool="tool-razor"]','razor','razor','Razor tool'],
  ['[data-v06-tool="range-tool"]','range','range','Range selection'],
  ['[data-v06-tool="add-text"]','text','addText','Insert text graphic'],
  ['[data-v06-tool="add-callout"]','callout','addCallout','Insert callout graphic'],
  ['[data-v06-tool="autocut-toggle"]','autocut',null,'AutoCut Studio'],
  ['#split','split','split','Split at playhead'],
  ['#cut','ripple','ripple','Ripple Delete'],
  ['#trim','trim','trim','Trim selected range'],
  ['#undo','undo','undo','Undo edit'],
  ['#redo','redo','redo','Redo edit']
 ];
 const icons=[];
 function svgFor(name){
  const svg=make('svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');
  svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');svg.setAttribute('fill','none');svg.setAttribute('aria-hidden','true');
  for(const d of paths[name]||[]){const p=make('path');p.setAttribute('d',d);svg.append(p);}
  return svg;
 }
 for(const [selector,icon,id,label] of targets){
  const element=document.querySelector(selector);if(!element)continue;
  const old=element.title||label;
  element.replaceChildren(svgFor(icon));
  const key=document.createElement('small');key.className='v065-keyhint';element.append(key);
  element.classList.add('v065-icon-tool');element.dataset.v065Action=id||'';
  element.setAttribute('aria-label',old||label);
  element.title=label;
  icons.push({element,id,label,key});
 }
 for(const [selector,icon] of [['#v065-import-media','media'],['#make-thumbnails','film'],['#analyze-audio','wave']]){
  const b=document.querySelector(selector);if(!b)continue;b.prepend(svgFor(icon));b.classList.add('v065-inline-tool');
 }
 const toggle=document.getElementById('v065-media-toggle');
 if(toggle){toggle.classList.add('v065-inline-tool');toggle.prepend(svgFor('collapse'));}
 function refresh(map){
  for(const {element,id,label,key} of icons){
   const binding=id?map[id]:'';
   key.textContent=binding?(binding.length<=4?binding:binding.replace('Ctrl+','⌃').replace('Shift+','⇧').replace('Alt+','⌥')):'';
   element.title=label+(binding?' · '+(binding==='Shift+/'?'?':binding):'');
  }
  if(toggle){const icon=toggle.querySelector('svg');if(icon)icon.replaceWith(svgFor(document.body.classList.contains('v065-bin-collapsed')?'expand':'collapse'));}
 }
 const menu=document.querySelector('.v06-menu-bar'),status=document.querySelector('.v06-menu-status');
 if(menu){
  const shortcut=document.createElement('button');shortcut.type='button';shortcut.id='v065-shortcut-launch';
  shortcut.className='v065-keys-launch';shortcut.title='Manage keyboard shortcuts · ?';
  shortcut.setAttribute('aria-label','Open keyboard shortcut preferences');
  shortcut.append(svgFor('keyboard'),document.createTextNode('Keys'));
  shortcut.addEventListener('click',()=>root.MangoShortcuts?.open?.());
  if(status)status.before(shortcut);else menu.append(shortcut);
 }
 root.MangoToolIcons={refresh,svgFor};
 refresh({});
})(typeof globalThis!=='undefined'?globalThis:this);
