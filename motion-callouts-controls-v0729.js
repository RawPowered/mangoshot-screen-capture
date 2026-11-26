/* Shared procedural controls. UI previews use the same mesh painter as exports. */
(function(root){'use strict';
 const d=root.document,M=root.MangoDimensionalV0729,S=root.MangoSpeedRampV0729;if(!d||!M)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const btn=(id,t,f)=>{const b=el('button','',t);b.id=id;b.type='button';b.onclick=f;return b;};
 const field=(label,n)=>{const l=el('label','mc-field-v0729',label);l.append(n);return l;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 function shapeEditor(host,initial,opts={}){
  if(initial?.mode==='scene')return root.MangoUnifiedSceneUIV0733.editor(host,initial,opts);
  if(initial?.mode==='spatial')return root.MangoSpatialArrowUIV0730.editor(host,initial,opts);
  let value=M.check(initial),locked=!!opts.locked;const prefix=opts.prefix||'mc',wrap=el('section','mc-panel-v0729'),presets=el('div','mc-presets-v0729'),grid=el('div','mc-fields-v0729'),preview=el('canvas','mc-preview-v0729'),status=el('p','mc-note-v0729');
  preview.width=440;preview.height=220;preview.id=prefix+'-preview';preview.setAttribute('aria-label','Live projected 3D mesh preview');
  const nodes=new Map(),reads=new Map();
  for(const p of M.presets){const b=btn(prefix+'-preset-'+p.id,p.name,()=>{value=M.copy(p.value);sync();});b.disabled=locked;presets.append(b);}
  for(const [key,label,items] of [['shape','Shape',M.shapes],['material','Surface',M.materials]]){const n=select(prefix+'-'+key,items.map(x=>[x,x[0].toUpperCase()+x.slice(1)]));grid.append(field(label,n));nodes.set(key,n);n.onchange=()=>{value[key]=n.value;sync();};}
  const color=el('input');color.type='color';color.id=prefix+'-color';grid.append(field('Base color',color));nodes.set('color',color);color.oninput=()=>{value.color=color.value;sync();};
  for(const [key,label,min,max,step] of [['curve','Curvature',-.55,.55,.01],['thickness','Shaft thickness',.035,.24,.005],['head','Arrowhead length',.16,.42,.01],['depth','Extrusion depth',.005,.35,.005],['pitch','Pitch X°',-80,80,1],['yaw','Yaw Y°',-80,80,1],['roll','Roll Z°',-180,180,1],['light','Light direction°',-180,180,1]]){
   const n=el('input'),row=el('div','mc-range-v0729'),out=el('output');n.type='range';n.id=prefix+'-'+key;n.min=min;n.max=max;n.step=step;n.setAttribute('aria-label',label);row.append(n,out);grid.append(field(label,row));nodes.set(key,n);reads.set(key,out);n.oninput=()=>{value[key]=Number(n.value);sync();};
  }
  function sync(){value=M.check(value);for(const [k,n] of nodes){n.value=String(value[k]);n.disabled=locked||['curve','thickness','head'].includes(k)&&value.shape!=='arrow';if(reads.has(k))reads.get(k).textContent=Number(value[k]).toFixed(['pitch','yaw','roll','light'].includes(k)?0:2);}
   const q=preview.getContext('2d');q.clearRect(0,0,preview.width,preview.height);M.paint(q,value,{x:18,y:16,width:404,height:188});status.textContent=M.mesh(value).faces.length+' visible mesh faces · orthographic projection';opts.onChange?.(M.copy(value));
  }
  wrap.append(el('strong','','DIMENSIONAL CALLOUT'),preview,presets,grid,status);host.append(wrap);sync();return {value:()=>M.copy(value)};
 }
 function speedEditor(host,initial,opts={}){
  let value=initial?S.check(initial):null,selected=0,drag=null;const prefix=opts.prefix||'mc-speed',locked=!!opts.locked,wrap=el('section','mc-panel-v0729'),graph=el('canvas','mc-speed-graph-v0729'),status=el('p','mc-note-v0729');
  graph.id=prefix+'-graph';graph.width=520;graph.height=180;graph.setAttribute('aria-label','Speed versus output time. Drag a speed point, or use numeric controls.');
  const preset=select(prefix+'-preset',[['off','Off · normal speed'],['custom','Custom'],...S.presets.map(p=>[p[0],p[1]])]),list=select(prefix+'-point',[]),at=el('input'),rate=el('input');
  for(const [n,id,min,max,step] of [[at,'time',0,100,1],[rate,'rate',.25,4,.05]]){n.type='number';n.id=prefix+'-'+id;n.min=min;n.max=max;n.step=step;}
  const add=btn(prefix+'-add','Add point',()=>{if(!value||value.length>=S.MAX_KEYS)return;let j=1;for(let i=2;i<value.length;i++)if(value[i].at-value[i-1].at>value[j].at-value[j-1].at)j=i;const a=(value[j].at+value[j-1].at)/2;if(value[j].at-value[j-1].at<.02)return;value.splice(j,0,{at:a,rate:S.rate(value,a)});selected=j;sync();}),remove=btn(prefix+'-remove','Remove point',()=>{if(!value||selected===0||selected===value.length-1)return;value.splice(selected,1);selected--;sync();});
  const grid=el('div','mc-fields-v0729');grid.append(field('Speed preset',preset),field('Point',list),field('Output time %',at),field('Speed ×',rate));
  const xy=p=>[30+p.at*470,154-(p.rate-.25)/3.75*132],points=()=>value||S.defaults();
  function sync(){
   if(value)value=S.check(value);const a=points(),p=a[selected]||a[0];list.replaceChildren();a.forEach((p,i)=>{const o=el('option','',(i+1)+' · '+Math.round(p.at*100)+'% / '+p.rate.toFixed(2)+'×');o.value=i;list.append(o);});list.value=selected;at.value=Math.round(p.at*1000)/10;rate.value=p.rate.toFixed(2);
   const match=value&&S.presets.find(p=>JSON.stringify(p[2])===JSON.stringify(value));preset.value=!value?'off':match?match[0]:'custom';
   preset.disabled=locked;list.disabled=locked||!value;at.disabled=locked||!value||selected===0||selected===a.length-1;rate.disabled=locked||!value;add.disabled=locked||!value||value.length>=S.MAX_KEYS;remove.disabled=locked||!value||selected===0||selected===a.length-1;
   const q=graph.getContext('2d');q.fillStyle='#171b20';q.fillRect(0,0,520,180);q.font='10px system-ui';q.strokeStyle='#424b54';q.fillStyle='#aab5be';
   for(const r of [.25,1,2,3,4]){const y=xy({at:0,rate:r})[1];q.beginPath();q.moveTo(30,y);q.lineTo(500,y);q.stroke();q.fillText(r+'×',2,y+3);}
   for(let i=0;i<=4;i++){const x=30+i*117.5;q.beginPath();q.moveTo(x,22);q.lineTo(x,154);q.stroke();q.fillText(i*25+'%',x-7,169);}
   q.strokeStyle='#b9f75c';q.lineWidth=2;q.beginPath();a.forEach((p,i)=>{const [x,y]=xy(p);i?q.lineTo(x,y):q.moveTo(x,y);});q.stroke();a.forEach((p,i)=>{const [x,y]=xy(p);q.beginPath();q.arc(x,y,5,0,Math.PI*2);q.fillStyle=i===selected?'#b9f75c':'#d9dce0';q.fill();});q.lineWidth=1;
   status.textContent='Average '+(value?S.integral(value):1).toFixed(3)+'× · '+(value?'Source out follows the integrated curve.':'Normal playback.')+' '+(opts.note||'');opts.onChange?.(value?S.copy(value):null);
  }
  preset.onchange=()=>{if(preset.value==='off')value=null;else if(preset.value==='custom')value=value||S.defaults();else value=S.copy(S.presets.find(p=>p[0]===preset.value)[2]);selected=0;sync();};
  list.onchange=()=>{selected=Number(list.value);sync();};
  function set(t,r){if(!value||locked)return;const p=value[selected];if(!p)return;if(selected>0&&selected<value.length-1&&Number.isFinite(t))p.at=Math.max(value[selected-1].at+.01,Math.min(value[selected+1].at-.01,t));if(Number.isFinite(r))p.rate=Math.max(.25,Math.min(4,Math.round(r*100)/100));sync();}
  at.onchange=()=>set(at.valueAsNumber/100,NaN);rate.onchange=()=>set(NaN,rate.valueAsNumber);
  function local(e){const b=graph.getBoundingClientRect();return [(e.clientX-b.left)*520/b.width,(e.clientY-b.top)*180/b.height];}
  graph.onpointerdown=e=>{if(!value||locked||e.button!==0)return;const [x,y]=local(e);let best=Infinity,index=-1;value.forEach((p,i)=>{const [a,b]=xy(p),v=Math.hypot(a-x,b-y);if(v<best){best=v;index=i;}});if(best>20)return;e.preventDefault();selected=index;drag=e.pointerId;graph.setPointerCapture(e.pointerId);sync();};
  graph.onpointermove=e=>{if(drag!==e.pointerId)return;const [x,y]=local(e);set((x-30)/470,.25+(154-y)/132*3.75);};
  for(const k of ['pointerup','pointercancel','lostpointercapture'])graph.addEventListener(k,()=>{drag=null;});
  wrap.append(el('strong','','SPEED RAMP'),graph,grid,el('div','mc-buttons-v0729'),status);wrap.querySelector('.mc-buttons-v0729').append(add,remove);host.append(wrap);sync();return {value:()=>value?S.copy(value):null};
 }
 root.MangoMotionCalloutControlsV0729=Object.freeze({shapeEditor,speedEditor});
})(typeof globalThis!=='undefined'?globalThis:this);
