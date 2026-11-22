/* MangoShot v0.6.5 — pinned Media Bin with its actual import controls.
   The desktop canvas never needs a document-level scrollbar; each panel
   owns its own overflow. Do not move or clone native file inputs. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const doc=document,body=doc.body;
 if(!body?.classList.contains('v062-workspace'))return;
 const bin=doc.querySelector('.v062-media-dock'),heading=bin?.querySelector(':scope > .panel-heading'),assetInput=doc.getElementById('v06-media-input');
 if(!bin||!heading||!assetInput)return;
 body.classList.add('v065-viewport');
 const make=(tag,cls,label)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(label)node.textContent=label;return node;};
 const action=(label,title,handler,cls)=>{
  const b=make('button',cls,label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',handler);return b;
 };
 const text=make('span','v065-dock-title','MEDIA LIBRARY');
 heading.replaceChildren(text);
 const count=doc.getElementById('v06-count'),num=make('span','v065-dock-count');
 if(count){count.classList.add('v065-media-count');num.append(count);}
 heading.append(num);
 const tools=make('div','v065-dock-tools');
 const importButton=action('Import','Import local images, video or audio',''.constructor===String?()=>assetInput.click():()=>assetInput.click(),'v065-import-action');
 importButton.id='v065-import-media';
 const toggle=action('Collapse','Collapse Media Library',()=>setCollapsed(!collapsed),'v065-dock-collapse');
 toggle.id='v065-media-toggle';
 tools.append(importButton,toggle);heading.append(tools);
 const section=bin.querySelector('.v06-section');
 section?.setAttribute('aria-label','Imported local media and asset actions');
 const oldLabel=bin.querySelector('.v06-upload-label');
 if(oldLabel)oldLabel.classList.add('v065-original-picker');
 let collapsed=false;
 function setCollapsed(value){
  collapsed=!!value;
  body.classList.toggle('v065-bin-collapsed',collapsed);
  toggle.textContent=collapsed?'Expand':'Collapse';
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.title=collapsed?'Expand Media Library':'Collapse Media Library';
  try{root.localStorage?.setItem('MangoShot.MediaDockCollapsed.v1',collapsed?'1':'0');}catch{}
 }
 try{collapsed=root.localStorage?.getItem('MangoShot.MediaDockCollapsed.v1')==='1';}catch{}
 if(root.innerHeight<640&&!collapsed)collapsed=true;
 setCollapsed(collapsed);
 const show=()=>setCollapsed(false);
 root.MangoMediaDock={toggle:()=>setCollapsed(!collapsed),show,collapsed:()=>collapsed,import:()=>assetInput.click()};
 const videoButton=doc.querySelector('.clip-open-file');
 if(videoButton)videoButton.title='Import the primary screen recording. Secondary assets belong in the pinned Media Library below.';
 const mediaMenu=[...doc.querySelectorAll('.v06-menu')].find(x=>x.querySelector('summary')?.textContent.trim()==='Layer');
 const existing=[...mediaMenu?.querySelectorAll('button')||[]].find(x=>x.textContent.trim()==='Show Media Bin');
 if(existing){
  existing.textContent='Show pinned Media Library';
  existing.addEventListener('click',show);
 }
 // Window resizing never changes source media, clip durations or any edit state.
 root.addEventListener('resize',()=>{
  if(root.innerHeight<600&&!collapsed&&doc.activeElement!==importButton)setCollapsed(true);
 },{passive:true});
})(typeof globalThis!=='undefined'?globalThis:this);
