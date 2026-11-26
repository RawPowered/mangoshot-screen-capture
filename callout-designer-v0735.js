/* Staged 2D callout inspector. Same Canvas recipe as final composition. */
(function(root){'use strict';
 const d=root.document,M=root.MangoCalloutV0735;if(!d||!M)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function editor(host,initial,opts){
  let value=M.check(initial),u=.5,reference=null,drag=null,raf=0,playing=false,start=0,controller=null;
  const locked=!!opts.locked,f=opts.fields,wrap=el('section','co35'),title=el('div','co35-title'),panel=el('div','co35-layout'),library=el('div','co35-library'),controls=el('div','co35-controls'),stage=el('div','co35-stage'),preview=el('canvas','co35-preview'),status=el('div','co35-status'),bindings=[];
  title.append(el('strong','','CALLOUT DESIGNER'),el('span','','2D • SCREEN SPACE'));wrap.append(title);
  preview.id='co35-preview';preview.width=Math.max(160,Math.round(Math.min(720,360*opts.aspect)));preview.height=Math.max(90,Math.round(preview.width/opts.aspect));preview.setAttribute('aria-label','Live callout composition; drag the graphic to reposition');preview.tabIndex=0;
  status.setAttribute('role','status');status.id='co35-status';
  const btn=(id,name,fn)=>{const n=el('button','',name);n.type='button';n.id=id;n.addEventListener('click',fn);return n;};
  const scrub=el('input');scrub.type='range';scrub.min='0';scrub.max='1000';scrub.step='1';scrub.value='500';scrub.id='co35-scrub';scrub.setAttribute('aria-label','Callout preview time');
  const time=el('output','co35-time'),play=btn('co35-play','Play',()=>{if(playing){stop();return;}playing=true;start=performance.now();play.textContent='Stop';tick(start);});
  const close=()=>{stop();controller?.abort();controller=null;if(reference){reference.width=reference.height=1;reference=null;}};
  const dialog=host.closest('dialog');dialog?.addEventListener('close',close,{once:true});
  function stop(){playing=false;cancelAnimationFrame(raf);raf=0;play.textContent='Play';}
  function tick(now){if(!playing||!wrap.isConnected||!dialog?.open){stop();return;}u=clamp((now-start)/Math.max(100,span()*1000),0,1);scrub.value=String(Math.round(u*1000));draw();if(u<1)raf=requestAnimationFrame(tick);else stop();}
  function span(){const a=f.start.valueAsNumber,b=f.end.valueAsNumber;return Number.isFinite(a)&&Number.isFinite(b)&&b>a?b-a:opts.duration||4;}
  function bounds(){const read=(n,def)=>Number.isFinite(n?.valueAsNumber)?n.valueAsNumber:def;return {x:read(f.x,.32)*preview.width,y:read(f.y,.3)*preview.height,width:read(f.width,.36)*preview.width,height:read(f.height,.24)*preview.height};}
  function draw(){const q=preview.getContext('2d'),w=preview.width,h=preview.height,b=bounds();q.fillStyle='#252b31';q.fillRect(0,0,w,h);
   if(reference)q.drawImage(reference,0,0,w,h);else{q.strokeStyle='#383f47';q.lineWidth=1;for(let i=0;i<w;i+=24){q.beginPath();q.moveTo(i,0);q.lineTo(i,h);q.stroke();}for(let i=0;i<h;i+=24){q.beginPath();q.moveTo(0,i);q.lineTo(w,i);q.stroke();}}
   try{M.paint(q,value,b,Number.isFinite(f.opacity.valueAsNumber)?f.opacity.valueAsNumber:1,u,w,h);if(!playing){q.save();q.strokeStyle='#c6d3dc';q.lineWidth=1;q.setLineDash([4,4]);q.strokeRect(b.x,b.y,b.width,b.height);q.restore();}time.textContent=(u*span()).toFixed(2)+' s / '+span().toFixed(2)+' s';status.textContent='';}catch(err){status.textContent=err.message;}
  }
  const load=btn('co35-reference','Sample footage',async()=>{stop();controller?.abort();const c=new AbortController();controller=c;load.disabled=true;try{const sample=await opts.loadReference(u,c.signal);if(c.signal.aborted||!wrap.isConnected||!dialog?.open){sample.width=sample.height=1;return;}if(reference)reference.width=reference.height=1;reference=sample;draw();status.textContent='Sampled footage without selected callout.';}catch(err){if(!c.signal.aborted)status.textContent=err.message;}finally{if(controller===c){controller=null;load.disabled=false;}}});
  const clear=btn('co35-clear-reference','Grid',()=>{controller?.abort();controller=null;load.disabled=false;if(reference)reference.width=reference.height=1;reference=null;draw();});
  const transport=el('div','co35-transport');transport.append(play,scrub,time);const refs=el('div','co35-refs');refs.append(load,clear);stage.append(preview,transport,refs,el('small','','Drag inside the dashed bounds to position. Use the clip inspector fields for exact size and timing. Footage is a sampled still; playback/export use the live sequence.'),status);
  scrub.oninput=()=>{stop();u=Number(scrub.value)/1000;draw();};
  const titleLib=el('h4','','PRESETS'),tiles=el('div','co35-presets');library.append(titleLib,tiles);
  const selectPreset=id=>{stop();value=M.preset(id);sync();draw();};
  for(const p of M.presets){const b=btn('co35-preset-'+p.id,'',()=>selectPreset(p.id)),c=el('canvas');c.width=128;c.height=72;const q=c.getContext('2d');q.fillStyle='#2b3239';q.fillRect(0,0,128,72);M.paint(q,p.value,{x:22,y:17,width:84,height:38},1,.5,128,72);b.append(c,el('span','',p.name));b.disabled=locked;b.title=p.name;tiles.append(b);}
  function group(label){const s=el('fieldset','co35-group'),l=el('legend','',label);s.append(l);controls.append(s);return s;}
  const style=group('Appearance'),motion=group('Motion');
  function field(group,key,label,type,options){const row=el('label','co35-field'),name=el('span','',label),n=el(type==='select'?'select':'input');n.id='co35-'+key;if(type==='select')for(const [v,t] of options){const o=el('option','',t);o.value=v;n.append(o);}else{n.type=type;if(type==='text')n.maxLength=120;}row.append(name,n);group.append(row);n.disabled=locked;bindings.push(()=>n.value=String(value[key]));n.addEventListener('input',()=>{value={...value,[key]:n.value};draw();});}
  function scalar(group,key,label,min,max,step){const row=el('div','co35-scalar'),name=el('label','',label),n=el('input'),slider=el('input');n.id='co35-'+key;name.htmlFor=n.id;n.type='number';slider.type='range';slider.id=n.id+'-range';slider.setAttribute('aria-label',label+' adjustment');for(const x of [n,slider]){x.min=String(min);x.max=String(max);x.step=String(step);x.disabled=locked;}
   const apply=source=>{if(!Number.isFinite(source.valueAsNumber))return;let a=clamp(source.valueAsNumber,min,max);if(key==='enterSpan')a=Math.min(a,.95-value.exitSpan);if(key==='exitSpan')a=Math.min(a,.95-value.enterSpan);value={...value,[key]:a};n.value=slider.value=String(a);draw();};
   n.addEventListener('change',()=>apply(n));slider.addEventListener('input',()=>apply(slider));n.addEventListener('input',()=>{if(Number.isFinite(n.valueAsNumber)&&n.valueAsNumber>=min&&n.valueAsNumber<=max)apply(n);});
   slider.addEventListener('dblclick',()=>{if(!locked){slider.value=String(M.defaults()[key]);apply(slider);}});bindings.push(()=>n.value=slider.value=String(value[key]));row.append(name,n,slider);group.append(row);
  }
  field(style,'kind','Shape','select',Object.entries(M.kinds));field(style,'text','Text','text');field(style,'color','Accent','color');field(style,'background','Surface','color');scalar(style,'rotation','Rotation °',-180,180,1);scalar(style,'thickness','Stroke',1,16,.5);scalar(style,'glow','Glow',0,40,1);scalar(style,'fillOpacity','Fill opacity',0,1,.01);scalar(style,'fontScale','Text scale',.5,2,.05);scalar(style,'dim','Spotlight dim',0,.95,.01);scalar(style,'progress','Progress',0,1,.01);
  field(motion,'enter','Entrance','select',M.entrances.map(x=>[x,x]));field(motion,'hold','Active','select',M.loops.map(x=>[x,x]));field(motion,'exit','Exit','select',M.exits.map(x=>[x,x]));scalar(motion,'enterSpan','Entrance fraction',0,.5,.01);scalar(motion,'exitSpan','Exit fraction',0,.5,.01);scalar(motion,'pulse','Cycles / active interval',.25,4,.25);
  const reset=btn('co35-reset','Reset recipe',()=>{value=M.defaults();sync();draw();});reset.disabled=locked;controls.append(reset);
  function sync(){for(const bind of bindings)bind();}
  for(const key of ['x','y','width','height','opacity','start','end'])f[key]?.addEventListener('input',draw);
  function point(ev){const r=preview.getBoundingClientRect();return {x:(ev.clientX-r.left)*preview.width/r.width,y:(ev.clientY-r.top)*preview.height/r.height};}
  preview.onpointerdown=ev=>{if(locked||ev.button!==0)return;const p=point(ev),b=bounds();if(p.x<b.x||p.x>b.x+b.width||p.y<b.y||p.y>b.y+b.height)return;stop();drag={id:ev.pointerId,p,x:b.x/preview.width,y:b.y/preview.height};preview.setPointerCapture(ev.pointerId);ev.preventDefault();};
  preview.onpointermove=ev=>{if(!drag||drag.id!==ev.pointerId)return;const p=point(ev);f.x.value=String(Math.round(clamp(drag.x+(p.x-drag.p.x)/preview.width,-1,1)*10000)/10000);f.y.value=String(Math.round(clamp(drag.y+(p.y-drag.p.y)/preview.height,-1,1)*10000)/10000);draw();};
  preview.onpointerup=preview.onpointercancel=preview.onlostpointercapture=()=>{drag=null;};
  preview.onkeydown=ev=>{if(locked||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key))return;ev.preventDefault();const key=['ArrowLeft','ArrowRight'].includes(ev.key)?'x':'y',dir=['ArrowLeft','ArrowUp'].includes(ev.key)?-1:1,amount=(ev.shiftKey?10:1)/(key==='x'?preview.width:preview.height);f[key].value=String(Math.round(clamp(Number(f[key].value)+dir*amount,-1,1)*10000)/10000);draw();};
  panel.append(library,stage,controls);wrap.append(panel);host.append(wrap);sync();draw();
  return {value(){stop();return M.check(value);}};
 }
 root.MangoCalloutUIV0735=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
