/* MangoShot v0.6.3 compact graphic properties, visual fonts and style previews.
   Move ORIGINAL controls so MangoLayerUI's state and undo remain authoritative. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const el=id=>document.getElementById(id),view=()=>root.MangoClipView;
 const inspector=el('graphic-inspector'),panel=el('v062-graphics-panel'),list=el('layer-list');
 if(!inspector||!panel||!list)return;
 const layer=()=>view()?.layers?.()?.find(x=>x.id===view()?.selectedLayer?.())||null;
 const input=id=>el(id),fire=id=>el(id)?.dispatchEvent(new Event('change',{bubbles:true}));
 const fonts={sans:'Arial, Helvetica, sans-serif',serif:'Georgia, serif',mono:'Consolas, monospace',
  rounded:'Trebuchet MS, Arial, sans-serif',condensed:'Arial Narrow, Impact, sans-serif',
  display:'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',handwritten:'Segoe Print, Comic Sans MS, cursive'};
 const fontNames={sans:'Clean Sans',serif:'Editorial Serif',mono:'Monospace',rounded:'Rounded',condensed:'Condensed',display:'Display Bold',handwritten:'Handwritten'};
 const presets=root.MangoGraphics?.styles||{};
 const names={none:'Custom',title:'Hero Title',lowerThird:'Lower Third',callout:'Bubble',spotlight:'Spotlight',
  limeAccent:'Neon Lime',glass:'Glass',step:'Step',warning:'Warning',minimal:'Caption',outline:'Outline',editorial:'Editorial',kinetic:'Impact',techNote:'Tech Note',softBadge:'Soft Badge',quoteCard:'Quote Card',pointerPop:'Pointer Pop',premium:'Premium',checklist:'Checklist'};
 const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const btn=(label,description,action,cls)=>{const b=mk('button',cls,label);b.type='button';b.title=description;b.setAttribute('aria-label',description);b.addEventListener('click',action);return b;};
 const box=mk('section','v063-design-bench');
 const title=mk('div','v063-section-heading');title.append(mk('strong','','STYLE PRESETS'),mk('span','','Select a visual template'));
 const gallery=mk('div','v063-style-gallery');gallery.id='v063-style-gallery';gallery.setAttribute('role','group');gallery.setAttribute('aria-label','Visual text and callout presets');
 for(const [name,style] of Object.entries(presets)){
  const card=btn('',(names[name]||name)+' preset',()=>applyPreset(name),'v063-style-card');
  card.dataset.style=name;card.setAttribute('aria-pressed','false');
  const art=mk('span','v063-style-art'),words=mk('span','v063-style-sample',name==='step'?'01 STEP':name==='minimal'?'Caption':name==='callout'?'Callout':'MANGO');
  art.style.background=style.background==='transparent'?'transparent':style.background||'#243135';
  words.style.color=style.color||'#fff';words.style.fontFamily=fonts[style.font]||fonts.sans;words.style.fontWeight=style.weight||'600';
  if(style.outlineWidth)words.style.webkitTextStroke=String(Math.min(1.5,style.outlineWidth*.35))+'px '+(style.outline||'#000');
  words.style.textShadow='0 2px '+Math.min(10,style.shadow||3)+'px #000a';
  art.append(words);card.append(art,mk('span','v063-style-name',names[name]||name));gallery.append(card);
 }
 box.append(title,gallery);
 const createRow=el('add-text')?.closest('.layer-create-row');if(createRow)createRow.after(box);
 else list.closest('.inspector-section')?.prepend(box);
 const original=inspector.querySelector('.graphics-fields');if(!original)return;
 const form=mk('section','v063-graphic-form'),head=mk('div','v063-section-heading');
 head.append(mk('strong','','QUICK EDIT'),mk('span','','Selected layer'));form.append(head);
 const mainText=el('graphic-text')?.closest('label');if(mainText){mainText.classList.add('v063-main-text');form.append(mainText);}
 const quick=mk('div','v063-quick-tools');quick.setAttribute('role','toolbar');quick.setAttribute('aria-label','Text quick actions');
 const inc=delta=>{const f=input('graphic-size');f.value=String(Math.max(12,Math.min(220,Math.round(Number(f.value||44)+delta))));fire('graphic-size');};
 quick.append(
  btn('A−','Decrease font size',()=>inc(-4)),btn('A+','Increase font size',()=>inc(4)),
  btn('B','Toggle bold weight',()=>{const f=input('graphic-weight');f.value=Number(f.value)>=700?'400':'700';fire('graphic-weight');},'v063-bold'),
  btn('≡','Align left',()=>{input('graphic-align').value='left';fire('graphic-align');}),
  btn('☷','Align center',()=>{input('graphic-align').value='center';fire('graphic-align');}),
  btn('≣','Align right',()=>{input('graphic-align').value='right';fire('graphic-align');}),
  btn('⧉','Duplicate graphic',()=>input('graphic-duplicate')?.click()),
  btn('⌫','Delete graphic',()=>input('graphic-delete')?.click())
 );
 const color=mk('label','v063-quick-color');color.title='Quick text color';color.append(mk('span','','Color'));
 const colorPick=mk('input');colorPick.id='v063-color';colorPick.type='color';colorPick.setAttribute('aria-label','Quick text color');
 colorPick.addEventListener('change',()=>{input('graphic-color').value=colorPick.value;fire('graphic-color');});
 color.append(colorPick);quick.append(color);form.append(quick);
 const fontHead=mk('div','v063-section-heading');fontHead.append(mk('strong','','FONTS'),mk('span','','Visual previews'));
 const fontGallery=mk('div','v063-font-gallery');fontGallery.id='v063-font-gallery';fontGallery.setAttribute('role','group');fontGallery.setAttribute('aria-label','Preview font choices');
 for(const [name,family] of Object.entries(fonts)){
  const card=btn('',fontNames[name]+' font',()=>{input('graphic-font').value=name;fire('graphic-font');},'v063-font-card');
  card.dataset.font=name;card.setAttribute('aria-pressed','false');
  const sample=mk('span','v063-font-sample','Aa');sample.style.fontFamily=family;
  card.append(sample,mk('span','v063-font-name',fontNames[name]));fontGallery.append(card);
 }
 form.append(fontHead,fontGallery);
 const drawers=mk('div','v063-drawers');
 function drawer(title,ids,scope=''){
  const d=mk('details','v063-drawer');if(scope)d.dataset.ux44Scope=scope;d.append(mk('summary','',title));const body=mk('div','v063-drawer-fields');
  for(const id of ids){const c=input(id);if(!c)continue;body.append(c.closest('label')||c);}
  d.append(body);drawers.append(d);return d;
 }
 drawer('Typography · Fine controls',['graphic-font','graphic-weight','graphic-size','graphic-align'],'text');
 const layout=drawer('Layout · Position and width',['graphic-track','graphic-x','graphic-y','graphic-width']);drawer('Shape · Height and rotation',['graphic-shape-height','graphic-shape-rotation'],'shape');drawer('Callout pointer',['graphic-tail-x','graphic-tail-length'],'callout');
 drawer('Appearance · Colors and effects',['graphic-color','graphic-bg','graphic-opacity','graphic-shape-fill-opacity','graphic-outline','graphic-outline-width','graphic-shadow']);
 const timing=drawer('Timing · In/Out and fades',['graphic-in','graphic-out','graphic-fade-in','graphic-fade-out']);
 const actions=drawer('Layer actions · Reorder, duplicate, delete',[]);
 const actionRow=input('graphic-duplicate')?.closest('.layer-create-row');if(actionRow)actions.lastElementChild.append(actionRow);
 const manual=drawer('Style dropdown · Manual selection',['graphic-preset'],'text');
 const duration=el('graphic-duration');if(duration)timing.lastElementChild.append(duration);
 for(const hint of original.querySelectorAll('.inspector-hint'))layout.lastElementChild.append(hint);
 form.append(drawers);original.replaceWith(form);
 const defaultPreset=el('create-preset');if(defaultPreset){
  const label=defaultPreset.closest('label'),d=mk('details','v063-default-select');
  d.append(mk('summary','','Manual default-style selector'));if(label)d.append(label);box.append(d);
 }
 function sync(){
  const active=layer(),locked=!!active?.locked||!!view()?.exporting?.()||!!view()?.isPlaying?.()||!!view()?.multitrackBusy?.()||!!globalThis.MangoCreativeUI?.voice?.state?.().recording;
  for(const card of gallery.children){
   card.setAttribute('aria-pressed',String((active?active.preset:defaultPreset?.value)===card.dataset.style));
   card.disabled=!!active&&locked;
  }
  for(const card of fontGallery.children){card.setAttribute('aria-pressed',String(active?.font===card.dataset.font));card.disabled=!active||locked;}
  for(const b of quick.querySelectorAll('button'))b.disabled=!active||locked;
  colorPick.disabled=!active||locked;
  if(active){colorPick.value=/^#[0-9a-f]{6}$/i.test(active.color||'')?active.color:'#ffffff';}
 }
 function applyPreset(name){
  const active=layer();
  if(active){if(active.locked||view()?.exporting?.())return;input('graphic-preset').value=name;fire('graphic-preset');}
  else if(defaultPreset){defaultPreset.value=name;fire('create-preset');}
  sync();
 }
 root.MangoTypeHUD={sync,fonts,presets};sync();
})(typeof globalThis!=='undefined'?globalThis:this);
