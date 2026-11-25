/* Tool library dispatches existing editor commands, never synthetic editing operations. */
(function(root){'use strict';
 const C=root.MangoToolStudioV0711,I=root.MangoIconsV079,d=document,dlg=d.getElementById('tool-library-v0711');if(!C||!I||!dlg)return;
 const el=id=>d.getElementById('ts-'+id+'-v0711'),image=d.body.classList.contains('studio-image'),studio=image?'image':'clip',groups=image?C.groups:C.clipGroups;
 const store='MangoShot.ToolStudio.'+studio+'.v1';
 function read(){try{return C.preferences(JSON.parse(localStorage.getItem(store)||'{}'),studio);}catch{return C.preferences({},studio);}}
 function write(p){try{localStorage.setItem(store,JSON.stringify(C.preferences(p,studio)));}catch{}}
 const buttons=new Map([...d.querySelectorAll('[data-v06-tool]')].map(b=>[b.dataset.v06Tool,b]));
 function activate(id){if(image){root.MangoToolGroupsV071?.activate(id);return true;}const b=buttons.get(id);if(!b||b.disabled)return false;b.click();return true;}
 function current(id){return image?d.getElementById('tool')?.value===id:buttons.get(id)?.getAttribute('aria-pressed')==='true';}
 for(const g of groups){const o=d.createElement('option');o.value=g.id;o.textContent=g.label;el('group').append(o);}
 function render(){const list=el('list'),p=read(),q=el('search').value.toLowerCase().trim(),cat=el('group').value;list.replaceChildren();
  for(const g of groups)for(const id of g.items){if(cat!=='all'&&cat!==g.id||el('favorites').checked&&!p.favorites.includes(id)||q&&!([C.titles[id],g.label,id].join(' ').toLowerCase().includes(q)))continue;
   const row=d.createElement('div');row.className='ts-entry-v0711';row.dataset.tool=id;
   const pick=d.createElement('button');pick.type='button';pick.setAttribute('aria-label','Activate '+C.titles[id]);pick.setAttribute('aria-pressed',String(current(id)));
   pick.append(I.svg(C.icons[id]||id,18),d.createTextNode(C.titles[id]));pick.disabled=!image&&(!buttons.get(id)||buttons.get(id).disabled);
   pick.addEventListener('click',()=>{dlg.close();activate(id);});
   const fav=d.createElement('button');fav.type='button';fav.setAttribute('aria-label','Favorite '+C.titles[id]);fav.setAttribute('aria-pressed',String(p.favorites.includes(id)));fav.append(I.svg('star',16));
   fav.addEventListener('click',()=>{const next=read();next.favorites=next.favorites.includes(id)?next.favorites.filter(x=>x!==id):[id,...next.favorites];write(next);render();});row.append(pick,fav);list.append(row);
  }
  if(!list.children.length){const p=d.createElement('p');p.textContent='No matching tools.';list.append(p);}
 }
 let trigger=null;
 el('open').addEventListener('click',e=>{if(dlg.open)return;trigger=e.currentTarget.closest('.v06-menu')?.querySelector('summary');for(const menu of d.querySelectorAll('.v06-menu[open]'))menu.open=false;render();dlg.showModal();el('search').focus();});
 el('close').addEventListener('click',()=>dlg.close());dlg.addEventListener('close',()=>trigger?.focus());
 for(const id of ['search','group','favorites'])el(id).addEventListener('input',render);
 if(image){for(const b of d.querySelectorAll('.ts-align-v0711 button'))b.replaceChildren(I.svg(b.dataset.tsBatch,17));}
 else{for(const g of groups){const first=buttons.get(g.items[0]);if(!first)continue;const label=d.createElement('span');label.className='ts-tool-group-label-v0711';label.textContent=g.id==='edit'?'EDIT':g.id==='graphics'?'GRAPHICS':'ASSIST';first.before(label);}}
 root.MangoToolLibraryV0711=Object.freeze({state:()=>({studio,open:dlg.open,preferences:read()})});
})(typeof globalThis!=='undefined'?globalThis:this);
