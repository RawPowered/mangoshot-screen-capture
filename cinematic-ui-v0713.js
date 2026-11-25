/* Native visual transition browser: preview actual decoded source frames before committing. */
(function(root){'use strict';
 const C=root.MangoCinematicV0713,M=root.MangoMotion,V=root.MangoClipView,doc=root.document;if(!C||!M||!V)return;
 const e=(tag,attrs={},text)=>{const n=doc.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!=null)n.textContent=text;return n;};
 const b=(id,label,fn)=>{const n=e('button',{type:'button',id},label);n.addEventListener('click',fn);return n;};
 const row=(cls,...nodes)=>{const n=e('div',{class:cls});n.append(...nodes);return n;};
 const label=(text,n)=>{const l=e('label',{},text);l.append(n);return l;};
 const dialog=e('dialog',{id:'cinematic-studio-v0713',class:'cs-dialog-v0713','aria-labelledby':'cs-title-v0713'});
 const header=row('cs-header-v0713',row('cs-title-v0713',e('small',{},'CLIP STUDIO / CINEMATIC'),e('h2',{id:'cs-title-v0713'},'Cinematic Studio'),e('p',{},'Two decoded source images · non-destructive cut transitions')),b('cs-close-v0713','Close',()=>dialog.close()));
 const cut=e('select',{id:'cs-cut-v0713','aria-label':'Select cut'}),duration=e('input',{id:'cs-duration-v0713',type:'number',min:'.08',max:'2',step:'.05',value:'.5'}),ease=e('select',{id:'cs-ease-v0713'});
 for(const [id,title] of [['linear','Linear'],['easeIn','Ease in'],['easeOut','Ease out'],['easeInOut','Ease in / out'],['back','Back']])ease.append(e('option',{value:id},title));
 ease.value='easeInOut';
 const catalog=e('section',{class:'cs-library-v0713','aria-label':'Transition presets'});
 const sampleA=doc.createElement('canvas'),sampleB=doc.createElement('canvas');for(const c of [sampleA,sampleB]){c.width=180;c.height=90;}
 const sa=sampleA.getContext('2d'),sb=sampleB.getContext('2d');sa.fillStyle='#243e57';sa.fillRect(0,0,180,90);sa.fillStyle='#d8e4ef';sa.fillRect(18,17,66,55);sb.fillStyle='#695035';sb.fillRect(0,0,180,90);sb.fillStyle='#ead7b5';sb.beginPath();sb.arc(130,45,24,0,Math.PI*2);sb.fill();
 let selected='crossDissolve',captured=null,prepared=null,returnFocus=null,serial=0,playing=0,cache=C.createCache(),busy=false;
 for(const item of C.catalog){
  const tile=b('cs-preset-'+item.id+'-v0713','',()=>{selected=item.id;invalidate();});
  tile.className='cs-tile-v0713';tile.dataset.type=item.id;tile.title=item.description;
  const c=e('canvas',{width:'180',height:'90','aria-hidden':'true'});C.composite(c.getContext('2d'),sampleA,sampleB,item.id,.5,180,90,[],0,'linear');
  tile.append(c,e('strong',{},item.name));catalog.append(tile);
 }
 const canvas=e('canvas',{id:'cs-preview-v0713',width:'640',height:'360','aria-label':'Actual decoded transition preview'});
 const scrub=e('input',{id:'cs-scrub-v0713',type:'range',min:'0',max:'1000',step:'1',value:'500','aria-label':'Transition preview position'});
 const info=e('span',{id:'cs-quality-v0713'},'No preview prepared');
 const check=e('input',{type:'checkbox',id:'cs-handles-v0713'});
 const warning=e('label',{class:'cs-warning-v0713'});warning.append(check,doc.createTextNode(' I permit using source handles around this cut. This can display nearby frames from trimmed-out footage. Audio remains hard-cut.'));
 const status=e('span',{id:'cs-status-v0713',role:'status','aria-live':'polite'},'Choose a cut and preset.');
 const preview=b('cs-prepare-v0713','Prepare actual preview',()=>void prepare());
 const play=b('cs-play-v0713','Play preview',()=>{if(!prepared)return;if(playing){stop();return;}let start=null;function tick(now){if(start===null)start=now;const q=Math.min(1,(now-start)/(prepared.plan.duration*1000));scrub.value=Math.round(q*1000);paint();if(q<1)playing=requestAnimationFrame(tick);else stop();}playing=requestAnimationFrame(tick);play.textContent='Pause preview';});
 const apply=b('cs-apply-v0713','Apply transition',()=>void commit());apply.className='primary';
 const remove=b('cs-remove-v0713','Remove transition',()=>{try{fresh();if(V.updateTransition(Number(cut.value),{type:'none',duration:.5,ease:'linear'})){dialog.close();}else status.textContent='No transition to remove.';}catch(err){fail(err);}});
 const controls=e('section',{class:'cs-controls-v0713'});controls.append(e('h3',{},'Cut & timing'),label('Cut',cut),row('cs-fields-v0713',label('Duration (seconds)',duration),label('Easing',ease)),warning,preview,row('cs-monitor-v0713',canvas),row('cs-transport-v0713',play,scrub),info,e('p',{class:'cs-muted-v0713'},'Preset thumbnails are illustrative. The monitor uses your actual decoded frames. Preview preparation is bounded; no source files are changed.'));
 dialog.append(header,row('cs-content-v0713',catalog,controls),row('cs-footer-v0713',status,remove,apply));doc.body.append(dialog);
 function fail(err){status.textContent=err.message||String(err);status.dataset.error='true';}
 function stop(){if(playing)cancelAnimationFrame(playing);playing=0;play.textContent='Play preview';}
 function sync(){for(const tile of catalog.children)tile.setAttribute('aria-pressed',String(tile.dataset.type===selected));const valid=!!captured?.ready&&cut.options.length>0&&!busy;for(const el of [cut,duration,ease,check,...catalog.children])el.disabled=busy;preview.disabled=!valid||!check.checked;apply.disabled=!valid||!prepared||!check.checked;play.disabled=!prepared||busy;scrub.disabled=!prepared||busy;remove.disabled=!valid;}
 function invalidate(){serial++;stop();cache.clear();prepared=null;busy=false;info.textContent='No preview prepared';const p=canvas.getContext('2d');p.fillStyle='#111315';p.fillRect(0,0,canvas.width,canvas.height);status.dataset.error='false';status.textContent='Preview draft before applying.';sync();}
 function fresh(){const s=V.automationCapture();if(!captured?.ready||!s.ready||s.stamp!==captured.stamp||s.identity!==captured.identity)throw Error('Source or edit changed. Reopen Cinematic Studio.');return s;}
 function draft(){
  fresh();const parts=V.segments(),index=Number(cut.value),patch={type:selected,duration:duration.valueAsNumber,ease:ease.value};
  const items=M.setTransition(V.transitions(),parts,index,patch),plan=C.plans(parts,items,V.duration()).find(p=>p.index===index);
  if(!plan)throw Error('Choose a supported cut transition.');
  return {parts,items,plan,patch};
 }
 function paint(){
  if(!prepared||busy)return;const p=prepared.plan,at=p.start+(p.duration*Math.min(.999999,Number(scrub.value)/1000));
  cache.paint(canvas.getContext('2d'),V.url(),V.duration(),prepared.parts,prepared.items,at,canvas.width,canvas.height,V.zoomFrames());
 }
 async function prepare(){
  if(!check.checked)return;const run=++serial;stop();prepared=null;busy=true;sync();
  try{
   const d=draft();duration.value=d.plan.duration;status.dataset.error='false';status.textContent='Preparing local source frames…';
   const q=await cache.prepare(V.url(),V.duration(),d.parts,d.items,V.video().videoWidth,V.video().videoHeight,(n,total)=>{if(run===serial)status.textContent='Preparing frame pairs '+n+' / '+total;});
   if(run!==serial||!dialog.open)return;fresh();prepared=d;busy=false;const scale=Math.min(640/V.video().videoWidth,360/V.video().videoHeight);canvas.width=Math.max(1,Math.round(V.video().videoWidth*scale));canvas.height=Math.max(1,Math.round(V.video().videoHeight*scale));canvas.style.aspectRatio=canvas.width+' / '+canvas.height;info.textContent=q.width+' × '+q.height+' cached at '+q.fps+' fps · '+(q.bytes/1048576).toFixed(1)+' MiB raster budget';scrub.value='500';paint();status.textContent='Preview ready · Apply to commit.';
  }catch(err){if(run===serial)fail(err);}
  finally{if(run===serial){busy=false;sync();}}
 }
 async function commit(){
  const run=serial;
  try{fresh();if(!check.checked||!prepared)throw Error('Prepare and review the transition first.');const d=draft();if(JSON.stringify(d.items)!==JSON.stringify(prepared.items))throw Error('Settings changed. Prepare again.');
   busy=true;sync();status.textContent='Installing prepared transition…';
   // Release the modal raster cache before preparing the same frames for the live editor.
   cache.clear();await V.prepareCinematic(d.items);if(run!==serial||!dialog.open)return;fresh();
   if(!V.updateTransition(d.plan.index,{...d.patch,allowHandles:true}))throw Error('Transition unchanged or not accepted.');
   dialog.close();
  }catch(err){if(run===serial){prepared=null;fail(err);}}finally{if(run===serial){busy=false;sync();}}
 }
 function open(event){
  if(dialog.open||doc.querySelector('dialog[open]'))return;
  returnFocus=event?.currentTarget||doc.activeElement;for(const menu of doc.querySelectorAll('.v06-menu[open]'))menu.open=false;
  captured=V.automationCapture();cut.replaceChildren();let t=0;
  const parts=V.segments();for(let i=1;i<parts.length;i++){t+=parts[i-1].end-parts[i-1].start;cut.append(e('option',{value:String(i)},'Cut '+i+' · '+t.toFixed(2)+'s'));}
  if(V.selectedClip()>0)cut.value=String(V.selectedClip());
  function loadCut(){const index=Number(cut.value),a=parts[index-1],b=parts[index],tr=a&&b&&V.transitions().find(x=>x.fromEnd.toFixed(5)===a.end.toFixed(5)&&x.toStart.toFixed(5)===b.start.toFixed(5));selected=tr&&C.isType(tr.type)?tr.type:'crossDissolve';duration.value=tr?.duration||.5;ease.value=tr?.ease||'easeInOut';}
  loadCut();check.checked=false;invalidate();dialog.showModal();
  if(!captured.ready)fail(captured.reason);else if(!cut.options.length)fail('Split or cut the source into at least two retained clips first.');else status.textContent='Choose a preset, review the source-handle notice and prepare a preview.';sync();cut.focus();
 }
 for(const control of [cut,duration,ease,check])control.addEventListener('change',()=>{if(control===cut){const i=Number(cut.value),a=V.segments()[i-1],b=V.segments()[i],tr=a&&b&&V.transitions().find(t=>t.fromEnd===a.end&&t.toStart===b.start);selected=tr&&C.isType(tr.type)?tr.type:'crossDissolve';duration.value=tr?.duration||.5;ease.value=tr?.ease||'easeInOut';}invalidate();});
 scrub.addEventListener('input',()=>{stop();paint();});
 dialog.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();dialog.close();}},true);
 dialog.addEventListener('close',()=>{serial++;stop();cache.clear();prepared=null;busy=false;V.paintPreview();if(returnFocus?.isConnected)(returnFocus.closest('.v06-menu')?.querySelector('summary')||returnFocus).focus({preventScroll:true});});
 for(const id of ['cinematic-open-v0713','cinematic-menu-v0713'])doc.getElementById(id)?.addEventListener('click',open);
 root.MangoCinematicUIV0713=Object.freeze({open:()=>open(null)});
})(typeof globalThis!=='undefined'?globalThis:this);
