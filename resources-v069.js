/* MangoShot v0.6.9: a static, local directory of official third-party resource pages.
 * No iframe, scraping, permissions, content injection or remote API required. */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const grid=document.getElementById('resources-grid'),search=document.getElementById('resources-search'),
  cats=document.getElementById('resources-categories'),favoritesOnly=document.getElementById('resources-favorites');
 if(!grid||!cats||!search||!favoritesOnly)return;
 const records=[
  {name:'Freepik',category:'Photos & Video',type:'Stock art, video, vectors and design assets',url:'https://www.freepik.com/',license:'https://www.freepik.com/legal/terms-of-use',note:'Free tier may require attribution; Premium content differs.'},
  {name:'Pexels',category:'Photos & Video',type:'Free stock photos and video',url:'https://www.pexels.com/',license:'https://www.pexels.com/license/',note:'Check restrictions on depicted people, brands and redistribution.'},
  {name:'Unsplash',category:'Photos & Video',type:'Professional photography',url:'https://unsplash.com/',license:'https://unsplash.com/license',note:'Photography free license; verify individual image rights.'},
  {name:'Mixkit',category:'Photos & Video',type:'Video, audio and sound effects',url:'https://mixkit.co/',license:'https://mixkit.co/license/',note:'Free and Restricted license categories vary by asset.'},
  {name:'Pixabay',category:'Photos & Video',type:'Stock photography, video and illustrations',url:'https://pixabay.com/',license:'https://pixabay.com/service/license-summary/',note:'Check restrictions on merchandising, redistribution and trademarks.'},
  {name:'Google Fonts',category:'Fonts',type:'Open-source font families',url:'https://fonts.google.com/',license:'https://fonts.google.com/knowledge/glossary/licensing',note:'Check the license bundled with each font.'},
  {name:'Fontshare',category:'Fonts',type:'Contemporary professional typefaces',url:'https://www.fontshare.com/',license:'https://www.fontshare.com/licenses',note:'Review the font family license before distribution.'},
  {name:'Font Squirrel',category:'Fonts',type:'Curated fonts and licensing tools',url:'https://www.fontsquirrel.com/',license:'https://www.fontsquirrel.com/faq',note:'Font licensing varies; verify original EULA.'},
  {name:'Poly Haven',category:'Materials',type:'CC0 PBR textures and HDRIs',url:'https://polyhaven.com/',license:'https://polyhaven.com/license',note:'CC0 material library.'},
  {name:'ambientCG',category:'Materials',type:'CC0 high-resolution texture materials',url:'https://ambientcg.com/',license:'https://docs.ambientcg.com/license/',note:'CC0 material library.'},
  {name:'SVG Repo',category:'Icons',type:'Icons and scalable vector illustrations',url:'https://www.svgrepo.com/',license:'https://www.svgrepo.com/page/licensing/',note:'Licenses vary by SVG; verify the specific asset.'},
  {name:'Freesound',category:'Audio',type:'Community effects and recordings',url:'https://freesound.org/',license:'https://freesound.org/help/faq/#licenses',note:'CC0, attribution and noncommercial terms vary by recording.'}
 ];
 const allowed=new Set(records.map(r=>r.name));
 let saved=[];try{const a=JSON.parse(root.localStorage?.getItem('MangoShot.ResourcesFavorites.v1')||'[]');
  if(Array.isArray(a))saved=a.filter(x=>allowed.has(x));}catch{}
 let category='All';
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 function save(){try{root.localStorage?.setItem('MangoShot.ResourcesFavorites.v1',JSON.stringify(saved));}catch{}}
 const buttons=new Map();
 for(const name of ['All','Photos & Video','Fonts','Materials','Icons','Audio']){
  const b=make('button','v069-filter',name);b.type='button';b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>{category=name;render();});cats.append(b);buttons.set(name,b);
 }
 function render(){
  for(const [name,b] of buttons)b.setAttribute('aria-pressed',String(name===category));
  grid.replaceChildren();const term=search.value.trim().toLowerCase();
  const selected=records.filter(r=>(category==='All'||r.category===category)&&
   (!favoritesOnly.checked||saved.includes(r.name))&&
   (!term||(r.name+' '+r.category+' '+r.type).toLowerCase().includes(term)));
  if(!selected.length){grid.append(make('p','v069-resource-empty','No matching resources. Change the category or search.'));return;}
  for(const record of selected){
   const card=make('article','v069-resource-card');
   const heading=make('div','v069-resource-card-heading');
   const icon=make('span','v069-resource-monogram',record.name.slice(0,2).toUpperCase());
   const names=make('div','');names.append(make('h2','',record.name),make('span','',record.category));
   const star=make('button','v069-resource-star',saved.includes(record.name)?'★':'☆');
   star.type='button';star.title=saved.includes(record.name)?'Remove from favorites':'Add to favorites';
   star.setAttribute('aria-pressed',String(saved.includes(record.name)));
   star.setAttribute('aria-label',(saved.includes(record.name)?'Remove ':'Add ')+record.name+(saved.includes(record.name)?' from':' to')+' favorites');
   star.addEventListener('click',()=>{saved=saved.includes(record.name)?saved.filter(n=>n!==record.name):saved.concat(record.name);save();render();});
   heading.append(icon,names,star);card.append(heading);
   card.append(make('p','v069-resource-type',record.type),make('p','v069-license-note',record.note));
   const actions=make('div','v069-resource-actions');
   const go=make('a','v069-resource-link','Visit website ↗');go.href=record.url;go.target='_blank';go.rel='noopener noreferrer';
   const license=make('a','v069-resource-license','License ↗');license.href=record.license;license.target='_blank';license.rel='noopener noreferrer';
   actions.append(go,license);card.append(actions);grid.append(card);
  }
 }
 search.addEventListener('input',render);
 favoritesOnly.addEventListener('change',render);
 render();
 root.MangoResources={count:records.length};
})(typeof globalThis!=='undefined'?globalThis:this);
