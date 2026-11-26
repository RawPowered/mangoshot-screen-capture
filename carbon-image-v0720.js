/* Carbon Image Studio v0.7.20. DOM/UI adapter; no alternate layer state. */
(function(root){'use strict';
 const doc=root.document;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function snap(value,min,max,step){
  if(!Number.isFinite(value)||!Number.isFinite(step)||step<=0)throw Error('Invalid dial value');
  return Number(clamp(min+Math.round((value-min)/step)*step,min,max).toFixed(4));
 }
 const specs=Object.freeze([{key:'rotation',name:'Rotation',min:-180,max:180,step:1,reset:0,unit:'°'},
  {key:'opacity',name:'Opacity',min:0,max:100,step:1,reset:100,unit:'%'},
  {key:'blur',name:'Effect softness',min:0,max:100,step:1,reset:0,unit:' px'}]);
 function draftArgs(initial,values,kind){
  const args={};
  if(values.rotation!==initial.rotation)args.rotation=values.rotation===180?-180:values.rotation;
  if(values.opacity!==initial.opacity*100)args.opacity=values.opacity/100;
  if(kind!==initial.fx.kind||((kind!=='none')&&values.blur!==initial.fx.blur)){
   args.fx={...initial.fx,kind,blur:kind==='none'?initial.fx.blur:values.blur};
  }
  return args;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={snap,specs,draftArgs};
 if(!doc?.body?.classList.contains('studio-image'))return;
 const by=id=>doc.getElementById(id);
 const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const action=(label,run)=>{const b=make('button','ci-action-v0720',label);b.type='button';b.addEventListener('click',run);return b;};
 const aside=doc.querySelector('.image-inspector'),panel=by('image-panel-layers'),list=by('stroke-list');
 const quick=doc.querySelector('.v070-quick-actions'),layout=root.MangoProfessionalUIV070,api=root.MangoLayerImageV0712;
 if(!aside||!panel||!list||!quick||!layout||!api)return;
 const store='MangoShotCarbonImageV0720.pinLayers';
 let pin=true;try{pin=root.localStorage.getItem(store)!=='false';}catch{}
 const filter=panel.querySelector('.ts-layer-filter-v0711'),selectActions=filter?.nextElementSibling;
 if(!filter||!selectActions?.classList.contains('ts-layer-actions-v0711'))return;
 const anchor=doc.createComment('Carbon layer controls original location');
 filter.before(anchor);
 const home=make('div','ci-layer-home-v0720');anchor.after(home);home.append(filter,selectActions,list);
 const dock=make('section','ci-layer-dock-v0720');dock.hidden=true;dock.setAttribute('aria-label','Persistent layer stack');
 const dockHead=make('div','ci-dock-title-v0720');dockHead.append(make('strong','','Layers'),make('small','','Top = front'));dock.append(dockHead);aside.append(dock);root.MangoPrecisionVisualV0721?.dock(aside,dock);
 const toggle=action('Pin layers',()=>{pin=!pin;try{root.localStorage.setItem(store,String(pin));}catch{}syncDock();});
 toggle.id='ci-pin-layers-v0720';toggle.title='Keep layers visible while editing Type, Tools or Mask on a wide right-docked workspace';
 aside.querySelector('.panel-heading').append(toggle);
 function syncDock(){
  const l=layout.layout(),wide=root.innerWidth>=1100&&root.innerHeight>=660;
  const active=pin&&wide&&l.properties&&l.dock==='right';
  if(active&&home.parentNode!==dock)dock.append(home);
  if(!active&&home.parentNode!==panel)anchor.after(home);
  dock.hidden=!active;toggle.setAttribute('aria-pressed',String(pin));toggle.textContent=pin?'Unpin':'Pin layers';
  toggle.title=wide?'Pin or unpin the persistent layer stack':'Layer pinning resumes on a wide right-docked workspace';
 }
 const profiles={
  quick:{label:'Quick annotation',layout:{tools:true,properties:true,dock:'right',side:310},tab:'tools'},
  design:{label:'Graphic design',layout:{tools:true,properties:true,dock:'right',side:360},tab:'layers'},
  type:{label:'Typography',layout:{tools:true,properties:true,dock:'right',side:350},tab:'type'},
  mask:{label:'Mask editing',layout:{tools:true,properties:true,dock:'right',side:330},tab:'mask'},
  focus:{label:'Canvas focus',layout:{tools:false,properties:false,dock:'right'},tab:null}
 };
 const select=make('select','ci-workspace-v0720');select.id='ci-workspace-v0720';select.setAttribute('aria-label','Quick workspace layout');
 const placeholder=make('option','','Workspace…');placeholder.value='';select.append(placeholder);
 for(const [key,p] of Object.entries(profiles)){const o=make('option','',p.label);o.value=key;select.append(o);}
 select.addEventListener('change',()=>{const p=profiles[select.value];if(!p)return;layout.setLayout(p.layout);if(p.tab)doc.querySelector('[data-image-tab="'+p.tab+'"]')?.click();syncDock();select.value='';});
 const buttons=make('div','ci-actions-v0720');buttons.append(select);
 const studios=make('div','ci-studios-v0720');studios.setAttribute('role','group');studios.setAttribute('aria-label','Creative studios');
 for(const [label,id] of [['Layers','layer-studio-open-v0712'],['Effects','effects-studio-open-v0712'],['Material','material-menu-v0715'],['Type','creative-inspector-v079']]){
  const b=action(label,()=>by(id)?.click());b.title='Open '+label+' Studio';studios.append(b);
 }
 aside.querySelector('.image-inspector-tabs').before(studios);
 const dialog=make('dialog','ci-precision-v0720');dialog.id='ci-precision-v0720';dialog.setAttribute('aria-labelledby','ci-title-v0720');
 const header=make('header'),titleBox=make('div'),title=make('strong','','PRECISION STUDIO');title.id='ci-title-v0720';
 const subtitle=make('small','','Single-layer adjustments · draft preview');titleBox.append(title,subtitle);
 const close=action('Close ×',()=>dialog.close());header.append(titleBox,close);
 const body=make('div','ci-body-v0720'),previews=make('div','ci-preview-v0720');
 function preview(label){const f=make('figure'),cap=make('figcaption','',label),canvas=make('canvas');canvas.width=480;canvas.height=270;canvas.setAttribute('aria-label',label+' composition');f.append(canvas,cap);previews.append(f);return canvas;}
 const original=preview('Before'),after=preview('Draft');
 const controls=make('div','ci-controls-v0720'),effects=make('div','ci-effect-row-v0720'),kindLabel=make('label','','Effect'),kind=make('select');kind.id='ci-kind-v0720';kindLabel.htmlFor=kind.id;
 for(const [value,label] of [['none','None'],['shadow','Drop shadow'],['glow','Outer glow']]){const o=make('option','',label);o.value=value;kind.append(o);}
 effects.append(kindLabel,kind,make('span','ci-muted-v0720','Drag vertically · Shift for fine adjustment · double-click to reset'));
 const footer=make('footer'),status=make('span','ci-status-v0720','Select an editable layer.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footerButtons=make('div','ci-footer-actions-v0720');
 const reset=action('Revert draft',()=>{if(!session)return;setInitial();schedule();});
 const apply=action('Apply',()=>commit());apply.classList.add('primary');apply.id='ci-apply-v0720';apply.disabled=true;
 footerButtons.append(reset,apply);footer.append(status,footerButtons);body.append(previews,controls,effects);dialog.append(header,body,footer);doc.body.append(dialog);
 let session=null,values={},frame=0,renderOK=false,returnFocus=null;
 const advanced=root.MangoPrecisionVisualV0721?.mount(body,kind,()=>schedule());
 const dials=new Map();
 function setValue(spec,n){if(!session||!Number.isFinite(n)||spec.key==='blur'&&kind.value==='none')return;values[spec.key]=snap(n,spec.min,spec.max,spec.step);updateDial(spec);schedule();}
 function updateDial(spec){
  const d=dials.get(spec.key),v=values[spec.key];if(!d||!Number.isFinite(v))return;
  const disabled=spec.key==='blur'&&kind.value==='none',p=(v-spec.min)/(spec.max-spec.min);
  d.knob.style.setProperty('--ci-angle',String(-135+270*p)+'deg');d.knob.style.setProperty('--ci-sweep',String(270*p)+'deg');
  d.knob.setAttribute('aria-valuenow',String(v));d.knob.setAttribute('aria-valuetext',String(v)+spec.unit);
  d.knob.setAttribute('aria-disabled',String(disabled));d.knob.tabIndex=disabled?-1:0;
  d.readout.textContent=String(v)+spec.unit;d.input.value=String(v);d.input.disabled=disabled;
 }
 for(const spec of specs){
  const card=make('div','ci-dial-card-v0720'),label=make('label','',spec.name),knob=make('div','ci-dial-v0720'),readout=make('span','ci-dial-value-v0720'),input=make('input','ci-number-v0720');
  knob.id='ci-dial-'+spec.key+'-v0720';knob.setAttribute('role','slider');knob.tabIndex=0;knob.setAttribute('aria-label',spec.name);knob.setAttribute('aria-valuemin',String(spec.min));knob.setAttribute('aria-valuemax',String(spec.max));knob.append(readout);
  input.id='ci-number-'+spec.key+'-v0720';input.type='number';input.min=String(spec.min);input.max=String(spec.max);input.step=String(spec.step);label.htmlFor=input.id;
  let drag=null;
  knob.addEventListener('pointerdown',e=>{if(e.button!==0||knob.getAttribute('aria-disabled')==='true')return;e.preventDefault();knob.focus();drag={id:e.pointerId,start:e.clientY,value:values[spec.key]};knob.setPointerCapture?.(e.pointerId);});
  knob.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;setValue(spec,drag.value+(drag.start-e.clientY)*(spec.max-spec.min)/(e.shiftKey?900:220));});
  knob.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)drag=null;});
  knob.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId){const v=drag.value;drag=null;setValue(spec,v);}});
  knob.addEventListener('lostpointercapture',()=>{drag=null;});
  knob.addEventListener('dblclick',()=>setValue(spec,spec.reset));
  knob.addEventListener('keydown',e=>{
   if(knob.getAttribute('aria-disabled')==='true')return;let next;
   if(e.key==='Home')next=spec.min;else if(e.key==='End')next=spec.max;
   else if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key))next=values[spec.key]+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*spec.step*(e.shiftKey?10:1);else return;
   e.preventDefault();setValue(spec,next);
  });
  input.addEventListener('change',()=>{if(Number.isFinite(input.valueAsNumber))setValue(spec,input.valueAsNumber);else updateDial(spec);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
  card.append(label,knob,input);controls.append(card);dials.set(spec.key,{knob,readout,input});
 }
 function setInitial(){const l=session.layer;values={rotation:l.rotation,opacity:l.opacity*100,blur:l.fx.blur};kind.value=l.fx.kind;for(const s of specs)updateDial(s);advanced?.reset(l);}
 kind.addEventListener('change',()=>{updateDial(specs[2]);advanced?.sync();schedule();});
 function schedule(){if(!session||!dialog.open)return;renderOK=false;apply.disabled=true;if(frame)return;frame=root.requestAnimationFrame(()=>{frame=0;render();});}
 function args(){const d=draftArgs(session.layer,values,kind.value);return advanced?advanced.patch(session.layer,d):d;}
 function render(){
  if(!session||!dialog.open)return;try{
   const d=args();if(d.material){const ink=by('ink');root.MangoTransformMaterialV0715.requireBudget([{material:d.material}],ink.width,ink.height);}api.preview(after,[session.layer.id],d,session.stamp);renderOK=true;apply.disabled=!Object.keys(d).length;status.textContent=apply.disabled?'No draft changes.':'Draft ready · Apply commits one undo step.';
  }catch(e){renderOK=false;apply.disabled=true;status.textContent=String(e.message||e);}
 }
 function selected(){const s=api.state();if(!s.ready||s.selection.length!==1)return null;const l=s.layers.find(v=>v.id===s.selection[0]);return l&&l.eligible&&!l.locked&&l.visible?{layer:l,stamp:s.stamp}:null;}
 function open(){
  const s=selected();if(!s||dialog.open||doc.querySelector('dialog[open]'))return false;
  returnFocus=doc.activeElement;session=s;setInitial();subtitle.textContent=s.layer.name+' · Non-destructive draft';dialog.showModal();
  try{api.preview(original,[s.layer.id],{},s.stamp);render();}catch(e){status.textContent=String(e.message||e);apply.disabled=true;}
  return true;
 }
 function commit(){
  if(!session||!renderOK||apply.disabled)return;
  try{const d=args();api.apply('effects',[session.layer.id],d,session.stamp);dialog.close();}
  catch(e){status.textContent=String(e.message||e);apply.disabled=true;renderOK=false;}
 }
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();dialog.close();}},true);
 dialog.addEventListener('close',()=>{if(frame)root.cancelAnimationFrame(frame);frame=0;session=null;renderOK=false;apply.disabled=true;returnFocus?.focus?.();returnFocus=null;refresh();});
 const precision=action('Precision dials…',open);precision.id='ci-open-v0720';precision.title='Open Precision Studio: rotation, opacity and shadow/glow dials with real preview';buttons.append(precision);quick.prepend(buttons);
 function refresh(){
  syncDock();const s=root.MangoImageActions?.state();precision.disabled=!s?.ready||!s.layerSelected||s.locked||s.visible===false||s.selectionCount!==1;
  if(!precision.disabled)precision.disabled=!selected();
 }
 let queued=false;
 function queue(){if(queued)return;queued=true;root.requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const event of ['click','input','change','pointerup','keydown'])doc.addEventListener(event,queue,true);
 root.addEventListener('resize',queue);
 const observer=new MutationObserver(queue);observer.observe(doc.body,{attributes:true,attributeFilter:['class']});observer.observe(list,{childList:true,subtree:false});observer.observe(by('status'),{childList:true});
 refresh();
 root.MangoCarbonImageV0720=Object.freeze({open,refresh,pinned:()=>!dock.hidden});
})(typeof globalThis!=='undefined'?globalThis:this);
