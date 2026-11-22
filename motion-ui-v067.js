/* MangoShot v0.6.7 — motion inspector; all changes use existing undoable transactions. */
(function(root){'use strict';
 const view=()=>root.MangoClipView,el=id=>document.getElementById(id);
 const inspector=el('graphic-inspector'),side=document.querySelector('.clip-properties');
 if(!inspector||!side||!root.MangoMotion)return;
 const M=root.MangoMotion;
 const textPanel=document.createElement('details');textPanel.className='v067-motion-inspector';textPanel.open=false;
 const textSummary=document.createElement('summary');textSummary.textContent='Motion · Entry, Exit & Numbers';textPanel.append(textSummary);
 const body=document.createElement('div');body.className='v067-motion-content';textPanel.append(body);
 function select(label,id,items){
  const wrap=document.createElement('label');wrap.textContent=label;
  const control=document.createElement('select');control.id=id;
  for(const [value,title] of items){const opt=document.createElement('option');opt.value=value;opt.textContent=title;control.append(opt);}
  wrap.append(control);return wrap;
 }
 function number(label,id,min,max,step){
  const wrap=document.createElement('label');wrap.textContent=label;
  const control=document.createElement('input');control.id=id;control.type='number';control.min=min;control.max=max;control.step=step;
  wrap.append(control);return wrap;
 }
 const motionChoices=[
  ['none','None'],['fade','Fade'],['slideUp','Slide up'],['slideDown','Slide down'],['slideLeft','Slide left'],['slideRight','Slide right'],
  ['pop','Pop'],['bounce','Bounce'],['zoom','Zoom burst'],['spin','Spin'],['flip','Flip'],
  ['typeIn','Type in'],['spinLetters','Spin letters into sentence']
 ];
 const easy=[['linear','Linear'],['easeIn','Ease in'],['easeOut','Ease out'],['easeInOut','Ease in/out'],['back','Back / overshoot']];
 for(const [key,title] of [['enter','Entry'],['exit','Exit']]){
  const section=document.createElement('fieldset');section.className='v067-section';
  const legend=document.createElement('legend');legend.textContent=title+' animation';section.append(legend);
  section.append(select('Effect','v067-'+key+'-type',motionChoices));
  const row=document.createElement('div');row.className='v067-grid';row.append(
   number('Duration (seconds)','v067-'+key+'-duration',.08,5,.05),
   select('Easing','v067-'+key+'-ease',easy));section.append(row);body.append(section);
 }
 const num=document.createElement('fieldset');num.className='v067-section';
 const legend=document.createElement('legend');legend.textContent='Dynamic numbers & timers';num.append(legend);
 num.append(select('Mode','v067-number-type',[
  ['none','Static text'],['countUp','Count up'],['countDown','Count down'],['timerUp','Timer up (MM:SS)'],['timerDown','Timer countdown (MM:SS)']]));
 const numbers=document.createElement('div');numbers.className='v067-grid';
 numbers.append(number('Starting value','v067-number-from',-100000000,100000000,1),
   number('Ending value','v067-number-to',-100000000,100000000,1),
   number('Animation seconds','v067-number-duration',.08,3600,.1),
   number('Decimal places','v067-number-decimals',0,3,1));num.append(numbers);
 for(const [label,id] of [['Prefix','v067-number-prefix'],['Suffix','v067-number-suffix']]){
  const l=document.createElement('label');l.textContent=label;
  const input=document.createElement('input');input.id=id;input.maxLength=24;input.placeholder=label==='Prefix'?'$': '%';
  l.append(input);num.append(l);
 }
 body.append(num);
 const hint=document.createElement('p');hint.className='inspector-hint';
 hint.textContent='All effects are editable and use edited-sequence time. Entry and exit each use up to half the layer duration. Preview and browser export share the same Canvas painter.';
 body.append(hint);inspector.append(textPanel);
 const clipPanel=document.createElement('details');clipPanel.className='v067-motion-inspector v067-transitions';
 const clipSummary=document.createElement('summary');clipSummary.textContent='V1 · Opening Transition';clipPanel.append(clipSummary);
 const clipBody=document.createElement('div');clipBody.className='v067-motion-content';
 clipBody.append(select('Transition','v067-transition-type',[
  ['none','Hard cut / None'],['dipBlack','Dip to black'],['dipWhite','Dip to white'],['flash','White flash'],['wipeLeft','Reveal wipe left'],
  ['wipeRight','Reveal wipe right'],['iris','Iris reveal'],['slideIn','Slide in'],['zoomPunch','Zoom punch'],['spinIn','Spin reveal']]));
 const clipRow=document.createElement('div');clipRow.className='v067-grid';
 clipRow.append(number('Duration (seconds)','v067-transition-duration',.08,2,.05),select('Easing','v067-transition-ease',easy));clipBody.append(clipRow);
 const note=document.createElement('p');note.className='inspector-hint';
 note.textContent='Select the second or later V1 clip to apply an opening cut treatment. Single-decoder effects are not two-source crossfades. Audio follows existing hard-cut edit boundaries.';
 clipBody.append(note);clipPanel.append(clipBody);side.insertBefore(clipPanel,inspector.nextSibling);
 const ids=['v067-enter-type','v067-enter-duration','v067-enter-ease','v067-exit-type','v067-exit-duration','v067-exit-ease',
  'v067-number-type','v067-number-from','v067-number-to','v067-number-duration','v067-number-decimals','v067-number-prefix','v067-number-suffix'];
 const textLayer=()=>view()?.layers?.().find(l=>l.id===view()?.selectedLayer?.());
 function sync(){
  const layer=textLayer(),enabled=!!layer;
  textPanel.hidden=!enabled;
  if(enabled){
   const value=M.checkLayer(layer.motion);
   for(const key of ['enter','exit']){
    el('v067-'+key+'-type').value=value[key].type;
    el('v067-'+key+'-duration').value=value[key].duration;
    el('v067-'+key+'-ease').value=value[key].ease;
   }
   for(const key of ['type','from','to','duration','decimals','prefix','suffix'])
    el('v067-number-'+key).value=value.numeric[key];
   for(const id of ids)el(id).disabled=layer.locked||view()?.exporting?.();
  }
  const index=view()?.selectedClip?.(),parts=view()?.segments?.()||[];
  clipPanel.hidden=!(Number.isInteger(index)&&index>0&&index<parts.length);
  if(!clipPanel.hidden){
   const a=parts[index-1],b=parts[index];
   const transition=(view()?.transitions?.()||[]).find(t=>Math.abs(t.fromEnd-a.end)<.00001&&Math.abs(t.toStart-b.start)<.00001);
   el('v067-transition-type').value=transition?.type||'none';
   el('v067-transition-duration').value=transition?.duration||.45;
   el('v067-transition-ease').value=transition?.ease||'easeInOut';
   for(const id of ['v067-transition-type','v067-transition-duration','v067-transition-ease'])el(id).disabled=!!view()?.exporting?.();
  }
 }
 function saveMotion(){
  const layer=textLayer();if(!layer||layer.locked||view()?.exporting?.())return;
  const motion=M.defaults();
  for(const key of ['enter','exit']){
   motion[key].type=el('v067-'+key+'-type').value;
   motion[key].duration=Number(el('v067-'+key+'-duration').value);
   motion[key].ease=el('v067-'+key+'-ease').value;
  }
  for(const key of ['type','prefix','suffix'])motion.numeric[key]=el('v067-number-'+key).value;
  for(const key of ['from','to','duration','decimals'])motion.numeric[key]=Number(el('v067-number-'+key).value);
  try{M.checkLayer(motion);view().updateLayer(layer.id,{motion});}
  catch(error){view().message?.(error.message);sync();}
 }
 for(const id of ids)el(id).addEventListener('change',saveMotion);
 function saveTransition(){const index=view()?.selectedClip?.();if(!Number.isInteger(index)||index<1)return;
  view().updateTransition(index,{type:el('v067-transition-type').value,
   duration:Number(el('v067-transition-duration').value),ease:el('v067-transition-ease').value});
 }
 for(const id of ['v067-transition-type','v067-transition-duration','v067-transition-ease'])
  el(id).addEventListener('change',saveTransition);
 root.MangoMotionUI={sync};
 sync();
})(typeof globalThis!=='undefined'?globalThis:this);
