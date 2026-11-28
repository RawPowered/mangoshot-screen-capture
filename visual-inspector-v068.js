/* MangoShot v0.6.8 — visual-first inspectors, retaining v0.6.7 editor controls.
 * Original inputs stay in the DOM and remain the only model write path. */
(function(root){'use strict';
 if(typeof document==='undefined'||!root.MangoMotionUI||!root.MangoMotion)return;
 const el=id=>document.getElementById(id);
 const graphics=el('v062-graphics-panel'),clip=el('v062-clip-panel'),inspector=el('graphic-inspector');
 const motionPanel=document.querySelector('.v067-motion-inspector:not(.v067-transitions)');
 const clipMotion=document.querySelector('.v067-transitions');
 const layerList=el('layer-list'),styleBench=document.querySelector('.v063-design-bench');
 const form=document.querySelector('.v063-graphic-form'),drawers=document.querySelector('.v063-drawers');
 if(!graphics||!clip||!inspector||!motionPanel||!clipMotion||!layerList||!form||!drawers||!styleBench)return;
 const M=root.MangoMotion,view=()=>root.MangoClipView;
 const create=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const btn=(name,cls,title,action)=>{const b=create('button',cls,name);b.type='button';b.title=title;b.addEventListener('click',action);return b;};
 const signal=id=>el(id)?.dispatchEvent(new Event('change',{bubbles:true}));
 const set=id=>value=>{const target=el(id);if(!target||target.disabled)return;
  if(String(target.value)===String(value))return;target.value=String(value);signal(id);
 };
 const tabs=(host,items,key)=>{
  const bar=create('div','v068-subnav');bar.setAttribute('role','tablist');bar.setAttribute('aria-label',key==='graphic'?'Graphic editor sections':'Clip editor sections');
  const views=create('div','v068-subviews');const pages={};const controls={};
  let current='';try{current=root.localStorage?.getItem('MangoShot.VisualTab.v068.'+key)||'';}catch{}
  if(!items.some(x=>x[0]===current))current=items[0][0];
  const activate=(name,focus=false)=>{
   if(!pages[name]||controls[name].hidden)return false;
   current=name;for(const id of Object.keys(pages)){
    const active=id===name;pages[id].hidden=!active;controls[id].setAttribute('aria-selected',String(active));
    controls[id].tabIndex=active?0:-1;
   }
   if(focus)controls[name].focus();
   const scroll=document.querySelector('.v062-properties-body');if(scroll)scroll.scrollTop=0;
   try{root.localStorage?.setItem('MangoShot.VisualTab.v068.'+key,name);}catch{}
  };
  for(const [id,name] of items){
   const tab=btn(name,'v068-subtab','Open '+name+' tools',()=>activate(id));
   tab.setAttribute('role','tab');tab.id='v068-'+key+'-tab-'+id;tab.setAttribute('aria-controls','v068-'+key+'-panel-'+id);
   const page=create('section','v068-subpanel');page.id='v068-'+key+'-panel-'+id;
   page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby',tab.id);
   controls[id]=tab;pages[id]=page;bar.append(tab);views.append(page);
  }
  bar.addEventListener('keydown',e=>{
   if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
   const keys=Object.keys(pages).filter(k=>!controls[k].hidden);let index=keys.indexOf(current);if(!keys.length)return;
   if(e.key==='Home')index=0;else if(e.key==='End')index=keys.length-1;
   else index=(index+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+keys.length)%keys.length;
   e.preventDefault();e.stopPropagation();activate(keys[index],true);
  });
  host.prepend(views);host.prepend(bar);activate(current);
  return {bar,views,pages,activate,current:()=>current};
 };
 const graphicTabs=tabs(graphics,[['design','Design'],['transform','Transform'],['motion','Motion'],['advanced','Appearance'],['premium','Presets'],['numbers','Counters']],'graphic');
 const clipTabs=tabs(clip,[['edit','Edit'],['transitions','Transitions']],'clip');
 // Keep one compact layer switcher visible above all graphic subpages.
 const layerSection=layerList.closest('.inspector-section');
 const layerDock=create('details','v068-layers-dock');layerDock.open=true;
 const layerSummary=create('summary','', 'Layers');layerDock.append(layerSummary);
 const deleteSelected=btn('×','v0610-delete-selected','Delete selected graphic layer (Ctrl+Z to undo)',()=>{
  const l=selectLayer();if(l&&!l.locked&&!view()?.exporting?.())view()?.deleteLayer?.(l.id);
 });
 deleteSelected.setAttribute('aria-label','Delete selected graphic layer');
 layerDock.append(deleteSelected);
 if(layerSection)layerDock.append(layerSection);
 graphics.insertBefore(layerDock,graphicTabs.bar);
 // Preserve original visual style gallery, text editor and quick tools.
 graphicTabs.pages.design.append(styleBench,inspector);
 const selectedActions=create('div','ux44-selected-actions'),selectedName=create('strong','ux44-selected-name','No graphic selected');
 const shapeEdit=btn('Edit shape','ux44-selected-action','Edit shape geometry and paint',()=>{const l=selectLayer();if(l?.kind==='shape')root.MangoShapeStudioV0742?.open(l.id);});
 shapeEdit.id='ux44-edit-selected-shape';
 const effectEdit=btn('Effects','ux44-selected-action','Edit selected layer appearance and filters',()=>root.MangoLayerStudioUIV0712?.open('effects'));
 effectEdit.id='ux44-edit-selected-effects';
 const keysEdit=btn('Motion','ux44-selected-action','Edit transform keyframes in Motion Studio',()=>root.MangoMotionStudioV0750?.open());
 keysEdit.id='ux44-edit-selected-keys';
 selectedActions.append(selectedName,shapeEdit,effectEdit,keysEdit);
 graphics.insertBefore(selectedActions,graphicTabs.bar);
 const title=inspector.querySelector('h3');if(title)title.textContent='Selected graphic';
 // Move the manual v0.6.3 drawers, do not recreate their fields or handlers.
 const transformFields=create('div','v063-drawers ms59-transform-fields');
 for(const drawer of [...drawers.children]){
  if(drawer.querySelector('#graphic-x,#graphic-shape-height,#graphic-tail-x,#graphic-in,#graphic-duplicate')){transformFields.append(drawer);if(drawer.querySelector('#graphic-x,#graphic-in'))drawer.open=true;}
 }
 graphicTabs.pages.transform.append(create('h3','v068-page-title','Base geometry & layer timing'),transformFields,create('p','v068-note','Base position and opacity are separate from animated offsets and multipliers in Motion. Moving a whole layer preserves its keyframe timing.'));
 graphicTabs.pages.advanced.append(create('h3','v068-page-title','Typography, paint & style'),drawers,create('p','v068-note','Change base appearance here; use Motion for animated opacity or transforms. Effects Studio owns ordered filters and materials.'));
 const emptyTransform=create('p','v068-note ms59-no-selection','Select a graphic layer on the timeline or in Layers.');graphicTabs.pages.transform.prepend(emptyTransform);
 // Relocate the original v0.6.7 fields into deliberate "Fine tuning" drawers.
 const originals=[...motionPanel.querySelectorAll('fieldset')];
 const entryField=originals.find(f=>f.querySelector('#v067-enter-type'));
 const exitField=originals.find(f=>f.querySelector('#v067-exit-type'));
 const numericField=originals.find(f=>f.querySelector('#v067-number-type'));
 const motionAdvanced=create('details','v068-precision');
 motionAdvanced.append(create('summary','','Fine timing & easing'));
 if(entryField)motionAdvanced.append(entryField);
 if(exitField)motionAdvanced.append(exitField);
 const numberAdvanced=create('details','v068-precision');
 numberAdvanced.append(create('summary','','Exact values & formatting'));
 if(numericField)numberAdvanced.append(numericField);
 // v0.6.7 sync still owns the original inputs, even when their wrapper is detached.
 motionPanel.remove();
 const clipBody=clipMotion.querySelector('.v067-motion-content');
 const transitionAdvanced=create('details','v068-precision');
 transitionAdvanced.append(create('summary','','Exact transition settings'));
 if(clipBody)transitionAdvanced.append(clipBody);
 clipMotion.remove();
 // Clip transition tools live under Clip, never under Callouts.
 for(const child of [...clip.children])if(child!==clipTabs.bar&&child!==clipTabs.views)clipTabs.pages.edit.append(child);
 const header=(title,desc)=>{const box=create('div','v068-heading');
  box.append(create('strong','',title),create('span','',desc));return box;};
 const hint=(txt)=>create('p','v068-note',txt);
 const selectLayer=()=>view()?.layers?.()?.find(l=>l.id===view()?.selectedLayer?.())||null;
 const validGraphic=()=>{const l=selectLayer();return !!l&&!l.locked&&!view()?.exporting?.()&&!view()?.isPlaying?.()&&!view()?.multitrackBusy?.()&&!root.MangoCreativeUI?.voice?.state?.().recording;};
 const selectedTransition=()=>{const index=view()?.selectedClip?.();const parts=view()?.segments?.()||[];
  return Number.isInteger(index)&&index>0&&index<parts.length?{index,parts}:null;};
 const preview=(mode)=>{
  const st=view(),layer=selectLayer();if(!st?.original?.()||st.exporting())return;
  let point=0;
  if(mode==='transition'){const selected=selectedTransition();if(!selected)return;
   const boundary=selected.parts.slice(0,selected.index).reduce((n,p)=>n+p.end-p.start,0);
   const prior=selected.parts[selected.index-1],next=selected.parts[selected.index];
   const current=st.transitions?.().find(t=>Math.abs(t.fromEnd-prior.end)<.00001&&Math.abs(t.toStart-next.start)<.00001);
   point=boundary-(current?.duration||.45)/2-.16;
  }else if(layer){const spec=M.checkLayer(layer.motion),duration=spec[mode]?.duration||.45;
   point=mode==='exit'?Math.max(layer.start,layer.end-Math.min(duration,(layer.end-layer.start)/2)-.16):layer.start-.08;
  }else return;
  st.seekOutput(Math.max(0,point));
  if(!st.isPlaying?.())el('program-play')?.click();
 };
 function sectionTabs(labels,handler){const container=create('div','v068-segments');container.setAttribute('role','group');
  for(const [key,label] of labels){const b=btn(label,'v068-segment','Show '+label,()=>handler(key));
   b.dataset.key=key;container.append(b);
  }return container;
 }
 function card(value,name,description,kind,click){const b=btn('','v068-effect-card','Choose '+name+'. '+description,click);
  b.dataset.effect=value;b.dataset.kind=kind;b.setAttribute('aria-pressed','false');
  const art=create('span','v068-effect-art'),glyph=create('span','v068-glyph',kind==='number'?'88':kind==='transition'?'▰':'Aa');
  art.append(glyph);b.append(art,create('span','v068-effect-name',name));
  b.append(create('span','v068-effect-subtitle',description));return b;
 }
 const effects=[
  ['none','None','No entrance','basic'],['fade','Fade','Soft reveal','basic'],
  ['slideUp','Rise','Upward motion','basic'],['slideDown','Drop','From above','basic'],
  ['pop','Pop','Fast emphasis','basic'],['typeIn','Type In','Letter reveal','basic'],
  ['spinLetters','Spin Letters','Viral lettering','viral'],['bounce','Bounce','Elastic motion','viral'],
  ['zoom','Zoom Burst','Punch in','viral'],['spin','Spin','Rotating text','viral'],
  ['flip','Flip','Turn in','viral'],['slideLeft','Slide Left','Side motion','viral'],
  ['slideRight','Slide Right','Other direction','viral']
 ];
 const motionView=graphicTabs.pages.motion,transformMotion=el('ms50-panel');if(transformMotion){motionView.append(transformMotion);transformMotion.open=true;}const entryMotion=create('div','ms59-entry-motion');motionView.append(entryMotion);entryMotion.append(header('Entry & exit presets','Separate from transform keyframes · exact settings below'));
 const phaseSwitch=sectionTabs([['enter','Entry'],['exit','Exit']],phase=>{currentPhase=phase;drawMotion();});
 entryMotion.append(phaseSwitch);
 const effectFilter=sectionTabs([['basic','Essentials'],['viral','Viral']],group=>{effectGroup=group;drawMotion();});
 entryMotion.append(effectFilter);
 const motionGrid=create('div','v068-effects-grid');motionGrid.setAttribute('role','group');motionGrid.setAttribute('aria-label','Text animation effects');
 for(const [value,name,desc,group] of effects){
  const b=card(value,name,desc,'motion',()=>set('v067-'+currentPhase+'-type')(value));
  b.dataset.group=group;motionGrid.append(b);
 }
 entryMotion.append(motionGrid);
 const durationRow=create('div','v068-control-row');durationRow.append(create('label','v068-control-label','Animation duration'));
 const durationValue=create('output','v068-duration-value','0.45 s');
 durationRow.append(durationValue);entryMotion.append(durationRow);
 const durationSlider=create('input','v068-range');durationSlider.type='range';durationSlider.min=.08;durationSlider.max=5;
 durationSlider.step=.05;durationSlider.setAttribute('aria-label','Animation duration');
 durationSlider.addEventListener('input',()=>{durationValue.textContent=Number(durationSlider.value).toFixed(2)+' s';});
 durationSlider.addEventListener('change',()=>set('v067-'+currentPhase+'-duration')(Number(durationSlider.value)));
 entryMotion.append(durationSlider);
 const speedRow=create('div','v068-speed-row');
 for(const [name,value] of [['Snappy',.25],['Natural',.55],['Cinematic',1.2]]){
  speedRow.append(btn(name,'v068-chip','Set '+name+' timing',()=>set('v067-'+currentPhase+'-duration')(value)));
 }
 entryMotion.append(speedRow);
 entryMotion.append(btn('▶ Preview '+ 'animation','v068-preview','Play real graphic motion in Program Monitor',()=>preview(currentPhase)));
 entryMotion.append(motionAdvanced);
 const motionEmpty=hint('Select an unlocked text or callout layer to edit its motion.');
 motionView.prepend(motionEmpty);
 let currentPhase='enter',effectGroup='basic';
 function drawMotion(){
  const l=selectLayer(),ok=validGraphic();motionEmpty.hidden=!!l;
  for(const b of phaseSwitch.children)b.setAttribute('aria-pressed',String(b.dataset.key===currentPhase));
  for(const b of effectFilter.children)b.setAttribute('aria-pressed',String(b.dataset.key===effectGroup));
  const active=el('v067-'+currentPhase+'-type')?.value||'none';
  const duration=Number(el('v067-'+currentPhase+'-duration')?.value||.45);
  durationSlider.value=String(Math.min(5,Math.max(.08,duration)));
  durationSlider.disabled=!ok;durationValue.textContent=duration.toFixed(2)+' s';
  for(const b of motionGrid.children){b.hidden=b.dataset.group!==effectGroup;b.disabled=!ok;
   b.setAttribute('aria-pressed',String(b.dataset.effect===active));}
  for(const b of speedRow.children)b.disabled=!ok;
  const p=motionView.querySelector('.v068-preview');if(p)p.disabled=!ok;
 }
 // Numeric controls use templates before exact manual values.
 const numberView=graphicTabs.pages.numbers;numberView.append(header('Counters & Timers','Dynamic overlays without keyframes'));
 const numericModes=[
  ['none','Static','No counting'],['countUp','Count Up','0 → 100'],
  ['countDown','Count Down','100 → 0'],['timerUp','Timer Up','00:00 → 02:00'],
  ['timerDown','Countdown','00:30 → 00:00']
 ];
 const numberGrid=create('div','v068-effects-grid v068-number-grid');numberGrid.setAttribute('role','group');numberGrid.setAttribute('aria-label','Counter and timer types');
 for(const [value,name,desc] of numericModes){
  numberGrid.append(card(value,name,desc,'number',()=>set('v067-number-type')(value)));
 }
 numberView.append(numberGrid);
 numberView.append(create('span','v068-micro-heading','QUICK START'));
 const numberPresets=create('div','v068-preset-grid');
 const options=[
  ['0 → 100%','countUp',0,100,'','%',0,2],['$0 → $10K','countUp',0,10000,'$','',0,2],
  ['30s countdown','timerDown',30,0,'','',0,30],['2m timer','timerUp',0,120,'','',0,120]
 ];
 for(const [label,mode,from,to,prefix,suffix,decimals,duration] of options){
  numberPresets.append(btn(label,'v068-preset','Use '+label,()=>{
   const l=selectLayer();if(!l||!validGraphic())return;
   const motion=M.checkLayer(l.motion);
   motion.numeric={type:mode,from,to,prefix,suffix,decimals,duration};
   view()?.updateLayer(l.id,{motion});
  }));
 }
 numberView.append(numberPresets);
 const numberPreview=create('div','v068-number-preview');
 numberPreview.append(create('span','v068-micro-heading','AT A GLANCE'));
 const sample=create('strong','v068-number-sample','100');
 const numberDetails=create('span','v068-number-details','0 → 100');numberPreview.append(sample,numberDetails);numberView.append(numberPreview);
 const numDurationRow=create('div','v068-control-row');numDurationRow.append(create('label','v068-control-label','Count / timer duration'));
 const numValue=create('output','v068-duration-value','2.0 s');numDurationRow.append(numValue);numberView.append(numDurationRow);
 const numSlider=create('input','v068-range');numSlider.type='range';numSlider.min=.1;numSlider.max=120;numSlider.step=.1;
 numSlider.setAttribute('aria-label','Counter duration in seconds');
 numSlider.addEventListener('input',()=>numValue.textContent=Number(numSlider.value).toFixed(1)+' s');
 numSlider.addEventListener('change',()=>set('v067-number-duration')(Number(numSlider.value)));numberView.append(numSlider);
 numberView.append(btn('▶ Preview counter','v068-preview','Play numeric graphic in Program Monitor',()=>preview('enter')));
 numberView.append(numberAdvanced);
 const numberEmpty=hint('Select an unlocked text or callout layer to configure numbers.');
 numberView.prepend(numberEmpty);
 function drawNumbers(){
  const l=selectLayer(),ok=validGraphic();numberEmpty.hidden=!!l;
  const n=M.checkLayer(l?.motion).numeric;
  for(const b of numberGrid.children){b.setAttribute('aria-pressed',String(b.dataset.effect===n.type));b.disabled=!ok;}
  for(const b of numberPresets.children)b.disabled=!ok;
  numSlider.value=String(Math.min(120,Math.max(.1,n.duration)));numSlider.disabled=!ok;
  numValue.textContent=n.duration.toFixed(1)+' s';
  const display=M.numberText(n,n.duration*.65);
  sample.textContent=display??(l?.text||'Add text');
  numberDetails.textContent=n.type==='none'?'Static text':(n.type==='timerUp'||n.type==='timerDown'?'Seconds':'Values')+
   ': '+n.from.toLocaleString('en-US')+' → '+n.to.toLocaleString('en-US');
  const p=numberView.querySelector('.v068-preview');if(p)p.disabled=!ok;
 }
 const transitions=clipTabs.pages.transitions;transitions.append(header('Clip Transitions','Choose an opening effect'));
 const clipEmpty=hint('Select the second or any later V1 clip to edit the transition at its start.');
 transitions.append(clipEmpty);
 const transitionFilters=sectionTabs([['basic','Essentials'],['viral','Viral']],group=>{transitionGroup=group;drawTransitions();});
 transitions.append(transitionFilters);
 const transitionsGrid=create('div','v068-effects-grid');transitionsGrid.setAttribute('role','group');transitionsGrid.setAttribute('aria-label','Clip opening transition effects');
 const transitionChoices=[
  ['none','Hard Cut','No effect','basic'],['dipBlack','Black Dip','Classic transition','basic'],
  ['dipWhite','White Dip','Soft bright dip','basic'],['flash','White Flash','Quick impact','basic'],
  ['wipeLeft','Wipe Left','Horizontal reveal','basic'],['wipeRight','Wipe Right','Reverse reveal','basic'],
  ['iris','Iris','Circular reveal','viral'],['slideIn','Slide In','Direction motion','viral'],
  ['zoomPunch','Zoom Punch','Viral zoom','viral'],['spinIn','Spin Reveal','Rotating reveal','viral']
 ];
 for(const [value,name,desc,group] of transitionChoices){
  const b=card(value,name,desc,'transition',()=>set('v067-transition-type')(value));b.dataset.group=group;transitionsGrid.append(b);
 }
 transitions.append(transitionsGrid);
 const transitionDurationRow=create('div','v068-control-row');
 transitionDurationRow.append(create('label','v068-control-label','Transition length'));
 const transitionValue=create('output','v068-duration-value','0.45 s');transitionDurationRow.append(transitionValue);transitions.append(transitionDurationRow);
 const transitionSlider=create('input','v068-range');transitionSlider.type='range';transitionSlider.min=.08;transitionSlider.max=2;transitionSlider.step=.05;
 transitionSlider.setAttribute('aria-label','Transition duration');transitions.append(transitionSlider);
 transitionSlider.addEventListener('input',()=>transitionValue.textContent=Number(transitionSlider.value).toFixed(2)+' s');
 transitionSlider.addEventListener('change',()=>set('v067-transition-duration')(Number(transitionSlider.value)));
 transitions.append(btn('▶ Preview cut','v068-preview','Play real clip boundary from before the cut',()=>preview('transition')));
 transitions.append(hint('These are single-decoder cut treatments; A1 audio remains a hard cut. True video and audio crossfades require the multi-source compositor.'));
 transitions.append(transitionAdvanced);
 let transitionGroup='basic';
 function drawTransitions(){
  const selected=selectedTransition(),ok=!!selected&&!view()?.exporting?.();
  clipEmpty.hidden=!!selected;
  const type=el('v067-transition-type')?.value||'none';
  const duration=Number(el('v067-transition-duration')?.value)||.45;
  for(const b of transitionFilters.children)b.setAttribute('aria-pressed',String(b.dataset.key===transitionGroup));
  for(const b of transitionsGrid.children){b.hidden=b.dataset.group!==transitionGroup;b.disabled=!ok;
   b.setAttribute('aria-pressed',String(b.dataset.effect===type));}
  transitionSlider.disabled=!ok;transitionSlider.value=String(Math.min(2,Math.max(.08,duration)));
  transitionValue.textContent=duration.toFixed(2)+' s';
  const p=transitions.querySelector('.v068-preview');if(p)p.disabled=!ok;
 }
 function sync(){
  const l=selectLayer();layerSummary.textContent='Layers · '+(view()?.layers?.()?.length||0)+(l?' · '+l.name:' · Select a layer');
  deleteSelected.disabled=!l||l.locked||!!view()?.exporting?.();
  deleteSelected.title=l?'Delete '+l.name+' (Ctrl+Z to undo)':'Select a layer to delete';
  const shape=l?.kind==='shape';graphics.dataset.ux44Kind=l?.kind||'';selectedActions.hidden=!l;selectedName.textContent=l?.name||'';shapeEdit.hidden=!shape;for(const b of [shapeEdit,effectEdit,keysEdit])b.disabled=!l||l.locked||!!view()?.exporting?.()||!!view()?.isPlaying?.()||!!view()?.multitrackBusy?.();for(const key of ['premium','numbers']){const tab=graphicTabs.bar.querySelector('#v068-graphic-tab-'+key);tab.hidden=!!shape;}if(shape&&['premium','numbers'].includes(graphicTabs.current()))graphicTabs.activate('design');
  drawers.hidden=!l;transformFields.hidden=!l;emptyTransform.hidden=!!l;
  transitionAdvanced.hidden=!selectedTransition();
  const current=el('v067-'+currentPhase+'-type')?.value||'none';
  const match=effects.find(x=>x[0]===current);
  if(match&&match[3]!==effectGroup)effectGroup=match[3];
  drawMotion();drawNumbers();drawTransitions();
 }
 const old=root.MangoMotionUI.sync;
 root.MangoMotionUI.sync=function(){const result=old.apply(root.MangoMotionUI,arguments);sync();return result;};
 // Make the top-level inspector navigation one row and preserve its existing IDs/listeners.
 const mainTabs=document.querySelector('.v062-property-tabs');mainTabs?.classList.add('v068-main-tabs');
 mainTabs?.addEventListener('click',()=>{const scroll=document.querySelector('.v062-properties-body');if(scroll)scroll.scrollTop=0;});
 root.MangoVisualInspectorV068={sync,graphicTabs,clipTabs,activateMotion:()=>{root.MangoWorkspaceV062?.activate?.('graphics');graphicTabs.activate('motion');},
  activateTransitions:()=>{root.MangoWorkspaceV062?.activate?.('clip');clipTabs.activate('transitions');}};
 root.MangoMotionUI.sync();
})(typeof globalThis!=='undefined'?globalThis:this);
