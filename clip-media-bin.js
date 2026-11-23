/* v0.6 Clip Studio Media Bin — real local imports and staging (NOT rendered yet).
 * Secondary assets never alter the legacy v0.5.7 export without a compositor. */
(function(root){
 'use strict';
 const el=id=>document.getElementById(id),view=()=>root.MangoClipView;
 if(!el('v06-media-input')||!root.MangoMediaAssets||!root.MangoProjectV2)return;
 const registry=root.MangoMediaAssets.create(),notes=el('v06-media-note');
 let selected=null,loadedProject=null,staged=[];
 const fmt=n=>Number.isFinite(n)?n.toFixed(2)+'s':'not decoded';
 const label=text=>{notes.textContent=text;};
 const clean=node=>node.replaceChildren();
 const span=(text,cls='')=>{const n=document.createElement('span');n.textContent=text;n.className=cls;return n;};
 const button=(name,onClick)=>{const n=document.createElement('button');n.type='button';n.textContent=name;n.addEventListener('click',onClick);return n;};
 const filesize=n=>n>=1048576?(n/1048576).toFixed(1)+' MiB':Math.ceil(n/1024)+' KiB';
 const kindMark={image:'▧',video:'▶',audio:'♫'};
 function updateControls(){const a=registry.get(selected),st=el('v06-stage-asset');
  st.disabled=!a||a.missing||(a.kind!=='image'&&!Number.isFinite(a.duration));
  el('v06-relink-asset').disabled=!a||!a.missing;
  el('v06-remove-asset').disabled=!a||a.id==='source-primary';
  el('v06-restore-project').disabled=!loadedProject?.legacyV1;
  el('v06-save-project').disabled=!view()?.original();
 }
 function preview(a){const container=el('v06-asset-preview');clean(container);
  if(!a){container.textContent='Select a local image, video or audio file to inspect it.';return;}
  const title=document.createElement('strong');title.textContent=a.name;container.append(title);
  const meta=span(`${a.kind.toUpperCase()} · ${filesize(a.size)}${a.duration!=null?' · '+fmt(a.duration):''}`,'v06-meta');container.append(meta);
  if(a.missing||!a.url){container.append(span('Source file missing — choose Relink file.','v06-warning'));return;}
  const media=document.createElement(a.kind==='image'?'img':a.kind==='video'?'video':'audio');
  media.className='v06-preview-media';media.src=a.url;
  if(a.kind==='image'){media.alt='Preview of '+a.name;media.addEventListener('load',()=>{
    try{registry.updateMeta(a.id,{width:media.naturalWidth,height:media.naturalHeight});}catch{}});}
  else {media.controls=true;media.preload='metadata';media.addEventListener('loadedmetadata',()=>{
    try{const props={};if(Number.isFinite(media.duration)&&media.duration>0)props.duration=media.duration;
      if(a.kind==='video'){props.width=media.videoWidth||null;props.height=media.videoHeight||null;}
      registry.updateMeta(a.id,props);
    }catch(error){label('Could not read media metadata: '+error.message);}updateControls();
  });}
  container.append(media);
 }
 // Editing decisions change often, but imported assets rarely do. Avoid
 // reconstructing the asset DOM on every timeline refresh or playhead change.
 let lastAssetSignature=null;
 function draw(){
  const assets=registry.snapshot();
  const stamp=assets.map(a=>[a.id,a.name,a.kind,a.size,a.missing,a.duration,a.width,a.height].join('|')).join('~')+
   '::'+selected+'::'+staged.map(c=>[c.id,c.assetId,c.track,c.start,c.end].join('|')).join('~');
  updateControls();
  if(stamp===lastAssetSignature)return;
  lastAssetSignature=stamp;
  const list=el('v06-asset-list');clean(list);
  for(const a of assets){
   const item=button('',()=>{selected=a.id;preview(registry.get(a.id));draw();});
   item.className='v06-asset'+(a.id===selected?' is-selected':'');item.setAttribute('aria-pressed',String(a.id===selected));
   item.title=a.name;item.append(span(kindMark[a.kind]||'□','v06-kind'),span(a.name,'v06-filename'),span(a.missing?'Relink':filesize(a.size),'v06-small'));
   list.append(item);
  }
  if(!registry.count())list.append(span('No media imported. Choose + Media to begin.','v06-hint'));
  const drafts=el('v06-staged-list');clean(drafts);
  for(const c of staged){const a=registry.get(c.assetId);
   const row=document.createElement('div');row.className='v06-staged-row';
   row.append(span(`${c.track} · ${a?.name||'Missing asset'} · ${fmt(c.start)} – ${fmt(c.end)}`));
   row.append(button('Remove',()=>{staged=staged.filter(x=>x.id!==c.id);draw();}));drafts.append(row);
  }
  if(!staged.length)drafts.append(span('No secondary clips staged.','v06-hint'));
  el('v06-count').textContent=assets.length+' assets · '+staged.length+' staged';
 }
 registry.subscribe(()=>{draw();const a=registry.get(selected);if(a){const target=el('v06-asset-preview');
  if(target?.querySelector('strong')?.textContent!==a.name)preview(a);} });
 async function addFiles(files){let added=0,errors=[];
  for(const file of [...files].slice(0,200)){
   try{const result=registry.register(file);if(!result.duplicate)added++;selected=result.asset.id;}
   catch(e){errors.push(file.name+': '+e.message);}
  }
  if(selected)preview(registry.get(selected));draw();
  label(`${added} local asset(s) imported.${errors.length?' '+errors.slice(0,2).join('; '):''} Secondary assets are staged, not yet composited.`);
 }
 el('v06-media-input').addEventListener('change',event=>{void addFiles(event.target.files||[]);event.target.value='';});
 el('v06-relink-input').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(!file||!selected)return;
  try{registry.relink(selected,file);preview(registry.get(selected));label('Local file relinked.');}
  catch(error){label('Relink rejected: '+error.message);} });
 el('v06-relink-asset').onclick=()=>el('v06-relink-input').click();
 el('v06-remove-asset').onclick=()=>{if(!selected||selected==='source-primary')return;
  registry.remove(selected);staged=staged.filter(c=>c.assetId!==selected);selected=null;preview(null);draw();label('Asset removed from this session. Source file was not deleted.');};
 el('v06-stage-asset').onclick=()=>{const a=registry.get(selected);if(!a||a.missing)return;
  try{const manifest=root.MangoProjectV2.create({assets:registry.snapshot(),clips:staged});
   const position=Math.max(0,Number(view()?.sequencePosition?.())||0);
   staged=root.MangoProjectV2.stage(manifest,a,{start:position}).timeline.clips;
   draw();label('Staged '+a.name+' on '+(a.kind==='audio'?'A2':'V2')+'. Staged clips are NOT composited or exported yet.');
  }catch(e){label('Cannot stage asset: '+e.message);}};
 function activeLegacy(){const v=view(),source=v?.original();if(!source)return null;
  const format=source.type?.includes('mp4')?'mp4':'webm';
  // Exact format may differ from Blob MIME; core exposes source format for the validator.
  const src={size:source.size,format:v.sourceFormat?.()||format,duration:v.duration()};
  const legacy=root.MangoProject.pack(src,v.segments(),v.layers(),root.MangoClipTimeline?.markers?.()||[],v.transitions?.()||[],
   v.captions?.()||[],v.captionStyle?.()||{preset:'classic'},v.burnCaptions?.()!==false);
  return {legacy,source:src};
 }
 function save(){const current=activeLegacy();if(!current){label('Load a primary video before saving a v2 project.');return;}
  try{const converted=root.MangoProjectV2.fromV1(current.legacy,current.source,root.MangoProject);
   const assets=[...converted.assets,...registry.snapshot().filter(x=>x.id!=='source-primary')];
   const project=root.MangoProjectV2.create({assets,clips:[...converted.timeline.clips,...staged],legacyV1:current.legacy});
   project.creative={zoomFrames:view()?.zoomFrames?.()||[]};
   const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.download='MangoShot-v2-Project-'+Date.now()+'.json';
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
   label('Project v2 saved. Media files remain separate and must be relinked when reopened.');
  }catch(e){label('Could not save project v2: '+e.message);}
 }
 el('v06-save-project').onclick=save;
 el('v06-open-project').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{if(file.size>3*1024*1024)throw new Error('Project metadata exceeds 3 MiB.');
   const p=root.MangoProjectV2.check(JSON.parse(await file.text()));
   registry.clear();selected=null;loadedProject=p;staged=p.timeline.clips.filter(c=>c.staged);
   if(p.creative?.zoomFrames&&view()?.original?.())view().setZoomFrames(p.creative.zoomFrames);
   for(const a of p.assets){if(a.id!=='source-primary')registry.addPlaceholder(a);}
   draw();preview(null);label(`Loaded ${p.assets.length} asset references. Relink local files; restore the primary timeline separately.`);
  }catch(error){label('Cannot open v2 project: '+error.message);}});
 el('v06-restore-project').onclick=async()=>{
  if(!loadedProject?.legacyV1)return;
  const primary=loadedProject.assets.find(a=>a.id==='source-primary');
  const v=view();if(!primary||!v?.original()){label('Load the matching primary video using Import video before restoring decisions.');return;}
  try{if(typeof v.restoreLegacyProject!=='function')throw new Error('Legacy restore adapter unavailable.');
   v.restoreLegacyProject(loadedProject.legacyV1);
   if(loadedProject.creative?.zoomFrames)v.setZoomFrames(loadedProject.creative.zoomFrames);
   label('Primary timeline and saved zooms restored; secondary assets remain staging-only.');}
  catch(e){label('Cannot restore primary timeline: '+e.message);}
 };
 root.MangoMediaBin={registry,addFiles,refresh:draw,staged:()=>staged.map(x=>({...x})),snapshot:()=>registry.snapshot()};
 el("video")?.addEventListener("loadedmetadata",draw);
 draw();
})(typeof globalThis!=='undefined'?globalThis:this);
