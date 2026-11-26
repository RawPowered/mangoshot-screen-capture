/* Shared professional compositor modal; all draft controls are local until Apply. */
(function(root){'use strict';
 const C=root.MangoCompositorV0714,doc=root.document,image=doc.body.classList.contains('studio-image'),host=image?root.MangoLayerImageV0712:root.MangoLayerClipV0712,V=root.MangoClipView;if(!C||!host)return;
 const el=(tag,attrs={},text)=>{const n=doc.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!=null)n.textContent=text;return n;};
 const button=(id,text,fn)=>{const n=el('button',{type:'button'},text);if(id)n.id=id;n.addEventListener('click',fn);return n;};
 const row=(cls,...nodes)=>{const n=el('div',{class:cls});n.append(...nodes);return n;};
 const label=(text,n)=>{const l=el('label',{},text);l.append(n);return l;};
 const select=(id,choices)=>{const n=el('select',{id});for(const [v,t] of choices)n.append(el('option',{value:v},t));return n;};
 const number=(id,min,max,step,value)=>el('input',{id,type:'number',min,max,step,value});
 const dlg=el('dialog',{id:'compositor-v0714',class:'pc-dialog-v0714','aria-labelledby':'pc-title-v0714'});
 const header=row('pc-head-v0714',row('pc-heading-v0714',el('small',{},image?'IMAGE STUDIO / COMPOSITOR':'CLIP STUDIO / COMPOSITOR'),el('h2',{id:'pc-title-v0714'},'Professional Compositor'),el('p',{},'Ordered layer effects · editable motion · local source grade')),button('pc-close-v0714','Close',()=>dlg.close()));
 const target=select('pc-target-v0714',[]),effectTab=button('pc-effects-tab-v0714','Effect stack',()=>switchMode('effects')),keyTab=button('pc-keyframes-tab-v0714','Keyframes',()=>switchMode('keys')),gradeTab=button('pc-grade-tab-v0714','Source color',()=>switchMode('grade'));
 const tabs=row('pc-tabs-v0714',effectTab);if(!image)tabs.append(keyTab,gradeTab);
 const left=el('section',{class:'pc-left-v0714'}),right=el('section',{class:'pc-right-v0714'});
 const canvas=el('canvas',{id:'pc-preview-v0714',width:640,height:360,'aria-label':'Non-destructive draft preview'});
 const scrub=el('input',{id:'pc-scrub-v0714',type:'range',min:0,max:1000,step:1,value:500,'aria-label':'Preview layer progress'});
 const scrubOut=el('output',{id:'pc-time-v0714'},'50%');
 const play=button('pc-play-v0714','Play motion',()=>{if(raf){stop();return;}const start=performance.now(),span=Math.max(.1,primary()?.end-primary()?.start||2);function tick(now){const p=Math.min(1,(now-start)/(span*1000));scrub.value=String(Math.round(p*1000));preview();if(p<1&&dlg.open)raf=requestAnimationFrame(tick);else stop();}raf=requestAnimationFrame(tick);play.textContent='Pause';});
 const compare=el('input',{type:'checkbox',id:'pc-original-v0714'});
 const previewNote=el('p',{class:'pc-muted-v0714'},'Draft preview; Apply commits one undoable edit.');
 left.append(label('Target',target),row('pc-monitor-v0714',canvas),row('pc-actions-v0714',label('Before (ignore draft)',compare)),row('pc-transport-v0714',play,scrub,scrubOut),previewNote);
 const stackPanel=el('section',{id:'pc-stack-panel-v0714',class:'pc-panel-v0714'}),keyPanel=el('section',{id:'pc-keys-panel-v0714',class:'pc-panel-v0714',hidden:''});
 const presets=row('pc-presets-v0714');for(const preset of C.presets){const b=button('pc-preset-'+preset.id+'-v0714',preset.name,()=>{stack=C.copy(preset.stack);renderStack();preview();});presets.append(b);}
 const addKind=select('pc-add-kind-v0714',C.effects.map(k=>[k,C.specs[k].label]));
 const stackRows=el('div',{id:'pc-stack-v0714',class:'pc-stack-v0714'});
 const customName=el('input',{id:'pc-custom-name-v0714',type:'text',maxlength:48,placeholder:'Name this stack','aria-label':'Custom preset name'});
 const customSelect=select('pc-custom-v0714',[]);
 const storageKey='MangoShot.CompositorPresets.v1';let custom=[];
 try{const raw=JSON.parse(root.localStorage.getItem(storageKey)||'[]');if(Array.isArray(raw))custom=raw.slice(0,20).filter(x=>typeof x.name==='string'&&x.name.length<=48).map(x=>({name:x.name,stack:C.checkStack(x.stack)}));}catch{}
 function saveCustom(){try{root.localStorage.setItem(storageKey,JSON.stringify(custom));}catch{throw Error('Could not save preset on this device.');}}
 function renderCustom(){customSelect.replaceChildren(el('option',{value:''},'Saved stacks…'));custom.forEach((p,i)=>customSelect.append(el('option',{value:String(i)},p.name)));}
 stackPanel.append(el('h3',{},'Preset looks'),presets,el('h3',{},'Ordered effects'),el('p',{class:'pc-muted-v0714'},'Effects process top to bottom. Disable, reorder or remove each effect without changing the source.'),row('pc-actions-v0714',addKind,button('pc-add-effect-v0714','Add effect',()=>{try{if(stack.length>=C.MAX_STACK)throw Error('Maximum eight effects.');const k=addKind.value;stack.push({kind:k,value:C.specs[k].initial,enabled:true});renderStack();preview();}catch(e){message(e.message,true);}})),stackRows,el('h3',{},'Reusable stacks'),row('pc-actions-v0714',customName,button('pc-save-preset-v0714','Save',()=>{try{const name=customName.value.trim();if(!name||name.length>48)throw Error('Enter a preset name (1–48 characters).');const next=custom.filter(p=>p.name!==name);if(next.length>=20)throw Error('Maximum 20 saved stacks.');custom=[...next,{name,stack:C.checkStack(stack)}];saveCustom();renderCustom();message('Stack saved locally.');}catch(e){message(e.message,true);}})),row('pc-actions-v0714',customSelect,button('pc-load-preset-v0714','Load',()=>{if(customSelect.value==='')return;stack=C.copy(custom[Number(customSelect.value)].stack);renderStack();preview();}),button('pc-delete-preset-v0714','Delete saved',()=>{if(customSelect.value==='')return;try{custom.splice(Number(customSelect.value),1);saveCustom();renderCustom();message('Saved preset deleted.');}catch(e){message(e.message,true);}})));
 const keyRows=el('div',{id:'pc-keys-v0714',class:'pc-stack-v0714'}),keyHint=el('p',{class:'pc-muted-v0714'},'Keyframe times are a percentage of the graphic’s duration. X/Y are offsets in percent of the video frame; scale and opacity are multipliers. Easing controls the interval to the next keyframe.');
 keyPanel.append(el('h3',{},'Transform & opacity keyframes'),keyHint,row('pc-actions-v0714',button('pc-add-key-v0714','Add at playhead',()=>{try{const t=Number(scrub.value)/1000;if(keys.length>=C.MAX_KEYS)throw Error('Maximum 32 keyframes.');if(keys.some(k=>Math.abs(k.t-t)<.000001))throw Error('A keyframe already exists here.');keys=C.checkKeys([...keys,{...C.pose(keys,t),t,ease:'linear'}]);renderKeys();preview();}catch(e){message(e.message,true);}}),button('pc-key-default-v0714','Start / end',()=>{keys=[C.neutral(),{...C.neutral(),t:1}];renderKeys();preview();}),button('pc-clear-keys-v0714','Clear',()=>{keys=[];renderKeys();preview();})),keyRows);
 right.append(stackPanel,keyPanel);
 const status=el('span',{id:'pc-status-v0714',role:'status','aria-live':'polite'},'Ready');
 const apply=button('pc-apply-v0714','Apply',()=>{try{
   if(!fresh())throw Error('Editor changed. Reopen Compositor.');
   if(mode==='grade')V.setSourceGrade(C.checkStack(stack),capture.stamp);
   else{const args=mode==='keys'?{keyframes:C.checkKeys(keys)}:{effectStack:C.checkStack(stack)};host.apply('effects',ids(),args,state.stamp);}
   state=host.state();capture=V?.automationCapture?.();loadDraft();message('Applied · Ctrl+Z restores the prior state.');
  }catch(e){message(e.message,true);}});apply.className='primary';
 dlg.append(header,tabs,row('pc-body-v0714',left,right),row('pc-footer-v0714',status,button('pc-reset-v0714','Reset draft',()=>loadDraft()),apply));doc.body.append(dlg);
 let mode='effects',state=null,capture=null,stack=[],keys=[],raf=0,returnFocus=null,previewRaf=0;
 function ids(){if(target.value==='selection')return state.selection.filter(id=>state.layers.some(l=>l.id===id));return target.value&&target.value!=='source'?[target.value]:[];}
 function primary(){return state?.layers.find(l=>ids().includes(l.id));}
 function fresh(){const now=host.state();return state?.ready&&now.ready&&now.stamp===state.stamp&&(!V||capture?.stamp===V.automationCapture().stamp);}
 function message(s,error=false){status.textContent=s;status.dataset.error=String(error);}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;play.textContent='Play motion';}
 function renderStack(){stackRows.replaceChildren();stack.forEach((x,i)=>{
  const spec=C.specs[x.kind],enabled=el('input',{type:'checkbox','aria-label':'Enable '+spec.label});enabled.checked=x.enabled;
  const n=number('pc-effect-value-'+i,spec.min,spec.max,spec.step,x.value);n.setAttribute('aria-label',spec.label);
  enabled.addEventListener('change',()=>{x.enabled=enabled.checked;preview();});n.addEventListener('input',()=>{x.value=n.valueAsNumber;preview();});
  const up=button('pc-effect-up-'+i,'↑',()=>{[stack[i-1],stack[i]]=[stack[i],stack[i-1]];renderStack();preview();});up.disabled=i===0;up.setAttribute('aria-label','Move '+spec.label+' up');
  const down=button('pc-effect-down-'+i,'↓',()=>{[stack[i+1],stack[i]]=[stack[i],stack[i+1]];renderStack();preview();});down.disabled=i===stack.length-1;down.setAttribute('aria-label','Move '+spec.label+' down');
  const remove=button('pc-effect-remove-'+i,'×',()=>{stack.splice(i,1);renderStack();preview();});remove.setAttribute('aria-label','Remove '+spec.label);
  stackRows.append(row('pc-effect-row-v0714',enabled,el('span',{},spec.label),n,up,down,remove));
 });if(!stack.length)stackRows.append(el('p',{class:'pc-muted-v0714'},'No effects. Choose a preset or add one.'));
 }
 function renderKeys(){keyRows.replaceChildren();keys.forEach((k,i)=>{
  const fields=[['t','Time %',0,100,.1,100],['x','X %',-100,100,.5,100],['y','Y %',-100,100,.5,100],['scale','Scale %',10,400,1,100],['rotation','Rotation °',-720,720,1,1],['opacity','Opacity %',0,100,1,100]];
  const head=row('pc-key-head-v0714',button('pc-key-jump-'+i,'◆ '+Math.round(k.t*100)+'%',()=>{scrub.value=String(Math.round(k.t*1000));preview();}),button('pc-key-remove-'+i,'Remove',()=>{keys.splice(i,1);renderKeys();preview();}));
  const grid=row('pc-key-grid-v0714');for(const [f,title,min,max,step,m] of fields){const n=number('pc-key-'+i+'-'+f,min,max,step,k[f]*m);n.addEventListener('input',()=>{k[f]=n.valueAsNumber/m;preview();});grid.append(label(title,n));}
  const ease=select('pc-key-'+i+'-ease',C.easing.map(x=>[x,x]));ease.value=k.ease;ease.addEventListener('change',()=>{k.ease=ease.value;preview();});grid.append(label('Easing to next',ease));keyRows.append(row('pc-key-card-v0714',head,grid));
 });if(!keys.length)keyRows.append(el('p',{class:'pc-muted-v0714'},'No keyframes. The graphic uses its original position and appearance.'));
 }
 function targetOptions(){
  const previous=target.value;target.replaceChildren();
  if(mode==='grade'){target.append(el('option',{value:'source'},'Entire source video'));return;}
  if(state.selection.length>1)target.append(el('option',{value:'selection'},'Selected layers ('+state.selection.length+')'));
  for(const l of state.layers)target.append(el('option',{value:l.id},(l.locked?'Locked · ':'')+l.name));
  if([...target.options].some(o=>o.value===previous))target.value=previous;else if(state.selection.length===1)target.value=state.selection[0];
 }
 function loadDraft(){
  stop();compare.checked=false;
  if(mode==='grade')stack=C.copy(V.sourceGrade());else{stack=C.copy(primary()?.effectStack||[]);keys=C.copy(primary()?.keyframes||[]);}
  renderStack();renderKeys();preview();
 }
 function switchMode(next){
  mode=next;targetOptions();effectTab.setAttribute('aria-pressed',String(next==='effects'));keyTab.setAttribute('aria-pressed',String(next==='keys'));gradeTab.setAttribute('aria-pressed',String(next==='grade'));
  stackPanel.hidden=next==='keys';keyPanel.hidden=next!=='keys';scrub.hidden=play.hidden=scrubOut.hidden=image||next==='grade';target.disabled=next==='grade';
  previewNote.textContent=next==='grade'?'Current decoded source frame, without graphics. Grading affects the entire retained source, not overlay titles or cursor.':image?'Current image composition. Changes affect only eligible selected annotation layers.':'Selected graphics at the scrubbed layer time on a neutral background. Before shows the committed appearance.';
  loadDraft();
 }
 function preview(){
  scrubOut.textContent=(Number(scrub.value)/10).toFixed(1)+'%';
  if(previewRaf)cancelAnimationFrame(previewRaf);
  previewRaf=requestAnimationFrame(()=>{previewRaf=0;
   try{const selected=state.layers.filter(l=>ids().includes(l.id)),can=state.ready&&(mode==='grade'||selected.length>0&&selected.every(l=>!l.locked&&l.eligible));
    apply.disabled=!can;if(!can)throw Error('Choose an unlocked, eligible layer or load source media.');
    const t=Number(scrub.value)/1000;
    if(mode==='grade'){const draft=compare.checked?V.sourceGrade():C.checkStack(stack);V.previewSourceGrade(canvas,draft,capture.stamp);}
    else {const args=compare.checked?{}:mode==='keys'?{keyframes:C.checkKeys(keys)}:{effectStack:C.checkStack(stack)};host.preview(canvas,ids(),args,state.stamp,t);}
    message('Draft · Apply to commit.');
   }catch(e){apply.disabled=true;message(e.message,true);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);}
  });
 }
 function open(event,next='effects'){
  if(dlg.open){switchMode(next);return;}if(doc.querySelector('dialog[open]'))return;
  returnFocus=event?.currentTarget||doc.activeElement;for(const m of doc.querySelectorAll('.v06-menu[open]'))m.open=false;
  state=host.state();capture=V?.automationCapture?.();target.replaceChildren();scrub.value='500';renderCustom();dlg.showModal();switchMode(next);(next==='grade'?gradeTab:target).focus();
 }
 target.addEventListener('change',loadDraft);scrub.addEventListener('input',()=>{stop();preview();});compare.addEventListener('change',preview);
 dlg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dlg.close();}},true);
 dlg.addEventListener('close',()=>{stop();if(previewRaf)cancelAnimationFrame(previewRaf);previewRaf=0;if(returnFocus?.isConnected)(returnFocus.closest('.v06-menu')?.querySelector('summary')||returnFocus).focus({preventScroll:true});});
 for(const [id,mode] of [['compositor-open-v0714','effects'],['compositor-menu-v0714','effects'],['compositor-key-menu-v0714','keys'],['compositor-grade-menu-v0714','grade']])doc.getElementById(id)?.addEventListener('click',event=>open(event,mode));
 root.MangoCompositorUIV0714=Object.freeze({open:(mode='effects')=>open(null,mode)});
})(typeof globalThis!=='undefined'?globalThis:this);
