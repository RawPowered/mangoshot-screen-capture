/* Creative Effects Studio. Revision-checked draft on existing Layer Studio model. */
(function(root){'use strict';
 const d=root.document,E=root.MangoCreativeEffectsV0726,H=root.MangoLayerImageV0712,R=root.MangoTransformMaterialV0715;
 if(!d?.body.classList.contains('studio-image')||!E||!H||!R)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,txt,fn)=>{const b=el('button','ci-action-v0720',txt);b.type='button';if(id)b.id=id;b.addEventListener('click',fn);return b;};
 const input=(id,type,min,max,step)=>{const n=el('input');n.id=id;n.type=type;if(min!=null){n.min=min;n.max=max;n.step=step;}return n;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 const field=(t,n)=>{const l=el('label','ce-field-v0726');l.append(el('span','',t),n);return l;};
 const modal=el('dialog','ce-dialog-v0726');modal.id='ce-dialog-v0726';modal.setAttribute('aria-labelledby','ce-title-v0726');
 const head=el('header'),headText=el('div'),title=el('strong','','CREATIVE EFFECTS STUDIO'),subtitle=el('small','','Editable gradients · outer effects · materials');title.id='ce-title-v0726';headText.append(title,subtitle);head.append(headText,button('ce-close-v0726','Close ×',()=>modal.close()));
 const body=el('div','ce-body-v0726'),previews=el('div','ce-previews-v0726');
 function preview(t,id){const f=el('figure'),c=el('canvas');c.width=480;c.height=270;c.id=id;c.setAttribute('aria-label',t);f.append(el('figcaption','',t),c);previews.append(f);return c;}
 const before=preview('Current composition','ce-before-v0726'),after=preview('Draft composition','ce-after-v0726');
 const tabs=el('div','ce-tabs-v0726');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Effect controls');
 const panels=new Map(),tabButtons=new Map();
 function tab(key,t){const p=el('section','ce-panel-v0726');p.id='ce-panel-'+key+'-v0726';panels.set(key,p);const b=button('ce-tab-'+key+'-v0726',t,()=>showTab(key));b.setAttribute('aria-controls',p.id);tabs.append(b);tabButtons.set(key,b);return p;}
 const grad=tab('gradient','Gradient overlay'),shadowPanel=tab('shadow','Shadows & glows'),materialPanel=tab('material','Bevel & materials');
 const presets=el('div','ce-presets-v0726');for(const p of E.presets){const b=button('ce-preset-'+p.id+'-v0726',p.name,()=>edit(()=>{draft.gradient=E.copy(p.gradient);stopIndex=1;}));const sw=el('span','ce-preset-swatch-v0726');sw.style.background=E.gradientCSS(p.gradient);b.prepend(sw);presets.append(b);}
 const enabled=input('ce-gradient-enabled-v0726','checkbox'),gKind=select('ce-gradient-kind-v0726',[['linear','Linear'],['radial','Radial']]),gAngle=input('ce-gradient-angle-v0726','number',-180,180,1),gOpacity=input('ce-gradient-opacity-v0726','range',0,100,1),gValue=el('output');
 const gradFields=el('div','ce-fields-v0726');gradFields.append(field('Gradient overlay',enabled),field('Type',gKind),field('Angle °',gAngle),field('Opacity %',gOpacity),gValue);
 const strip=el('div','ce-strip-v0726');strip.id='ce-strip-v0726';strip.setAttribute('aria-label','Gradient stop track');
 const stripPaint=el('div','ce-strip-paint-v0726');strip.append(stripPaint);
 const handles=[];for(let i=0;i<E.MAX_STOPS;i++){const h=button('ce-handle-'+i+'-v0726','',()=>{stopIndex=i;sync();});h.className='ce-stop-v0726';h.setAttribute('aria-label','Gradient stop '+(i+1));strip.append(h);handles.push(h);}
 const stopPick=select('ce-stop-select-v0726',[]),sPos=input('ce-stop-position-v0726','number',0,100,1),sColor=input('ce-stop-color-v0726','color'),sOpacity=input('ce-stop-opacity-v0726','number',0,100,1);
 const stopFields=el('div','ce-fields-v0726');stopFields.append(field('Selected stop',stopPick),field('Position %',sPos),field('Color',sColor),field('Alpha %',sOpacity));
 const addStop=button('ce-add-stop-v0726','Add stop',()=>edit(()=>{const a=draft.gradient.stops;let at=0;for(let i=1;i<a.length-1;i++)if(a[i+1].position-a[i].position>a[at+1].position-a[at].position)at=i;const pos=(a[at].position+a[at+1].position)/2;a.splice(at+1,0,{position:pos,color:a[at].color,opacity:a[at].opacity});stopIndex=at+1;}));
 const removeStop=button('ce-remove-stop-v0726','Remove stop',()=>edit(()=>{draft.gradient.stops.splice(stopIndex,1);stopIndex=Math.max(0,stopIndex-1);}));
 const stopBtns=el('div','ce-buttons-v0726');stopBtns.append(addStop,removeStop);
 grad.append(presets,gradFields,strip,stopFields,stopBtns,el('p','ce-note-v0726','Drag interior stop handles or enter exact positions. Stops at 0% and 100% are fixed. Gradient follows the rotated layer bounding box; original alpha is preserved.'));
 const list=select('ce-shadow-list-v0726',[]),shKind=select('ce-shadow-kind-v0726',[['shadow','Drop shadow'],['glow','Outer glow']]),shEnabled=input('ce-shadow-enabled-v0726','checkbox'),shColor=input('ce-shadow-color-v0726','color'),shOpacity=input('ce-shadow-opacity-v0726','number',0,100,1),shBlur=input('ce-shadow-blur-v0726','number',0,100,1),shX=input('ce-shadow-x-v0726','number',-200,200,1),shY=input('ce-shadow-y-v0726','number',-200,200,1);
 const shadowButtons=el('div','ce-buttons-v0726');
 const addShadow=button('ce-add-shadow-v0726','Add shadow',()=>edit(()=>{draft.shadows.push(E.shadow('shadow'));shadowIndex=draft.shadows.length-1;})),addGlow=button('ce-add-glow-v0726','Add glow',()=>edit(()=>{draft.shadows.push(E.shadow('glow'));shadowIndex=draft.shadows.length-1;}));
 function moveShadow(delta){edit(()=>{const a=draft.shadows,j=shadowIndex+delta;if(j<0||j>=a.length)return;[a[shadowIndex],a[j]]=[a[j],a[shadowIndex]];shadowIndex=j;});}
 const earlier=button('ce-shadow-earlier-v0726','Earlier',()=>moveShadow(-1)),later=button('ce-shadow-later-v0726','Later',()=>moveShadow(1)),deleteShadow=button('ce-shadow-remove-v0726','Remove',()=>edit(()=>{draft.shadows.splice(shadowIndex,1);shadowIndex=Math.max(0,shadowIndex-1);}));
 shadowButtons.append(addShadow,addGlow,earlier,later,deleteShadow);
 const shFields=el('div','ce-fields-v0726');for(const [t,n] of [['Effect',list],['Type',shKind],['Enabled',shEnabled],['Color',shColor],['Opacity %',shOpacity],['Blur px',shBlur],['Offset X px',shX],['Offset Y px',shY]])shFields.append(field(t,n));
 shadowPanel.append(shadowButtons,shFields,el('p','ce-note-v0726','Earlier effects render behind later ones. Every effect uses the same layer silhouette; the source layer is painted once. Existing legacy shadow/glow is retained as the first underlay. Outer effects are not editable redactions.'));
 const matKind=select('ce-material-kind-v0726',R.kinds.map(k=>[k,k[0].toUpperCase()+k.slice(1)])),matStrength=input('ce-material-strength-v0726','range',0,100,1),matDepth=input('ce-material-depth-v0726','number',0,16,.5),matAngle=input('ce-material-angle-v0726','number',-180,180,1),matPrimary=input('ce-material-primary-v0726','color'),matSecondary=input('ce-material-secondary-v0726','color'),matPresets=el('div','ce-presets-v0726');
 for(const p of R.presets){const b=button('ce-material-'+p.id+'-v0726',p.name,()=>edit(()=>{material=E.copy(p.material);}));matPresets.append(b);}
 const matFields=el('div','ce-fields-v0726');for(const [t,n] of [['Material',matKind],['Strength %',matStrength],['Edge depth px',matDepth],['Lighting angle °',matAngle],['Highlight',matPrimary],['Shade',matSecondary]])matFields.append(field(t,n));
 materialPanel.append(matPresets,matFields,el('p','ce-note-v0726','Uses the existing bevel/emboss alpha-edge renderer. Gradient overlay is composited after materials and ordered filters; reduce gradient opacity to retain the underlying material details.'));
 body.append(previews,tabs,...panels.values());
 const foot=el('footer'),status=el('span','ce-status-v0726');status.id='ce-status-v0726';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const apply=button('ce-apply-v0726','Apply effects',()=>commit());apply.classList.add('primary');apply.disabled=true;foot.append(status,apply);modal.append(head,body,foot);d.body.append(modal);
 let session=null,draft=null,material=null,stopIndex=0,shadowIndex=0,frame=0,drag=null,focus=null;
 const gradient=()=>draft?.gradient,selectedStop=()=>gradient()?.stops[stopIndex],selectedShadow=()=>draft?.shadows[shadowIndex];
 function showTab(key){for(const [k,p] of panels){p.hidden=k!==key;tabButtons.get(k).setAttribute('aria-pressed',String(k===key));}}
 function options(n,items,i){n.replaceChildren();for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}n.value=String(i);}
 function sync(){
  const g=gradient(),s=selectedStop(),sh=selectedShadow();enabled.checked=!!g;
  for(const n of [gKind,gAngle,gOpacity,stopPick,sPos,sColor,sOpacity])n.disabled=!g;
  gKind.value=g?.kind||'linear';gAngle.value=g?.angle||0;gAngle.disabled=!g||g.kind==='radial';gOpacity.value=Math.round((g?.opacity??1)*100);gValue.textContent=gOpacity.value+'%';
  stripPaint.style.background=g?E.gradientCSS({...g,kind:'linear',angle:0}):'transparent';
  options(stopPick,(g?.stops||[]).map((s,i)=>[i,'Stop '+(i+1)+' · '+Math.round(s.position*100)+'%']),stopIndex);
  for(let i=0;i<handles.length;i++){const p=g?.stops[i],h=handles[i];h.hidden=!p;if(!p)continue;h.style.left=(p.position*100)+'%';h.style.background=p.color;h.setAttribute('aria-pressed',String(i===stopIndex));h.setAttribute('aria-label','Stop '+(i+1)+', '+Math.round(p.position*100)+' percent');}
  sPos.value=s?Math.round(s.position*100):0;sColor.value=s?.color||'#ffffff';sOpacity.value=Math.round((s?.opacity??1)*100);sPos.disabled=!s||stopIndex===0||stopIndex===g.stops.length-1;
  addStop.disabled=!g||g.stops.length>=E.MAX_STOPS||!g.stops.some((s,i)=>i&&s.position-g.stops[i-1].position>.002);
  removeStop.disabled=!s||stopIndex===0||stopIndex===g.stops.length-1;
  options(list,draft.shadows.map((s,i)=>[i,(i+1)+'. '+(s.kind==='shadow'?'Shadow':'Glow')+(s.enabled?'':' · disabled')]),shadowIndex);
  for(const n of [shKind,shEnabled,shColor,shOpacity,shBlur,shX,shY,deleteShadow])n.disabled=!sh;
  shKind.value=sh?.kind||'shadow';shEnabled.checked=sh?.enabled??false;shColor.value=sh?.color||'#000000';shOpacity.value=Math.round((sh?.opacity??1)*100);shBlur.value=sh?.blur??0;shX.value=sh?.x??0;shY.value=sh?.y??0;shX.disabled=shY.disabled=!sh||sh.kind==='glow';
  addShadow.disabled=addGlow.disabled=draft.shadows.length>=E.MAX_SHADOWS;earlier.disabled=!sh||shadowIndex===0;later.disabled=!sh||shadowIndex===draft.shadows.length-1;
  matKind.value=material.kind;matStrength.value=Math.round(material.strength*100);matDepth.value=material.depth;matAngle.value=material.angle;matPrimary.value=material.primary;matSecondary.value=material.secondary;
 }
 function args(){const a={};if(JSON.stringify(draft)!==JSON.stringify(session.layer.creativeFx||E.empty()))a.creativeFx=E.content(draft)?draft:null;if(JSON.stringify(material)!==JSON.stringify(session.layer.material||R.defaults()))a.material=material;return a;}
 function edit(fn){if(!session)return;const prev=E.copy(draft),pm=E.copy(material),ps=stopIndex,ph=shadowIndex;try{fn();draft=E.check(draft);material=R.checkMaterial(material);sync();schedule();}catch(e){draft=prev;material=pm;stopIndex=ps;shadowIndex=ph;sync();status.textContent=e.message;}}
 function schedule(){apply.disabled=true;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!modal.open||!session)return;try{const a=args();if(a.material)R.requireBudget([{material:a.material}],d.getElementById('ink').width,d.getElementById('ink').height);H.preview(after,[session.layer.id],a,session.stamp);apply.disabled=!Object.keys(a).length;status.textContent=apply.disabled?'No changes.':'Draft ready · Apply commits one undo step.';}catch(e){status.textContent=e.message;apply.disabled=true;}});}
 function change(n,fn,event='change'){n.addEventListener(event,()=>edit(fn));}
 change(enabled,()=>{draft.gradient=enabled.checked?E.copy(E.presets[0].gradient):null;stopIndex=0;});
 change(gKind,()=>{gradient().kind=gKind.value;});change(gAngle,()=>{gradient().angle=gAngle.valueAsNumber;});change(gOpacity,()=>{gradient().opacity=Number(gOpacity.value)/100;},'input');
 stopPick.addEventListener('change',()=>{stopIndex=Number(stopPick.value);sync();});
 function position(v){const a=gradient()?.stops,i=stopIndex;if(!a||i===0||i===a.length-1||!Number.isFinite(v))return;const low=a[i-1].position+.001,high=a[i+1].position-.001;if(low<=high)a[i].position=Math.max(low,Math.min(high,Math.round(v*1000)/1000));}
 change(sPos,()=>position(sPos.valueAsNumber/100));change(sColor,()=>{selectedStop().color=sColor.value;},'input');change(sOpacity,()=>{selectedStop().opacity=sOpacity.valueAsNumber/100;});
 for(let i=0;i<handles.length;i++){const h=handles[i];h.addEventListener('pointerdown',e=>{if(e.button!==0||h.hidden)return;e.preventDefault();stopIndex=i;sync();h.focus();drag={id:e.pointerId,index:i};h.setPointerCapture?.(e.pointerId);});h.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId||drag.index!==i)return;const r=stripPaint.getBoundingClientRect();if(r.width)edit(()=>position((e.clientX-r.left)/r.width));});for(const k of ['pointerup','pointercancel','lostpointercapture'])h.addEventListener(k,e=>{if(drag?.id===e.pointerId)drag=null;});h.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();stopIndex=i;edit(()=>position(selectedStop().position+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?.001:.01)));});}
 list.addEventListener('change',()=>{shadowIndex=Number(list.value);sync();});
 for(const [n,key,get] of [[shKind,'kind',()=>shKind.value],[shEnabled,'enabled',()=>shEnabled.checked],[shColor,'color',()=>shColor.value],[shOpacity,'opacity',()=>shOpacity.valueAsNumber/100],[shBlur,'blur',()=>shBlur.valueAsNumber],[shX,'x',()=>shX.valueAsNumber],[shY,'y',()=>shY.valueAsNumber]])change(n,()=>{selectedShadow()[key]=get();},n===shColor?'input':'change');
 for(const [n,key,get] of [[matKind,'kind',()=>matKind.value],[matStrength,'strength',()=>Number(matStrength.value)/100],[matDepth,'depth',()=>matDepth.valueAsNumber],[matAngle,'angle',()=>matAngle.valueAsNumber],[matPrimary,'primary',()=>matPrimary.value],[matSecondary,'secondary',()=>matSecondary.value]])change(n,()=>{material[key]=get();},[matStrength,matPrimary,matSecondary].includes(n)?'input':'change');
 function selected(){const s=H.state();if(!s.ready||s.selection.length!==1)return null;const l=s.layers.find(l=>l.id===s.selection[0]);return l&&l.eligible&&l.visible&&!l.locked?{stamp:s.stamp,layer:l}:null;}
 function open(){const s=selected();if(!s||d.querySelector('dialog[open]'))return false;session=s;draft=E.copy(s.layer.creativeFx||E.empty());material=E.copy(s.layer.material||R.defaults());stopIndex=shadowIndex=0;subtitle.textContent=s.layer.name+' · Non-destructive appearance draft';focus=d.activeElement;showTab('gradient');modal.showModal();sync();try{H.preview(before,[s.layer.id],{},s.stamp);schedule();}catch(e){status.textContent=e.message;apply.disabled=true;}return true;}
 function commit(){if(!session||apply.disabled)return;try{H.apply('effects',[session.layer.id],args(),session.stamp);modal.close();}catch(e){status.textContent=e.message;apply.disabled=true;}}
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);
 modal.addEventListener('close',()=>{if(frame)cancelAnimationFrame(frame);frame=0;drag=null;session=null;apply.disabled=true;focus?.focus?.();focus=null;});
 const launch=button('ce-open-v0726','Creative FX…',open),studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.append(launch);
 let queued=false;function refresh(){launch.disabled=!selected();}
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);const listNode=d.getElementById('stroke-list'),statusNode=d.getElementById('status');if(listNode)new MutationObserver(queue).observe(listNode,{childList:true});if(statusNode)new MutationObserver(queue).observe(statusNode,{childList:true});
 root.MangoCreativeEffectsUIV0726=Object.freeze({open,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
