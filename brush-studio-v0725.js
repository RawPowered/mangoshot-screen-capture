/* Professional brush controls, curve editor, actual renderer preview and local presets. */
(function(root){'use strict';
 const d=root.document,B=root.MangoBrushV0725,H=root.MangoBrushImageV0725;if(!d?.body.classList.contains('studio-image')||!B||!H)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const button=(id,label,fn)=>{const n=el('button','ci-action-v0720',label);n.id=id;n.type='button';n.addEventListener('click',fn);return n;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,label] of items){const o=el('option','',label);o.value=v;n.append(o);}return n;};
 const input=(id,type)=>{const n=el('input');n.id=id;n.type=type;return n;};
 const field=(label,node)=>{const n=el('label','bs-field-v0725');n.append(el('span','',label),node);return n;};
 const modal=el('dialog','bs-dialog-v0725');modal.id='bs-dialog-v0725';modal.setAttribute('aria-labelledby','bs-title-v0725');
 const head=el('header'),titlebox=el('div'),title=el('strong','','PRECISION BRUSH STUDIO');title.id='bs-title-v0725';titlebox.append(title,el('small','','Pressure response · custom tip · live raster preview'));head.append(titlebox,button('bs-close-v0725','Close ×',()=>modal.close()));
 const body=el('div','bs-body-v0725'),mode=select('bs-mode-v0725',[['next','Brush for new strokes'],['selected','Edit selected stroke']]),enable=input('bs-enable-v0725','checkbox');
 const top=el('div','bs-top-v0725');top.append(field('Target',mode),field('Advanced brush',enable));
 const tiles=el('div','bs-presets-v0725'),customRow=el('div','bs-custom-v0725'),custom=select('bs-custom-v0725',[]),name=input('bs-custom-name-v0725','text');name.placeholder='Preset name';name.maxLength=40;name.setAttribute('aria-label','Preset name');
 const store=button('bs-store-v0725','Save preset',()=>savePreset()),remove=button('bs-remove-v0725','Delete preset',()=>removePreset());customRow.append(custom,name,store,remove);
 const grid=el('div','bs-grid-v0725'),left=el('section','bs-panel-v0725'),right=el('section','bs-panel-v0725');
 const tip=select('bs-tip-v0725',B.TIPS.map(t=>[t,t[0].toUpperCase()+t.slice(1)]));
 left.append(el('h3','','BRUSH TIP'),field('Shape',tip));
 const controls=new Map();
 function range(key,label,min,max,step,unit,scale=1){
  const n=input('bs-'+key+'-v0725','range'),out=el('output');n.min=min;n.max=max;n.step=step;
  const wrap=el('div','bs-range-v0725');wrap.append(n,out);left.append(field(label,wrap));n.setAttribute('aria-label',label);controls.set(key,{n,out,unit,scale});
  n.addEventListener('input',()=>edit(()=>{profile[key]=Number(n.value)/scale;}));
 }
 range('hardness','Hardness',0,100,1,'%',100);range('flow','Flow',5,100,1,'%',100);range('spacing','Spacing',5,100,1,'%',100);range('aspect','Tip aspect',15,100,1,'%',100);range('angle','Tip angle',-180,180,1,'°');range('minWidth','Minimum width',5,100,1,'%',100);
 const pressureWidth=input('bs-pressure-width-v0725','checkbox'),pressureFlow=input('bs-pressure-flow-v0725','checkbox');
 left.append(field('Pressure → width',pressureWidth),field('Pressure → flow',pressureFlow),el('p','bs-note-v0725','Flow builds up at each dab; overall layer opacity is applied once. Physical eraser and legacy strokes retain their existing renderer.'));
 const graph=el('canvas','bs-curve-v0725');graph.id='bs-curve-v0725';graph.width=340;graph.height=180;graph.setAttribute('aria-label','Pressure curve. Drag the three inner control points or edit their numeric values below.');
 const vals=el('div','bs-curve-numbers-v0725'),knots=[];
 for(let i=1;i<=3;i++){const n=input('bs-knot-'+i+'-v0725','number');n.min=0;n.max=100;n.step=1;knots.push(n);vals.append(field(i*25+'% input',n));n.addEventListener('change',()=>edit(()=>{profile.curve[i]=Math.max(profile.curve[i-1],Math.min(profile.curve[i+1],Number(n.value)/100));}));}
 const reset=button('bs-linear-v0725','Linear curve',()=>edit(()=>{profile.curve=[0,.25,.5,.75,1];}));
 const preview=el('canvas','bs-preview-v0725');preview.id='bs-preview-v0725';preview.width=440;preview.height=150;preview.setAttribute('aria-label','Actual brush renderer preview');
 const pad=el('canvas','bs-pad-v0725');pad.id='bs-pad-v0725';pad.width=440;pad.height=135;pad.setAttribute('aria-label','Draw a pressure test stroke with your pen or mouse');
 const reading=el('p','bs-note-v0725','Draw here with a pen or mouse; hardware pressure is reported by the browser.');
 right.append(el('h3','','PRESSURE RESPONSE'),graph,vals,reset,el('h3','','LIVE STROKE PREVIEW'),preview,el('h3','','PEN TEST PAD'),pad,reading,button('bs-clear-v0725','Clear test',()=>{testPoints=[];drawPad();}));
 grid.append(left,right);body.append(top,tiles,customRow,grid);
 const footer=el('footer'),status=el('span','bs-status-v0725');status.id='bs-status-v0725';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const apply=button('bs-apply-v0725','Use brush',()=>commit());apply.classList.add('primary');footer.append(status,apply);modal.append(head,body,footer);d.body.append(modal);
 let session=null,profile=B.defaults(),customs=[],isEnabled=false,frame=0,focus=null,testPoints=[],activePointer=null,dragKnot=null,observed={min:1,max:0,count:0};
 const tileMap=new Map();
 for(const preset of B.presets){const b=button('bs-preset-'+preset.id+'-v0725',preset.name,()=>{if(!session)return;profile=B.copy(preset.profile);isEnabled=true;sync();schedule();});const c=el('canvas');c.width=136;c.height=36;c.setAttribute('aria-hidden','true');b.prepend(c);tiles.append(b);tileMap.set(preset.id,{b,c});}
 function renderTiles(){for(const p of B.presets){const c=tileMap.get(p.id).c,q=c.getContext('2d');q.clearRect(0,0,c.width,c.height);
  const points=Array.from({length:40},(_,i)=>{const t=i/39;return {x:8+120*t,y:18+5*Math.sin(t*Math.PI*2),p:.1+.9*Math.sin(t*Math.PI)};});
  B.paint(q,{type:'pen',points,color:'#d5dce3',size:12,opacity:1,brush:p.profile});}}
 function options(){custom.replaceChildren();const o=el('option','','Local presets…');o.value='';custom.append(o);customs.forEach((p,i)=>{const n=el('option','',p.name);n.value=String(i);custom.append(n);});}
 function sync(){
  enable.checked=isEnabled;tip.value=profile.tip;tip.disabled=!isEnabled;
  for(const [key,c] of controls){c.n.value=String(Math.round(profile[key]*c.scale));c.out.textContent=c.n.value+c.unit;c.n.disabled=!isEnabled||key==='aspect'&&profile.tip==='round';}
  pressureWidth.checked=profile.pressureWidth;pressureFlow.checked=profile.pressureFlow;pressureWidth.disabled=pressureFlow.disabled=!isEnabled;
  for(let i=0;i<knots.length;i++){knots[i].value=String(Math.round(profile.curve[i+1]*100));knots[i].disabled=!isEnabled;}
  reset.disabled=!isEnabled;apply.textContent=mode.value==='selected'?'Apply to stroke':'Use brush';remove.disabled=custom.value==='';store.disabled=!isEnabled;
  for(const p of B.presets)tileMap.get(p.id).b.setAttribute('aria-pressed',String(isEnabled&&JSON.stringify(profile)===JSON.stringify(p.profile)));
 }
 function edit(fn){if(!session||!isEnabled)return;try{fn();profile=B.check(profile);sync();schedule();}catch(e){status.textContent=e.message;apply.disabled=true;}}
 function drawCurve(){
  const q=graph.getContext('2d'),w=graph.width,h=graph.height,pad=20,X=t=>pad+t*(w-2*pad),Y=t=>h-pad-t*(h-2*pad);
  q.clearRect(0,0,w,h);q.fillStyle='#15181c';q.fillRect(0,0,w,h);q.strokeStyle='#414950';q.lineWidth=1;
  for(let i=0;i<=4;i++){q.beginPath();q.moveTo(X(i/4),Y(0));q.lineTo(X(i/4),Y(1));q.moveTo(X(0),Y(i/4));q.lineTo(X(1),Y(i/4));q.stroke();}
  q.strokeStyle='#727b85';q.setLineDash([4,4]);q.beginPath();q.moveTo(X(0),Y(0));q.lineTo(X(1),Y(1));q.stroke();q.setLineDash([]);
  q.strokeStyle=isEnabled?'#b7ff3c':'#9fa8b2';q.lineWidth=2;q.beginPath();profile.curve.forEach((v,i)=>i?q.lineTo(X(i/4),Y(v)):q.moveTo(X(0),Y(v)));q.stroke();
  profile.curve.forEach((v,i)=>{q.beginPath();q.arc(X(i/4),Y(v),i===0||i===4?3:5,0,Math.PI*2);q.fillStyle='#d9dce0';q.fill();});
  q.font='10px system-ui';q.fillStyle='#b4bdc5';q.fillText('0',3,h-4);q.fillText('100% input',w-68,h-4);q.fillText('Output',4,11);
 }
 function graphPoint(e){const r=graph.getBoundingClientRect(),x=(e.clientX-r.left)*graph.width/r.width,y=(e.clientY-r.top)*graph.height/r.height;return {i:Math.max(1,Math.min(3,Math.round((x-20)/(graph.width-40)*4))),v:Math.max(0,Math.min(1,(graph.height-20-y)/(graph.height-40)))};}
 graph.addEventListener('pointerdown',e=>{if(!isEnabled||e.button!==0)return;e.preventDefault();const p=graphPoint(e);dragKnot={id:e.pointerId,i:p.i};graph.setPointerCapture?.(e.pointerId);edit(()=>{profile.curve[p.i]=Math.max(profile.curve[p.i-1],Math.min(profile.curve[p.i+1],Math.round(p.v*100)/100));});});
 graph.addEventListener('pointermove',e=>{if(dragKnot?.id!==e.pointerId)return;const p=graphPoint(e),i=dragKnot.i;edit(()=>{profile.curve[i]=Math.max(profile.curve[i-1],Math.min(profile.curve[i+1],Math.round(p.v*100)/100));});});
 for(const e of ['pointerup','pointercancel','lostpointercapture'])graph.addEventListener(e,()=>{dragKnot=null;});
 function drawPad(){const q=pad.getContext('2d');q.clearRect(0,0,pad.width,pad.height);if(!testPoints.length)return;
  if(isEnabled)B.paint(q,{type:'pen',brush:profile,points:testPoints,color:'#e0e5ec',size:24,opacity:1});
  else{q.strokeStyle='#e0e5ec';q.lineCap='round';for(let i=1;i<testPoints.length;i++){const a=testPoints[i-1],b=testPoints[i];q.lineWidth=24*Math.max(.2,(a.p+b.p)/2);q.beginPath();q.moveTo(a.x,a.y);q.lineTo(b.x,b.y);q.stroke();}}
 }
 function addPoint(e){const P=root.MangoPenInputV0616,p=P.localPoint(e,pad.getBoundingClientRect(),pad.width,pad.height,true);if(testPoints.length<4096)testPoints.push(p);
  if(e.pointerType==='pen'){observed.min=Math.min(observed.min,p.p);observed.max=Math.max(observed.max,p.p);observed.count++;reading.textContent='Pen · input '+p.p.toFixed(2)+' · response '+B.response(p.p,profile.curve).toFixed(2)+' · observed '+observed.min.toFixed(2)+'–'+observed.max.toFixed(2);}
  else reading.textContent='Mouse/touch · full pressure input. Connect a pen to test variable pressure.';}
 pad.addEventListener('pointerdown',e=>{if(e.button!==0||root.MangoPenInputV0616.eraserTip(e))return;activePointer=e.pointerId;testPoints=[];observed={min:1,max:0,count:0};pad.setPointerCapture?.(e.pointerId);addPoint(e);schedule();});
 pad.addEventListener('pointermove',e=>{if(activePointer!==e.pointerId)return;for(const x of root.MangoPenInputV0616.samples(e))addPoint(x);schedule();});
 for(const e of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(e,()=>{activePointer=null;});
 function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!session||!modal.open)return;try{drawCurve();H.preview(preview,isEnabled?profile:null,mode.value,session.selected);drawPad();H.validate(isEnabled?profile:null);apply.disabled=false;status.textContent=isEnabled?'Advanced brush draft · original strokes unchanged until Apply.':'Legacy brush renderer selected.';}catch(e){status.textContent=e.message;apply.disabled=true;}});}
 tip.addEventListener('change',()=>edit(()=>{profile.tip=tip.value;}));pressureWidth.addEventListener('change',()=>edit(()=>{profile.pressureWidth=pressureWidth.checked;}));pressureFlow.addEventListener('change',()=>edit(()=>{profile.pressureFlow=pressureFlow.checked;}));
 enable.addEventListener('change',()=>{isEnabled=enable.checked;sync();schedule();});
 mode.addEventListener('change',()=>loadMode());
 custom.addEventListener('change',()=>{if(custom.value!==''){profile=B.copy(customs[Number(custom.value)].profile);isEnabled=true;name.value=customs[Number(custom.value)].name;}sync();schedule();});
 function savePreset(){if(!isEnabled)return;const n=name.value.trim();if(!n){status.textContent='Enter a preset name.';return;}const i=customs.findIndex(p=>p.name.toLowerCase()===n.toLowerCase());if(i<0&&customs.length>=12){status.textContent='Use at most 12 local presets.';return;}
  const next=customs.slice(),entry={name:n,profile:B.copy(profile)};if(i>=0)next[i]=entry;else next.push(entry);
  try{B.save(H.state().preference,next);customs=next;options();custom.value=String(i>=0?i:next.length-1);sync();status.textContent='Preset saved locally.';}catch(e){status.textContent=e.message;}}
 function removePreset(){if(custom.value==='')return;const next=customs.filter((_,i)=>i!==Number(custom.value));try{B.save(H.state().preference,next);customs=next;options();name.value='';sync();status.textContent='Preset removed.';}catch(e){status.textContent=e.message;}}
 function loadMode(){const p=mode.value==='selected'?session.selected?.brush:session.preference;isEnabled=!!p;profile=p?B.copy(p):B.defaults();sync();schedule();}
 function open(){const s=H.state();if(!s.ready||d.querySelector('dialog[open]'))return false;session=s;customs=B.read().custom;options();name.value='';testPoints=[];reading.textContent='Draw here to test pen pressure.';focus=d.activeElement;
  mode.querySelector('[value=selected]').disabled=!s.selected;mode.value=s.selected?'selected':'next';modal.showModal();renderTiles();loadMode();return true;}
 function commit(){if(!session||apply.disabled)return;try{const p=isEnabled?B.check(profile):null;if(mode.value==='selected'){H.applySelected(session.selected.id,p,session.stamp);}else{H.validate(p);B.save(p,customs);H.setPreference(p);}modal.close();}catch(e){status.textContent=e.message;}}
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);
 modal.addEventListener('close',()=>{if(frame)cancelAnimationFrame(frame);frame=0;session=null;testPoints=[];activePointer=dragKnot=null;focus?.focus?.();focus=null;});
 const launch=button('bs-open-v0725','Brush Studio…',open),studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.append(launch);
 let queued=false;function refresh(){launch.disabled=!H.state().ready;}
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);const n=d.getElementById('status');if(n)new MutationObserver(queue).observe(n,{childList:true});
 root.MangoBrushStudioV0725=Object.freeze({open,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
