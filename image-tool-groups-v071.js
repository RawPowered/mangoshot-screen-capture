/* MangoShot v0.7.1 — compact, accurate SVG tool groups for Image Studio.
 * Original tool buttons remain mounted and retain their event handlers. */
(function(root){'use strict';
 if(typeof document==='undefined'||!document.body?.classList?.contains('studio-image'))return;
 const rail=document.querySelector('.image-toolrail'),selector=document.getElementById('tool');
 if(!rail||!selector)return;
 const groupDefs=root.MangoToolStudioV0711?.groups||[
  {id:'select',label:'Select / Move',items:['select']},
  {id:'draw',label:'Drawing tools',items:['pen','highlighter']},
  {id:'erase',label:'Erasers',items:['erase-brush','erase-stroke']},
  {id:'shapes',label:'Vector shapes',items:['rectangle','rounded-rectangle','ellipse','line','arrow',
    'triangle','diamond','pentagon','hexagon','star','speech-bubble']},
  {id:'redact',label:'Redact',items:['redact']},
  {id:'text',label:'Typography',items:['text']},
  {id:'mask',label:'Image masks',items:['mask-erase','mask-restore']}
 ];
 const icons={
  select:['M4 2l4 19 4-7 5 7 3-2-5-8 8-1Z'],
  pen:['M3 21l5-1L21 7l-5-5L3 15Z','M13 5l5 5','M3 21l5-1'],
  highlighter:['M4 16L16 4l5 5L9 21H4Z','M4 16l5 5','M16 4l5 5'],
  'erase-brush':['M3 16L16 3l6 6-12 12H6Z','M9 21h12'],
  'erase-stroke':['M3 16L16 3l6 6-12 12H6Z','M14 16l7 7m0-7l-7 7'],
  rectangle:['M3 5h18v14H3Z'],
  'rounded-rectangle':['M7 4h10a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z'],
  ellipse:['M3 12a9 7 0 1 0 18 0a9 7 0 1 0-18 0'],
  line:['M3 21L21 3'],
  arrow:['M3 20L21 4m-9 0h9v9'],
  triangle:['M12 3l10 18H2Z'],
  diamond:['M12 2l10 10-10 10L2 12Z'],
  pentagon:['M12 2l10 8-4 12H6L2 10Z'],
  hexagon:['M7 3h10l5 9-5 9H7l-5-9Z'],
  star:['M12 2l3 7 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1Z'],
  'speech-bubble':['M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-8l-8 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'],
  redact:['M3 4h18v16H3Z','M3 9h18m-18 5h18','M8 4v16M16 4v16'],
  text:['M3 4h18','M12 4v16','M7 20h10'],
  'mask-erase':['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18','M16 9l5 5m0-5l-5 5'],
  'mask-restore':['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18','M16 9h6m-3-3v6']
 };
 const title=id=>root.MangoToolStudioV0711?.titles[id]||({select:'Select / Move',pen:'Pen',highlighter:'Highlighter','erase-brush':'Brush Erase',
  'erase-stroke':'Whole Stroke Erase',rectangle:'Rectangle','rounded-rectangle':'Rounded rectangle',
  ellipse:'Ellipse',line:'Line',arrow:'Arrow',triangle:'Triangle',diamond:'Diamond',pentagon:'Pentagon',
  hexagon:'Hexagon',star:'Star','speech-bubble':'Speech bubble',redact:'Redact',text:'Text',
  'mask-erase':'Mask Erase','mask-restore':'Mask Restore'})[id]||id;
 const ns='http://www.w3.org/2000/svg';
 function icon(id){
  if(root.MangoIconsV079?.has(id))return root.MangoIconsV079.svg(id,22);
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','22');svg.setAttribute('height','22');
  svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  for(const d of icons[id]||icons.rectangle){
   const p=document.createElementNS(ns,'path');p.setAttribute('d',d);svg.append(p);
  }
  return svg;
 }
 const originals=new Map([...rail.querySelectorAll('[data-studio-tool]')].map(b=>[b.dataset.studioTool,b]));
 const storageKey='MangoShot.ToolStudio.image.v1';let pref;try{pref=root.MangoToolStudioV0711?.preferences(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{};
 const saved=new Map(groupDefs.map(g=>[g.id,pref?.last[g.id]||g.items[0]]));
 function remember(){if(!root.MangoToolStudioV0711)return;try{const p=root.MangoToolStudioV0711.preferences(JSON.parse(localStorage.getItem(storageKey)||'{}'));p.last=Object.fromEntries(saved);localStorage.setItem(storageKey,JSON.stringify(p));}catch{}}
 const slots=[];
 let open=null;
 function close(){
  if(!open)return;
  open.flyout.hidden=true;
  open.more.setAttribute('aria-expanded','false');
  open=null;
 }
 function activate(id){
  const existing=originals.get(id);
  if(existing)existing.click();
  else{
   const option=[...selector.options].find(o=>o.value===id);
   if(!option)return;
   selector.value=id;
   selector.dispatchEvent(new Event('change',{bubbles:true}));
  }
  for(const g of groupDefs)if(g.items.includes(id))saved.set(g.id,id);
  remember();close();sync();
 }
 function make(tag,cls){
  const e=document.createElement(tag);
  if(cls)e.className=cls;return e;
 }
 for(const g of groupDefs){
  const slot=make('div','v071-tool-slot');slot.dataset.group=g.id;
  const main=make('button','v071-tool-main');main.type='button';
  const more=make('button','v071-tool-more');more.type='button';more.textContent='▸';
  more.setAttribute('aria-label','Choose '+g.label);
  more.setAttribute('aria-haspopup','true');more.setAttribute('aria-expanded','false');
  const flyout=make('div','v071-tool-flyout');flyout.hidden=true;
  flyout.setAttribute('role','group');flyout.setAttribute('aria-label',g.label);
  for(const id of g.items){
   let item=originals.get(id);
   if(item){
    const label=make('small','v071-tool-label');
    label.textContent=title(id);
    item.replaceChildren(icon(id),label);
   }else{
    item=make('button','v071-virtual-tool');item.type='button';
    item.dataset.v071Variant=id;
    const label=make('small','v071-tool-label');label.textContent=title(id);
    item.append(icon(id),label);
    item.setAttribute('aria-pressed','false');
    item.addEventListener('click',()=>activate(id));
   }
   item.title=title(id);
   item.setAttribute('aria-label',title(id));
   flyout.append(item);
  }
  let heldTimer=0,longPressed=false;
  const clearHold=()=>{clearTimeout(heldTimer);heldTimer=0;};
  main.addEventListener('pointerdown',e=>{if(e.button!==0||g.items.length<2)return;longPressed=false;clearHold();heldTimer=setTimeout(()=>{longPressed=true;more.click();},450);});
  for(const event of ['pointerup','pointercancel','pointerleave','lostpointercapture'])main.addEventListener(event,clearHold);
  main.addEventListener('click',()=>{if(longPressed){longPressed=false;return;}activate(saved.get(g.id)||g.items[0]);});
  // Stylus barrel click / mouse right click opens variants, like a tool flyout.
  main.addEventListener('contextmenu',event=>{
   event.preventDefault();event.stopPropagation();more.click();
  });
  more.addEventListener('click',()=>{
   if(open?.slot===slot){close();return;}
   close();flyout.hidden=false;more.setAttribute('aria-expanded','true');
   // A tall Shapes flyout must remain inside the fixed editor even when its
   // trigger is near the bottom of a short viewport.
   const host=rail.getBoundingClientRect(),rect=slot.getBoundingClientRect();
   const maxHeight=Math.max(80,Math.min(400,host.height-8));
   flyout.style.maxHeight=Math.round(maxHeight)+'px';
   const h=Math.min(maxHeight,flyout.scrollHeight);
   flyout.style.top=Math.round(Math.max(host.top+4,Math.min(rect.top,host.bottom-h-4))-rect.top)+'px';
   open={slot,flyout,more};
   const selected=flyout.querySelector('[aria-pressed="true"]');
   (selected||flyout.querySelector('button'))?.focus();
  });
  flyout.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    event.preventDefault();close();more.focus();return;
   }
   if(!['ArrowUp','ArrowDown'].includes(event.key))return;
   const entries=[...flyout.querySelectorAll('button')];
   const index=entries.indexOf(document.activeElement);
   event.preventDefault();
   entries[(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length]?.focus();
  });
  slot.append(main,more,flyout);rail.append(slot);
  slots.push({g,slot,main,more,flyout});
 }
 document.addEventListener('pointerdown',event=>{
  if(open&&!open.slot.contains(event.target))close();
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')close();
  root.requestAnimationFrame?.(sync);
 },false);
 let previous='';
 function sync(){
  const tool=selector.value;
  if(tool===previous&&slots.every(s=>s.slot.dataset.active!=null))return;
  previous=tool;
  for(const s of slots){
   const {g,slot,main,flyout}=s;
   if(g.items.includes(tool))saved.set(g.id,tool);
   const active=g.items.includes(tool),selected=saved.get(g.id)||g.items[0];
   slot.dataset.active=String(active);
   main.replaceChildren(icon(selected));
   main.setAttribute('aria-pressed',String(active));
   main.title=title(selected)+(active?' · Active':'')+' · '+g.label;
   main.setAttribute('aria-label',title(selected)+' tool');
   for(const item of flyout.querySelectorAll('button')){
    const id=item.dataset.studioTool||item.dataset.v071Variant;
    item.setAttribute('aria-pressed',String(id===tool));
   }
  }
  remember();
 }
 selector.addEventListener('change',sync);
 rail.addEventListener('click',()=>root.requestAnimationFrame?.(sync),false);
 sync();
 root.MangoToolGroupsV071={sync,activate,close,groups:()=>slots.map(s=>s.g.id)};
})(typeof globalThis!=='undefined'?globalThis:this);
