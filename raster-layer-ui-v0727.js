/* Editable raster layer studio. Async preparation before synchronous preview/commit. */
(function(root){'use strict';
 const d=root.document,E=root.MangoRasterLayerV0727,H=root.MangoRasterLayerImageV0727,L=root.MangoLayerImageV0712;
 if(!d?.body.classList.contains('studio-image')||!E||!H||!L)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,txt,fn)=>{const b=el('button','ci-action-v0720',txt);b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 const input=(id,type)=>{const n=el('input');n.id=id;n.type=type;return n;};
 const field=(t,n)=>{const label=el('label','rl-field-v0727');label.append(el('span','',t),n);return label;};
 const modal=el('dialog','rl-dialog-v0727');modal.id='rl-dialog-v0727';modal.setAttribute('aria-labelledby','rl-title-v0727');
 const header=el('header'),h=el('div'),title=el('strong','','MANGOENGINE / EDITABLE RASTER'),subtitle=el('small');title.id='rl-title-v0727';h.append(title,subtitle);header.append(h,button('rl-close-v0727','Close ×',()=>modal.close()));
 const body=el('div','rl-body-v0727'),pair=el('div','rl-pair-v0727');
 function picture(t,id){const f=el('figure'),c=el('canvas');c.id=id;c.width=480;c.height=270;c.setAttribute('aria-label',t);f.append(el('figcaption','',t),c);pair.append(f);return c;}
 const before=picture('Current composition','rl-before-v0727'),after=picture('Draft composition','rl-after-v0727');
 const panel=el('section','rl-panel-v0727'),list=select('rl-list-v0727',[]),op=select('rl-op-v0727',Object.entries(E.kinds)),amount=input('rl-amount-v0727','range'),number=input('rl-number-v0727','number'),enabled=input('rl-enabled-v0727','checkbox'),backend=select('rl-backend-v0727',[['auto','Auto · Rust/Wasm preferred'],['js','JavaScript reference']]);
 for(const n of [amount,number]){n.min='0';n.max='100';n.step='1';}amount.setAttribute('aria-label','Effect intensity');
 const controls=el('div','rl-fields-v0727'),strength=el('div','rl-strength-v0727');strength.append(amount,number);
 controls.append(field('Filter order',list),field('Effect',op),field('Intensity %',strength),field('Enabled',enabled),field('Processing backend',backend));
 const buttons=el('div','rl-buttons-v0727');
 const add=button('rl-add-v0727','Add filter',()=>edit(()=>{draft.push({op:'gray',amount:100,enabled:true});selected=draft.length-1;}));
 const remove=button('rl-remove-v0727','Remove',()=>edit(()=>{draft.splice(selected,1);selected=Math.max(0,selected-1);}));
 function move(delta){edit(()=>{const j=selected+delta;if(j<0||j>=draft.length)return;[draft[selected],draft[j]]=[draft[j],draft[selected]];selected=j;});}
 const earlier=button('rl-earlier-v0727','Earlier',()=>move(-1)),later=button('rl-later-v0727','Later',()=>move(1));
 buttons.append(add,remove,earlier,later);
 panel.append(el('h3','','NON-DESTRUCTIVE SOURCE FILTERS'),buttons,controls,el('p','rl-note-v0727','Filters process the original imported image at source resolution before image masks, transformations and layer effects. The original asset is retained. Gaussian softness and sharpen use a fixed 3 × 3 neighborhood.'));
 const diag=el('section','rl-panel-v0727'),engineInfo=el('p','rl-metric-v0727'),cacheInfo=el('p','rl-note-v0727');engineInfo.id='rl-engine-v0727';cacheInfo.id='rl-cache-v0727';
 const gpuInfo=el('p','rl-note-v0727','WebGPU is optional; the active renderer is still Canvas2D.');gpuInfo.id='rl-gpu-status-v0727';let gpuRunning=false;
 const gpu=button('rl-gpu-probe-v0727','Test WebGPU capability',async()=>{if(gpuRunning)return;gpuRunning=true;gpu.disabled=true;gpuInfo.textContent='Testing local compute…';try{const r=await E.gpuProbe();gpuInfo.textContent=r.status+' · '+r.detail;}finally{gpuRunning=false;gpu.disabled=false;}});
 diag.append(el('h3','','ENGINE DIAGNOSTICS'),engineInfo,cacheInfo,gpu,gpuInfo);
 const grid=el('div','rl-grid-v0727');grid.append(panel,diag);body.append(pair,grid);
 const footer=el('footer'),status=el('span','rl-note-v0727');status.id='rl-status-v0727';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const apply=button('rl-apply-v0727','Apply raster filters',()=>commit());apply.classList.add('primary');apply.disabled=true;footer.append(status,apply);modal.append(header,body,footer);d.body.append(modal);
 let session=null,draft=[],selected=0,timer=0,controller=null,revision=0,focus=null;
 const item=()=>draft[selected];
 const args=()=>JSON.stringify(draft)!==JSON.stringify(session.selected.stack)?{rasterFx:draft.length?draft:null}:{};
 function sync(){
  list.replaceChildren();for(const [i,f] of draft.entries()){const o=el('option','',(i+1)+'. '+E.kinds[f.op]+(f.enabled?'':' · disabled'));o.value=String(i);list.append(o);}list.value=String(selected);
  const f=item();for(const n of [list,op,amount,number,enabled,remove])n.disabled=!f;
  op.value=f?.op||'gray';amount.value=number.value=String(f?.amount??100);enabled.checked=f?.enabled??false;
  earlier.disabled=!f||selected===0;later.disabled=!f||selected===draft.length-1;add.disabled=draft.length>=E.MAX_STEPS;
 }
 function edit(fn){if(!session)return;const previous=E.copy(draft),i=selected;try{fn();draft=E.check(draft);sync();schedule();}catch(e){draft=previous;selected=i;sync();status.textContent=e.message;}}
 function stop(){clearTimeout(timer);controller?.abort();controller=null;revision++;}
 function cacheStats(){const s=E.stats();cacheInfo.textContent='Cache: '+s.entries+'/'+E.MAX_CACHE_ENTRIES+' recipes · '+(s.bytes/1048576).toFixed(1)+' MiB RGBA · '+s.hits+' hits · '+s.misses+' misses · '+s.evictions+' evictions';}
 function schedule(){stop();apply.disabled=true;status.textContent='Preparing local preview…';const r=revision;timer=setTimeout(()=>void render(r),110);}
 async function render(r){
  if(!session||!modal.open||r!==revision)return;const active=session;controller=new AbortController();const signal=controller.signal;
  try{
   const result=await H.prepare(active.selected.id,draft,active.stamp,backend.value,signal);
   if(!modal.open||session!==active||revision!==r||signal.aborted)return;
   L.preview(after,[active.selected.id],args(),active.stamp);
   engineInfo.textContent=result.backend+' · '+result.width+' × '+result.height+' · '+result.steps+' active filters · '+(result.cached?'cache hit':result.ms.toFixed(1)+' ms preparation');
   cacheStats();apply.disabled=!Object.keys(args()).length;status.textContent=apply.disabled?'No document changes.':'Draft ready · Apply commits one undo step.';
  }catch(e){if(session===active&&revision===r&&!signal.aborted){status.textContent=e.message;apply.disabled=true;}}
 }
 list.addEventListener('change',()=>{selected=Number(list.value);sync();});
 op.addEventListener('change',()=>edit(()=>{item().op=op.value;}));enabled.addEventListener('change',()=>edit(()=>{item().enabled=enabled.checked;}));
 amount.addEventListener('input',()=>edit(()=>{item().amount=Number(amount.value);}));number.addEventListener('change',()=>edit(()=>{item().amount=number.valueAsNumber;}));
 backend.addEventListener('change',schedule);
 function open(){const s=H.state();if(!s.ready||!s.selected||d.querySelector('dialog[open]'))return false;
  session=s;draft=E.copy(s.selected.stack);selected=0;backend.value='auto';focus=d.activeElement;subtitle.textContent=s.selected.name+' · '+s.selected.width+' × '+s.selected.height+' source pixels';engineInfo.textContent='Waiting for local engine';cacheStats();modal.showModal();sync();
  try{L.preview(before,[s.selected.id],{},s.stamp);schedule();}catch(e){status.textContent=e.message;apply.disabled=true;}return true;
 }
 function commit(){if(!session||apply.disabled)return;try{L.apply('effects',[session.selected.id],args(),session.stamp);modal.close();}catch(e){status.textContent=e.message;apply.disabled=true;}}
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);
 modal.addEventListener('close',()=>{stop();session=null;apply.disabled=true;focus?.focus?.();focus=null;});
 const launch=button('rl-open-v0727','Raster Filters…',open),studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.append(launch);
 let queued=false;function refresh(){const s=H.state();launch.disabled=!s.ready||!s.selected;}
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);
 const listNode=d.getElementById('stroke-list'),statusNode=d.getElementById('status');if(listNode)new MutationObserver(queue).observe(listNode,{childList:true});if(statusNode)new MutationObserver(queue).observe(statusNode,{childList:true});
 root.addEventListener('pagehide',stop);root.MangoRasterLayerUIV0727=Object.freeze({open,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
