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
 let mode='presets',chosen=null,loaded=false,anim=0,animCanvas=null,returnFocus=null,previewBackground='dark',previewQueued=false;
 const cards=new Map(),motionReduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const collection=()=>mode==='fonts'?C.fonts:C.presets;
 const textFor=p=>el('sample').value.trim().slice(0,80)||(mode==='fonts'?'Ag 0123':p.sample);
 const fontFor=p=>mode==='fonts'?p.id:p.font;
 const make=(tag,cls,txt)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,name,fn)=>{const b=make('button','',name);b.type='button';b.id=id;b.onclick=fn;return b;};
 const body=dlg.querySelector('.cr-body-v079'),browse=make('div','cr45-browse'),detail=make('aside','cr45-detail'),preview=make('canvas','cr45-preview'),selectedName=make('h3','cr45-name'),info=make('p','cr45-info'),effects=make('div','cr45-effects'),bgBar=make('div','cr45-background');
 preview.id='cr45-preview';preview.width=480;preview.height=240;preview.setAttribute('aria-label','Selected font or style rendered preview');detail.setAttribute('aria-label','Selected design preview');
 for(const [key,name] of [['dark','Dark'],['light','Light'],['mid','Neutral']]){const b=button('cr45-bg-'+key,name,()=>{previewBackground=key;refreshDetail();});bgBar.append(b);}
 const actualText=button('cr45-use-text','Use selected text',()=>{const s=host.state();if(s.selected&&s.text){el('sample').value=s.text.slice(0,80);refreshPaints();}}),clearText=button('cr45-clear-text','Reset sample',()=>{el('sample').value='';refreshPaints();});
 const sampleActions=make('div','cr45-sample-actions');sampleActions.append(actualText,clearText);const sampleTitle=make('span','cr45-eyebrow','SELECTED DESIGN');detail.append(sampleTitle,selectedName,info,preview,bgBar,effects,sampleActions);
 browse.append(el('grid'));body.replaceChildren(browse,detail);body.classList.add('cr45-workbench');
 const one=make('option','','Thin');one.value='100';el('weight').append(one);
 function stopAnimation(restore=true){if(anim)cancelAnimationFrame(anim);anim=0;const old=animCanvas;animCanvas=null;if(restore&&old&&old.canvas.isConnected)paint(old.canvas,old.p,1.3);}
 function paint(canvas,p,time=1.3,background='dark'){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle=background==='light'?'#edeff2':background==='mid'?'#6a737d':'#171b21';ctx.fillRect(0,0,w,h);
  if(!C.loaded(fontFor(p))){ctx.fillStyle='#c0c7cd';ctx.font='18px sans-serif';ctx.fillText('Font unavailable',18,32);return;}
  const sample=textFor(p);
  if(mode==='fonts'){
   const weight=C.weight(p.id,el('weight').value);
   let size=68;ctx.font=weight+' '+size+'px '+C.family(p.id,'sans-serif');
   const width=ctx.measureText(sample).width;if(width>w*.9)size=Math.max(12,Math.floor(size*w*.9/width));
   ctx.font=weight+' '+size+'px '+C.family(p.id,'sans-serif');ctx.fillStyle=background==='light'?'#172029':'#f2f4f5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sample,w/2,h/2);
  }else if(image){
   const patch=C.imagePatch(p.id),l={type:'text',points:[{x:0,y:0}],text:sample,fontSize:72,size:6,scaleX:1,scaleY:1,...patch};
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
  el('weight').disabled=mode!=='fonts'||!p||p.min===p.max;actualText.disabled=!s.selected||!s.text;for(const o of el('weight').options)o.disabled=mode==='fonts'&&!!p&&(Number(o.value)<p.min||Number(o.value)>p.max);
  el('hint').textContent=mode==='fonts'?'Choose a typeface. Applying changes font and weight only.':image?'Choose a look, then apply or insert. All text effects remain editable.':'Hover or focus a card to preview its motion.';refreshDetail();
 }
 function select(id){chosen=id;if(mode==='fonts'){const p=C.font(id);if(p)el('weight').value=C.weight(id,el('weight').value);}for(const [key,node] of cards){node.dataset.selected=String(key===id);node.querySelector('.cr-choice-v079').setAttribute('aria-pressed',String(key===id));}actionState();}
 function refreshDetail(){const p=collection().find(x=>x.id===chosen);selectedName.textContent=p?.name||'No design selected';info.textContent=p?(mode==='fonts'?p.category+' · '+(p.min===p.max?'Single weight '+p.min:'Weights '+p.min+'–'+p.max):p.category+' · '+C.font(p.font).name+' · '+C.weight(p.font,p.weight)):'Try a different search or collection.';effects.replaceChildren();
  for(const b of bgBar.children)b.setAttribute('aria-pressed',String(b.id==='cr45-bg-'+previewBackground));
  if(!p){const q=preview.getContext('2d');q.fillStyle='#171b21';q.fillRect(0,0,preview.width,preview.height);return;}paint(preview,p,1.3,previewBackground);
  if(mode==='presets'&&image){const fx=C.imagePatch(p.id).effects;for(const [key,label] of Object.entries({shadow:'Shadow',stroke:'Outline',glow:'Glow',gradient:'Gradient',overlay:'Overlay',panel:'Background'}))if(fx[key]?.enabled)effects.append(make('span','cr45-chip',label));}else effects.append(make('span','cr45-chip',mode==='fonts'?'Local typeface':'Editable graphic'));
 }
 function refreshPaints(){if(previewQueued)return;previewQueued=true;root.requestAnimationFrame(()=>{previewQueued=false;if(!dlg.open)return;stopAnimation(false);for(const [id,node] of cards){const p=collection().find(x=>x.id===id);if(p)paint(node.querySelector('canvas'),p);}actionState();});}
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
  if(!data.some(x=>x.id===chosen))chosen=data[0]?.id||null;dlg.dataset.mode=mode;if(mode==='fonts'&&chosen)el('weight').value=C.weight(chosen,el('weight').value);
  for(const p of data){
   const item=doc.createElement('article');item.className='cr-card-v079';item.dataset.id=p.id;item.dataset.selected=String(p.id===chosen);
   const choice=doc.createElement('button');choice.type='button';choice.className='cr-choice-v079';choice.setAttribute('aria-label',p.name+' · '+p.category);choice.setAttribute('aria-pressed',String(p.id===chosen));
   const canvas=doc.createElement('canvas');canvas.width=480;canvas.height=240;canvas.setAttribute('aria-hidden','true');choice.append(canvas);
   const meta=doc.createElement('div');meta.className='cr-meta-v079';const title=doc.createElement('strong'),detail=doc.createElement('small');title.textContent=p.name;
   detail.textContent=mode==='fonts'?p.category+' · '+p.min+(p.max!==p.min?'–'+p.max:''):p.category+' · '+C.font(p.font).name;
   meta.append(title,detail);
   const fav=doc.createElement('button');fav.type='button';fav.className='cr-fav-v079';fav.setAttribute('aria-label','Favorite '+p.name);fav.setAttribute('aria-pressed',String(saved.favorites.includes(p.id)));fav.append(I.svg('heart',16));
   fav.addEventListener('click',()=>{saved.favorites=saved.favorites.includes(p.id)?saved.favorites.filter(x=>x!==p.id):[p.id,...saved.favorites].slice(0,32);persist();fav.setAttribute('aria-pressed',String(saved.favorites.includes(p.id)));if(filter==='favorites')render();});
   choice.addEventListener('click',()=>select(p.id));choice.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const all=[...cards.values()].map(n=>n.querySelector('.cr-choice-v079')),index=all.indexOf(choice),columns=Math.max(1,Math.floor(grid.clientWidth/Math.max(1,item.getBoundingClientRect().width))),delta=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;const next=event.key==='Home'?0:event.key==='End'?all.length-1:Math.max(0,Math.min(all.length-1,index+delta));all[next]?.focus();const target=all[next]?.closest('[data-id]')?.dataset.id;if(target)select(target);});choice.addEventListener('pointerenter',()=>startAnimation(canvas,p));choice.addEventListener('pointerleave',()=>stopAnimation());
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
 function open(event,requested){if(dlg.open||doc.querySelector('dialog[open]'))return;returnFocus=event?.currentTarget||doc.activeElement;if(['fonts','presets'].includes(requested)){mode=requested;chosen=requested==='fonts'?host.state().font:null;el('search').value='';el('filter').value='all';el('category').value='All';el('fonts').setAttribute('aria-pressed',String(mode==='fonts'));el('presets').setAttribute('aria-pressed',String(mode==='presets'));if(mode==='fonts')el('weight').value=host.state().weight||'600';}for(const menu of doc.querySelectorAll('.v06-menu[open]'))menu.open=false;
  dlg.showModal();categories();render();el('search').focus();C.ready.then(()=>{loaded=true;if(dlg.open)render();});}
 for(const id of ['creative-open-v079','creative-inspector-v079'])doc.getElementById(id)?.addEventListener('click',open);
 el('close').addEventListener('click',()=>dlg.close());el('fonts').addEventListener('click',()=>switchMode('fonts'));el('presets').addEventListener('click',()=>switchMode('presets'));
 el('search').addEventListener('input',render);el('sample').addEventListener('input',refreshPaints);
 for(const k of ['category','filter'])el(k).addEventListener('change',render);el('weight').addEventListener('change',refreshPaints);
 el('apply').addEventListener('click',()=>execute(false));el('insert').addEventListener('click',()=>execute(true));
 dlg.addEventListener('cancel',()=>stopAnimation(false));dlg.addEventListener('close',()=>{stopAnimation(false);if(returnFocus?.isConnected&&!returnFocus.closest('.v06-menu-pop'))returnFocus.focus();else doc.querySelector('.v06-menu > summary')?.focus();});
 root.MangoCreativeLibraryV079=Object.freeze({open:next=>open(null,next),state:()=>({mode,chosen,loaded,open:dlg.open})});
 C.ready.then(()=>{loaded=true;if(dlg.open)render();});
})(typeof globalThis!=='undefined'?globalThis:this);
