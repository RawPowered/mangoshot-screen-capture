/* MangoShot v0.6.6 — compact library for existing & Studio II graphic presets.
   All cards and insert actions reuse MangoGraphics and existing layer buttons. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const gallery=document.getElementById('v063-style-gallery');
 const defaultPreset=document.getElementById('create-preset');
 const addText=document.getElementById('add-text'),addCallout=document.getElementById('add-callout');
 if(!gallery||!defaultPreset||!addText||!addCallout)return;
 const studio=['editorial','kinetic','techNote','softBadge','quoteCard','pointerPop','premium','checklist'];
 const pack=new Set(studio),cards=[...gallery.querySelectorAll('[data-style]')];
 for(const card of cards){card.dataset.pack=pack.has(card.dataset.style)?'studio':'core';
  card.title=(card.title||card.dataset.style)+' · '+(card.dataset.pack==='studio'?'Studio Pack II':'Core Collection');
 }
 const controls=document.createElement('div');controls.className='v066-preset-tabs';controls.setAttribute('role','group');
 controls.setAttribute('aria-label','Filter typography and callout styles by collection');
 const choices=[['core','Core · 11'],['studio','Studio II · 8'],['all','All · 19']];
 let active='core';
 function setCollection(value){
  if(!['core','studio','all'].includes(value))return;
  active=value;
  for(const card of cards)card.hidden=value!=='all'&&card.dataset.pack!==value;
  for(const button of controls.children)button.setAttribute('aria-pressed',String(button.dataset.collection===value));
  try{root.localStorage?.setItem('MangoShot.PresetCollection.v1',value);}catch{}
 }
 for(const [key,label] of choices){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.dataset.collection=key;button.title='Show '+label+' styles';
  button.setAttribute('aria-pressed',String(key==='core'));
  button.onclick=()=>setCollection(key);
  controls.append(button);
 }
 gallery.before(controls);
 const actions=document.createElement('div');actions.className='v066-preset-actions';
 const hint=document.createElement('p');hint.className='v066-preset-hint';
 hint.textContent='Choose a style, then insert a text or callout layer at the playhead. Selecting an existing layer applies the style instantly.';
 let chosen=defaultPreset.value;
 for(const card of cards){
  card.addEventListener('click',()=>{chosen=card.dataset.style;},false);
 }
 function insert(kind){
  if(!root.MangoClipView?.original?.()||root.MangoClipView.exporting?.())return;
  const activeCard=cards.find(c=>c.getAttribute('aria-pressed')==='true');
  const preset=(activeCard?.dataset.style)||chosen||defaultPreset.value;
  defaultPreset.value=preset;
  const source=kind==='text'?addText:addCallout;
  if(!source.disabled)source.click();
  root.MangoWorkspaceV062?.activate?.('graphics');
 }
 for(const [kind,label] of [['text','+ Text with style'],['callout','+ Callout with style']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.title='Insert a '+kind+' layer using the selected preset';button.onclick=()=>insert(kind);
  actions.append(button);
 }
 gallery.after(actions,hint);
 const previous=root.MangoTypeHUD?.sync;
 if(previous){
  root.MangoTypeHUD.sync=function(){
   previous();
   const selected=root.MangoClipView?.layers?.()?.find(l=>l.id===root.MangoClipView?.selectedLayer?.());
   if(selected?.preset&&pack.has(selected.preset)&&active==='core')setCollection('studio');
   for(const button of actions.children)button.disabled=!root.MangoClipView?.original?.()||!!root.MangoClipView?.exporting?.();
  };
 }
 try{const value=root.localStorage?.getItem('MangoShot.PresetCollection.v1');setCollection(value||'core');}catch{setCollection('core');}
 root.MangoPresetPackV066={keys:studio.slice(),setCollection,insert,collection:()=>active};
 root.MangoTypeHUD?.sync?.();
})(typeof globalThis!=='undefined'?globalThis:this);
