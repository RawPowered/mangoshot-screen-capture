/* v0.6.9 Premium Studio: real local Canvas thumbnails, accessible catalog, no network. */
(function(root){'use strict';
 const P=root.MangoPremium,G=root.MangoGraphics,V=root.MangoVisualInspectorV068;
 const page=V?.graphicTabs?.pages?.premium;
 if(!page||!P||!G)return;
 const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const current=()=>root.MangoClipView;
 const active=()=>current()?.layers?.()?.find(x=>x.id===current()?.selectedLayer?.())||null;
 const loaded=()=>!!current()?.original?.()&&!current()?.exporting?.();
 const header=mk('div','v069-premium-head');
 header.append(mk('strong','', 'PREMIUM STUDIO'),mk('span','','24 signature compositions'));
 const sub=mk('p','v069-copy','Signature materials, precise motion and editorial typography. Fully local and editable.');
 const toolbar=mk('div','v069-premium-toolbar');
 const search=mk('input','v069-search');search.type='search';search.placeholder='Search premium treatments';
 search.setAttribute('aria-label','Search premium compositions');
 const categories=mk('div','v069-categories');categories.setAttribute('role','group');categories.setAttribute('aria-label','Composition category');
 const favToggle=mk('button','v069-filter','☆ Favorites');favToggle.type='button';favToggle.setAttribute('aria-pressed','false');
 toolbar.append(search,categories,favToggle);
 const gallery=mk('div','v069-premium-grid');gallery.setAttribute('aria-label','Premium composition library');
 const foot=mk('div','v069-premium-actions');
 const detail=mk('p','v069-selected','Choose a composition to preview and insert.');
 const preview=mk('button','v069-primary','▶ Preview selected');
 const insert=mk('button','v069-primary v069-insert','+ Insert composition');
 preview.type='button';insert.type='button';
 const settings=mk('details','v069-premium-settings');
 settings.append(mk('summary','', 'Customize selected composition'));
 const style=mk('div','v069-premium-style');
 const colorRow=mk('label','', 'Accent color');
 const color=mk('input','');color.type='color';color.value='#a1f2f5';color.setAttribute('aria-label','Premium accent');
 colorRow.append(color);
 const strengthRow=mk('label','', 'Material intensity');
 const strength=mk('input','');strength.type='range';strength.min='0';strength.max='100';strength.step='5';strength.value='75';strength.setAttribute('aria-label','Material intensity');
 const number=mk('output','','75%');strengthRow.append(strength,number);
 const setMessage=mk('span','v069-premium-hint','Changing the accent or intensity updates the selected premium graphic. Fine timing stays in Motion.');
 style.append(colorRow,strengthRow,setMessage);settings.append(style);
 foot.append(detail,preview,insert,settings);
 page.append(header,sub,toolbar,gallery,foot);
 let chosen='crystal-reveal',category='All',onlyFavorite=false;
 let favorites=[];
 try{const saved=JSON.parse(root.localStorage?.getItem('MangoShot.PremiumFavorites.v1')||'[]');
  if(Array.isArray(saved))favorites=saved.filter(x=>typeof x==='string'&&P.byId[x]);}catch{}
 const cardNodes=new Map();
 const selection=()=>P.byId[chosen];
 const persist=()=>{try{root.localStorage?.setItem('MangoShot.PremiumFavorites.v1',JSON.stringify(favorites));}catch{}};
 function paintCard(canvas,preset,time=1.3){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#050a10');grad.addColorStop(1,'#182525');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const layer=P.make('text',preset.id,0,3.5);
  layer.text=preset.category==='Titles'?'PRECISION':preset.category==='Subtitles'?'Studio in motion':
   preset.category==='Callouts'?'FEATURE':'MANGOSHOT';
  layer.x=.08;layer.y=.34;layer.width=.84;layer.fontSize=preset.category==='Titles'?65:49;
  layer.motion={enter:{type:'fade',duration:.6,ease:'easeOut'},exit:{type:'fade',duration:.4,ease:'easeIn'},
   numeric:{type:'none',from:0,to:100,duration:2,decimals:0,prefix:'',suffix:''}};
  G.render(ctx,[layer],time,w,h);
 }
 function makeCard(preset){
  const wrapper=mk('div','v069-card');
  const button=mk('button','v069-card-button');button.type='button';
  button.dataset.premiumId=preset.id;button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Select '+preset.name+' composition');
  const canvas=mk('canvas','v069-card-image');canvas.width=300;canvas.height=160;
  button.append(canvas,mk('strong','',preset.name),mk('small','',preset.description));
  const favorite=mk('button','v069-favorite','☆');favorite.type='button';favorite.title='Toggle favorite';
  favorite.setAttribute('aria-label','Favorite '+preset.name);favorite.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{chosen=preset.id;sync();});
  favorite.addEventListener('click',()=>{if(favorites.includes(preset.id))favorites=favorites.filter(x=>x!==preset.id);
   else favorites.push(preset.id);persist();sync();});
  wrapper.append(button,favorite);
  cardNodes.set(preset.id,{wrapper,button,favorite,canvas});paintCard(canvas,preset);
 }
 for(const preset of P.catalog)makeCard(preset);
 function filter(){
  const term=search.value.trim().toLowerCase();
  gallery.replaceChildren();
  for(const preset of P.catalog){
   if(category!=='All'&&preset.category!==category)continue;
   if(onlyFavorite&&!favorites.includes(preset.id))continue;
   if(term&&!(preset.name+' '+preset.description+' '+preset.material).toLowerCase().includes(term))continue;
   gallery.append(cardNodes.get(preset.id).wrapper);
  }
  if(!gallery.children.length)gallery.append(mk('p','v069-empty','No matching compositions. Change your filters.'));
 }
 for(const name of ['All','Titles','Subtitles','Callouts','Text']){
  const btn=mk('button','v069-filter',name);btn.type='button';btn.dataset.category=name;
  btn.addEventListener('click',()=>{category=name;sync();});categories.append(btn);
 }
 search.addEventListener('input',filter);
 favToggle.addEventListener('click',()=>{onlyFavorite=!onlyFavorite;sync();});
 function sync(){
  const preset=selection();
  for(const [id,item] of cardNodes){
   item.button.setAttribute('aria-pressed',String(id===chosen));
   item.favorite.textContent=favorites.includes(id)?'★':'☆';
   item.favorite.setAttribute('aria-pressed',String(favorites.includes(id)));
  }
  for(const b of categories.children)b.setAttribute('aria-pressed',String(b.dataset.category===category));
  favToggle.setAttribute('aria-pressed',String(onlyFavorite));
  detail.textContent=preset.name+' · '+preset.category+' · '+preset.description;
  preview.disabled=false;insert.disabled=!loaded();
  const l=active();const premium=l?.premium;
  color.value=premium?.accent||preset.accent;
  strength.value=String(Math.round((premium?.intensity??.74)*100));
  number.textContent=strength.value+'%';
  color.disabled=strength.disabled=!premium||l.locked||!loaded();
  filter();
 }
 function applyStyle(){
  const l=active();if(!l?.premium||l.locked||!loaded())return;
  const next=P.validate({...l.premium,accent:color.value,intensity:Number(strength.value)/100});
  current()?.updateLayer(l.id,{premium:next});
 }
 color.addEventListener('change',applyStyle);
 strength.addEventListener('input',()=>number.textContent=strength.value+'%');
 strength.addEventListener('change',applyStyle);
 insert.addEventListener('click',()=>{if(!loaded())return;const ok=current()?.addPremiumComposition?.(chosen);
  if(ok){V.graphicTabs.activate('design');}});
 preview.addEventListener('click',()=>{
  const p=selection(),item=cardNodes.get(chosen);
  // Preview locally in its original gallery canvas, without committing to the project.
  let frame=0;const reduce=root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduce){paintCard(item.canvas,p,1.25);return;}
  function step(){if(frame>=40){paintCard(item.canvas,p,1.25);return;}
   paintCard(item.canvas,p,frame/24);frame++;root.requestAnimationFrame(step);}
  root.requestAnimationFrame(step);
  item.button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
 });
 const previous=root.MangoMotionUI?.sync;
 if(previous)root.MangoMotionUI.sync=function(){previous();sync();};
 sync();
 root.MangoPremiumUI={sync,choose:id=>{if(P.byId[id]){chosen=id;V.graphicTabs.activate('premium');sync();}}};
})(typeof globalThis!=='undefined'?globalThis:this);
