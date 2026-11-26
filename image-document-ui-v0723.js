/* Local native image document UI and lazy isolated layer thumbnails. */
(function(root){'use strict';
 const d=root.document,H=root.MangoImageDocumentV0723,C=root.MangoImageDocumentCoreV0723;if(!d?.body.classList.contains('studio-image')||!H||!C)return;
 const by=id=>d.getElementById(id),el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const action=(id,text,fn)=>{const b=el('button','ci-action-v0720',text);if(id)b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
 let name='Untitled image',session=null,working=false,returnFocus=null;
 const dialog=el('dialog','md-dialog-v0723');dialog.id='md-dialog-v0723';dialog.setAttribute('aria-labelledby','md-title-v0723');
 const header=el('header'),title=el('strong','','IMAGE DOCUMENT');title.id='md-title-v0723';const close=action('md-close-v0723','Close ×',()=>{if(!working)dialog.close();});header.append(title,close);
 const body=el('div','md-body-v0723'),note=el('p','md-warning-v0723','Editable projects contain the original screenshot and imported image pixels, including pixels covered by editable redactions or masks. Keep project files private. Use ordinary flattened export for sharing and inspect it before distribution.');
 const nameInput=el('input');nameInput.type='text';nameInput.id='md-name-v0723';nameInput.maxLength=120;const label=el('label','','Document name');label.htmlFor=nameInput.id;
 const saveSection=el('section','md-save-v0723');saveSection.append(label,nameInput);
 const fileInput=el('input');fileInput.type='file';fileInput.id='md-file-v0723';fileInput.accept='.mangoimage,application/json';const fileLabel=el('label','','Choose a local .mangoimage project');fileLabel.htmlFor=fileInput.id;
 const openSection=el('section','md-open-v0723');openSection.append(fileLabel,fileInput,el('p','md-muted-v0723','Opening a project replaces this tab’s current document and resets undo history. Save your work first. The original project file is not modified.'));
 const details=el('p','md-muted-v0723'),status=el('span','md-status-v0723');status.id='md-status-v0723';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footer=el('footer'),confirm=action('md-confirm-v0723','Save project',()=>void perform());confirm.classList.add('primary');footer.append(status,confirm);
 body.append(note,details,saveSection,openSection);dialog.append(header,body,footer);d.body.append(dialog);
 function sync(){confirm.disabled=working||!session||(session.mode==='save'?!nameInput.value.trim():!fileInput.files?.length);close.disabled=working;nameInput.disabled=fileInput.disabled=working;}
 function show(mode){
  const s=H.state();if(d.querySelector('dialog[open]')||mode==='save'&&!s.ready||mode==='open'&&!s.canOpen)return false;
  returnFocus=d.activeElement;session={...s,mode};working=false;title.textContent=mode==='save'?'SAVE EDITABLE IMAGE PROJECT':'OPEN IMAGE PROJECT';
  nameInput.value=name;fileInput.value='';saveSection.hidden=mode!=='save';openSection.hidden=mode!=='open';confirm.textContent=mode==='save'?'Save .mangoimage':'Open & replace';
  details.textContent=mode==='save'?s.width+' × '+s.height+' px · '+s.layers.length+' layers · embedded source assets and masks':'Version 1–11 local project · maximum 96 MiB · source dimensions and references validated';
  status.textContent='Local only';dialog.showModal();sync();return true;
 }
 function download(blob,filename){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=filename;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function perform(){
  if(!session||confirm.disabled)return;const active=session;working=true;sync();
  try{
   if(active.mode==='save'){
    status.textContent='Encoding embedded assets…';await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
    const n=nameInput.value.trim(),p=H.save(active.stamp,n),blob=new Blob([JSON.stringify(p)],{type:'application/json'});
    if(blob.size>C.MAX_FILE)throw Error('Encoded project exceeds 96 MiB.');
    download(blob,n.replace(/[^a-zA-Z0-9 _.-]/g,'_').slice(0,100)+'.mangoimage');name=n;status.textContent='Saved editable project locally.';
   }else{
    const file=fileInput.files[0];if(!file||file.size<2||file.size>C.MAX_FILE)throw Error('Project file must be under 96 MiB.');
    status.textContent='Validating and decoding project…';const p=JSON.parse(await file.text()),result=await H.open(p,active.stamp);name=result.name;status.textContent='Opened '+result.layers+' editable layers.';working=false;dialog.close();
   }
  }catch(e){status.textContent=String(e.message||e);}
  finally{working=false;sync();refresh();}
 }
 nameInput.addEventListener('input',sync);fileInput.addEventListener('change',sync);
 dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});dialog.addEventListener('close',()=>{session=null;returnFocus?.focus?.();returnFocus=null;refresh();});
 for(const [id,mode] of [['md-open-v0723','open'],['md-save-v0723','save']])by(id)?.addEventListener('click',()=>show(mode));
 const quick=d.querySelector('.v070-quick-actions');const openButton=action('md-quick-open-v0723','Open project',()=>show('open')),saveButton=action('md-quick-save-v0723','Save project',()=>show('save'));
 if(quick)quick.prepend(openButton,saveButton);
 // A single list remains authoritative. Render thumbnails lazily for visible rows only.
 const list=by('stroke-list'),expanded=new Set();let pending=false,observer=null;
 function paint(row){if(!row.isConnected)return;const c=row.querySelector('canvas.md-thumb-v0723');if(!c||c.dataset.painted)return;c.dataset.painted='true';try{if(!H.thumbnail(row.dataset.layerId,c))c.hidden=true;const mask=row.querySelector('canvas.ce-mask-thumb-v0726');if(mask&&!H.maskThumbnail(row.dataset.layerId,mask))mask.hidden=true;}catch{c.hidden=true;}}
 if(root.IntersectionObserver)observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);paint(entry.target);}},{root:null,rootMargin:'40px'});
 function decorate(){
  if(!list)return;const layers=new Map(H.state().layers.map(l=>[l.id,l]));for(const id of expanded)if(!layers.has(id))expanded.delete(id);observer?.disconnect();for(const row of list.querySelectorAll('.image-layer-row[data-layer-id]')){
   if(row.dataset.mdDecorated){if(observer&&row.querySelector('canvas.md-thumb-v0723:not([data-painted])'))observer.observe(row);continue;}const l=layers.get(row.dataset.layerId);if(!l)continue;row.dataset.mdDecorated='true';
   const target=row.querySelector('.image-object-select');
   if(target&&l.eligible&&l.visible){const c=el('canvas','md-thumb-v0723');c.width=64;c.height=44;c.setAttribute('aria-hidden','true');c.title='Isolated layer preview';target.prepend(c);if(l.maskPreview){const m=el('canvas','ce-mask-thumb-v0726');m.width=64;m.height=44;m.title='Effective alpha mask (white visible, dark transparent)';m.setAttribute('aria-label','Image alpha mask');c.after(m);}if(observer)observer.observe(row);else paint(row);}
   const effects=[];if(l.rotation)effects.push('Rotation '+l.rotation+'°');if(l.opacity!==1)effects.push('Opacity '+Math.round(l.opacity*100)+'%');if(l.fx.kind!=='none')effects.push(l.fx.kind==='shadow'?'Drop shadow':'Outer glow');if(l.fx.blend!=='source-over')effects.push('Blend: '+l.fx.blend);if(l.material?.kind&&l.material.kind!=='none')effects.push('Material: '+l.material.kind);for(const item of l.effectStack||[])effects.push((item.enabled?'':'Disabled · ')+item.kind+' '+item.value);
   if(l.creativeFx?.gradient)effects.push('Gradient · '+l.creativeFx.gradient.kind+' · '+l.creativeFx.gradient.stops.length+' stops');for(const [i,s] of (l.creativeFx?.shadows||[]).entries())effects.push((s.enabled?'':'Disabled · ')+(s.kind==='shadow'?'Drop shadow':'Outer glow')+' '+(i+1));
   for(const [i,r] of (l.rasterFx||[]).entries())effects.push((r.enabled?'':'Disabled · ')+'Raster '+(i+1)+' · '+root.MangoRasterLayerV0727.kinds[r.op]+' '+r.amount+'%');
   if(l.callout3d)effects.push(l.callout3d.mode==='scene'?'3D scene · '+l.callout3d.objects.length+' objects · shared depth':l.callout3d.mode==='spatial'?'Spatial '+l.callout3d.shape+' · '+l.callout3d.points.length+' XYZ nodes · '+l.callout3d.camera.projection+(l.callout3d.occlusion?.length?' · '+l.callout3d.occlusion.length+' foreground masks':''):'Legacy extrusion · '+l.callout3d.shape+' · '+l.callout3d.material);
   if(l.selectionMask)effects.push((l.selectionMask.enabled?'':'Disabled · ')+'Selection mask · '+l.selectionMask.regions.length+' regions · '+l.selectionMask.feather+' px feather');
   if(l.maskPreview)effects.push('Editable image alpha mask');
   if(l.group?.length)effects.push('Folder: '+l.group.join(' / '));
   if(effects.length){const f=el('details','md-effects-v0723');f.open=expanded.has(l.id);const summary=el('summary','',effects.length+' appearance / organization entries');const items=el('div','md-effect-items-v0723');for(const effect of effects)items.append(el('span','',effect));f.append(summary,items);f.addEventListener('toggle',()=>{if(f.open)expanded.add(l.id);else expanded.delete(l.id);});row.append(f);}
  }
 }
 function refresh(){const s=H.state();for(const b of [saveButton,by('md-save-v0723')])if(b)b.disabled=!s.ready;for(const b of [openButton,by('md-open-v0723')])if(b)b.disabled=!s.canOpen;decorate();}
 function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
 if(list)new MutationObserver(records=>{if(records.some(r=>r.target===list))queue();}).observe(list,{childList:true});
 const state=by('status');if(state)new MutationObserver(queue).observe(state,{childList:true});
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);
 root.MangoImageDocumentUIV0723=Object.freeze({show,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
