/* Tool library dispatches existing editor commands, never synthetic editing operations. */
(function(root){'use strict';
 const C=root.MangoToolStudioV0711,I=root.MangoIconsV079,d=document,dlg=d.getElementById('tool-library-v0711');if(!C||!I||!dlg)return;
 const el=id=>d.getElementById('ts-'+id+'-v0711'),image=d.body.classList.contains('studio-image'),studio=image?'image':'clip',groups=image?[...C.groups,C.actionGroup]:C.clipGroups;
 const store='MangoShot.ToolStudio.'+studio+'.v1';
 function read(){try{return C.preferences(JSON.parse(localStorage.getItem(store)||'{}'),studio);}catch{return C.preferences({},studio);}}
 function write(p){try{localStorage.setItem(store,JSON.stringify(C.preferences(p,studio)));root.MangoPinShelfV0746?.refresh?.();}catch{}}
 const buttons=new Map([...d.querySelectorAll('[data-v06-tool]')].map(b=>[b.dataset.v06Tool,b]));
 function activate(id){if(image){if(C.actions[id]){const target=d.getElementById(C.actions[id].target);if(!target||target.disabled)return false;target.click();return true;}if(!C.groups.some(g=>g.items.includes(id)))return false;root.MangoToolGroupsV071?.activate(id);return true;}const b=buttons.get(id);if(!b||b.disabled)return false;b.click();return true;}
 function current(id){return image?d.getElementById('tool')?.value===id:buttons.get(id)?.getAttribute('aria-pressed')==='true';}
 for(const g of groups){const o=d.createElement('option');o.value=g.id;o.textContent=g.label;el('group').append(o);}
 function render(){const list=el('list'),p=read(),q=el('search').value.toLowerCase().trim(),cat=el('group').value;list.replaceChildren();
  for(const g of groups)for(const id of g.items){if(cat!=='all'&&cat!==g.id||el('favorites').checked&&!p.favorites.includes(id)||q&&!([C.titles[id],g.label,id].join(' ').toLowerCase().includes(q)))continue;
   const row=d.createElement('div');row.className='ts-entry-v0711';row.dataset.tool=id;
   const pick=d.createElement('button');pick.type='button';pick.setAttribute('aria-label','Activate '+C.titles[id]);pick.setAttribute('aria-pressed',String(current(id)));
   pick.append(I.svg(C.icons[id]||id,18),d.createTextNode(C.titles[id]));pick.disabled=image?!!C.actions[id]&&(!d.getElementById(C.actions[id].target)||d.getElementById(C.actions[id].target).disabled):(!buttons.get(id)||buttons.get(id).disabled);
   pick.addEventListener('click',()=>{dlg.close();activate(id);});
   const fav=d.createElement('button');fav.type='button';fav.setAttribute('aria-label','Favorite '+C.titles[id]);fav.setAttribute('aria-pressed',String(p.favorites.includes(id)));fav.append(I.svg('star',16));
   fav.addEventListener('click',()=>{const next=read();next.favorites=next.favorites.includes(id)?next.favorites.filter(x=>x!==id):[id,...next.favorites];write(next);render();});row.append(pick,fav);if(image&&p.favorites.includes(id)&&el('favorites').checked){for(const [delta,label,symbol] of [[-1,'Move earlier','↑'],[1,'Move later','↓']]){const b=d.createElement('button');b.type='button';b.textContent=symbol;b.setAttribute('aria-label',label+' '+C.titles[id]);const index=p.favorites.indexOf(id);b.disabled=index+delta<0||index+delta>=p.favorites.length;b.onclick=()=>{const next=read(),i=next.favorites.indexOf(id),j=i+delta;if(i<0||j<0||j>=next.favorites.length)return;[next.favorites[i],next.favorites[j]]=[next.favorites[j],next.favorites[i]];write(next);render();};row.append(b);}}list.append(row);
  }
  if(!list.children.length){const p=d.createElement('p');p.textContent='No matching tools.';list.append(p);}
 }
 let trigger=null;
 function open(e,favorites=false){if(dlg.open||d.querySelector('dialog[open]'))return;trigger=e?.currentTarget?.closest('.v06-menu')?.querySelector('summary')||d.activeElement;for(const menu of d.querySelectorAll('.v06-menu[open]'))menu.open=false;if(favorites){el('search').value='';el('group').value='all';el('favorites').checked=true;}render();dlg.showModal();el('search').focus();}
 el('open').addEventListener('click',e=>open(e));
 el('close').addEventListener('click',()=>dlg.close());dlg.addEventListener('close',()=>trigger?.focus());
 for(const id of ['search','group','favorites'])el(id).addEventListener('input',render);
 if(image){for(const b of d.querySelectorAll('.ts-align-v0711 button'))b.replaceChildren(I.svg(b.dataset.tsBatch,17));}
 else{for(const g of groups){const first=buttons.get(g.items[0]);if(!first)continue;const label=d.createElement('span');label.className='ts-tool-group-label-v0711';label.textContent=g.id==='edit'?'EDIT':g.id==='graphics'?'GRAPHICS':'ASSIST';first.before(label);}}
 root.MangoToolLibraryV0711=Object.freeze({open:(favorites=false)=>open(null,favorites),activate,state:()=>({studio,open:dlg.open,preferences:read()})});
})(typeof globalThis!=='undefined'?globalThis:this);
