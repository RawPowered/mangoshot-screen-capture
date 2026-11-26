/* Accessible precision dials and staged, independent property tracks. */
(function(root){'use strict';
 const d=root.document,K=root.MangoCalloutMotionV0736;if(!d||!K)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=v=>Math.round(v*10000)/10000;
 function dial(label,min,max,step,get,set,reset,locked){
  const n=el('div','co36-dial'),face=el('span','co36-dial-face'),needle=el('span','co36-dial-needle');face.append(needle);n.append(face);
  n.setAttribute('role','slider');n.setAttribute('aria-label',label+' dial');n.setAttribute('aria-valuemin',String(min));n.setAttribute('aria-valuemax',String(max));n.setAttribute('aria-disabled',String(locked));n.tabIndex=locked?-1:0;
  n.title=label+' · drag vertically/horizontally · Shift fine · arrows · double-click reset';
  const refresh=()=>{const v=clamp(get(),min,max),a=270*(v-min)/(max-min);n.style.setProperty('--dial-sweep',a+'deg');needle.style.transform='rotate('+(-135+a)+'deg)';n.setAttribute('aria-valuenow',String(v));};
  let drag=null;
  const put=v=>{set(round(clamp(v,min,max)));refresh();};
  n.onpointerdown=ev=>{if(locked||ev.button!==0)return;drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,v:get()};n.focus({preventScroll:true});n.setPointerCapture(ev.pointerId);ev.preventDefault();};
  n.onpointermove=ev=>{if(!drag||drag.id!==ev.pointerId)return;const delta=(ev.clientX-drag.x+drag.y-ev.clientY)*(max-min)/180*(ev.shiftKey?.1:1);put(drag.v+delta);};
  n.onpointerup=n.onpointercancel=n.onlostpointercapture=()=>{drag=null;};
  n.ondblclick=()=>{if(!locked)put(reset());};
  n.onkeydown=ev=>{if(locked)return;const delta=ev.shiftKey?step/10:step;if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End','PageUp','PageDown'].includes(ev.key)){ev.preventDefault();put(ev.key==='Home'?min:ev.key==='End'?max:get()+(['ArrowRight','ArrowUp','PageUp'].includes(ev.key)?1:-1)*delta*(ev.key.startsWith('Page')?10:1));}};
  refresh();return {element:n,refresh};
 }
 function editor(host,initial,opts){
  let model=initial?K.check(initial):K.empty(),property=model.tracks[0]?.property||'x',index=0,selectedTime=0;
  const locked=!!opts.locked,wrap=el('div','co36-editor'),notice=el('p','co36-notice','Independent property tracks. Static values remain the fallback. Drag the preview in this tab to create position or size keys. Keys retime with clip duration.'),status=el('div','co36-status');status.setAttribute('role','status');
  const btn=(id,text,fn)=>{const b=el('button','',text);b.type='button';b.id=id;b.onclick=()=>safe(fn);return b;};
  const base=p=>K.poseKeys.includes(p)?opts.base()[p]:opts.recipe()[p];
  const active=()=>K.get(model,property);
  function safe(fn){try{fn();status.textContent='';}catch(e){status.textContent=e.message;}}
  function mutate(n,selectTime){if(locked)throw Error('Unlock the clip first.');model=K.check(n);if(selectTime!=null){const a=active();index=a?Math.max(0,K.nearest(a,selectTime)):0;}opts.change();refresh(opts.time());}
  const selector=el('select');selector.id='co36-property';selector.setAttribute('aria-label','Animated property');for(const [p,s] of Object.entries(K.properties)){const o=el('option','',s.name);o.value=p;selector.append(o);}selector.value=property;
  const trackToggle=btn('co36-enable','Enable track',()=>{mutate(active()?K.remove(model,property):K.enable(model,property,base(property)));index=0;refresh(opts.time());});
  const add=btn('co36-add-key','◆ Add at time',()=>{let n=K.enable(model,property,base(property));n=K.insert(n,property,opts.time());mutate(n,opts.time());});
  const del=btn('co36-delete-key','Delete key',()=>{mutate(K.removeKey(model,property,index));index=Math.max(0,index-1);refresh(opts.time());});
  const info=el('output','co36-count'),graph=el('canvas','co36-graph');graph.width=360;graph.height=126;graph.id='co36-graph';graph.setAttribute('aria-label','Property value over clip time');
  const strip=el('div','co36-key-strip');strip.id='co36-key-strip';
  const selectKey=el('select');selectKey.id='co36-key';selectKey.setAttribute('aria-label','Selected keyframe');
  const time=el('input');time.type='number';time.min='0';time.max='100';time.step='any';time.id='co36-key-time';
  const val=el('input');val.type='number';val.step='any';val.id='co36-key-value';
  const ease=el('select');ease.id='co36-ease';for(const [v,t] of [['linear','Linear'],['smooth','Smoothstep'],['easeIn','Ease in'],['easeOut','Ease out'],['hold','Hold'],['bezier','Custom Bezier']]){const o=el('option','',t);o.value=v;ease.append(o);}
  const curves=el('div','co36-curve'),curveInputs=[];const field=(label,n)=>{const l=el('label','co36-field',label);l.append(n);return l;};
  for(const s of ['X1','Y1','X2','Y2']){const n=el('input');n.type='number';n.min='0';n.max='1';n.step='any';n.id='co36-curve-'+s.toLowerCase();curveInputs.push(n);curves.append(field(s,n));}
  const apply=btn('co36-apply-key','Apply key values',()=>{const a=active();if(!a)return;const k=a.keys[index],patch={t:time.valueAsNumber/100,value:val.valueAsNumber,ease:ease.value,curve:curveInputs.map(n=>n.valueAsNumber)};if(!Number.isFinite(patch.t)||!Number.isFinite(patch.value))throw Error('Enter valid numeric key values.');mutate(K.edit(model,property,index,patch),patch.t);opts.seek(patch.t);});
  const rows=el('div','co36-key-fields');rows.append(field('Key',selectKey),field('Time %',time),field('Value',val),field('Outgoing ease',ease),curves,apply);
  const paths=el('div','co36-path-presets');paths.append(el('strong','','POSITION PATHS'));for(const [id,text] of [['drift','Drift'],['rise','Rise'],['arc','Arc']]){const b=btn('co36-path-'+id,text,()=>{if((K.get(model,'x')||K.get(model,'y'))&&!root.confirm('Replace the X/Y position tracks? Other property tracks are preserved.'))return;property='x';selector.value=property;index=0;mutate(K.pathPreset(model,id,opts.base()));});b.disabled=locked;paths.append(b);}
  const header=el('div','co36-track-head');header.append(selector,trackToggle,info);
  const actions=el('div','co36-key-actions');actions.append(add,del);
  wrap.append(notice,header,graph,strip,actions,rows,paths,status);host.append(wrap);
  function choose(i){const a=active();if(!a)return;index=clamp(i,0,a.keys.length-1);opts.seek(a.keys[index].t);refresh(opts.time(),true);}
  selector.onchange=()=>{property=selector.value;index=0;refresh(opts.time(),true);};
  selectKey.onchange=()=>choose(Number(selectKey.value));
  ease.onchange=()=>{curves.hidden=ease.value!=='bezier';};
  graph.onpointerdown=ev=>{const a=active(),r=graph.getBoundingClientRect(),x=(ev.clientX-r.left)*graph.width/r.width,t=clamp((x-25)/(graph.width-36),0,1);if(a){const i=a.keys.reduce((best,k,i)=>Math.abs(k.t-t)<Math.abs(a.keys[best].t-t)?i:best,0);if(Math.abs(a.keys[i].t-t)<.035){choose(i);return;}}opts.seek(t);};
  function drawGraph(t){const q=graph.getContext('2d'),w=graph.width,h=graph.height,s=K.properties[property],a=active(),x=t=>25+t*(w-36),y=v=>h-17-(v-s.min)/(s.max-s.min)*(h-28);q.fillStyle='#13171c';q.fillRect(0,0,w,h);q.strokeStyle='#343e47';q.lineWidth=1;for(let i=0;i<=4;i++){q.beginPath();q.moveTo(x(i/4),9);q.lineTo(x(i/4),h-17);q.stroke();q.beginPath();q.moveTo(25,y(s.min+(s.max-s.min)*i/4));q.lineTo(w-11,y(s.min+(s.max-s.min)*i/4));q.stroke();}q.font='10px system-ui';q.fillStyle='#bac4cc';q.fillText(String(s.max),2,12);q.fillText(String(s.min),2,h-17);q.fillText('0%',25,h-4);q.fillText('100%',w-35,h-4);q.strokeStyle='#b9f35d';q.lineWidth=2;q.beginPath();for(let i=0;i<=160;i++){const t=i/160,v=a?K.sample(a,t):base(property);if(i)q.lineTo(x(t),y(v));else q.moveTo(x(t),y(v));}q.stroke();if(a)for(let i=0;i<a.keys.length;i++){const k=a.keys[i];q.save();q.translate(x(k.t),y(k.value));q.rotate(Math.PI/4);q.fillStyle=i===index?'#f3f7fa':'#b9f35d';q.fillRect(-3,-3,6,6);q.restore();}q.strokeStyle='#e7edf2';q.lineWidth=1;q.beginPath();q.moveTo(x(t),6);q.lineTo(x(t),h-15);q.stroke();}
  let signature='';
  function refresh(t,force=false){selectedTime=t;const a=active(),s=K.properties[property];if(a)index=clamp(index,0,a.keys.length-1);else index=0;
   drawGraph(t);info.textContent=K.count(model)+' keys · '+model.tracks.length+' tracks';trackToggle.textContent=a?'Remove track':'Enable track';trackToggle.disabled=locked;add.disabled=locked;del.disabled=locked||!a||index===0||index===a.keys.length-1;
   const sig=JSON.stringify([property,index,a]);if(force||signature!==sig){signature=sig;strip.replaceChildren();selectKey.replaceChildren();if(a){a.keys.forEach((k,i)=>{const b=btn('co36-key-'+i,'◆ '+Math.round(k.t*100)+'%',()=>choose(i));b.setAttribute('aria-pressed',String(i===index));strip.append(b);const o=el('option','',i+1+' · '+Math.round(k.t*100)+'%');o.value=String(i);selectKey.append(o);});selectKey.value=String(index);const k=a.keys[index];time.value=String(round(k.t*100));val.min=String(s.min);val.max=String(s.max);val.value=String(round(k.value));ease.value=k.ease;curveInputs.forEach((n,i)=>n.value=String(k.curve[i]));}rows.hidden=!a;curves.hidden=!a||ease.value!=='bezier';}
   selectKey.disabled=!a;time.disabled=locked||!a||index===0||index===a.keys.length-1;val.disabled=ease.disabled=apply.disabled=locked||!a;curveInputs.forEach(n=>n.disabled=locked||!a);
  }
  function paintPath(q,w,h){if(!K.get(model,'x')&&!K.get(model,'y')&&!K.get(model,'width')&&!K.get(model,'height'))return;const point=t=>{const p=K.evaluate(model,opts.base(),opts.recipe(),t).pose;return [(p.x+p.width/2)*w,(p.y+p.height/2)*h];};q.save();try{q.strokeStyle='#b9f35d';q.lineWidth=1.5;q.setLineDash([5,4]);q.beginPath();for(let i=0;i<=100;i++){const [x,y]=point(i/100);if(i)q.lineTo(x,y);else q.moveTo(x,y);}q.stroke();q.setLineDash([]);const times=[...new Set(['x','y','width','height'].flatMap(p=>K.get(model,p)?.keys.map(k=>k.t)||[]))];for(const t of times){const [x,y]=point(t);q.beginPath();q.arc(x,y,4,0,2*Math.PI);q.fillStyle=Math.abs(t-selectedTime)<.01?'#ffffff':'#b9f35d';q.fill();q.strokeStyle='#11161b';q.stroke();}}finally{q.restore();}}
  refresh(opts.time(),true);
  return {current:()=>K.copy(model),value:()=>model.tracks.length?K.check(model):null,hasGeometry:()=>['x','y','width','height'].some(p=>K.get(model,p)),refresh,paintPath,setPose:(original,changes,t)=>{if(locked)throw Error('Unlock the clip first.');model=K.poseAt(original,opts.base(),opts.recipe(),t,Object.fromEntries(Object.entries(changes).map(([p,v])=>[p,round(v)])));const a=active();if(a)index=Math.max(0,K.nearest(a,t));refresh(t);}};
 }
 root.MangoCalloutMotionUIV0736=Object.freeze({dial,editor});
})(typeof globalThis!=='undefined'?globalThis:this);
