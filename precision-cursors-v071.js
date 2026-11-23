/* MangoShot v0.7.1 — precise vector cursors, original MangoShot artwork.
 * SVG data cursors are entirely local. Browser fallback is always provided. */
(function(root){'use strict';
 const esc=s=>encodeURIComponent(s).replace(/'/g,'%27').replace(/"/g,'%22');
 function cursorSVG(tool,diameter=8){
  const stroke='#101820',light='#f7fff7',accent='#c8fa8f';
  const w=Math.max(2,Math.min(13,Math.round(Number(diameter)||8)));
  let art='',x=16,y=16,fallback='crosshair';
  const cross='<path d="M16 2v9 M16 21v9 M2 16h9 M21 16h9" stroke="'+stroke+'" stroke-width="3"/>'+
   '<path d="M16 2v9 M16 21v9 M2 16h9 M21 16h9" stroke="'+light+'" stroke-width="1.4"/>';
  if(tool==='select'){
   x=3;y=2;fallback='default';
   art='<path d="M3 2l3 23 5-7 5 10 4-2-5-10 9-1Z" fill="'+stroke+'" stroke="'+light+'" stroke-width="1.7" stroke-linejoin="round"/>'+
    '<path d="M7 7l2 13 3-5 6 10" fill="none" stroke="'+accent+'" stroke-width="1.3"/>';
  }else if(tool==='pen'||tool==='highlighter'){
   x=5;y=27;fallback='crosshair';
   art='<path d="M5 27L23 6l4 4L9 30Z" fill="'+stroke+'" stroke="'+light+'" stroke-width="1.7" stroke-linejoin="round"/>'+
    '<path d="M5 27l5-1 14-17" fill="none" stroke="'+accent+'" stroke-width="2"/>';
   if(tool==='highlighter')art='<path d="M5 27l6-1 18-18-6-6L5 21Z" fill="'+stroke+'" stroke="'+light+'" stroke-width="1.5"/>'+
    '<path d="M5 21l6 5" stroke="'+accent+'" stroke-width="4"/>';
  }else if(['erase-brush','erase-stroke','mask-erase','mask-restore'].includes(tool)){
   art='<circle cx="16" cy="16" r="'+w+'" fill="none" stroke="'+stroke+'" stroke-width="3"/>'+
    '<circle cx="16" cy="16" r="'+w+'" fill="none" stroke="'+light+'" stroke-width="1.4"/>'+
    '<circle cx="16" cy="16" r="1.25" fill="'+accent+'"/>';
   if(tool==='erase-stroke'||tool==='mask-erase')art+='<path d="M23 5l6 6m0-6l-6 6" stroke="'+stroke+'" stroke-width="3"/>'+
     '<path d="M23 5l6 6m0-6l-6 6" stroke="'+light+'" stroke-width="1.4"/>';
   if(tool==='mask-restore')art+='<path d="M25 4v10M20 9h10" stroke="'+stroke+'" stroke-width="3"/>'+
     '<path d="M25 4v10M20 9h10" stroke="'+light+'" stroke-width="1.4"/>';
  }else if(tool==='text'){
   x=16;y=16;fallback='text';
   art='<path d="M11 3h10M16 3v26M11 29h10 M8 5h5 M8 27h5" stroke="'+stroke+'" stroke-width="3.7"/>'+
     '<path d="M11 3h10M16 3v26M11 29h10 M8 5h5 M8 27h5" stroke="'+light+'" stroke-width="1.7"/>';
  }else if(tool==='redact'){
   art=cross+'<rect x="21" y="22" width="9" height="7" fill="'+stroke+'" stroke="'+light+'" stroke-width="1"/>';
  }else if(tool==='razor'){
   art=cross+'<path d="M22 21l8 8m0-8l-8 8" stroke="'+stroke+'" stroke-width="3"/>'+
    '<path d="M22 21l8 8m0-8l-8 8" stroke="'+accent+'" stroke-width="1.3"/>';
  }else if(tool==='range'){
   fallback='crosshair';
   art=cross+'<path d="M4 7h7M4 7v7 M28 25h-7M28 25v-7" stroke="'+accent+'" stroke-width="2"/>';
  }else{
   art=cross;
   const corner='<path d="M21 22h8v7h-8Z" fill="none" stroke="'+stroke+'" stroke-width="3"/>'+
    '<path d="M21 22h8v7h-8Z" fill="none" stroke="'+accent+'" stroke-width="1.5"/>';
   const shape={
    rectangle:corner,'rounded-rectangle':'<rect x="21" y="22" width="8" height="7" rx="2.4" fill="none" stroke="'+accent+'" stroke-width="1.5"/>',
    ellipse:'<ellipse cx="25" cy="25.5" rx="4.5" ry="3.5" fill="none" stroke="'+accent+'" stroke-width="1.6"/>',
    line:'<path d="M21 29l9-8" stroke="'+accent+'" stroke-width="1.7"/>',
    arrow:'<path d="M21 29l9-8h-6m6 0v6" fill="none" stroke="'+accent+'" stroke-width="1.6"/>',
    triangle:'<path d="M25 21l5 8H20Z" fill="none" stroke="'+accent+'" stroke-width="1.5"/>',
    diamond:'<path d="M25 21l5 4-5 4-5-4Z" fill="none" stroke="'+accent+'" stroke-width="1.5"/>',
    star:'<path d="M25 21l1.2 3 3.2.2-2.5 2 1 3-2.9-1.7-2.8 1.7.7-3-2.3-2 3.2-.2Z" fill="none" stroke="'+accent+'" stroke-width="1.2"/>',
    pentagon:'<path d="M25 21l5 3-2 5h-6l-2-5Z" fill="none" stroke="'+accent+'" stroke-width="1.2"/>',
    hexagon:'<path d="M23 21h5l3 4-3 4h-5l-3-4Z" fill="none" stroke="'+accent+'" stroke-width="1.2"/>',
    'speech-bubble':'<path d="M21 22h9v6h-5l-3 3v-3h-1Z" fill="none" stroke="'+accent+'" stroke-width="1.2"/>'
   };
   art+=(shape[tool]||corner);
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="geometricPrecision">'+art+'</svg>';
  return {svg,x,y,fallback};
 }
 function forTool(tool,diameter){
  const {svg,x,y,fallback}=cursorSVG(tool,diameter);
  return 'url("data:image/svg+xml,'+esc(svg)+'") '+x+' '+y+', '+fallback;
 }
 function getTool(doc,studio){
  return studio==='image'?(doc.getElementById('tool')?.value||'select'):
   (doc.body?.dataset?.clipTool||'select');
 }
 function diameterFor(doc,tool){
  if(tool==='erase-brush'||tool==='erase-stroke'){
   const px=Number(doc.getElementById('size')?.value)||32;
   const canvas=doc.getElementById('base'),wrap=doc.getElementById('canvas-wrap');
   const scale=canvas?.width&&wrap?.clientWidth?wrap.clientWidth/canvas.width:1;
   return Math.max(2,Math.min(13,px*scale/2));
  }
  if(tool==='mask-erase'||tool==='mask-restore'){
   const px=Number(doc.getElementById('image-mask-brush')?.value)||35;
   const canvas=doc.getElementById('base'),wrap=doc.getElementById('canvas-wrap');
   const scale=canvas?.width&&wrap?.clientWidth?wrap.clientWidth/canvas.width:1;
   return Math.max(2,Math.min(13,px*scale/2));
  }
  return 8;
 }
 function install(doc=document){
  const body=doc.body;
  const studio=body?.classList?.contains('studio-image')?'image':body?.classList?.contains('studio-clip')?'clip':null;
  if(!studio)return null;
  let previous='';
  function refresh(){
   const tool=getTool(doc,studio),diameter=diameterFor(doc,tool),key=tool+':'+Math.round(diameter);
   if(previous===key)return;previous=key;
   body.style.setProperty('--mango-precision-cursor',forTool(tool,diameter));
   body.dataset.mangoPrecisionTool=tool;
  }
  const schedule=()=>{(root.requestAnimationFrame||root.setTimeout)(refresh,0)};
  doc.addEventListener('input',schedule,true);
  doc.addEventListener('change',schedule,true);
  doc.addEventListener('click',schedule,true);
  doc.addEventListener('keydown',schedule,false);
  if(root.MutationObserver&&studio==='clip'){
   new root.MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['data-clip-tool']});
  }
  refresh();
  return {refresh,tool:()=>getTool(doc,studio)};
 }
 root.MangoPrecisionCursorsV071={cursorSVG,forTool,getTool,diameterFor,install};
 if(typeof document!=='undefined')install(document);
})(typeof globalThis!=='undefined'?globalThis:this);
