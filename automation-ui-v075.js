/* Shared studio workspace: all data is local and inert until a reviewed apply. */
(function(root){'use strict';
const doc=root.document,core=root.MangoAutomationCoreV075,adapters=root.MangoAutomationAdaptersV075,dialog=doc.getElementById('automation-dialog-v075');
if(!core||!adapters||!dialog)return;
const studio=doc.body.classList.contains('studio-image')?'image':doc.body.classList.contains('studio-clip')?'clip':'recorder';
const ui=id=>doc.getElementById('au-'+id+'-v075'),open=doc.getElementById('automation-open-v075'),engine=core.createEngine(studio,adapters.adapter(studio));
const storage='MangoShotAutomationRecipeLibraryV1',json=x=>JSON.stringify(x,null,2);
let ticket=null,reviewText=null,opener=null;
const status=t=>{ui('status').textContent=t;};
const catalog=engine.catalog();
function invalidate(){ticket=null;reviewText=null;engine.cancel();ui('apply').disabled=true;}
function context(){try{ui('context').textContent=json(engine.inspect());}catch{ui('context').textContent='Editor context unavailable';}}
function choose(recipe){invalidate();ui('script').value=json(recipe);ui('review').textContent='Validate to generate a change plan. No edits applied.';page('recipe');status('Recipe loaded · not executed');}
function button(label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{try{fn();}catch(e){status(e.message);}});return b;}
function commands(){const host=ui('commands'),q=ui('search').value.toLowerCase().trim();host.replaceChildren();for(const c of catalog.filter(x=>(x.title+' '+x.id+' '+x.description).toLowerCase().includes(q))){const b=button(c.title,()=>choose(core.template(c.id))),sub=doc.createElement('small');sub.textContent=c.id;b.append(sub);b.title=c.description;host.append(b);}}
function readLibrary(){const raw=root.localStorage.getItem(storage)||'[]';if(raw.length>1048576)throw Error('Recipe library too large');return core.library(JSON.parse(raw));}
function writeLibrary(next){root.localStorage.setItem(storage,JSON.stringify(core.library(next)));renderLibrary();}
function download(recipe){const data=json(core.parse(recipe)),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='MangoShot-Automation-Recipe.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function renderLibrary(){
 const host=ui('library');host.replaceChildren();let list;
 try{list=readLibrary();}catch(e){host.textContent='Library unavailable: '+e.message;return;}
 for(const r of list){const row=doc.createElement('div');row.className='au-library-row-v075';const label=doc.createElement('span');label.textContent=r.name+' · '+r.recipe.command;const load=button('Load',()=>choose(r.recipe));load.disabled=!catalog.some(c=>c.id===r.recipe.command);
 row.append(label,load,button('Export',()=>download(r.recipe)),button('Delete',()=>writeLibrary(readLibrary().filter(x=>x.name!==r.name))));host.append(row);}
 if(!list.length)host.textContent='No saved recipes.';
}
function renderHistory(){const host=ui('history');host.replaceChildren();for(const e of engine.history()){const row=doc.createElement('div');row.className='au-library-row-v075';const label=doc.createElement('span');label.textContent=e.at+' · '+e.status+' · '+e.command+' · '+e.message;row.append(label);host.append(row);}if(!host.children.length)host.textContent='No operations this session.';}
function page(name){for(const p of dialog.querySelectorAll('[data-au-page]'))p.hidden=p.dataset.auPage!==name;for(const b of dialog.querySelectorAll('[data-au-tab]'))b.setAttribute('aria-pressed',String(b.dataset.auTab===name));if(name!=='recipe'){invalidate();ui('review').textContent='Review canceled when leaving the script panel.';}if(name==='library')renderLibrary();if(name==='history')renderHistory();}
for(const b of dialog.querySelectorAll('[data-au-tab]'))b.addEventListener('click',()=>page(b.dataset.auTab));
function show(){if(dialog.open)return;const other=doc.querySelector('dialog[open]');if(other){status('Close the other dialog first');return;}opener=open;root.MangoStudioMenusV0617?.closeAll?.();open.closest('details')?.removeAttribute('open');
 try{dialog.showModal();}catch{const s=doc.getElementById('status');if(s)s.textContent='Native dialog unavailable in this browser.';return;}
 invalidate();ui('review').textContent='Validate a recipe to generate a change plan.';page('recipe');context();root.MangoStudioOverlaysV072?.refresh?.();ui('script').focus();}
open.addEventListener('click',show);ui('close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{invalidate();if(opener){const target=opener.closest('details')?.querySelector('summary')||opener;target.focus?.({preventScroll:true});}opener=null;});
ui('search').addEventListener('input',commands);ui('script').addEventListener('input',()=>{invalidate();ui('review').textContent='Recipe changed. Validate again.';});
ui('preview').addEventListener('click',()=>{invalidate();try{const p=engine.preview(ui('script').value);ticket=p.ticket;reviewText=ui('script').value;ui('review').textContent=p.summary+'\n\n'+json(p.changes)+(p.warnings.length?'\n\n'+p.warnings.join('\n'):'');ui('apply').disabled=false;status('Validated · review proposed changes, then Apply');context();}catch(e){ui('review').textContent='Rejected: '+e.message;status('No edits applied');}});
ui('apply').addEventListener('click',()=>{if(!ticket||reviewText!==ui('script').value){invalidate();status('Validate the current recipe first');return;}const token=ticket;ticket=null;reviewText=null;ui('apply').disabled=true;
 try{const r=engine.apply(token);ui('review').textContent='Applied: '+r.summary;status(studio==='recorder'?'Settings applied · already recorded frames unchanged':'Edit applied · Ctrl+Z in the editor to undo');context();}catch(e){ui('review').textContent='Rejected: '+e.message;status('Review invalid; validate again');}});
ui('import').addEventListener('click',()=>ui('file').click());ui('file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>core.LIMIT)throw Error('Recipe file exceeds 16 KiB');const r=core.parse(await file.text());if(!dialog.open)return;if(!catalog.some(c=>c.id===r.command))throw Error('Open the matching studio for this recipe');choose(r);}catch(err){status(err.message);}});
ui('export').addEventListener('click',()=>{try{download(ui('script').value);status('Recipe export requested');}catch(e){status(e.message);}});
ui('save').addEventListener('click',()=>{try{const r=core.parse(ui('script').value),name=ui('name').value.trim();const next=[...readLibrary().filter(x=>x.name!==name),{name,recipe:r}];writeLibrary(next);status('Recipe saved locally');}catch(e){status(e.message);}});
ui('clear-history').addEventListener('click',()=>{engine.clearHistory();renderHistory();});
root.addEventListener('storage',e=>{if(e.key===storage&&dialog.open&&!dialog.querySelector('[data-au-page="library"]').hidden)renderLibrary();});
ui('scope').textContent=({image:'IMAGE STUDIO',clip:'CLIP STUDIO',recorder:'RECORD STUDIO'})[studio]+' · LOCAL · '+catalog.length+' COMMANDS';
commands();if(catalog.length)choose(core.template(catalog[0].id));
root.MangoAutomationV075=Object.freeze({open:show,catalog:engine.catalog,inspect:engine.inspect,preview:engine.preview,apply:engine.apply,cancel:engine.cancel,history:engine.history});
})(typeof globalThis!=='undefined'?globalThis:this);
