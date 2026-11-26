/* MangoShot v0.7 Patch B — shared professional editing chrome.
 * Does not clone editing state: proxies write through original editor inputs. */
(function(root){'use strict';
 if(typeof document==='undefined'||!root.MangoControlCoreV070)return;
 const body=document.body,studio=body?.classList.contains('studio-image')?'image':
  body?.classList.contains('studio-clip')?'clip':null;
 const transport=document.querySelector('.studio-transport');
 if(!studio||!transport)return;
 const core=root.MangoControlCoreV070;
 const doc=document,byId=id=>doc.getElementById(id);
 const create=(tag,cls,text)=>{
  const node=doc.createElement(tag);if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;return node;
 };
 const storeKey='MangoShot.ProfessionalLayout.v070.'+studio;
 let hasSaved=false,saved=null;
 try{saved=JSON.parse(root.localStorage?.getItem(storeKey)||'null');hasSaved=!!saved;}catch{}
 let layout=core.validateLayout(saved);
 if(studio==='clip'&&!hasSaved&&root.MangoMediaDock?.collapsed)
  layout.media=!root.MangoMediaDock.collapsed();
 const bar=create('section','v070-options-bar');
 bar.setAttribute('aria-label','Contextual tool options and workspace customization');
 const identity=create('div','v070-tool-identity');
 const small=create('span','v070-eyebrow','TOOL OPTIONS');
 const active=create('strong','v070-tool-name','Tool');
 identity.append(small,active);
 const divider=create('span','v070-divider');
 divider.setAttribute('aria-hidden','true');
 const options=create('div','v070-fields');
 options.setAttribute('role','group');options.setAttribute('aria-label','Current tool controls');
 const actions=create('div','v070-quick-actions');
 const settings=create('details','v070-settings');
 const summary=create('summary','v070-settings-trigger','Workspace ▾');
 summary.title='Customize panels and save MangoShot workspace preferences';
 settings.append(summary);
 const menu=create('div','v070-settings-menu');
 menu.setAttribute('aria-label','Workspace and docking preferences');
 const section=label=>menu.append(create('div','v070-settings-section',label));
 const button=(label,action,cls='')=>{
  const b=create('button',cls,label);b.type='button';
  b.addEventListener('click',action);return b;
 };
 const toggles={};
 section('PANELS');
 const panelRow=create('div','v070-settings-grid');
 const items=[['tools','Tools'],['properties','Properties']];
 if(studio==='clip')items.push(['media','Media']);
 function persist(){
  try{root.localStorage?.setItem(storeKey,JSON.stringify({version:1,...layout}));}catch{}
 }
 function apply({save=true,reflow=true}={}){
  layout=core.validateLayout(layout);
  body.classList.toggle('v070-no-tools',!layout.tools);
  body.classList.toggle('v070-no-properties',!layout.properties);
  body.classList.toggle('v070-dock-bottom',layout.dock==='bottom');
  body.classList.toggle('v070-dock-right',layout.dock==='right');
  body.style.setProperty('--v070-side',layout.side+'px');
  body.style.setProperty('--v070-bottom',layout.bottom+'px');
  if(studio==='clip'&&root.MangoMediaDock?.collapsed){
   const collapsed=root.MangoMediaDock.collapsed();
   if(collapsed===layout.media)root.MangoMediaDock.toggle();
  }
  for(const [key,b] of Object.entries(toggles)){
   const enabled=key==='media'&&root.MangoMediaDock?.collapsed
    ?!root.MangoMediaDock.collapsed():!!layout[key];
   b.setAttribute('aria-pressed',String(enabled));
   b.textContent=b.dataset.label+' '+(enabled?'On':'Off');
  }
  for(const [dock,b] of Object.entries(dockButtons)){
   b.setAttribute('aria-pressed',String(layout.dock===dock));
  }
  if(sideRange)sideRange.value=String(layout.side);
  if(bottomRange)bottomRange.value=String(layout.bottom);
  if(save)persist();
  if(reflow&&typeof root.requestAnimationFrame==='function')
   root.requestAnimationFrame(()=>root.dispatchEvent(new Event('resize')));
 }
 for(const [key,label] of items){
  const b=button(label,()=>{
   if(key==='media'&&root.MangoMediaDock?.collapsed)
    layout.media=root.MangoMediaDock.collapsed();
   else layout[key]=!layout[key];
   apply();
  },'v070-settings-toggle');
  b.dataset.label=label;
  toggles[key]=b;panelRow.append(b);
 }
 menu.append(panelRow);
 section('INSPECTOR DOCK');
 const dockRow=create('div','v070-settings-grid');
 const dockButtons={};
 for(const name of ['right','bottom']){
  const b=button(name==='right'?'Right side':'Below preview',()=>{layout.dock=name;apply();},'v070-settings-toggle');
  dockButtons[name]=b;dockRow.append(b);
 }
 menu.append(dockRow);
 const sideLabel=create('label','v070-settings-range');
 sideLabel.append(create('span','','Side width'));
 const sideRange=doc.createElement('input');sideRange.type='range';sideRange.min='260';sideRange.max='520';sideRange.step='10';
 sideRange.setAttribute('aria-label','Inspector side width');
 sideRange.addEventListener('input',()=>{layout.side=Number(sideRange.value);apply({save:false});});
 sideRange.addEventListener('change',()=>persist());
 sideLabel.append(sideRange);if(studio==='image')menu.append(sideLabel);
 const bottomLabel=create('label','v070-settings-range');
 bottomLabel.append(create('span','','Bottom height'));
 const bottomRange=doc.createElement('input');bottomRange.type='range';bottomRange.min='180';bottomRange.max='440';bottomRange.step='10';
 bottomRange.setAttribute('aria-label','Inspector bottom height');
 bottomRange.addEventListener('input',()=>{layout.bottom=Number(bottomRange.value);apply({save:false});});
 bottomRange.addEventListener('change',()=>persist());
 bottomLabel.append(bottomRange);menu.append(bottomLabel);
 section('LAYOUT PRESETS');
 const presetRow=create('div','v070-settings-grid v070-settings-presets');
 const labels={balanced:'Balanced',canvas:'Canvas focus',typography:'Typography',preview:'Preview focus',graphics:'Graphics'};
 for(const name of Object.keys(core.presets[studio])){
  presetRow.append(button(labels[name]||name,()=>{
   layout=core.applyPreset(layout,studio,name);apply();settings.open=false;
  },'v070-settings-preset'));
 }
 menu.append(presetRow);
 section('SAVED WORKSPACES');
 const profileKey=storeKey+'.profiles';
 let profiles={};
 try{
  const raw=JSON.parse(root.localStorage?.getItem(profileKey)||'{}');
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
   for(const [name,value] of Object.entries(raw).slice(0,12))
    if(name.length<=36)profiles[name]=core.validateLayout(value);
  }
 }catch{}
 const saveRow=create('div','v070-profile-save');
 const nameInput=doc.createElement('input');nameInput.type='text';nameInput.maxLength=36;
 nameInput.placeholder='Workspace name';nameInput.setAttribute('aria-label','Name this workspace');
 const saveProfile=button('Save',()=>{
  const name=nameInput.value.trim();
  if(!name||name.length>36)return;
  if(!Object.hasOwn(profiles,name)&&Object.keys(profiles).length>=12)return;
  profiles[name]=core.validateLayout(layout);
  try{root.localStorage?.setItem(profileKey,JSON.stringify(profiles));}catch{}
  nameInput.value='';renderProfiles();
 },'v070-profile-add');
 saveRow.append(nameInput,saveProfile);
 menu.append(saveRow);
 const profileList=create('div','v070-profile-list');
 menu.append(profileList);
 function renderProfiles(){
  profileList.replaceChildren();
  for(const [name,value] of Object.entries(profiles).sort(([a],[b])=>a.localeCompare(b))){
   const row=create('div','v070-profile-row');
   const load=button(name,()=>{
    layout=core.validateLayout(value);apply();settings.open=false;
   },'v070-profile-load');
   load.title='Load saved workspace '+name;
   const remove=button('×',()=>{
    delete profiles[name];
    try{root.localStorage?.setItem(profileKey,JSON.stringify(profiles));}catch{}
    renderProfiles();
   },'v070-profile-remove');
   remove.setAttribute('aria-label','Delete workspace '+name);
   row.append(load,remove);profileList.append(row);
  }
  if(!Object.keys(profiles).length)
   profileList.append(create('span','v070-profile-empty','No saved custom workspaces'));
 }
 renderProfiles();
 menu.append(button('Restore default layout',()=>{
  layout=core.defaultLayout();apply();settings.open=false;
 },'v070-settings-reset'));
 const hint=create('p','v070-settings-hint',
  'Panel layout is stored in this browser. Project media and edits are unchanged.');
 menu.append(hint);settings.append(menu);
 actions.append(settings);
 bar.append(identity,divider,options,actions);
 transport.insertAdjacentElement('afterend',bar);
 let fieldMap=new Map(),signature='';
 const dialReset={'size':4,'image-tool-opacity':100,'image-layer-opacity':100,'image-layer-rotation-v0715':0,'image-eraser-hardness':80,'image-mask-brush':35,'image-mask-feather':0,'image-shape-radius':18,'image-shape-points':5,'text-font-size':48,'graphic-size':48,'graphic-opacity':100,'graphic-width':70,'graphic-x':50,'graphic-y':50,'timeline-zoom':1};
 function makeProxy(spec){
  const source=byId(spec.id);
  if(!source||!['INPUT','SELECT','TEXTAREA'].includes(source.tagName))return null;
  const label=create('label','v070-option');
  label.append(create('span','v070-option-label',spec.label));
  const input=source.cloneNode(true);
  input.removeAttribute('id');input.removeAttribute('name');
  input.removeAttribute('data-fx-group');input.removeAttribute('data-fx-field');
  input.className='v070-proxy';
  input.setAttribute('aria-label',spec.label+' (synchronized with Properties)');
  input.dataset.v070Source=spec.id;
  const relay=kind=>{
   if(source.disabled)return;
   if(input.type==='checkbox')source.checked=input.checked;
   else source.value=input.value;
   source.dispatchEvent(new Event(kind,{bubbles:true}));
   schedule();
  };
  input.addEventListener('input',()=>relay('input'));
  input.addEventListener('change',()=>relay('change'));
  const readout=create('output','v070-readout'),U=root.MangoCalloutMotionUIV0736,min=Number(source.min),max=Number(source.max),step=Number(source.step)||1;
  let precision=null;
  if(U&&Object.hasOwn(dialReset,spec.id)&&['number','range'].includes(source.type)&&source.min!==''&&source.max!==''&&Number.isFinite(min)&&Number.isFinite(max)&&max>min){
   // The original proxy remains the exact-value field; both controls have one authoritative source.
   input.type='number';input.step='any';label.classList.add('ux40-option-dial');let draft=null,held=false;
   const get=()=>draft??(Number.isFinite(source.valueAsNumber)?source.valueAsNumber:dialReset[spec.id]);
   const apply=v=>{if(source.disabled)return;const n=Math.max(min,Math.min(max,Math.round(v*10000)/10000));input.value=String(n);source.value=input.value;
    source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));schedule();};
   const commit=()=>{if(draft===null)return;const v=draft;draft=null;apply(v);};
   const dial=U.dial(spec.label,min,max,step,get,v=>{if(source.disabled)return;if(held){draft=v;input.value=String(Math.round(v*100)/100);}else apply(v);},()=>dialReset[spec.id],false);
   dial.element.dataset.ux40Source=spec.id;
   dial.element.addEventListener('pointerdown',e=>{if(source.disabled){e.stopImmediatePropagation();return;}if(e.button===0)held=true;},true);
   dial.element.addEventListener('pointerup',()=>{held=false;commit();dial.refresh();});
   for(const k of ['pointercancel','lostpointercapture'])dial.element.addEventListener(k,()=>{if(held){held=false;draft=null;input.value=source.value;dial.refresh();}});
   dial.element.addEventListener('keydown',e=>{if(source.disabled)e.stopImmediatePropagation();},true);
   const field=create('span','ux40-exact');field.append(input,readout);label.append(dial.element,field);
   precision={refresh(){dial.element.setAttribute('aria-disabled',String(!!source.disabled));dial.element.tabIndex=source.disabled?-1:0;if(!held){input.value=source.value;dial.refresh();}},held:()=>held};
  }else{label.append(input);if(['range','number'].includes(input.type))label.append(readout);}
  return {label,input,readout,source,spec,precision};
 }
 function syncProxy(pair){
  const {input,readout,source,spec,precision}=pair;
  input.disabled=!!source.disabled;
  if(input.type==='checkbox')input.checked=!!source.checked;
  else if(!precision?.held()&&input.value!==source.value)input.value=source.value;
  for(const key of ['min','max','step']){
   if(source.hasAttribute(key)&&!(precision&&key==='step'))input.setAttribute(key,source.getAttribute(key));
  }
  if(readout&&['range','number'].includes(input.type)){
   readout.value=input.type==='number'?(spec.unit||''):core.formatValue(spec.id,source.value);
   readout.textContent=readout.value;
  }
  precision?.refresh();
 }
 function hasSelectedGraphic(){
  const st=root.MangoClipView;
  return !!st?.selectedLayer?.()&&!!st?.layers?.()?.some(l=>l.id===st.selectedLayer());
 }
 function currentTool(){
  return studio==='image'?(byId('tool')?.value||'select'):(body.dataset.clipTool||'select');
 }
 function refresh(){
  if(studio==='clip'&&root.MangoMediaDock?.collapsed){
   const visible=!root.MangoMediaDock.collapsed();
   if(layout.media!==visible){layout.media=visible;toggles.media?.setAttribute('aria-pressed',String(visible));if(toggles.media)toggles.media.textContent='Media '+(visible?'On':'Off');persist();}
  }
  const tool=currentTool(),graphic=studio==='clip'&&hasSelectedGraphic();
  active.textContent=studio==='image'?
   (byId('tool')?.selectedOptions?.[0]?.textContent||tool):
   (graphic?'Selected graphic':{select:'Selection',razor:'Razor',range:'Range'}[tool]||'Timeline');
  const layerType=studio==='image'?(byId('image-inspector-state')?.textContent||''):'';
  const fields=core.fieldsFor(studio,tool,graphic,layerType).filter(spec=>!!byId(spec.id));
  const key=fields.map(v=>v.id).join('|')+'|'+studio+'|'+tool+'|'+graphic+'|'+layerType;
  if(key!==signature){
   signature=key;fieldMap=new Map();options.replaceChildren();
   if(studio==='clip'){
    const quick=create('div','v070-tool-switches');
    for(const [id,label] of [['tool-select','Select'],['tool-razor','Razor'],['range-tool','Range']]){
     const b=button(label,()=>{byId(id)?.click();schedule();},'v070-tool-switch');
     b.dataset.v070Tool=id;quick.append(b);
    }
    options.append(quick);
    const snap=button('Snap',()=>{byId('graphics-snap')?.click();schedule();},'v070-tool-switch');
    snap.dataset.v070Tool='graphics-snap';options.append(snap);
   }
   for(const spec of fields){
    const pair=makeProxy(spec);
    if(!pair)continue;
    fieldMap.set(spec.id,pair);options.append(pair.label);
   }
  }
  for(const pair of fieldMap.values())syncProxy(pair);
  for(const b of options.querySelectorAll('[data-v070-tool]')){
   const src=byId(b.dataset.v070Tool);
   const pressed=src?.getAttribute('aria-pressed')==='true';
   b.setAttribute('aria-pressed',String(pressed));
   b.disabled=!!src?.disabled;
  }
 }
 let pending=false;
 function schedule(){
  if(pending)return;
  pending=true;
  const work=()=>{pending=false;refresh();};
  if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(work);
  else root.setTimeout?.(work,0);
 }
 doc.addEventListener('input',schedule,true);
 doc.addEventListener('change',schedule,true);
 doc.addEventListener('click',schedule,true);
 doc.addEventListener('pointerup',schedule,true);
 body.addEventListener('keydown',schedule,false);
 if(root.MutationObserver){
  const observer=new root.MutationObserver(schedule);
  const rail=doc.querySelector(studio==='image'?'.image-toolrail':'.v06-rail');
  if(rail)observer.observe(rail,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
  if(studio==='clip')observer.observe(body,{attributes:true,attributeFilter:['data-clip-tool']});
 }
 root.addEventListener?.('storage',e=>{
  if(e.key!==storeKey)return;
  try{layout=core.validateLayout(JSON.parse(e.newValue||'null'));apply({save:false});}catch{}
 });
 apply({save:false,reflow:false});
 refresh();
 root.MangoProfessionalUIV070={studio,refresh,layout:()=>({...layout}),setLayout:value=>{
  layout=core.validateLayout({...layout,...value});apply();
 },reset:()=>{layout=core.defaultLayout();apply();}};
})(typeof globalThis!=='undefined'?globalThis:this);
