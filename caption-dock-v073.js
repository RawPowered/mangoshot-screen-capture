/* MangoShot v0.7.3 — Captions belongs to the LEFT editing rail.
 * Keep the CC1 timeline small. Only the dock's content is scrollable. */
(function(root){'use strict';
 const doc=root.document,by=id=>doc.getElementById(id),dock=by('v073-caption-dock');
 const toggle=by('v073-caption-toggle'),close=by('v073-caption-close'),panel=by('caption-studio-panel');
 if(!dock||!toggle||!panel)return;
 panel.open=true;
 const body=panel.querySelector('.v072-caption-body');
 if(!body)return;
 const tabs=doc.createElement('nav');tabs.className='v073-caption-tabs';tabs.setAttribute('role','tablist');
 tabs.setAttribute('aria-label','Caption Studio controls');
 const views={};
 for(const [id,name] of [['auto','Transcribe'],['edit','Cues'],['style','Style'],['files','Files']]){
  const b=doc.createElement('button');b.type='button';b.textContent=name;
  b.className='v073-caption-tab';b.dataset.v073Tab=id;b.setAttribute('role','tab');
  b.setAttribute('aria-selected',String(id==='auto'));b.setAttribute('aria-controls','v073-caption-page-'+id);
  const v=doc.createElement('section');v.className='v073-caption-page';v.id='v073-caption-page-'+id;
  v.setAttribute('role','tabpanel');v.setAttribute('aria-label',name);v.hidden=id!=='auto';
  b.onclick=()=>activate(id);
  b.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
   e.preventDefault();const keys=Object.keys(views),at=keys.indexOf(id);
   const next=e.key==='Home'?0:e.key==='End'?keys.length-1:
    (at+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
   const key=keys[next];activate(key);tabs.querySelector('[data-v073-tab="'+key+'"]')?.focus();
  };
  tabs.appendChild(b);views[id]=v;
 }
 body.prepend(tabs);
 for(const v of Object.values(views))body.insertBefore(v,body.querySelector('#cc-status'));
 const move=(target,node)=>{if(node)target.appendChild(node);};
 const actions=body.querySelector('.v072-caption-actions');
 const label=id=>by(id)?.closest('label');
 const hint=doc.createElement('div');hint.className='v073-caption-hero';
 hint.innerHTML='<strong>Auto captions</strong><span>Detect speech, generate timed words, and show them on the video.</span>';
 views.auto.append(hint);
 move(views.auto,label('cc-engine'));
 move(views.auto,label('cc-lang'));
 move(views.auto,label('cc-model-consent'));
 move(views.auto,by('cc-transcribe'));
 move(views.auto,by('cc-install-pack'));
 move(views.auto,by('cc-cancel-transcribe'));
 move(views.auto,by('cc-asr-progress'));
 move(views.auto,by('cc-asr-stage'));
 const captionHint=body.querySelector('.v072-caption-note');
 if(captionHint)move(views.auto,captionHint);
 move(views.edit,by('cc-add'));
 move(views.edit,body.querySelector('.v072-caption-editor'));
 move(views.edit,body.querySelector('.v072-caption-list'));
 const styleHead=doc.createElement('p');styleHead.className='v073-section-head';
 styleHead.textContent='On-screen captions · appearance';views.style.append(styleHead);
 move(views.style,body.querySelector('.v072-caption-style'));
 move(views.style,label('cc-burn'));
 const fileHead=doc.createElement('p');fileHead.className='v073-section-head';
 fileHead.textContent='Subtitle sidecar files';views.files.append(fileHead);
 move(views.files,label('cc-import'));
 move(views.files,by('cc-export-srt'));move(views.files,by('cc-export-vtt'));
 const fileHint=doc.createElement('p');fileHint.className='v073-files-hint';
 fileHint.textContent='SRT/VTT retain timed captions even when video burn-in is disabled.';
 views.files.append(fileHint);
 if(actions)actions.remove();
 let opened=false,active='auto';
 function activate(key){
  if(!views[key])return;active=key;
  for(const [k,p] of Object.entries(views)){
   const on=k===key;p.hidden=!on;
   const btn=tabs.querySelector('[data-v073-tab="'+k+'"]');
   btn?.setAttribute('aria-selected',String(on));btn.tabIndex=on?0:-1;
  }
 }
 function open(key=active){
  if(typeof key==='string')activate(key);
  opened=true;dock.hidden=false;doc.body.classList.add('v073-caption-open');
  toggle.setAttribute('aria-pressed','true');toggle.setAttribute('aria-expanded','true');
 }
 function shut(){
  opened=false;dock.hidden=true;doc.body.classList.remove('v073-caption-open');
  toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-expanded','false');
 }
 toggle.addEventListener('click',()=>{if(opened)shut();else open('auto');});
 close.addEventListener('click',()=>{shut();toggle.focus();});
 doc.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&opened&&!doc.querySelector('dialog[open]')){
   e.preventDefault();shut();toggle.focus();
  }
 });
 const rail=doc.querySelector('.v06-rail');
 // Previous grouped-command tools remain unchanged. CC is a persistent dock.
 rail?.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  if(e.target===toggle){e.preventDefault();toggle.click();}
 });
 activate('auto');shut();
 root.MangoCaptionDockV073={open,close:shut,activate,isOpen:()=>opened};
})(typeof globalThis!=='undefined'?globalThis:this);
