/* Staged target controls shared with the callout preview and precision dials. */
(function(root){'use strict';
 const d=root.document,S=root.MangoSmartFocusV0737,U=root.MangoCalloutMotionUIV0736;if(!d||!S||!U)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=v=>Math.round(v*10000)/10000;
 function editor(host,initial,opts){
  let value=initial?S.check(initial):null,picking=null;const locked=!!opts.locked,wrap=el('div','sf37'),controls=el('div','sf37-fields'),bindings=[],status=el('p','sf37-status');status.setAttribute('role','status');
  const button=(id,text,fn)=>{const b=el('button','',text);b.type='button';b.id=id;b.disabled=locked;b.onclick=()=>{try{fn();}catch(e){status.textContent=e.message;}};return b;};
  const toggle=button('sf37-toggle',value?'Remove Smart Focus':'Enable Smart Focus',()=>set(value?null:S.defaults()));
  const presets=el('div','sf37-presets');presets.append(el('strong','','FOCUS RECIPES'));
  for(const p of S.presets){const b=button('sf37-preset-'+p.id,p.name,()=>set(S.preset(p.id).focus));b.dataset.id=p.id;presets.append(b);}
  const pickRow=el('div','sf37-pick'),pickStart=button('sf37-pick-start','Pick target',()=>arm('start')),pickEnd=button('sf37-pick-end','Pick end target',()=>arm('end'));pickRow.append(pickStart,pickEnd);
  const cancel=button('sf37-cancel-pick','Cancel target pick',()=>{picking=null;sync();});cancel.hidden=true;pickRow.append(cancel);
  function arm(which){if(!value||value.targetMode==='follow')return;picking=picking===which?null:which;sync();}
  function set(v){if(locked)return;value=v?S.check(v):null;picking=null;sync();opts.change();}
  function patch(k,v){if(!value)return;set({...value,[k]:v});}
  function field(k,label,type,items){const row=el('label','co35-field'),n=el(type==='select'?'select':'input');row.dataset.key=k;row.append(el('span','',label),n);n.id='sf37-'+k;n.disabled=locked;if(type==='select'){for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}}else{n.type=type;n.maxLength=100;}n.oninput=()=>patch(k,n.value);bindings.push(()=>n.value=String((value||S.defaults())[k]));controls.append(row);}
  function scalar(k,label,min,max,step){const row=el('div','co35-scalar'),n=el('input'),r=el('input'),l=el('label','',label);row.dataset.key=k;n.id='sf37-'+k;l.htmlFor=n.id;r.id=n.id+'-range';r.setAttribute('aria-label',label+' adjustment');n.type='number';r.type='range';for(const x of [n,r]){x.min=String(min);x.max=String(max);x.step=String(step);x.disabled=locked;}n.step='any';const apply=v=>patch(k,round(clamp(v,min,max)));n.onchange=()=>{if(Number.isFinite(n.valueAsNumber))apply(n.valueAsNumber);else sync();};r.oninput=()=>apply(r.valueAsNumber);const dial=U.dial(label,min,max,step,()=> (value||S.defaults())[k],apply,()=>S.defaults()[k],locked);bindings.push(()=>{const v=(value||S.defaults())[k];n.value=r.value=String(v);dial.refresh();});row.append(l,n,dial.element,r);controls.append(row);}
  field('mode','Effect','select',[['lens','Magnification lens'],['anchor','Anchored callout']]);
  field('shape','Lens mask','select',[['ellipse','Ellipse / circle'],['rect','Rounded rectangle']]);
  field('targetMode','Target motion','select',[['fixed','Fixed screen point'],['sweep','Start → end sweep'],['follow','Follow animated bounds']]);
  controls.append(pickRow);
  scalar('targetX','Target X',0,1,.01);scalar('targetY','Target Y',0,1,.01);
  scalar('endX','End X',0,1,.01);scalar('endY','End Y',0,1,.01);
  scalar('zoom','Start zoom ×',1,6,.1);scalar('zoomEnd','End zoom ×',1,6,.1);
  field('ease','Sweep / zoom easing','select',[['smooth','Smoothstep'],['linear','Linear']]);
  scalar('feather','Edge feather',0,.4,.01);scalar('shade','Outside dim',0,.85,.01);
  field('leader','Leader line','select',[['none','None'],['straight','Straight'],['elbow','Elbow']]);
  field('marker','Target marker','select',[['none','None'],['ring','Ring'],['crosshair','Crosshair'],['region','Region brackets']]);
  scalar('targetSize','Target size',.015,.25,.005);field('caption','Lens caption','text');
  const reset=button('sf37-reset','Reset focus settings',()=>set(S.defaults()));controls.append(reset);
  wrap.append(el('p','sf37-help','One clip links a real footage lens or callout with a shared target, leader and marker. Focus recipes change the focus settings only; geometry and animation tracks remain intact.'),toggle,presets,controls,status);host.append(wrap);
  function sync(){toggle.textContent=value?'Remove Smart Focus':'Enable Smart Focus';controls.hidden=!value;for(const f of bindings)f();const v=value||S.defaults();for(const n of controls.querySelectorAll('[data-key]')){const k=n.dataset.key;n.hidden=(['shape','zoom','zoomEnd','feather','shade','caption'].includes(k)&&v.mode!=='lens')||(['targetX','targetY'].includes(k)&&v.targetMode==='follow')||(['endX','endY'].includes(k)&&v.targetMode!=='sweep')||(k==='targetSize'&&v.marker==='none')||(k==='ease'&&v.mode!=='lens'&&v.targetMode!=='sweep');}
   pickRow.hidden=v.targetMode==='follow';pickEnd.hidden=v.targetMode!=='sweep';pickStart.setAttribute('aria-pressed',String(picking==='start'));pickEnd.setAttribute('aria-pressed',String(picking==='end'));cancel.hidden=!picking;status.textContent=picking?'Click the '+(picking==='end'?'end':'start')+' target on the preview.':v.targetMode==='follow'?'Target follows the animated clip center.':'Targets use normalized screen coordinates; edge samples are clamped to the frame.';
   for(const b of presets.querySelectorAll('button'))b.setAttribute('aria-pressed',String(!!value&&JSON.stringify(value)===JSON.stringify(S.preset(b.dataset.id).focus)));
  }
  sync();
  function pick(x,y){if(!picking||locked||!value)return;const k=picking==='end'?'end':'target';set({...value,[k+'X']:round(x),[k+'Y']:round(y)});}
  function drawTarget(q,v,b,u,w,h){const t=S.target(v,b,u,w,h),x=t.x*w,y=t.y*h,r=Math.max(5,Math.min(w,h)*.016);q.save();try{q.lineWidth=1;q.strokeStyle='#b9f35d';q.setLineDash([3,3]);q.beginPath();q.arc(x,y,r,0,Math.PI*2);q.stroke();q.setLineDash([]);q.beginPath();q.moveTo(x-r*1.6,y);q.lineTo(x+r*1.6,y);q.moveTo(x,y-r*1.6);q.lineTo(x,y+r*1.6);q.stroke();if(v.targetMode==='sweep'){q.setLineDash([4,4]);q.beginPath();q.moveTo(v.targetX*w,v.targetY*h);q.lineTo(v.endX*w,v.endY*h);q.stroke();}}finally{q.restore();}}
  return {current:()=>value?{...value}:null,value:()=>value?S.check(value):null,isPicking:()=>!!picking,pick,drawTarget};
 }
 root.MangoSmartFocusUIV0737=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
