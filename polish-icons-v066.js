/* MangoShot v0.6.6 — finish iconography without replacing editor controls. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const NS='http://www.w3.org/2000/svg';
 const geometry={
  import:['M12 3v12','m8-4 4 4 4-4','M4 17v3h16v-3'],
  open:['M3 5h7l2 3h9v11H3z','M9 12h7','m13 9 3 3-3 3'],
  trash:['M4 7h16','M10 7V4h4v3','M7 7l1 13h8l1-13','M10 11v6','M14 11v6'],
  export:['M12 15V3','m8 7 4-4 4 4','M5 14v6h14v-6'],
  magnet:['M4 3v10a8 8 0 0 0 16 0V3h-5v10a3 3 0 0 1-6 0V3z','M4 7h5','M15 7h5'],
  wand:['M4 20 20 4','m15 3 3-1','m19 8 3 1','M4 4l1 3','M6 14l-3 1'],
  layers:['M12 3 2 9l10 6 10-6z','m2 4 10 6 10-6','m2 4 10 6 10-6'],
  reset:['M3 12a9 9 0 1 1 3 7','M3 5v7h7']
 };
 const svg=paths=>{
  const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('width','16');s.setAttribute('height','16');s.setAttribute('aria-hidden','true');
  s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');
  s.setAttribute('stroke-width','1.8');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');
  for(const d of paths){const p=document.createElementNS(NS,'path');p.setAttribute('d',d);s.appendChild(p);}return s;
 };
 const commands=[
  ['#open-last','open','Open latest locally stored recording'],
  ['#forget-last','trash','Forget the stored recording'],
  ['#v061-export-menu','export','Export edited video'],
  ['#autocut-toggle','wand','Analyze and remove inactive footage'],
  ['#graphics-snap','magnet','Toggle timeline snapping'],
  ['#quick-text','layers','Insert text graphic'],
  ['#quick-callout','layers','Insert callout graphic']
 ];
 for(const [selector,icon,title] of commands){
  const b=document.querySelector(selector);if(!b||b.querySelector('.v066-command-icon'))continue;
  const graphic=root.MangoIconsV079?.has(icon)?root.MangoIconsV079.svg(icon,16):svg(geometry[icon]);graphic.classList.add('v066-command-icon');b.prepend(graphic);
  b.classList.add('v066-icon-command');b.setAttribute('aria-label',title);
  if(!b.title)b.title=title;
 }
 const picker=document.querySelector('.clip-open-file');
 if(picker&&!picker.querySelector('.v066-command-icon')){
  const icon=svg(geometry.import);icon.classList.add('v066-command-icon');picker.prepend(icon);picker.classList.add('v066-icon-label');
 }
 // Help users discover the new layout handles without adding a permanent
 // second toolbar or dense technical instructions.
 const info=document.createElement('span');info.className='v066-resize-hint';
 info.textContent='Drag dividers to resize · Double-click to reset';
 info.title='Panel sizes are saved separately for Edit, Graphics and Timeline workspaces';
 const menu=document.querySelector('.v066-layout-menu .v066-layout-options');
 menu?.append(info);
})(typeof globalThis!=='undefined'?globalThis:this);
