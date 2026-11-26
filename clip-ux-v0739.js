/* Compact primary-first timeline and real Smart Zoom dial adapters. */
(function(root){'use strict';const d=root.document;if(!d)return;const by=id=>d.getElementById(id),make=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const timeline=by('timeline'),graphics=by('graphic-tracks'),scroller=by('timeline-scroll');if(timeline&&graphics&&timeline.parentNode===graphics.parentNode){graphics.before(timeline);timeline.classList.add('ci39-primary');timeline.setAttribute('aria-label','V1 primary video and A1 linked audio');}
 const heading=d.querySelector('.clip-timeline-panel>.panel-heading');if(heading){heading.firstElementChild.textContent='TIMELINE · PRIMARY / GRAPHICS / CAMERA / AUDIO';const b=make('button','ci39-track-button','Primary track');b.type='button';b.onclick=()=>{if(scroller)scroller.scrollTop=0;};heading.append(b);}
 by('media-check-save-v0739')?.addEventListener('click',()=>by('save-original')?.click());
 const props=by('v062-cursor-panel'),director=by('cursor-director-v074'),simple=by('cursor-clip-v073');if(props&&director&&simple){
  const launch=make('button','ci39-open','Open Cursor Studio · dials & effects');launch.type='button';launch.id='ci39-open-cursor';props.prepend(launch);
  const dlg=make('dialog','ci39-cursor-dialog');dlg.id='ci39-cursor-dialog';dlg.setAttribute('aria-label','Cursor Studio');const top=make('header','ci39-cursor-head'),close=make('button','','Close ×');close.type='button';close.onclick=()=>dlg.close();top.append(make('strong','','CURSOR STUDIO'),close);const body=make('div','ci39-cursor-body');dlg.append(top,body);d.body.append(dlg);let placeholders=[];
  launch.onclick=()=>{if(d.querySelector('dialog[open]'))return;placeholders=[simple,director].map(n=>{const p=d.createComment('cursor studio owner');n.before(p);body.append(n);return {p,n};});dlg.showModal();};
  dlg.addEventListener('close',()=>{for(const {p,n} of placeholders)p.replaceWith(n);placeholders=[];launch.focus();});
 }
 const U=root.MangoCalloutMotionUIV0736;
 for(const [id,label,reset] of [['cd-smart-scale-v074','Smart zoom',1.75],['cd-smart-transition-v074','Transition',.4],['cd-smart-hold-v074','Hold',1.2],['cursor-clip-scale-v073','Cursor zoom',1.75],['cursor-clip-hold-v073','Cursor hold',1.8]]){
  const input=by(id);if(!input||!U)continue;const host=input.parentElement;const dial=U.dial(label,Number(input.min),Number(input.max),Number(input.step),()=>Number(input.value)||reset,v=>{if(input.disabled)return;input.value=String(Math.round(v*10000)/10000);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},()=>reset,false);
  const row=make('span','ci39-dial-row');input.before(row);row.append(dial.element,input);host.classList.add('ci39-field');input.addEventListener('input',dial.refresh);input.addEventListener('change',dial.refresh);d.addEventListener('click',()=>root.requestAnimationFrame(dial.refresh),true);
 }
})(globalThis);
