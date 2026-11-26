/* One creative action shelf, existing editor commands; no independent edit state. */
(function(root){'use strict';
 const d=root.document,I=root.MangoIconsV079,bar=d.querySelector('.v070-options-bar');if(!I||!bar)return;
 const image=d.body.classList.contains('studio-image'),by=id=>d.getElementById(id),el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const custom={dial:['M4 18a9 9 0 1 1 16 0','M12 12l5-6','M12 21v-2M3 12h2M19 12h2'],zoom:['M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14','M15 15l6 6','M10 6v8M6 10h8'],cursor:['M4 2l4 19 4-7 5 7 3-2-5-8 8-1Z','M17 3h4v4'],key:['M12 3l9 9-9 9-9-9Z','M12 8v8'],fx:['M2 18l4-12h4','M4 12h7','M14 9l6 9m0-9l-6 9'],color:['M12 3a9 9 0 1 0 0 18c2 0 3-1 3-3 0-1-1-2-1-3 0-2 2-2 4-2 3 0 3-2 3-3 0-4-4-7-9-7Z','M7 9h.1M11 6h.1M15 8h.1'],cube:['M12 2l10 6v9l-10 5-10-5V8Z','M2 8l10 6 10-6M12 14v8'],sample:['M16 3l5 5-3 3-2-2-9 9-4 1 1-4 9-9-2-2 3-3Z','M4 21h10'],gradient:['M3 4h18v16H3z','M7 4v16M11 4v16M17 4v16'],transition:['M3 5h7v14H3z','M14 5h7v14h-7z','M8 12h8m-3-3 3 3-3 3'],settings:['M5 3v18M12 3v18M19 3v18','M2 8h6M9 15h6M16 10h6']};
 function icon(id){if(I.has(id))return I.svg(id,19);const ns='http://www.w3.org/2000/svg',s=d.createElementNS(ns,'svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'19',height:'19',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))s.setAttribute(k,v);for(const a of custom[id]||custom.settings){const p=d.createElementNS(ns,'path');p.setAttribute('d',a);s.append(p);}return s;}
 const shelf=el('nav','ux40-shelf');shelf.setAttribute('aria-label',image?'Image creative tools':'Video creative tools');shelf.id='ux40-shelf';
 const caption=el('span','ux40-shelf-caption',image?'IMAGE TOOLS':'VIDEO TOOLS');shelf.append(caption);
 const strip=el('div','ux40-shelf-strip');shelf.append(strip);bar.append(shelf);d.body.classList.add('ux40-workspace');
 const group=(name)=>{const g=el('div','ux40-group');g.setAttribute('role','group');g.setAttribute('aria-label',name);strip.append(g);return g;};
 function decorate(b,key,short,long){b.classList.add('ux40-launch');b.title=long;b.setAttribute('aria-label',long);b.replaceChildren(icon(key),el('span','ux40-tool-label',short));return b;}
 function real(host,id,key,short,long){const b=by(id);if(!b)return null;decorate(b,key,short,long);host.append(b);return b;}
 const proxies=[];
 function proxy(host,id,key,short,long,invoke){const target=by(id);if(!target&&!invoke)return null;const b=el('button','ux40-launch');b.type='button';b.id='ux40-'+id;decorate(b,key,short,long);b.onclick=()=>{if(b.disabled)return;for(const m of d.querySelectorAll('.v06-menu[open]'))m.open=false;if(invoke)invoke();else target.click();};host.append(b);if(target)proxies.push({b,target});return b;}
 function activeTool(host,id,key,name){const b=proxy(host,'tool-'+id,key,name,name+' tool',()=>root.MangoToolGroupsV071?.activate(id));b.dataset.ux40Tool=id;return b;}
 function refresh(){for(const {b,target} of proxies)b.disabled=!!target.disabled;for(const b of strip.querySelectorAll('[data-ux40-tool]'))b.setAttribute('aria-pressed',String(by('tool')?.value===b.dataset.ux40Tool));}
 if(image){
  const direct=group('Direct drawing and selection');activeTool(direct,'pen','pen','Pen');activeTool(direct,'marquee','marquee','Marquee');activeTool(direct,'arrow','arrow','Arrow');activeTool(direct,'rectangle','rectangle','Box');activeTool(direct,'ellipse','ellipse','Ellipse');
  let armed=false;const ink=by('ink'),sample=el('button','ux40-launch');sample.type='button';sample.id='ux40-sample';decorate(sample,'sample','Sample','Sample drawing color from canvas');sample.setAttribute('aria-pressed','false');direct.append(sample);
  const set=v=>{armed=v;sample.setAttribute('aria-pressed',String(v));d.body.classList.toggle('ux40-sampling',v);if(v)by('status').textContent='Click a pixel to sample its visible color · Esc to cancel';};
  sample.onclick=()=>{if(!root.MangoImageActions?.state().ready)return;set(!armed);};
  root.addEventListener('pointerdown',e=>{if(!armed)return;if(sample.contains(e.target))return;if(e.target!==ink){set(false);return;}e.preventDefault();e.stopImmediatePropagation();const b=ink.getBoundingClientRect();try{const value=root.MangoColorSampleV0740.use((e.clientX-b.left)*ink.width/b.width,(e.clientY-b.top)*ink.height/b.height);sample.style.setProperty('--ux40-sample',value);}catch(err){by('status').textContent=err.message;}finally{set(false);}},true);
  root.addEventListener('keydown',e=>{if(armed&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();set(false);}},true);
  const retouch=group('Pixel painting and retouching');retouch.id='ux41-pixel-tools';
 const precision=group('Precision and pixel tools');
  real(precision,'ci-open-v0720','dial','Dials','Precision dials');
  real(precision,'bs-open-v0725','pen','Brush','Precision Brush Studio');
  real(precision,'ps-open-v0728','marquee','Pixels','Pixel Selection and Mask Studio');
  real(precision,'rl-open-v0727','gradient','Filters','Editable Raster Filters');
  const fx=group('Effects and design');real(fx,'ce-open-v0726','fx','FX','Creative Effects Studio');real(fx,'ac-open-v0724','layers','Composite','Compositing Studio');real(fx,'us-image-open','cube','3D','3D Scene Studio');
  const advanced=group('Additional creative tools');real(advanced,'sa-image-open','cube','Spatial','Spatial 3D object');real(advanced,'mc-image-open','cube','Extrude','Legacy 3D extrusions');real(advanced,'mr-open-v0722','wand','Raster','Raster Lab');
  const old=d.querySelector('.ci-studios-v0720');if(old){for(const [i,b] of [...old.querySelectorAll('button')].entries()){const text=b.textContent.trim(),name=b.title||text;decorate(b,({Layers:'layers',Effects:'fx',Material:'gradient',Type:'text'})[text]||'settings',text,name);advanced.append(b);}old.hidden=true;}
  // Original quick-access buttons remain accessible; the ribbon owns the moved nodes.
  const layout=by('ci-workspace-v0720');if(layout)layout.title='Saved image workspace layouts';
  d.querySelectorAll('#image-vector-library [data-vector-kind]').forEach(b=>{const text=b.querySelector('small')?.textContent||b.dataset.vectorKind;b.replaceChildren(icon(b.dataset.vectorKind),el('small','',text));});
 }else{
  const camera=group('Motion and cursor');real(camera,'zs38-open','zoom','Zoom','Open Zoom Studio');proxy(camera,'ci39-open-cursor','cursor','Cursor','Open Cursor Studio');
  proxy(camera,'compositor-key-menu-v0714','key','Keys','Open Keyframe Studio');
  const creative=group('Graphics and effects');proxy(creative,'add-text','text','Title','Add title');proxy(creative,'add-callout','callout','Callout','Add callout');proxy(creative,'effects-studio-menu-v0712','fx','FX','Open Effects Studio');proxy(creative,'cinematic-menu-v0713','transition','Transitions','Open Cinematic Studio');proxy(creative,'compositor-grade-menu-v0714','color','Color','Open Source Color Studio');
  const tracks=group('Layers and media');proxy(tracks,'layer-studio-menu-v0712','layers','Layers','Open Layer Studio');proxy(tracks,'multitrack-menu-v0716','film','Tracks','Open Multitrack Studio');proxy(tracks,'compositor-menu-v0714','gradient','Composite','Open Professional Compositor');proxy(tracks,'creative-open-v079','text','Presets','Open Creative Library');
  const primary=by('timeline'),ruler=by('timeline-ruler');if(primary&&ruler&&primary.parentNode===ruler.parentNode){ruler.after(primary);primary.classList.add('ux40-primary');}
  for(const b of d.querySelectorAll('[data-v062-tab]')){const label=b.textContent.trim(),key=({clip:'film',graphics:'callout',camera:'zoom',cursor:'cursor',voice:'wave',autocut:'autocut'})[b.dataset.v062Tab];if(key){b.title=label;b.setAttribute('aria-label',label);b.replaceChildren(icon(key),el('span','',label));}}
  const fields=d.querySelector('.v070-fields');function iconSwitches(){for(const b of fields?.querySelectorAll('[data-v070-tool]')||[]){if(b.dataset.ux40Icon)continue;const key=({'tool-select':'select','tool-razor':'razor','range-tool':'range','graphics-snap':'magnet'})[b.dataset.v070Tool];if(!key)continue;const name=b.textContent.trim();b.title=name;b.setAttribute('aria-label',name);b.replaceChildren(icon(key));b.dataset.ux40Icon='true';}}
  if(fields){new MutationObserver(iconSwitches).observe(fields,{childList:true,subtree:true});iconSwitches();}
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;root.requestAnimationFrame(()=>{queued=false;refresh();});};
 for(const name of ['click','input','change','pointerup','keydown'])d.addEventListener(name,schedule,true);
 for(const {target} of proxies)new MutationObserver(schedule).observe(target,{attributes:true,attributeFilter:['disabled']});refresh();
 root.MangoCreativeWorkspaceV0740=Object.freeze({refresh,studio:image?'image':'clip',launchers:()=>[...strip.querySelectorAll('button')].map(b=>({id:b.id,name:b.getAttribute('aria-label'),disabled:b.disabled}))});
})(globalThis);
