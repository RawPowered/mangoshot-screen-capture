/* Actual local canvas previews. Selection does not mutate project; explicit apply/insert only. */
(function(root){'use strict';
 const doc=root.document,C=root.MangoCreativeV079,I=root.MangoIconsV079,dlg=doc.getElementById('creative-library-v079');
 if(!dlg||!C)return;
 const el=k=>doc.getElementById('cr-'+k+'-v079'),image=doc.body.classList.contains('studio-image'),host=image?root.MangoCreativeImageV079:root.MangoCreativeClipV079;
 if(!host)return;
 const store='MangoShot.CreativeLibrary.v1',known=id=>!!(C.font(id)||C.preset(id));
 let saved={favorites:[],recent:[]};
 try{const data=JSON.parse(root.localStorage.getItem(store));for(const k of ['favorites','recent'])if(Array.isArray(data?.[k]))saved[k]=[...new Set(data[k].filter(known))].slice(0,32);}catch{}
 function persist(){try{root.localStorage.setItem(store,JSON.stringify(saved));}catch{}}
 let mode='presets',chosen=null,loaded=false,anim=0,animCanvas=null,returnFocus=null;
 const cards=new Map(),motionReduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const collection=()=>mode==='fonts'?C.fonts:C.presets;
 const textFor=p=>el('sample').value.trim().slice(0,80)||(mode==='fonts'?'Ag 0123':p.sample);
 const fontFor=p=>mode==='fonts'?p.id:p.font;
 function stopAnimation(restore=true){if(anim)cancelAnimationFrame(anim);anim=0;const old=animCanvas;animCanvas=null;if(restore&&old&&old.canvas.isConnected)paint(old.canvas,old.p,1.3);}
 function paint(canvas,p,time=1.3){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#171b21';ctx.fillRect(0,0,w,h);
  if(!C.loaded(fontFor(p))){ctx.fillStyle='#c0c7cd';ctx.font='18px sans-serif';ctx.fillText('Font unavailable',18,32);return;}
  const sample=textFor(p);
  if(mode==='fonts'){
   const weight=C.weight(p.id,el('weight').value);
   let size=68;ctx.font=weight+' '+size+'px '+C.family(p.id,'sans-serif');
   const width=ctx.measureText(sample).width;if(width>w*.9)size=Math.max(12,Math.floor(size*w*.9/width));
   ctx.font=weight+' '+size+'px '+C.family(p.id,'sans-serif');ctx.fillStyle='#f2f4f5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sample,w/2,h/2);
  }else if(image){
   const patch=C.imagePatch(p.id),l={type:'text',points:[{x:0,y:0}],text:sample,fontSize:56,size:6,scaleX:1,scaleY:1,...patch};
   const core=root.MangoImageEditorCore;let b=core.textMetrics(ctx,l);const factor=Math.min(1,w*.86/b.width,h*.65/b.height);
   l.fontSize=Math.max(12,Math.floor(l.fontSize*factor));b=core.textMetrics(ctx,l);l.points=[{x:(w-b.width)/2,y:(h-b.height)/2}];
   root.MangoImageTypeV0613.draw(ctx,l);
  }else{
   const patch=C.videoPatch(p.id),l=root.MangoGraphics.create('text',p.id,0,{...patch,text:sample,fontSize:140,x:.06,y:.27,width:.88,end:3});
   root.MangoGraphics.render(ctx,[l],time,w,h);
  }
 }
 function startAnimation(canvas,p){
  if(image||mode!=='presets'||!dlg.open||motionReduced()||!C.loaded(fontFor(p)))return;
  stopAnimation();animCanvas={canvas,p};const start=performance.now();
  function tick(now){if(!dlg.open||!canvas.isConnected||animCanvas?.canvas!==canvas){stopAnimation(false);return;}
   paint(canvas,p,Math.min(2.95,(now-start)/1000%3));anim=requestAnimationFrame(tick);}
  anim=requestAnimationFrame(tick);
 }
 function status(message){el('status').textContent=message;}
 function actionState(){
  const p=collection().find(p=>p.id===chosen),s=host.state(),usable=!!p&&loaded&&C.loaded(fontFor(p))&&s.ready;
  el('apply').disabled=!usable||!s.selected;el('insert').disabled=!usable;
  el('weight').disabled=mode!=='fonts';
  el('hint').textContent=mode==='fonts'?'Select a family and weight.':image?'Editable gradients, shadows and other text effects.':'Hover or focus a card to preview its motion.';
 }
 function select(id){chosen=id;for(const [key,node] of cards){node.dataset.selected=String(key===id);node.querySelector('.cr-choice-v079').setAttribute('aria-pressed',String(key===id));}actionState();}
 function categories(){
  const old=el('category').value;el('category').replaceChildren();
  for(const k of ['All',...new Set(collection().map(p=>p.category))]){const o=doc.createElement('option');o.value=k;o.textContent=k;el('category').append(o);}
  el('category').value=[...el('category').options].some(x=>x.value===old)?old:'All';
 }
 function render(){
  stopAnimation(false);cards.clear();const grid=el('grid');grid.replaceChildren();
  const q=el('search').value.trim().toLowerCase(),cat=el('category').value,filter=el('filter').value;
  let data=collection().filter(p=>(cat==='All'||p.category===cat)&&(!q||[p.name,p.category,p.sample,p.font&&C.font(p.font)?.name].some(v=>String(v||'').toLowerCase().includes(q)))&&(filter==='all'||saved[filter]?.includes(p.id)));
  if(filter==='recent')data.sort((a,b)=>saved.recent.indexOf(a.id)-saved.recent.indexOf(b.id));
  if(!data.some(x=>x.id===chosen))chosen=data[0]?.id||null;
  for(const p of data){
   const item=doc.createElement('article');item.className='cr-card-v079';item.dataset.id=p.id;item.dataset.selected=String(p.id===chosen);
   const choice=doc.createElement('button');choice.type='button';choice.className='cr-choice-v079';choice.setAttribute('aria-label',p.name+' · '+p.category);choice.setAttribute('aria-pressed',String(p.id===chosen));
   const canvas=doc.createElement('canvas');canvas.width=480;canvas.height=240;canvas.setAttribute('aria-hidden','true');choice.append(canvas);
   const meta=doc.createElement('div');meta.className='cr-meta-v079';const title=doc.createElement('strong'),detail=doc.createElement('small');title.textContent=p.name;
   detail.textContent=mode==='fonts'?p.category+' · '+p.min+(p.max!==p.min?'–'+p.max:''):p.category+' · '+C.font(p.font).name;
   meta.append(title,detail);
   const fav=doc.createElement('button');fav.type='button';fav.className='cr-fav-v079';fav.setAttribute('aria-label','Favorite '+p.name);fav.setAttribute('aria-pressed',String(saved.favorites.includes(p.id)));fav.append(I.svg('heart',16));
   fav.addEventListener('click',()=>{saved.favorites=saved.favorites.includes(p.id)?saved.favorites.filter(x=>x!==p.id):[p.id,...saved.favorites].slice(0,32);persist();fav.setAttribute('aria-pressed',String(saved.favorites.includes(p.id)));if(filter==='favorites')render();});
   choice.addEventListener('click',()=>select(p.id));choice.addEventListener('pointerenter',()=>startAnimation(canvas,p));choice.addEventListener('pointerleave',()=>stopAnimation());
   choice.addEventListener('focus',()=>startAnimation(canvas,p));choice.addEventListener('blur',()=>stopAnimation());
   item.append(choice,meta,fav);grid.append(item);cards.set(p.id,item);paint(canvas,p);
  }
  if(!data.length){const empty=doc.createElement('p');empty.textContent='No matching items.';grid.append(empty);}
  status(data.length+' items · '+C.fonts.filter(x=>C.loaded(x.id)).length+'/'+C.fonts.length+' fonts loaded locally');actionState();
 }
 function switchMode(next){mode=next;chosen=null;el('fonts').setAttribute('aria-pressed',String(next==='fonts'));el('presets').setAttribute('aria-pressed',String(next==='presets'));categories();render();}
 function execute(insert){
  const p=collection().find(x=>x.id===chosen);if(!p)return;
  try{const ok=insert?host.insert(mode,p.id,el('weight').value,textFor(p)):host.apply(mode,p.id,el('weight').value);if(!ok)throw Error('Editor declined the operation');
   saved.recent=[p.id,...saved.recent.filter(x=>x!==p.id)].slice(0,32);persist();dlg.close();}
  catch(e){status(e.message);actionState();}
 }
 function open(event){if(dlg.open)return;returnFocus=event?.currentTarget;for(const menu of doc.querySelectorAll('.v06-menu[open]'))menu.open=false;
  dlg.showModal();categories();render();el('search').focus();C.ready.then(()=>{loaded=true;if(dlg.open)render();});}
 for(const id of ['creative-open-v079','creative-inspector-v079'])doc.getElementById(id)?.addEventListener('click',open);
 el('close').addEventListener('click',()=>dlg.close());el('fonts').addEventListener('click',()=>switchMode('fonts'));el('presets').addEventListener('click',()=>switchMode('presets'));
 for(const k of ['search','sample'])el(k).addEventListener('input',render);
 for(const k of ['category','filter','weight'])el(k).addEventListener('change',render);
 el('apply').addEventListener('click',()=>execute(false));el('insert').addEventListener('click',()=>execute(true));
 dlg.addEventListener('cancel',()=>stopAnimation(false));dlg.addEventListener('close',()=>{stopAnimation(false);if(returnFocus?.isConnected&&!returnFocus.closest('.v06-menu-pop'))returnFocus.focus();else doc.querySelector('.v06-menu > summary')?.focus();});
 root.MangoCreativeLibraryV079=Object.freeze({state:()=>({mode,chosen,loaded,open:dlg.open})});
 C.ready.then(()=>{loaded=true;if(dlg.open)render();});
})(typeof globalThis!=='undefined'?globalThis:this);
