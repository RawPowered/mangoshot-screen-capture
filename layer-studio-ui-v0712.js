/* Shared native modal; all mutations go through the editor's existing undo history. */
(function(root){'use strict';
 const C=root.MangoLayerStudioV0712,doc=root.document,image=doc.body.classList.contains('studio-image');
 const host=image?root.MangoLayerImageV0712:root.MangoLayerClipV0712;if(!C||!host)return;
 const e=(tag,attrs={},text)=>{const n=doc.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')n.className=v;else if(k==='value')n.value=v;else n.setAttribute(k,v);}if(text!=null)n.textContent=text;return n;};
 const btn=(id,label,fn)=>{const b=e('button',{type:'button',id},label);b.addEventListener('click',fn);return b;};
 const field=(id,type,value,attrs={})=>e('input',{id,type,value,...attrs});
 const label=(name,control)=>{const n=e('label',{},name);n.append(control);return n;};
 const option=(value,text)=>e('option',{value},text);
 const select=(id,options)=>{const n=e('select',{id});for(const [v,t] of options)n.append(option(v,t));return n;};
 const line=(cls,...children)=>{const n=e('div',{class:cls});n.append(...children);return n;};
 const checkbox=(id,name)=>{const n=field(id,'checkbox','1'),l=e('label',{class:'ls-check-v0712'});l.append(n,doc.createTextNode(name));return [n,l];};
 const dlg=e('dialog',{id:'layer-studio-v0712','aria-labelledby':'ls-title-v0712',class:'ls-dialog-v0712'});
 const title=e('h2',{id:'ls-title-v0712'},'Layer & Effects Studio');
 const header=line('ls-header-v0712',line('ls-title-v0712',e('small',{},image?'IMAGE STUDIO / COMPOSITION':'CLIP STUDIO / GRAPHICS'),title,e('p',{},'Organize your layers and edit appearance without changing the source media.')),btn('ls-close-v0712','Close',()=>dlg.close()));
 const layerTab=btn('ls-layer-tab-v0712','Layers',()=>mode('layers')),fxTab=btn('ls-fx-tab-v0712','Effects',()=>mode('effects'));
 const search=field('ls-search-v0712','search','',{placeholder:'Search names, folders, types…','aria-label':'Search layers'});
 const type=select('ls-type-v0712',[['all','All types'],...(image?[['image','Image'],['text','Text'],['vector','Shapes / ink']]:[['text','Title'],['callout','Callout']])]);type.setAttribute('aria-label','Filter layer types');
 const filter=select('ls-filter-v0712',[['all','All states'],['visible','Visible'],['hidden','Hidden'],['locked','Locked'],['unlocked','Unlocked']]);filter.setAttribute('aria-label','Filter layer state');
 const left=e('section',{class:'ls-left-v0712','aria-label':'Layer organization'}),tree=e('div',{id:'ls-tree-v0712',class:'ls-tree-v0712','aria-label':'Layer folders and layers'});
 const selectedLabel=e('span',{class:'ls-muted-v0712',id:'ls-selected-v0712'},'0 selected');
 const selectShown=btn('ls-select-shown-v0712','Select shown',()=>{for(const l of shown())chosen.add(l.id);renderTree();syncEffects();});
 const clear=btn('ls-deselect-v0712','Deselect',()=>{chosen.clear();renderTree();syncEffects();});
 left.append(line('ls-filter-v0712',search),line('ls-filter-v0712',type,filter),line('ls-selection-v0712',selectedLabel,selectShown,clear),tree);
 const right=e('section',{class:'ls-right-v0712','aria-label':'Layer controls'});
 const organize=e('section',{id:'ls-organize-v0712',class:'ls-panel-v0712'});
 const path=field('ls-path-v0712','text','',{maxlength:'164',placeholder:'Brand / Intro / Titles','aria-label':'Folder path'});
 const name=field('ls-name-v0712','text','',{maxlength:'80',placeholder:'Layer or batch name','aria-label':'New layer name'});
 const actions=[];
 function op(id,text,command,args,confirmDelete=false){
  const b=btn(id,text,()=>{if(confirmDelete&&!root.confirm('Delete '+chosen.size+' selected layer(s)? Undo is available.'))return;try{run(command,args());}catch(err){message(err.message,true);}});actions.push({b,command});return b;
 }
 organize.append(e('h3',{},'Organization'),e('p',{class:'ls-muted-v0712'},'Folders are organizational. They do not alter stacking, track order, timing or compositing.'),
  label('Folder path (up to four levels)',path),line('ls-actions-v0712',op('ls-group-v0712','Move to folder','group',()=>({path:C.path(path.value)})),op('ls-ungroup-v0712','Up one folder','ungroup',()=>({}))),
  label('Rename (multiple layers receive numbers)',name),op('ls-rename-v0712','Rename selected','rename',()=>({name:name.value})),
  e('h3',{},'Layer operations'),
  line('ls-actions-v0712',op('ls-show-v0712','Show','visibility',()=>({value:true})),op('ls-hide-v0712','Hide','visibility',()=>({value:false})),op('ls-lock-v0712','Lock','lock',()=>({value:true})),op('ls-unlock-v0712','Unlock','lock',()=>({value:false}))),
  line('ls-actions-v0712',op('ls-front-v0712','Bring to front','stack',()=>({direction:'front'})),op('ls-back-v0712','Send to back','stack',()=>({direction:'back'}))),
  line('ls-actions-v0712',op('ls-duplicate-v0712','Duplicate','duplicate',()=>({})),op('ls-delete-v0712','Delete','delete',()=>({}),true)));
 if(!image)organize.append(e('h3',{},'Graphic tracks'),line('ls-actions-v0712',op('ls-g2-v0712','Move to G2','track',()=>({track:2})),op('ls-g3-v0712','Move to G3','track',()=>({track:3}))));
 const fxPanel=e('section',{id:'ls-effects-v0712',class:'ls-panel-v0712',hidden:''});
 const [useOpacity,opacityLabel]=checkbox('ls-use-opacity-v0712','Apply opacity');
 const [useFx,fxLabel]=checkbox('ls-use-fx-v0712','Apply layer effect');
 const [useFade,fadeLabel]=checkbox('ls-use-fade-v0712','Apply graphic fades');
 const [useOutline,outlineLabel]=checkbox('ls-use-outline-v0712','Apply graphic outline');
 const [useMotion,motionLabel]=checkbox('ls-use-motion-v0713','Apply entry and exit motion');
 const motionChoices=(root.MangoMotion?.motionTypes||['none']).map(x=>[x,x.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())]);
 const easyChoices=(root.MangoMotion?.easing||['linear']).map(x=>[x,x.replace(/([A-Z])/g,' $1')]);
 const enter=select('ls-enter-v0713',motionChoices),exit=select('ls-exit-v0713',motionChoices),enterDuration=field('ls-enter-duration-v0713','number','.45',{min:'.08',max:'5',step:'.05'}),exitDuration=field('ls-exit-duration-v0713','number','.35',{min:'.08',max:'5',step:'.05'}),enterEase=select('ls-enter-ease-v0713',easyChoices),exitEase=select('ls-exit-ease-v0713',easyChoices),scrub=field('ls-motion-scrub-v0713','range','50',{min:'0',max:'100',step:'1','aria-label':'Graphic motion preview position'});
 const opacity=field('ls-opacity-v0712','range','100',{min:'0',max:'100',step:'1'}),opacityValue=e('output',{id:'ls-opacity-value-v0712'},'100%');
 const kind=select('ls-kind-v0712',[['none','None'],['shadow','Drop shadow'],['glow','Outer glow']]);
 const color=field('ls-color-v0712','color','#000000'),blur=field('ls-blur-v0712','number','0',{min:'0',max:'100',step:'1'}),x=field('ls-x-v0712','number','0',{min:'-100',max:'100',step:'1'}),y=field('ls-y-v0712','number','0',{min:'-100',max:'100',step:'1'});
 const blend=select('ls-blend-v0712',C.blends.map(v=>[v,v==='source-over'?'Normal':v[0].toUpperCase()+v.slice(1)]));
 const fadeIn=field('ls-fade-in-v0712','number','0',{min:'0',max:'10',step:'.05'}),fadeOut=field('ls-fade-out-v0712','number','0',{min:'0',max:'10',step:'.05'});
 const outline=field('ls-outline-v0712','color','#000000'),outlineWidth=field('ls-outline-width-v0712','number','0',{min:'0',max:'16',step:'.5'});
 const presets=e('div',{class:'ls-presets-v0712','aria-label':'Layer effect presets'});
 function loadFx(v){kind.value=v.kind;color.value=v.color;blur.value=v.blur;x.value=v.offsetX;y.value=v.offsetY;blend.value=v.blend;}
 for(const p of C.presets){const b=btn('ls-preset-'+p.id+'-v0712',p.name,()=>{loadFx(p.fx);useFx.checked=true;preview();});b.style.setProperty('--ls-preset-color',p.fx.color);presets.append(b);}
 const previewCanvas=e('canvas',{id:'ls-preview-v0712',width:'480',height:'270','aria-label':'Draft appearance preview'});
 const previewHint=e('small',{class:'ls-muted-v0712'},image?'Draft preview of the current composition, scaled to fit.':'Selected graphics at the scrubbed time of the first selected graphic, over a neutral background.');
 const apply=btn('ls-apply-v0712','Apply effects',()=>{try{run('effects',effectArgs());}catch(err){message(err.message,true);}});apply.className='primary';
 fxPanel.append(e('h3',{},'Draft appearance'),previewCanvas,previewHint,line('ls-actions-v0712',opacityLabel,opacity,opacityValue),e('h3',{},'Layer effects'),fxLabel,presets,
  line('ls-fx-grid-v0712',label('Effect',kind),label('Color',color),label('Blur',blur),label('Blend',blend),label('Offset X',x),label('Offset Y',y)));
 if(!image)fxPanel.append(e('h3',{},'Graphic-specific effects'),fadeLabel,line('ls-fx-grid-v0712',label('Fade in (s)',fadeIn),label('Fade out (s)',fadeOut)),outlineLabel,line('ls-fx-grid-v0712',label('Outline color',outline),label('Outline width',outlineWidth)));
 if(!image){const motionPresets=line('ls-presets-v0712');for(const [labelText,a,z] of [['Clean fade','fade','fade'],['Slide & settle','slideUp','fade'],['Impact pop','pop','zoom'],['Kinetic letters','spinLetters','fade'],['Typewriter','typeIn','fade'],['Flip reveal','flip','slideRight']])motionPresets.append(btn('',''+labelText,()=>{useMotion.checked=true;enter.value=a;exit.value=z;enterDuration.value='.65';exitDuration.value='.35';enterEase.value='easeOut';exitEase.value='easeIn';scrub.value='10';preview();}));fxPanel.append(e('h3',{},'Motion presets & timing'),motionLabel,motionPresets,line('ls-fx-grid-v0712',label('Entry',enter),label('Exit',exit),label('Entry duration (s)',enterDuration),label('Exit duration (s)',exitDuration),label('Entry easing',enterEase),label('Exit easing',exitEase)),label('Scrub first selected graphic',scrub));}
 fxPanel.append(line('ls-actions-v0712',btn('ls-reset-draft-v0712','Reset draft',()=>syncEffects()),apply));
 right.append(organize,fxPanel);
 const status=e('span',{id:'ls-status-v0712',role:'status','aria-live':'polite'},'Ready');
 const locate=btn('ls-locate-v0712',image?'Select in editor':'Select primary in editor',()=>{try{if(!chosen.size)throw Error('Select at least one layer.');host.select([...chosen]);dlg.close();}catch(err){message(err.message,true);}});
 const footer=line('ls-footer-v0712',status,locate);
 dlg.append(header,line('ls-tabs-v0712',layerTab,fxTab),line('ls-work-v0712',left,right),footer);doc.body.append(dlg);
 let state=null,chosen=new Set(),collapsed=new Set(),tab='layers',returnFocus=null,previewFrame=0;
 function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
 function shown(){
  const q=search.value.trim().toLowerCase(),t=type.value,f=filter.value;
  return (state?.layers||[]).filter(l=>(t==='all'||t==='vector'&&!['image','text'].includes(l.type)||l.type===t)&&
   (f==='all'||f==='visible'&&l.visible||f==='hidden'&&!l.visible||f==='locked'&&l.locked||f==='unlocked'&&!l.locked)&&
   (!q||[l.name,l.type,...l.group].join(' ').toLowerCase().includes(q)));
 }
 function updateButtons(){
  const selected=(state?.layers||[]).filter(l=>chosen.has(l.id)),locked=selected.some(l=>l.locked),can=!!state?.ready&&selected.length>0;
  for(const {b,command} of actions)b.disabled=!can||(locked&&!['lock','visibility'].includes(command));
  apply.disabled=!can||locked||selected.some(l=>!l.eligible)||!(useOpacity.checked||useFx.checked||(!image&&(useFade.checked||useOutline.checked||useMotion.checked)));
  locate.disabled=!can;
  selectedLabel.textContent=chosen.size+' selected / '+(state?.layers.length||0);
 }
 function renderTree(){
  const items=shown(),ordered=items.slice().reverse();if(!image)ordered.sort((a,b)=>b.track-a.track);
  tree.replaceChildren();
  const makeGroup=()=>({children:new Map(),layers:[],all:[]}),base=makeGroup();
  for(const l of ordered){let n=base;n.all.push(l);for(const part of l.group){if(!n.children.has(part))n.children.set(part,makeGroup());n=n.children.get(part);n.all.push(l);}n.layers.push(l);}
  function checkRow(ids,accessible){
   const n=field('','checkbox','1');n.removeAttribute('id');n.checked=ids.every(id=>chosen.has(id));n.indeterminate=!n.checked&&ids.some(id=>chosen.has(id));n.setAttribute('aria-label',accessible);
   n.addEventListener('change',()=>{for(const id of ids)n.checked?chosen.add(id):chosen.delete(id);renderTree();syncEffects();const restored=[...tree.querySelectorAll('input[type=checkbox]')].find(x=>x.getAttribute('aria-label')===accessible);restored?.focus({preventScroll:true});});return n;
  }
  function render(n,level,prefix=[]){
   for(const [name,g] of n.children){
    const groupPath=[...prefix,name],key=JSON.stringify(groupPath),fold=collapsed.has(key);
    const toggle=btn('','',()=>{fold?collapsed.delete(key):collapsed.add(key);renderTree();const restored=[...tree.querySelectorAll('.ls-fold-v0712')].find(b=>b.getAttribute('aria-label')===(fold?'Collapse ':'Expand ')+groupPath.join(' / '));restored?.focus({preventScroll:true});});toggle.removeAttribute('id');toggle.textContent=fold?'▸':'▾';toggle.className='ls-fold-v0712';toggle.setAttribute('aria-label',(fold?'Expand ':'Collapse ')+groupPath.join(' / '));toggle.setAttribute('aria-expanded',String(!fold));
    const row=line('ls-group-v0712',toggle,checkRow(g.all.map(l=>l.id),'Select folder '+groupPath.join(' / ')),e('strong',{},name),e('small',{},String(g.all.length)));row.style.setProperty('--ls-depth',String(level));tree.append(row);
    if(!fold)render(g,level+1,groupPath);
   }
   for(const l of n.layers){
    const name=e('span',{class:'ls-row-name-v0712'},l.name);name.title=l.name;
    const meta=e('small',{},(image?l.type:'G'+l.track+' · '+l.start.toFixed(2)+'–'+l.end.toFixed(2)+'s')+' · '+Math.round(l.opacity*100)+'%');
    const stateText=e('span',{class:'ls-row-state-v0712'},(l.locked?'Locked · ':'')+(l.visible?'Visible':'Hidden')+(l.fx.kind==='none'&&l.fx.blend==='source-over'?'':' · FX'));
    const row=line('ls-row-v0712',checkRow([l.id],'Select '+l.name),line('ls-row-meta-v0712',name,meta,stateText));row.dataset.layerId=l.id;row.dataset.selected=String(chosen.has(l.id));row.style.setProperty('--ls-depth',String(level));tree.append(row);
   }
  }
  render(base,0);if(!items.length)tree.append(e('p',{class:'ls-muted-v0712'},state?.layers.length?'No matching layers.':'No editable layers yet.'));
  updateButtons();
 }
 function effectArgs(){
  const out={};
  if(useOpacity.checked)out.opacity=Number(opacity.value)/100;
  if(useFx.checked)out.fx=C.checkFx({kind:kind.value,color:color.value,blur:blur.valueAsNumber,offsetX:x.valueAsNumber,offsetY:y.valueAsNumber,blend:blend.value});
  if(!image&&useFade.checked)out.fade={in:fadeIn.valueAsNumber,out:fadeOut.valueAsNumber};
  if(!image&&useOutline.checked)out.outline={color:outline.value,width:outlineWidth.valueAsNumber};
  if(!image&&useMotion.checked)out.motion={enter:{type:enter.value,duration:enterDuration.valueAsNumber,ease:enterEase.value},exit:{type:exit.value,duration:exitDuration.valueAsNumber,ease:exitEase.value}};
  return out;
 }
 function preview(){
  opacityValue.textContent=opacity.value+'%';updateButtons();
  if(tab!=='effects'||!dlg.open)return;
  if(previewFrame)root.cancelAnimationFrame(previewFrame);
  previewFrame=root.requestAnimationFrame(()=>{previewFrame=0;
   try{host.preview(previewCanvas,[...chosen],effectArgs(),state.stamp,Number(scrub.value)/100);message(state.ready?'Draft only · Apply effects to commit.':state.reason,!state.ready);}
   catch(err){message(err.message,true);const p=previewCanvas.getContext('2d');p.clearRect(0,0,previewCanvas.width,previewCanvas.height);}
  });
 }
 function syncEffects(){
  const first=(state?.layers||[]).find(l=>chosen.has(l.id));
  useOpacity.checked=useFx.checked=useFade.checked=useOutline.checked=useMotion.checked=false;
  if(!image){const m=first?.motion||root.MangoMotion.defaults();enter.value=m.enter.type;exit.value=m.exit.type;enterDuration.value=m.enter.duration;exitDuration.value=m.exit.duration;enterEase.value=m.enter.ease;exitEase.value=m.exit.ease;scrub.value='50';}
  opacity.value=Math.round((first?.opacity??1)*100);loadFx(first?.fx||C.appearance(null));fadeIn.value=first?.fadeIn??0;fadeOut.value=first?.fadeOut??0;outline.value=first?.outline||'#000000';outlineWidth.value=first?.outlineWidth??0;
  path.value=first?.group.join(' / ')||'';name.value=chosen.size===1?first?.name||'':'';
  updateButtons();preview();
 }
 function mode(next){tab=next;organize.hidden=next!=='layers';fxPanel.hidden=next!=='effects';layerTab.setAttribute('aria-pressed',String(next==='layers'));fxTab.setAttribute('aria-pressed',String(next==='effects'));preview();}
 function refresh(keep=true){state=host.state();chosen=new Set((keep?[...chosen]:state.selection).filter(id=>state.layers.some(l=>l.id===id)));renderTree();syncEffects();}
 function run(command,args){
  if(!state.ready)throw Error(state.reason);
  const r=host.apply(command,[...chosen],args,state.stamp);
  if(!r.changed){message('No change.');return;}
  chosen=new Set(r.selection);refresh();message('Applied · Ctrl+Z restores the complete operation.');
 }
 function open(event,next='layers'){
  if(dlg.open){refresh(false);mode(next);search.focus();return;}
  if(doc.querySelector('dialog[open]'))return;
  returnFocus=event?.currentTarget||doc.activeElement;for(const m of doc.querySelectorAll('.v06-menu[open]'))m.open=false;
  root.MangoToolGroupsV071?.close?.();search.value='';type.value='all';filter.value='all';collapsed.clear();refresh(false);dlg.showModal();mode(next);search.focus();if(!state.ready)message(state.reason,true);else if(next==='layers')message('Select layers to organize or apply effects.');
 }
 for(const input of [search,type,filter])input.addEventListener('input',renderTree);
 for(const input of [useOpacity,useFx,useFade,useOutline,opacity,kind,color,blur,x,y,blend,fadeIn,fadeOut,outline,outlineWidth,useMotion,enter,exit,enterDuration,exitDuration,enterEase,exitEase,scrub])input.addEventListener('input',preview);
 dlg.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dlg.close();}},true);
 dlg.addEventListener('close',()=>{if(previewFrame)root.cancelAnimationFrame(previewFrame);previewFrame=0;if(returnFocus?.isConnected){const summary=returnFocus.closest('.v06-menu')?.querySelector('summary');(summary||returnFocus).focus({preventScroll:true});}});
 for(const [id,next] of [['layer-studio-open-v0712','layers'],['effects-studio-open-v0712','effects'],['layer-studio-menu-v0712','layers'],['effects-studio-menu-v0712','effects']])doc.getElementById(id)?.addEventListener('click',event=>open(event,next));
 root.MangoLayerStudioUIV0712=Object.freeze({open:(mode='layers')=>open(null,mode)});
})(typeof globalThis!=='undefined'?globalThis:this);
