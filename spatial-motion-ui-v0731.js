/* Sequence spatial pose editor. Draft keyframes use the existing XYZ gizmos.
 * Motion is saved atomically with the ordinary clip inspector. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730,M=root.MangoSpatialMotionV0731,R=root.MangoSpatialRendererV0730,U=root.MangoSpatialArrowUIV0730,d=root.document;if(!S||!M||!R||!U||!d)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,t,f)=>{const b=el('button','',t);b.type='button';b.id=id;b.onclick=f;return b;};
 const field=(t,n)=>{const l=el('label','sa-field-v0730',t);l.append(n);return l;};
 const input=(id,type,min,max,step)=>{const n=el('input');n.id=id;n.type=type;if(min!=null){n.min=min;n.max=max;n.step=step;}return n;};
 const select=(id,items)=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 function editor(host,initial,opts={}){
  const prefix=opts.prefix||'sa-seq',locked=!!opts.locked,wrap=el('section','sm-studio-v0731'),tools=el('section','sa-panel-v0730'),bar=el('div','sa-toolbar-v0730'),fields=el('div','sa-grid-v0730'),shapeHost=el('div'),preview=el('canvas','sm-preview-v0731'),status=el('p','sa-status-v0730');
  let base=S.check(initial),motion=opts.motion?M.check(opts.motion,base):null,selected=0,frame=0,playing=false,started=0,shape,refController=null;
  const keyedMasks=input(prefix+'-motion-masks','checkbox'),enabled=input(prefix+'-motion-enabled','checkbox'),list=select(prefix+'-motion-key',[]),time=input(prefix+'-motion-time','number',0,100,'any'),reveal=input(prefix+'-motion-reveal','number',0,100,'any'),ease=select(prefix+'-motion-ease',[['linear','Linear'],['smooth','Ease in / out'],['hold','Hold']]),scrub=input(prefix+'-motion-scrub','range',0,1000,1),readout=el('output');
  scrub.value='0';scrub.setAttribute('aria-label','Preview clip-local time');preview.width=Math.max(1,Math.round(Math.min(480,270*(opts.aspect||16/9))));preview.height=Math.max(1,Math.round(preview.width/(opts.aspect||16/9)));preview.id=prefix+'-motion-preview';preview.setAttribute('aria-label','Actual depth-tested animated arrow preview');status.id=prefix+'-motion-status';status.setAttribute('role','status');
  function withMask(p,masks=base.occlusion){return {...M.copy(p),...(masks?.length?{occlusion:M.copy(masks)}:{})};}
  function keyed(){return motion?.maskMode==='keyed';}
  function flush(){const p=shape.draft();if(motion){motion.keys[selected].pose=M.pose(p);if(keyed())motion.keys[selected].masks=M.copy(p.occlusion||[]);base=withMask(motion.keys[0].pose,keyed()?motion.keys[0].masks:(p.occlusion||[]));}else base=p;}
  function poseAt(i){return motion?withMask(motion.keys[i].pose,keyed()?motion.keys[i].masks:base.occlusion):base;}
  function checked(){flush();return motion?M.check(motion,base):null;}
  function loadKey(i){selected=i;shape.load(poseAt(i));shape.setTopologyLocked(!!motion);sync();}
  function safe(fn){stop();try{fn();sync();paint();}catch(e){status.textContent=e.message;}}
  enabled.onchange=()=>safe(()=>{flush();if(enabled.checked&&!motion){motion=M.defaults(base,false);loadKey(0);}else if(!enabled.checked&&motion){base=poseAt(selected);motion=null;loadKey(0);}});
  keyedMasks.onchange=()=>safe(()=>{flush();if(!motion)return;if(keyedMasks.checked&&!keyed()){motion.maskMode='keyed';for(const k of motion.keys)k.masks=M.copy(base.occlusion||[]);}else if(!keyedMasks.checked&&keyed()){const m=M.copy(motion.keys[selected].masks);delete motion.maskMode;for(const k of motion.keys)delete k.masks;base=withMask(motion.keys[0].pose,m);}loadKey(selected);});
  const grow=button(prefix+'-motion-grow','Grow along 3D path',()=>safe(()=>{flush();if(!motion)motion=M.defaults(base,true);else{motion.keys.forEach(k=>{k.reveal=k.at;});}loadKey(0);}));
  list.onchange=()=>safe(()=>{const i=Number(list.value);flush();loadKey(i);});
  time.onchange=()=>safe(()=>{flush();if(!motion||selected===0||selected===motion.keys.length-1)return;const n=time.valueAsNumber/100,a=motion.keys;if(!Number.isFinite(n)||n<a[selected-1].at+.009999999||n>a[selected+1].at-.009999999)throw Error('Keep motion keys at least 1% apart.');a[selected].at=n;});
  reveal.onchange=()=>safe(()=>{const n=reveal.valueAsNumber/100;if(!motion||!Number.isFinite(n)||n<0||n>1)throw Error('Reveal must be 0–100%.');motion.keys[selected].reveal=n;});
  ease.onchange=()=>safe(()=>{if(motion)motion.keys[selected].ease=ease.value;});
  const add=button(prefix+'-motion-add','Insert key at scrubber',()=>safe(()=>{const m=checked();if(!m||m.keys.length>=M.MAX_KEYS)throw Error('Maximum 12 motion keys.');const t=Number(scrub.value)/1000,i=m.keys.findIndex(k=>k.at>t);if(i<1||t-m.keys[i-1].at<.01||m.keys[i].at-t<.01)throw Error('Move the scrubber at least 1% away from another key.');const p=M.evaluate(m,t,base);m.keys.splice(i,0,{at:t,pose:M.pose(p.value),reveal:p.reveal,ease:m.keys[i-1].ease,...(m.maskMode==='keyed'?{masks:M.copy(p.value.occlusion||[])}:{})});motion=m;loadKey(i);}));
  const del=button(prefix+'-motion-delete','Remove key',()=>safe(()=>{flush();if(!motion||selected===0||selected===motion.keys.length-1)return;motion.keys.splice(selected,1);loadKey(selected-1);}));
  const refresh=button(prefix+'-motion-refresh','Refresh motion preview',()=>safe(()=>{checked();}));
  const reference=button(prefix+'-motion-reference','Load footage at preview time',async()=>{if(!opts.loadReference)return;stop();refController?.abort();const controller=new AbortController();refController=controller;reference.disabled=true;status.textContent='Decoding local reference frame…';try{const t=Number(scrub.value)/1000;await opts.loadReference(t,controller.signal);if(controller.signal.aborted||!wrap.isConnected||!wrap.closest('dialog')?.open)return;shape.refresh();paint();status.textContent='Reference refreshed at '+(t*100).toFixed(1)+'% · selected callout excluded.';}catch(e){if(!controller.signal.aborted)status.textContent=e.message;}finally{if(refController===controller){refController=null;reference.disabled=false;}}});reference.hidden=!opts.loadReference;
  const play=button(prefix+'-motion-play','Play motion',()=>{if(playing){stop();return;}try{checked();playing=true;started=performance.now();play.textContent='Stop';tick(started);}catch(e){status.textContent=e.message;}});
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;play.textContent='Play motion';}
  function tick(now){if(!playing||!wrap.isConnected||!wrap.closest('dialog')?.open){stop();return;}const duration=Math.max(.25,Math.min(30,opts.duration||4)),u=Math.min(1,(now-started)/1000/duration);scrub.value=Math.round(u*1000);try{paint(false);}catch(e){status.textContent=e.message;stop();return;}if(u<1)frame=requestAnimationFrame(tick);else stop();}
  function paint(validate=true){
   const m=validate?checked():motion,u=Number(scrub.value)/1000,q=preview.getContext('2d'),w=preview.width,h=preview.height,p=M.evaluate(m,u,base);q.clearRect(0,0,w,h);q.fillStyle='#171c22';q.fillRect(0,0,w,h);if(opts.reference){q.save();q.globalAlpha=.72;q.drawImage(opts.reference,0,0,w,h);q.restore();}
   R.paint(q,p.value,{x:0,y:0,width:w,height:h},1,p.reveal,true);readout.textContent=(u*100).toFixed(1)+'% · '+(p.reveal*100).toFixed(1)+'% geometry visible';status.textContent=m?m.keys.length+' pose keys · interpolated in true XYZ · '+(keyed()?'animated foreground polygons':'static foreground polygons'):'Static arrow · enable keyframes or choose Grow along 3D path.';
  }
  function sync(){const a=motion?.keys||[],k=a[selected];enabled.checked=!!motion;enabled.disabled=grow.disabled=locked;keyedMasks.checked=keyed();keyedMasks.disabled=locked||!motion;list.replaceChildren();a.forEach((k,i)=>{const o=el('option','',(i+1)+' · '+(k.at*100).toFixed(1)+'%');o.value=i;list.append(o);});list.value=selected;time.value=k?100*k.at:0;reveal.value=k?100*k.reveal:100;ease.value=k?.ease||'linear';list.disabled=!motion;time.disabled=locked||!k||selected===0||selected===a.length-1;reveal.disabled=locked||!k;ease.disabled=locked||!k||selected===a.length-1;add.disabled=locked||!motion||a.length>=M.MAX_KEYS;del.disabled=locked||!k||selected===0||selected===a.length-1;play.disabled=!motion;}
  scrub.oninput=()=>safe(()=>{checked();});
  fields.append(field('Enable pose keyframes',enabled),field('Animate foreground masks',keyedMasks),field('Edit key',list),field('Key time %',time),field('Path visible %',reveal),field('Outgoing interpolation',ease));bar.append(grow,add,del,refresh,reference,play);
  tools.append(el('strong','','3D PATH MOTION / CLIP KEYFRAMES'),bar,fields,preview,field('Preview time',scrub),readout,status,el('small','','Edit the selected pose using the XYZ controls below. Scrub to preview interpolation; Refresh after editing a pose. Changing clip length scales key times. Keyed polygons interpolate matching vertices; different vertex counts hold until the next key. Load a reference frame at the scrubber time to align the camera and masks manually.'));
  wrap.append(tools,shapeHost);host.append(wrap);shape=U.editor(shapeHost, poseAt(0),opts);shape.setTopologyLocked(!!motion);sync();try{paint();}catch(e){status.textContent=e.message;}
  const dialog=wrap.closest('dialog');dialog?.addEventListener('close',()=>{stop();refController?.abort();},{once:true});
  return {value(){stop();checked();R.requireRenderer();return S.check(base);},motion(){return checked();}};
 }
 root.MangoSpatialMotionUIV0731=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
