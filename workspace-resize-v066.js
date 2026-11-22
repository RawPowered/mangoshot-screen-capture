/* MangoShot v0.6.6 — draggable panel separators, persisted per workspace.
   Grid sizing only: media and edit timeline are never reparented or reloaded. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const body=document.body,layout=document.querySelector('.clip-layout');
 const program=document.querySelector('.clip-program'),properties=document.querySelector('.clip-properties');
 const timeline=document.querySelector('.clip-timeline-panel'),media=document.querySelector('.v062-media-dock');
 if(!body?.classList.contains('v065-viewport')||!layout||!program||!properties||!timeline||!media)return;
 const store='MangoShot.ClipLayout.v066.',valid=new Set(['edit','graphics','timeline']);
 const defaults={
  edit:{top:.45,dock:119,side:320},
  graphics:{top:.53,dock:105,side:385},
  timeline:{top:.34,dock:91,side:285}
 };
 const clone=x=>({...x}),clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
 const profile=()=>valid.has(body.dataset.workspace)?body.dataset.workspace:'edit';
 const desktop=()=>!!root.matchMedia?.('(min-width:901px) and (min-height:601px)')?.matches;
 const available=()=>Math.max(0,layout.clientHeight-24);
 const minTop=()=>root.innerHeight<761?155:195;
 const minTimeline=()=>root.innerHeight<761?175:195;
 const bound=config=>{
  const width=Math.max(0,layout.clientWidth-65),total=available();
  const side=clamp(Number(config.side),260,Math.max(260,Math.min(620,width-260)));
  const dock=clamp(Number(config.dock),36,Math.max(36,Math.min(240,total-minTop()-minTimeline())));
  const maxTop=Math.max(minTop(),total-dock-minTimeline());
  const topPx=clamp(clamp(Number(config.top),.12,.8)*total,minTop(),maxTop);
  return {top:total?topPx/total:.45,dock,side};
 };
 const states={};
 for(const name of valid){
  try{
   const raw=JSON.parse(root.localStorage?.getItem(store+name)||'null');
   states[name]=bound(raw&&typeof raw==='object'?raw:defaults[name]);
  }catch{states[name]=bound(defaults[name]);}
 }
 let dragging=null,scheduled=false;
 const handles={};
 function createHandle(name,orientation,label){
  const h=document.createElement('div');h.className='v066-splitter v066-splitter-'+name;
  h.dataset.split=name;h.tabIndex=0;h.setAttribute('role','separator');
  h.setAttribute('aria-orientation',orientation);
  h.setAttribute('aria-label',label);
  h.setAttribute('aria-valuemin',name==='side'?'260':name==='dock'?'36':'0');
  h.setAttribute('aria-valuemax',name==='side'?'620':name==='dock'?'240':'100');
  h.title=label+' · Drag or use arrow keys · Double click to reset';
  layout.append(h);handles[name]=h;return h;
 }
 createHandle('side','vertical','Resize Program Monitor and Properties widths');
 createHandle('top','horizontal','Resize Program Monitor and editing timeline heights');
 createHandle('dock','horizontal','Resize timeline and Media Library heights');
 function save(name){try{root.localStorage?.setItem(store+name,JSON.stringify(states[name]));}catch{}}
 function draw(){
  scheduled=false;
  if(!desktop())return;
  const name=profile(),state=states[name]=bound(states[name]);
  const top=Math.round(state.top*available());
  layout.style.setProperty('--v066-side',state.side+'px');
  layout.style.setProperty('--v066-top',top+'px');
  layout.style.setProperty('--v066-dock',state.dock+'px');
  const base=layout.getBoundingClientRect(),prog=program.getBoundingClientRect(),
    track=timeline.getBoundingClientRect(),dock=media.getBoundingClientRect();
  handles.side.style.left=(prog.right-base.left)+'px';
  handles.side.style.top=(prog.top-base.top)+'px';
  handles.side.style.height=prog.height+'px';
  handles.top.style.left=(track.left-base.left)+'px';
  handles.top.style.top=(track.top-base.top)+'px';
  handles.top.style.width=track.width+'px';
  handles.dock.style.left=(dock.left-base.left)+'px';
  handles.dock.style.top=(dock.top-base.top)+'px';
  handles.dock.style.width=dock.width+'px';
  handles.dock.hidden=body.classList.contains('v065-bin-collapsed');
  handles.side.setAttribute('aria-valuenow',String(Math.round(state.side)));
  handles.top.setAttribute('aria-valuenow',String(Math.round(state.top*100)));
  handles.dock.setAttribute('aria-valuenow',String(Math.round(state.dock)));
 }
 function redraw(){if(scheduled)return;scheduled=true;(root.requestAnimationFrame||root.setTimeout)(draw);}
 function modify(name,axis,delta){
  const current=clone(states[name]);
  if(axis==='side')current.side+=delta;
  if(axis==='top')current.top+=delta/Math.max(1,available());
  if(axis==='dock')current.dock-=delta;
  states[name]=bound(current);redraw();
 }
 for(const [axis,element] of Object.entries(handles)){
  element.addEventListener('pointerdown',event=>{
   if(event.button!==0||!desktop()||(axis==='dock'&&body.classList.contains('v065-bin-collapsed')))return;
   event.preventDefault();dragging={axis,id:event.pointerId,x:event.clientX,y:event.clientY,workspace:profile()};
   element.setPointerCapture?.(event.pointerId);
   body.classList.add('v066-resizing');
  });
  element.addEventListener('pointermove',event=>{
   if(!dragging||dragging.axis!==axis||dragging.id!==event.pointerId)return;
   event.preventDefault();
   const delta=axis==='side'?dragging.x-event.clientX:event.clientY-dragging.y;
   if(Math.abs(delta)<.5)return;
   modify(dragging.workspace,axis,delta);
   dragging.x=event.clientX;dragging.y=event.clientY;
  });
  function finish(){if(!dragging||dragging.axis!==axis)return;
   save(dragging.workspace);dragging=null;body.classList.remove('v066-resizing');redraw();
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,finish);
  element.addEventListener('keydown',event=>{
   const delta=event.shiftKey?32:8;
   if(axis==='side'&&!['ArrowLeft','ArrowRight'].includes(event.key))return;
   if(axis!=='side'&&!['ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();
   modify(profile(),axis,(['ArrowLeft','ArrowUp'].includes(event.key)?-delta:delta)*(axis==='side'?-1:1));
   save(profile());
  });
  element.addEventListener('dblclick',()=>{states[profile()][axis==='top'?'top':axis==='dock'?'dock':'side']=defaults[profile()][axis==='top'?'top':axis==='dock'?'dock':'side'];states[profile()]=bound(states[profile()]);save(profile());redraw();});
 }
 const video=document.getElementById('video'),previewFrame=document.getElementById('clip-preview-frame');
 video?.addEventListener('loadedmetadata',()=>{
  if(video.videoWidth>0&&video.videoHeight>0){
   previewFrame?.style.setProperty('--mango-aspect',String(video.videoWidth/video.videoHeight));
   redraw();
  }
 });
 const transport=document.querySelector('.workspace-switch');
 const layouts=document.createElement('details');layouts.className='v066-layout-menu';
 const summary=document.createElement('summary');summary.textContent='▣ Panels';summary.title='Adjust, save or restore workspace dimensions';
 layouts.append(summary);
 const options=document.createElement('div');options.className='v066-layout-options';
 const presets=[
  ['Balanced','edit',{top:.45,dock:119,side:320}],
  ['Editing focus','edit',{top:.32,dock:95,side:280}],
  ['Preview focus','edit',{top:.60,dock:91,side:275}],
  ['Graphics focus','graphics',{top:.53,dock:100,side:405}],
  ['Timeline focus','timeline',{top:.30,dock:90,side:285}]
 ];
 for(const [label,workspace,settings] of presets){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.addEventListener('click',()=>{
   document.querySelector('[data-workspace="'+workspace+'"]')?.click();
   states[workspace]=bound(settings);save(workspace);redraw();layouts.open=false;
  });
  options.append(b);
 }
 const reset=document.createElement('button');reset.type='button';reset.textContent='Reset current workspace sizes';
 reset.addEventListener('click',()=>{const name=profile();states[name]=bound(defaults[name]);save(name);redraw();layouts.open=false;});
 options.append(reset);layouts.append(options);
 transport?.after(layouts);
 const view=[...document.querySelectorAll('.v06-menu')].find(e=>e.querySelector('summary')?.textContent.trim()==='View');
 const viewPop=view?.querySelector('.v06-menu-pop');
 if(viewPop){
  const b=document.createElement('button');b.type='button';b.textContent='Reset panel layout';
  b.addEventListener('click',()=>{reset.click();view.open=false;});
  viewPop.append(b);
 }
 const mediaToggle=document.getElementById('v065-media-toggle');
 mediaToggle?.addEventListener('click',redraw);
 root.addEventListener('resize',redraw,{passive:true});
 if(root.ResizeObserver){const ro=new root.ResizeObserver(redraw);ro.observe(layout);}
 if(root.MutationObserver){
  const watch=new root.MutationObserver(records=>{
   if(records.some(r=>r.attributeName==='data-workspace'||r.attributeName==='class'))redraw();
  });
  watch.observe(body,{attributes:true,attributeFilter:['data-workspace','class']});
 }
 root.MangoPanelsV066={states:()=>Object.fromEntries(Object.entries(states).map(([k,v])=>[k,clone(v)])),
  modify:(axis,delta)=>{modify(profile(),axis,delta);save(profile());},
  reset:()=>reset.click(),refresh:redraw,defaults};
 redraw();
})(typeof globalThis!=='undefined'?globalThis:this);
