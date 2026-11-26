/* Direct canvas pixel draft. One context bar and one undoable layer on Apply. */
(function(root){'use strict';
 const d=root.document,P=root.MangoPixelToolsV0741,H=root.MangoPixelImageV0741,U=root.MangoCalloutMotionUIV0736;
 const by=id=>d.getElementById(id),bar=d.querySelector('.v070-options-bar'),host=by('ux41-pixel-tools'),wrap=by('canvas-wrap'),ink=by('ink');
 if(!P||!H||!U||!host||!bar||!wrap||!ink)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;},clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const names={clone:'Clone Stamp',dodge:'Dodge',burn:'Burn',fill:'Bucket Fill',gradient:'Gradient'},icons={
 clone:['M8 3h8a3 3 0 0 1 3 3c0 3-3 4-3 7h4v4H4v-4h4c0-3-3-4-3-7a3 3 0 0 1 3-3Z','M4 21h16'],
 dodge:['M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14','M15 15l6 6','M7 10h6M10 7v6'],
 burn:['M12 2c2 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-7 4-9 0 4 2 5 3 5 2-3 1-6 0-9Z'],
 fill:['M6 3l12 12-6 6L2 11Z','M3 12h15','M20 15c-2 2-3 4-3 5a2 2 0 0 0 4 0c0-1-1-3-1-5Z'],
 gradient:['M3 4h18v16H3Z','M7 5v14M11 5v14M16 5v14']};
 function svg(mode){const ns='http://www.w3.org/2000/svg',s=d.createElementNS(ns,'svg');for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'19',height:'19',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))s.setAttribute(k,v);for(const a of icons[mode]){const p=d.createElementNS(ns,'path');p.setAttribute('d',a);s.append(p);}return s;}
 const buttons=new Map(),prefs={size:32,hardness:65,strength:70,tolerance:12,opacity:100,first:'#ffffff',last:'#101820',pressure:true};
 let session=null,drag=null,busy=false,frame=0;
 const controls=el('section','ux41-controls');controls.id='ux41-controls';controls.hidden=true;controls.setAttribute('aria-label','Active pixel tool controls');
 const title=el('strong','ux41-title'),knobs=el('div','ux41-knobs'),actions=el('div','ux41-actions'),note=el('span','ux41-note');note.id='ux41-note';note.setAttribute('role','status');
 const apply=el('button','primary','Apply'),cancel=el('button','','Cancel');apply.id='ux41-apply';cancel.id='ux41-cancel';apply.type=cancel.type='button';actions.append(apply,cancel);controls.append(title,knobs,actions,note);bar.append(controls);
 const overlay=el('canvas','ux41-overlay');overlay.id='ux41-overlay';overlay.hidden=true;overlay.setAttribute('aria-label','Pixel editing canvas. Alt-click selects a clone source.');overlay.tabIndex=0;wrap.append(overlay);
 const ring=el('div','ux41-ring');ring.hidden=true;wrap.append(ring);
 const marker=el('div','ux41-marker');marker.hidden=true;wrap.append(marker);
 const message=text=>{note.textContent=text;by('status').textContent=text;};
 function tip(){return session?.mode==='clone'?(session.anchor?'Paint from selected source · Alt-click to choose another':'Alt-click the source, then paint the destination'):session?.mode==='fill'?'Click a connected color region':session?.mode==='gradient'?'Drag from start to end; drag again to replace the gradient':'Paint over the region · optional pen pressure';}
 function refresh(){for(const [mode,b] of buttons){b.disabled=busy||(!session&&!H.state().ready);b.setAttribute('aria-pressed',String(session?.mode===mode));}apply.disabled=busy||!!drag||!session?.dirty;cancel.disabled=busy;controls.setAttribute('aria-busy',String(busy));}
 function dispose(text){if(frame)root.cancelAnimationFrame(frame);frame=0;drag=null;if(session){session.source=null;session.patch=null;}session=null;overlay.hidden=true;overlay.width=overlay.height=1;ring.hidden=marker.hidden=true;controls.hidden=true;d.body.classList.remove('ux41-editing');if(text)message(text);refresh();}
 function live(){if(!session)return false;const s=H.state();if(!s.ready||s.stamp!==session.stamp){message('Image changed. Cancel the pixel draft before continuing.');apply.disabled=true;return false;}return true;}
 function dial(key,label,min,max,step,reset,change){
  const w=el('div','ux41-knob'),l=el('span','',label),n=el('input');n.id='ux41-'+key;n.type='number';n.min=String(min);n.max=String(max);n.step='any';n.setAttribute('aria-label',label+' exact value');
  const set=v=>{prefs[key]=Math.round(clamp(v,min,max)*100)/100;n.value=String(prefs[key]);a.refresh();change?.();};
  const a=U.dial(label,min,max,step,()=>prefs[key],set,()=>reset,false);n.value=String(prefs[key]);n.onchange=()=>{if(Number.isFinite(n.valueAsNumber))set(n.valueAsNumber);else n.value=String(prefs[key]);};n.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();n.blur();}};w.append(a.element,l,n);knobs.append(w);
 }
 function color(key,label,change){const w=el('label','ux41-color'),n=el('input');n.type='color';n.id='ux41-'+key;n.value=prefs[key];n.oninput=()=>{prefs[key]=n.value;change?.();};w.append(el('span','',label),n);knobs.append(w);}
 function renderGradient(){if(!session||session.mode!=='gradient'||!session.line)return;const {start,end}=session.line,g=overlay.getContext('2d');if(P.gradient(g,overlay.width,overlay.height,start,end,prefs.first,prefs.last,prefs.opacity))session.dirty={x:0,y:0,width:overlay.width,height:overlay.height};else {g.clearRect(0,0,overlay.width,overlay.height);session.dirty=null;}refresh();}
 function build(){knobs.replaceChildren();title.textContent=names[session.mode];const mode=session.mode;
  if(['clone','dodge','burn'].includes(mode)){
   dial('size','Diameter',4,300,2,32);dial('hardness','Hardness',0,100,1,65);dial('strength',mode==='clone'?'Opacity':'Strength',0,100,5,70);
   const w=el('label','ux41-pressure'),n=el('input');n.type='checkbox';n.id='ux41-pressure';n.checked=prefs.pressure;n.onchange=()=>prefs.pressure=n.checked;w.append(n,el('span','','Pen pressure'));knobs.append(w);
  }else if(mode==='fill'){prefs.first=by('color')?.value||prefs.first;color('first','Fill');dial('tolerance','Tolerance',0,100,1,12);dial('opacity','Opacity',0,100,5,100);}
  else{color('first','Start',renderGradient);color('last','End',renderGradient);dial('opacity','Opacity',0,100,5,100,renderGradient);}
  message(tip());refresh();
 }
 function open(mode){if(busy||!Object.hasOwn(names,mode))return false;if(d.querySelector('dialog[open]'))return false;
  if(session?.mode===mode)return true;
  if(session?.dirty){message('Apply or cancel the current pixel draft before switching tools.');return false;}
  if(session)dispose();try{const s=H.state();if(!s.ready)throw Error('Import or capture an image first.');P.dimensions(s.width,s.height);const c=H.capture(s.stamp),q=c.getContext('2d',{willReadFrequently:true}),source=q.getImageData(0,0,s.width,s.height);c.width=c.height=1;
   overlay.width=s.width;overlay.height=s.height;const ctx=overlay.getContext('2d',{willReadFrequently:true}),patch=ctx.createImageData(s.width,s.height);
   session={mode,stamp:s.stamp,source:source.data,patch,dirty:null,anchor:null,line:null};overlay.hidden=false;controls.hidden=false;d.body.classList.add('ux41-editing');build();return true;
  }catch(e){dispose(e.message);return false;}}
 for(const mode of Object.keys(names)){const b=el('button','ux40-launch ux41-launch');b.type='button';b.id='ux41-tool-'+mode;b.title=names[mode];b.setAttribute('aria-label',names[mode]);b.append(svg(mode),el('span','ux40-tool-label',mode==='clone'?'Clone':mode==='fill'?'Fill':names[mode]));b.onclick=()=>open(mode);host.append(b);buttons.set(mode,b);}
 function point(e){const r=overlay.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*overlay.width/r.width,0,overlay.width-.0001),y:clamp((e.clientY-r.top)*overlay.height/r.height,0,overlay.height-.0001),pressure:prefs.pressure&&e.pointerType==='pen'?clamp(e.pressure||.05,.05,1):1};}
 function paintBounds(b){if(!b)return;overlay.getContext('2d').putImageData(session.patch,0,0,b.x,b.y,b.width,b.height);session.dirty=P.union(session.dirty,b);}
 function dab(p){return P.brush(session.source,session.patch.data,overlay.width,overlay.height,session.mode,p.x,p.y,{size:prefs.size,hardness:prefs.hardness,strength:prefs.strength,pressure:p.pressure,dx:drag.dx,dy:drag.dy});}
 function stroke(p){const a=drag.last||p,dist=Math.hypot(p.x-a.x,p.y-a.y),n=Math.max(1,Math.ceil(dist/Math.max(1,prefs.size*.15)));let b=null;for(let i=1;i<=n;i++){const u=i/n;b=P.union(b,dab({x:a.x+(p.x-a.x)*u,y:a.y+(p.y-a.y)*u,pressure:a.pressure+(p.pressure-a.pressure)*u}));}drag.last=p;paintBounds(b);}
 function showRing(p){if(!session||!['clone','dodge','burn'].includes(session.mode)){ring.hidden=true;return;}ring.hidden=false;ring.style.left=100*p.x/overlay.width+'%';ring.style.top=100*p.y/overlay.height+'%';ring.style.width=100*prefs.size/overlay.width+'%';ring.style.height=100*prefs.size/overlay.height+'%';}
 function showAnchor(){const a=session?.anchor;marker.hidden=!a;if(a){marker.style.left=100*a.x/overlay.width+'%';marker.style.top=100*a.y/overlay.height+'%';}}
 overlay.addEventListener('pointerdown',e=>{if(e.button!==0||busy||!session||!live())return;e.preventDefault();e.stopPropagation();const p=point(e);overlay.focus({preventScroll:true});
  try{if(session.mode==='clone'&&e.altKey){session.anchor=p;showAnchor();message(tip());return;}
   if(session.mode==='clone'&&!session.anchor){message(tip());return;}
   if(session.mode==='fill'){paintBounds(P.fill(session.source,session.patch.data,overlay.width,overlay.height,p.x,p.y,P.color(prefs.first),prefs.tolerance,prefs.opacity));refresh();return;}
   drag={id:e.pointerId,start:p,last:null,dx:(session.anchor?.x??p.x)-p.x,dy:(session.anchor?.y??p.y)-p.y};
   overlay.setPointerCapture(e.pointerId);
   if(session.mode==='gradient')session.line={start:p,end:p};else stroke(p);refresh();
  }catch(err){drag=null;message(err.message);refresh();}});
 overlay.addEventListener('pointermove',e=>{if(!session||busy)return;const p=point(e);showRing(p);if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
  if(!live()){drag=null;refresh();return;}
  try{if(session.mode==='gradient'){session.line.end=p;if(!frame)frame=root.requestAnimationFrame(()=>{frame=0;renderGradient();});}else stroke(p);}catch(err){drag=null;message(err.message);refresh();}});
 function end(e){if(!drag||drag.id!==e.pointerId)return;try{if(session.mode==='gradient'&&e.type==='pointerup'){session.line.end=point(e);if(frame)root.cancelAnimationFrame(frame);frame=0;renderGradient();}else if(e.type==='pointerup')stroke(point(e));}catch(err){message(err.message);}drag=null;refresh();}
 for(const name of ['pointerup','pointercancel','lostpointercapture'])overlay.addEventListener(name,end);
 overlay.addEventListener('pointerleave',()=>ring.hidden=true);
 overlay.addEventListener('contextmenu',e=>e.preventDefault());
 apply.onclick=async()=>{if(busy||!session?.dirty||drag||!live())return;const s=session,b=s.dirty,c=el('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(overlay,b.x,b.y,b.width,b.height,0,0,b.width,b.height);busy=true;refresh();message('Preparing editable pixel layer…');try{await H.commit(c,b.x,b.y,names[s.mode],s.stamp);dispose(names[s.mode]+' applied · one editable layer · Ctrl+Z to undo');}catch(e){message(e.message);}finally{c.width=c.height=1;busy=false;refresh();}};
 cancel.onclick=()=>{if(!busy)dispose('Pixel draft discarded. Original image unchanged.');};
 // Protect the staged operation from tool switches and global shortcuts.
 root.addEventListener('keydown',e=>{if(!session)return;if(e.key==='Escape'&&!busy){e.preventDefault();e.stopImmediatePropagation();cancel.click();return;}if(e.target?.closest?.('#ux41-controls'))return;if(e.key===' '||e.code==='Space')return;if(e.ctrlKey||e.metaKey||e.altKey||/^(Arrow|Delete|Backspace)/.test(e.key)||e.key.length===1){e.preventDefault();e.stopImmediatePropagation();message('Apply or cancel the pixel draft before using another editing command.');}},true);
 d.addEventListener('click',e=>{if(!session)return;const target=e.target.closest?.('button,select,input,a,summary');if(!target||target.closest('#ux41-controls,#ux41-pixel-tools')||target===overlay||target.id==='zoom'||target.closest('.ux42-viewzoom,.v070-settings'))return;if(target.closest('.ux40-shelf,.image-toolrail,.image-inspector,.studio-transport,.v06-menu-bar,.studio-tabs')){e.preventDefault();e.stopImmediatePropagation();message('Apply or cancel the pixel draft before switching tools.');}},true);
 const watch=new MutationObserver(()=>{if(!busy&&!session)refresh();});watch.observe(by('status'),{childList:true,subtree:true});root.addEventListener('mango-image-state-v0743',()=>{if(!session)refresh();});for(const type of ['click','pointerup','pointercancel','change'])d.addEventListener(type,()=>{if(!session)queueMicrotask(refresh);},true);refresh();
 root.MangoPixelUIV0741=Object.freeze({open,refresh,state:()=>({mode:session?.mode||null,dirty:session?.dirty?{...session.dirty}:null,busy})});
})(globalThis);
