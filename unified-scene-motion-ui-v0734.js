/* Sequence-only scene animation. Static scene authoring and independent
 * animation tracks are separate draft modes. Apply commits both atomically. */
(function(root){'use strict';
 const d=root.document,S=root.MangoSpatialArrowV0730,Q=root.MangoUnifiedSceneV0733,U=root.MangoUnifiedSceneUIV0733,A=root.MangoSpatialArrowUIV0730,R=root.MangoSpatialRendererV0730,M=root.MangoUnifiedSceneMotionV0734,T=root.MangoRigidMotionV0736;if(!d||!S||!Q||!U||!A||!R||!M||!T)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,t,f)=>{const n=el('button','',t);n.id=id;n.type='button';n.onclick=f;return n;};
 const field=(t,n)=>{const l=el('label','sa-field-v0730',t);l.append(n);return l;};
 const select=(id,items=[])=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 const input=(id,type,min,max,step)=>{const n=el('input');n.id=id;n.type=type;if(min!=null){n.min=min;n.max=max;n.step=step;}return n;};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),wrapAngle=a=>((a+180)%360+360)%360-180;
 function editor(host,initial,opts={}){
  const prefix=opts.prefix||'us-seq',locked=!!opts.locked,wrap=el('section','um-studio-v0734'),staticHost=el('div'),motionHost=el('section','sa-panel-v0730'),status=el('p','sa-status-v0730'),keyHost=el('div'),tools=el('div','sa-toolbar-v0730'),fields=el('div','sa-grid-v0730'),timeline=el('div','um-timeline-v0734');
  let base=Q.check(initial),motion=opts.sceneMotion?M.check(opts.sceneMotion,base):M.empty(),animating=M.hasTracks(motion),target=motion.objectTracks[0]?.id||(motion.cameraKeys.length?M.cameraTarget:motion.maskKeys?.length?M.maskTarget:M.cameraTarget),index=0,staticEditor=null,keyEditor=null,playing=false,raf=0,started=0,referenceController=null,cameraDrag=null,rigidDrag=null,maskDrag=null,maskDraft=null,maskEditing=false;
  const track=select(prefix+'-animation-track'),key=select(prefix+'-animation-key'),time=input(prefix+'-animation-time','number',0,100,'any'),ease=select(prefix+'-animation-ease',[['linear','Linear'],['smooth','Ease in / out'],['hold','Hold']]),reveal=input(prefix+'-animation-reveal','number',0,100,'any'),scrub=input(prefix+'-animation-scrub','range',0,1000,1),preview=el('canvas','um-preview-v0734'),readout=el('output');
  const aspect=opts.aspect||16/9;preview.width=Math.max(1,Math.round(Math.min(600,320*aspect)));preview.height=Math.max(1,Math.round(preview.width/aspect));preview.id=prefix+'-animation-preview';preview.setAttribute('aria-label','Shared depth-tested 3D scene preview');scrub.value='0';status.id=prefix+'-animation-status';status.setAttribute('role','status');scrub.setAttribute('aria-label','Preview time within scene clip');
  const keys=()=>M.getKeys(motion,target),obj=()=>base.objects.find(o=>o.id===target),cameraTrack=()=>target===M.cameraTarget,maskTrack=()=>target===M.maskTarget,objectTrack=()=>motion.objectTracks.find(t=>t.id===target),rigidTrack=()=>objectTrack()?.mode==='rigid',specialTrack=()=>cameraTrack()||maskTrack(),canEdit=()=>!locked&&(specialTrack()||!obj()?.locked),trackIds=()=>[M.cameraTarget,...base.objects.map(o=>o.id),M.maskTarget];
  function flush(){
   if(maskDraft)throw Error('Finish or cancel the foreground polygon before changing keys or applying.');
   if(!animating){if(staticEditor)base=staticEditor.draft();return;}
   if(keyEditor&&keys()[index]&&!specialTrack()&&!rigidTrack()&&canEdit())keys()[index].geometry=Q.geometry(keyEditor.draft());
   base=M.updateBase(base,motion);
  }
  function checked(){flush();base=Q.check(base);return M.hasTracks(motion)?M.check(motion,base):null;}
  function selectedTime(){return keys()[index]?.at||0;}
  function safe(fn,{mount=false,paint=true}={}){stop();try{flush();fn();if(mount)mountKey();sync();if(paint)draw();}catch(e){status.textContent=e.message;sync();}}
  function mountStatic(){staticHost.replaceChildren();staticEditor=U.editor(staticHost,base,{...opts,prefix});}
  const toggle=button(prefix+'-animation-toggle','Animate scene',()=>safe(()=>{if(locked)return;if(!animating){animating=true;staticHost.hidden=true;staticHost.replaceChildren();staticEditor=null;motionHost.hidden=false;target=base.objects.find(o=>!o.locked)?.id||M.cameraTarget;index=0;mountKey();}else{if(M.hasTracks(motion)){status.textContent='Remove the animation tracks first to change scene membership.';return;}animating=false;motionHost.hidden=true;keyHost.replaceChildren();keyEditor=null;staticHost.hidden=false;mountStatic();}sync();},{paint:false}));
  function trackLabel(id){return id===M.maskTarget?'Foreground masks':id===M.cameraTarget?'Shared camera':base.objects.find(o=>o.id===id)?.name||'Missing object';}
  function seekKey(i){index=clamp(i,0,Math.max(0,keys().length-1));scrub.value=String(Math.round(selectedTime()*1000));mountKey();}
  function switchTrack(id){target=id;seekKey(0);}
  track.onchange=()=>{const t=track.value;safe(()=>switchTrack(t));};key.onchange=()=>{const i=Number(key.value);safe(()=>seekKey(i));};
  const enable=button(prefix+'-animation-enable','Enable track',()=>safe(()=>{if(!canEdit())return;motion=M.addTrack(motion,base,target);seekKey(0);}));
  const enableRigid=button(prefix+'-animation-enable-rigid','Enable rigid motion',()=>safe(()=>{if(!canEdit()||specialTrack())return;motion=M.addRigidTrack(motion,base,target);seekKey(0);}));
  const removeTrack=button(prefix+'-animation-remove-track','Remove track (keep first pose)',()=>safe(()=>{if(!canEdit())return;motion=M.removeTrack(motion,target);index=0;mountKey();}));
  const grow=button(prefix+'-animation-grow','Grow / reveal object',()=>safe(()=>{if(specialTrack()||!canEdit())return;if(!keys().length)motion=M.addTrack(motion,base,target,true);else for(const k of keys())k.reveal=k.at;seekKey(0);}));
  const add=button(prefix+'-animation-add','Insert key at scrubber',()=>safe(()=>{if(!canEdit())return;const out=M.insertKey(motion,base,target,Number(scrub.value)/1000);motion=out.motion;seekKey(out.index);}));
  const del=button(prefix+'-animation-delete','Delete selected key',()=>safe(()=>{if(!canEdit()||index===0||index===keys().length-1)return;keys().splice(index,1);seekKey(index-1);}));
  time.onchange=()=>safe(()=>{const a=keys(),t=time.valueAsNumber/100;if(!canEdit()||index===0||index===a.length-1)return;if(!Number.isFinite(t)||t<a[index-1].at+M.MIN_GAP-1e-9||t>a[index+1].at-M.MIN_GAP+1e-9)throw Error('Keep keys at least 1% apart.');a[index].at=t;scrub.value=String(Math.round(t*1000));});
  ease.onchange=()=>safe(()=>{if(canEdit()&&keys()[index]&&index!==keys().length-1)keys()[index].ease=ease.value;});
  reveal.onchange=()=>safe(()=>{if(!canEdit()||specialTrack()||!keys()[index])return;const n=reveal.valueAsNumber/100;if(!Number.isFinite(n)||n<0||n>1)throw Error('Reveal must be 0–100%.');keys()[index].reveal=n;});
  const refresh=button(prefix+'-animation-refresh','Refresh preview',()=>safe(()=>{}));
  const loadReference=button(prefix+'-animation-reference','Load footage at preview time',async()=>{if(!opts.loadReference)return;stop();referenceController?.abort();const controller=new AbortController(),u=Number(scrub.value)/1000;referenceController=controller;loadReference.disabled=true;try{await opts.loadReference(u,controller.signal);if(controller.signal.aborted||!wrap.isConnected||!wrap.closest('dialog')?.open)return;keyEditor?.refresh();draw();status.textContent='Reference refreshed at '+(u*100).toFixed(1)+'% · selected scene excluded.';}catch(e){if(!controller.signal.aborted)status.textContent=e.message;}finally{if(referenceController===controller){referenceController=null;loadReference.disabled=false;}}});loadReference.hidden=!opts.loadReference;
  const play=button(prefix+'-animation-play','Play scene',()=>{if(playing){stop();return;}try{checked();playing=true;started=performance.now();play.textContent='Stop';tick(started);}catch(e){status.textContent=e.message;}});
  function stop(){playing=false;cancelAnimationFrame(raf);raf=0;play.textContent='Play scene';}
  function tick(now){if(!playing||!wrap.isConnected||!wrap.closest('dialog')?.open){stop();return;}const u=Math.min(1,(now-started)/1000/Math.max(.25,Math.min(30,opts.duration||4)));scrub.value=String(Math.round(u*1000));try{draw(false);}catch(e){status.textContent=e.message;stop();return;}if(u<1)raf=requestAnimationFrame(tick);else stop();}
  const cameraFields=new Map();
  function changeCamera(raw){if(!canEdit()||!cameraTrack()||!keys()[index])return;try{const k=keys()[index];k.camera=S.checkCamera(raw);base=M.updateBase(base,motion);scrub.value=String(Math.round(k.at*1000));syncCamera();draw(false);}catch(e){status.textContent=e.message;syncCamera();}}
  function syncCamera(){const c=keys()[index]?.camera;if(!c)return;for(const [name,n] of cameraFields){const v=name.startsWith('target')?c.target[Number(name.at(-1))]:c[name]??0;if(d.activeElement!==n)n.value=String(v);}}
  function mountCamera(){cameraFields.clear();const p=el('section','sa-panel-v0730'),g=el('div','sa-grid-v0730');p.append(el('strong','','SHARED CAMERA KEY'),g,el('small','','Drag preview to orbit · Shift-drag to pan · wheel to dolly. Changes edit this key, not any object.'));
   for(const [name,label,min,max] of [['azimuth','Azimuth°',-180,180],['elevation','Elevation°',-89.5,89.5],['roll','Roll°',-180,180],['distance','Distance',2,18],['fov','FOV°',15,90],['target0','Target X',-S.LIMIT,S.LIMIT],['target1','Target Y',-S.LIMIT,S.LIMIT],['target2','Target Z',-S.LIMIT,S.LIMIT]]){
    const n=input(prefix+'-animation-camera-'+name,'number',min,max,'any');n.disabled=!canEdit();n.onchange=()=>{const c=S.copy(keys()[index].camera);if(name.startsWith('target'))c.target[Number(name.at(-1))]=n.valueAsNumber;else c[name]=n.valueAsNumber;changeCamera(c);};cameraFields.set(name,n);g.append(field(label,n));
   }
   const projection=select(prefix+'-animation-camera-projection',[['perspective','Perspective'],['orthographic','Orthographic']]);projection.disabled=!canEdit();projection.onchange=()=>changeCamera({...keys()[index].camera,projection:projection.value});cameraFields.set('projection',projection);g.append(field('Projection',projection));keyHost.append(p);syncCamera();
  }
  const rigidFields=new Map();let maskButtons=null;
  function syncRigid(){const k=keys()[index];if(!rigidTrack()||!k)return;const t=objectTrack(),e=T.toEuler(k.rotation);for(const [name,n] of rigidFields){const i=Number(name.at(-1)),v=name.startsWith('pivot')?t.pivot[i]:name.startsWith('rotation')?e[i]:k.translation[i];if(d.activeElement!==n)n.value=String(Math.round(v*10000)/10000);}}
  function changeRigid(patch){if(!rigidTrack()||!keys()[index]||!canEdit())return;try{const k=keys()[index],t=objectTrack(),v=T.check({pivot:patch.pivot||t.pivot,rotation:patch.rotation||k.rotation,translation:patch.translation||k.translation});t.pivot=v.pivot;k.rotation=v.rotation;k.translation=v.translation;scrub.value=String(Math.round(k.at*1000));syncRigid();draw(false);}catch(e){status.textContent=e.message;syncRigid();}}
  function mountRigid(){
   const p=el('section','sa-panel-v0730'),g=el('div','sa-grid-v0730'),bar=el('div','sa-toolbar-v0730');p.append(el('strong','','RIGID BODY / QUATERNION ROTATION'),g,bar,el('small','','Rotation uses shortest-arc quaternion interpolation of the original mesh. Pivot is shared by this object track (not keyframed). Drag the preview to rotate about world X/Y; Shift-drag to translate in the camera plane. The lime crosshair is the pivot. Add intermediate keys for turns exceeding 180 degrees.'));
   for(const [type,label,max] of [['pivot','Pivot',S.LIMIT],['rotation','Rotation',180],['translation','Translation',T.MAX_TRANSLATION]])for(let i=0;i<3;i++){const name=type+i,n=input(prefix+'-animation-rigid-'+name,'number',-max,max,'any');n.disabled=!canEdit();n.onchange=()=>{const k=keys()[index],v=type==='rotation'?T.toEuler(k.rotation):type==='pivot'?objectTrack().pivot.slice():k.translation.slice();v[i]=n.valueAsNumber;try{changeRigid(type==='rotation'?{rotation:T.fromEuler(v)}:{[type]:v});}catch(e){status.textContent=e.message;} };n.onblur=syncRigid;rigidFields.set(name,n);g.append(field(label+' '+['X','Y','Z'][i]+(type==='rotation'?'°':''),n));}
   const addButton=(suffix,label,fn)=>{const b=button(prefix+'-animation-rigid-'+suffix,label,()=>{stop();fn();});b.disabled=!canEdit();bar.append(b);};
   addButton('center','Pivot: center',()=>changeRigid({pivot:S.pivot(obj().geometry.points)}));addButton('start','Pivot: first point',()=>changeRigid({pivot:obj().geometry.points[0]}));
   for(let i=0;i<3;i++)for(const sign of [-1,1])addButton('rotate-'+i+'-'+(sign<0?'minus':'plus'),['X','Y','Z'][i]+(sign<0?' −15°':' +15°'),()=>changeRigid({rotation:T.multiply(T.axisAngle(i,sign*15),keys()[index].rotation)}));
   addButton('reset','Reset transform key',()=>changeRigid({rotation:T.identity(),translation:T.zero()}));keyHost.append(p);syncRigid();
  }
  function maskSet(raw){if(!maskTrack()||!keys()[index]||!canEdit())return;const masks=S.checkOcclusion(raw);keys()[index].masks=masks;base=M.updateBase(base,motion);scrub.value=String(Math.round(selectedTime()*1000));}
  function maskSync(){if(!maskButtons)return;const a=keys()[index]?.masks||[],off=!maskTrack()||!keys()[index]||!canEdit();maskButtons.start.disabled=off||!!maskDraft||a.length>=4;maskButtons.finish.disabled=off||!maskDraft||maskDraft.length<3;maskButtons.cancel.disabled=off||!maskDraft;maskButtons.edit.disabled=off||!!maskDraft||!a.length;maskButtons.edit.setAttribute('aria-pressed',String(maskEditing));maskButtons.remove.disabled=maskButtons.clear.disabled=off||!!maskDraft||!a.length;}
  function mountMasks(){
   const p=el('section','sa-panel-v0730'),bar=el('div','sa-toolbar-v0730'),btn=(suffix,text,fn)=>button(prefix+'-animation-mask-'+suffix,text,fn);
   maskButtons={
    start:btn('start','Draw foreground polygon',()=>{if(!canEdit()||maskDraft||keys()[index].masks.length>=4)return;stop();maskEditing=false;maskDraft=[];scrub.value=String(Math.round(selectedTime()*1000));maskSync();draw(false);}),
    finish:btn('finish','Close polygon',()=>{if(!canEdit()||!maskDraft||maskDraft.length<3)return;try{const masks=S.checkOcclusion([...keys()[index].masks,maskDraft]);maskDraft=null;maskSet(masks);maskSync();draw();}catch(e){status.textContent=e.message;}}),
    cancel:btn('cancel','Cancel drawing',()=>{maskDraft=null;maskSync();draw();}),
    edit:btn('edit','Move vertices',()=>{if(!canEdit()||maskDraft)return;stop();maskEditing=!maskEditing;scrub.value=String(Math.round(selectedTime()*1000));maskSync();draw(false);}),
    remove:btn('remove','Remove last polygon',()=>safe(()=>{maskSet(keys()[index].masks.slice(0,-1));maskEditing=false;maskSync();})),
    clear:btn('clear','Clear this key',()=>safe(()=>{maskSet([]);maskEditing=false;maskSync();}))
   };
   bar.append(...Object.values(maskButtons));p.append(el('strong','','FOREGROUND MASK KEY'),bar,el('small','','Trace foreground objects on the preview at this key. Drag their vertices in Move vertices mode. Corresponding polygons and vertex counts interpolate; differing topology holds until the next key. These are manual screen-space masks for the complete scene, not object tracking or security redaction. Sample the actual local footage at the key for accurate alignment.'));keyHost.append(p);maskSync();
  }
  function maskGuides(q,w,h){if(!maskTrack()||playing||!keys()[index]||Math.abs(Number(scrub.value)/1000-selectedTime())>.0011)return;
   const a=keys()[index].masks,polys=[...a,...(maskDraft?[maskDraft]:[])];q.save();try{q.lineWidth=1.5;q.strokeStyle='#efc06a';q.fillStyle='#efc06a22';q.setLineDash([4,3]);for(const poly of polys){if(!poly.length)continue;q.beginPath();poly.forEach(([x,y],i)=>i?q.lineTo(x*w,y*h):q.moveTo(x*w,y*h));if(poly!==maskDraft){q.closePath();q.fill('evenodd');}q.stroke();for(const [x,y] of poly){q.fillStyle='#efc06a';q.fillRect(x*w-3,y*h-3,6,6);q.fillStyle='#efc06a22';}}}finally{q.restore();}}
  function mountKey(){
   keyHost.replaceChildren();keyEditor=null;cameraFields.clear();rigidFields.clear();maskButtons=null;maskDraft=null;maskEditing=false;if(!keys().length){keyHost.append(el('p','sa-status-v0730','Enable this independent track to create start and end keys.'));return;}
   if(cameraTrack()){mountCamera();return;}if(maskTrack()){mountMasks();return;}if(rigidTrack()){mountRigid();return;}
   // Render other objects at the selected key time, but show the selected mesh
   // fully for editing. Preview above shows actual reveal and camera animation.
   const evaluated=M.evaluate(motion,selectedTime(),base),frame=evaluated.scene,id=target,pose=Q.selectedPose(frame,id);
   keyEditor=A.editor(keyHost,pose,{...opts,prefix:prefix+'-animation-object',locked:!canEdit(),scene:true,inspectionOnly:true,renderTransforms:evaluated.transforms||null,compose:v=>Q.replace(frame,id,v)});
   keyEditor.setTopologyLocked(true);
  }
  function local(e){const r=preview.getBoundingClientRect();return {x:(e.clientX-r.left)*preview.width/r.width,y:(e.clientY-r.top)*preview.height/r.height};}
  preview.addEventListener('pointerdown',e=>{if(!canEdit()||!keys()[index]||e.button!==0)return;stop();e.preventDefault();
   if(maskTrack()){
    const p=local(e),w=preview.width,h=preview.height;
    if(maskDraft){if(maskDraft.length<64)maskDraft.push([clamp(p.x/w,0,1),clamp(p.y/h,0,1)]);maskSync();draw(false);return;}
    if(maskEditing){const a=keys()[index].masks;let hit=null,best=14;for(const [i,poly] of a.entries())for(const [j,v] of poly.entries()){const dist=Math.hypot(p.x-v[0]*w,p.y-v[1]*h);if(dist<best){best=dist;hit={i,j};}}if(hit){maskDrag={id:e.pointerId,...hit,original:S.copy(a)};preview.setPointerCapture(e.pointerId);}}return;
   }
   if(rigidTrack()){const k=keys()[index],p=local(e);scrub.value=String(Math.round(k.at*1000));rigidDrag={id:e.pointerId,p,rotation:k.rotation.slice(),translation:k.translation.slice(),pivot:objectTrack().pivot.slice(),camera:M.evaluate(motion,k.at,base).scene.camera,pan:e.shiftKey};preview.setPointerCapture(e.pointerId);draw(false);return;}
   if(!cameraTrack())return;cameraDrag={id:e.pointerId,p:local(e),camera:S.copy(keys()[index].camera),pan:e.shiftKey};preview.setPointerCapture(e.pointerId);});
  preview.addEventListener('pointermove',e=>{
   if(maskDrag?.id===e.pointerId){const p=local(e),a=S.copy(maskDrag.original);a[maskDrag.i][maskDrag.j]=[clamp(p.x/preview.width,0,1),clamp(p.y/preview.height,0,1)];try{maskSet(a);draw(false);}catch(e){status.textContent=e.message;}return;}
   if(rigidDrag?.id===e.pointerId){const p=local(e),dx=p.x-rigidDrag.p.x,dy=p.y-rigidDrag.p.y,g=rigidDrag;if(g.pan){const delta=S.viewDelta(S.add(g.pivot,g.translation),g.camera,preview.width,preview.height,dx,dy);if(delta)changeRigid({translation:S.add(g.translation,delta).map(v=>clamp(v,-T.MAX_TRANSLATION,T.MAX_TRANSLATION))});}else changeRigid({rotation:T.multiply(T.axisAngle(1,dx*.6),T.multiply(T.axisAngle(0,dy*.6),g.rotation))});return;}
   if(!cameraDrag||cameraDrag.id!==e.pointerId)return;const p=local(e),dx=p.x-cameraDrag.p.x,dy=p.y-cameraDrag.p.y,c=cameraDrag.camera;if(cameraDrag.pan){const delta=S.viewDelta(c.target,c,preview.width,preview.height,-dx,-dy);changeCamera({...c,target:S.add(c.target,delta).map(v=>clamp(v,-S.LIMIT,S.LIMIT))});}else changeCamera({...c,azimuth:wrapAngle(c.azimuth-dx*.5),elevation:clamp(c.elevation+dy*.4,-89.5,89.5)});});
  preview.addEventListener('pointercancel',e=>{if(maskDrag?.id===e.pointerId){const a=maskDrag.original;maskDrag=null;maskSet(a);draw(false);}if(rigidDrag?.id===e.pointerId){const g=rigidDrag;rigidDrag=null;changeRigid({rotation:g.rotation,translation:g.translation});}if(cameraDrag?.id===e.pointerId){const c=cameraDrag.camera;cameraDrag=null;changeCamera(c);}});for(const event of ['pointerup','lostpointercapture'])preview.addEventListener(event,e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;if(maskDrag?.id===e.pointerId)maskDrag=null;if(rigidDrag?.id===e.pointerId)rigidDrag=null;});
  preview.addEventListener('wheel',e=>{if(!cameraTrack()||!canEdit()||!keys()[index])return;stop();e.preventDefault();const c=keys()[index].camera;changeCamera({...c,distance:clamp(c.distance*Math.exp(e.deltaY*.001),2,18)});},{passive:false});
  function renderTimeline(){
   timeline.replaceChildren();for(const id of trackIds()){const row=el('div','um-track-v0734'),label=button(prefix+'-track-'+(id===M.cameraTarget?'camera':id),trackLabel(id),()=>safe(()=>switchTrack(id))),lane=el('div','um-lane-v0734');label.setAttribute('aria-pressed',String(id===target));const a=M.getKeys(motion,id);a.forEach((k,i)=>{const mark=button(prefix+'-marker-'+(id===M.cameraTarget?'camera':id)+'-'+i,'◆',()=>safe(()=>{target=id;seekKey(i);}));mark.style.left=(k.at*100)+'%';mark.className='um-key-v0734';mark.setAttribute('aria-label',trackLabel(id)+' key '+(i+1)+' at '+Math.round(k.at*100)+'%');mark.setAttribute('aria-pressed',String(id===target&&i===index));lane.append(mark);});row.append(label,lane);timeline.append(row);}
  }
  function sync(){
   toggle.textContent=animating?'Return to static scene editing':'Animate scene';toggle.disabled=locked||animating&&M.hasTracks(motion);if(!animating)return;
   track.replaceChildren();for(const id of trackIds()){const o=el('option','',(M.getKeys(motion,id).length?'◆ ':'')+trackLabel(id));o.value=id;track.append(o);}track.value=target;const a=keys(),k=a[index];
   key.replaceChildren();a.forEach((k,i)=>{const o=el('option','',(i+1)+' · '+(k.at*100).toFixed(1)+'%');o.value=i;key.append(o);});key.value=String(index);
   time.value=k?k.at*100:0;ease.value=k?.ease||'linear';reveal.value=cameraTrack()?100:(k?.reveal??1)*100;
   enable.disabled=!canEdit()||!!a.length;enableRigid.disabled=!canEdit()||specialTrack()||!!a.length;removeTrack.disabled=!canEdit()||!a.length;removeTrack.textContent=rigidTrack()?'Remove rigid track (restore source)':'Remove track (keep first key)';grow.disabled=!canEdit()||specialTrack();key.disabled=!a.length;time.disabled=!canEdit()||!k||index===0||index===a.length-1;ease.disabled=!canEdit()||!k||index===a.length-1;reveal.disabled=!canEdit()||!k||specialTrack();add.disabled=!canEdit()||!a.length||a.length>=M.MAX_KEYS;del.disabled=!canEdit()||!k||index===0||index===a.length-1;play.disabled=!M.hasTracks(motion);renderTimeline();syncCamera();syncRigid();maskSync();
  }
  function draw(validate=true){
   if(!animating)return;const m=validate?checked():motion,u=Number(scrub.value)/1000,p=M.evaluate(m,u,base),q=preview.getContext('2d'),w=preview.width,h=preview.height;
   q.clearRect(0,0,w,h);q.fillStyle='#171c22';q.fillRect(0,0,w,h);if(opts.reference){q.save();q.globalAlpha=.72;q.drawImage(opts.reference,0,0,w,h);q.restore();}
   R.paint(q,p.scene,{x:0,y:0,width:w,height:h},1,1,true,p.reveals,p.transforms||null);
   if(rigidTrack()&&!playing&&p.transforms?.[target]){const t=p.transforms[target],a=S.project(S.add(t.pivot,t.translation),p.scene.camera,w,h);if(a){q.save();try{q.strokeStyle='#b9f75c';q.lineWidth=1.5;q.beginPath();q.moveTo(a.x-9,a.y);q.lineTo(a.x+9,a.y);q.moveTo(a.x,a.y-9);q.lineTo(a.x,a.y+9);q.stroke();q.fillStyle='#b9f75c';q.font='10px system-ui';q.fillText('PIVOT',a.x+10,a.y-7);}finally{q.restore();}}}
   maskGuides(q,w,h);readout.textContent=(u*100).toFixed(1)+'% · '+(u*(opts.duration||4)).toFixed(2)+' s';status.textContent=M.hasTracks(m)?m.objectTracks.length+' object tracks · '+(m.cameraKeys.length?'animated':'static')+' camera · '+M.count(m)+' keys · '+(m.maskKeys?.length?'keyed foreground':'static foreground')+' · shared GPU depth':'Select an object, shared camera or foreground track.';if(maskDraft)status.textContent='Draw foreground polygon · '+maskDraft.length+' vertices · Close polygon to commit this key.';
  }
  scrub.oninput=()=>{stop();if(maskDraft||maskEditing){scrub.value=String(Math.round(selectedTime()*1000));draw(false);return;}try{draw();}catch(e){status.textContent=e.message;}};
  tools.append(enable,enableRigid,grow,removeTrack,add,del,refresh,loadReference,play);
  fields.append(field('Track',track),field('Selected key',key),field('Key time %',time),field('Outgoing easing',ease),field('Object reveal %',reveal));
  motionHost.append(el('strong','','INDEPENDENT 3D MOTION TRACKS'),el('small','','Scene membership is fixed while animation tracks exist. Remove tracks to return to static object editing. Choose pose deformation or rigid rotation per object. Camera and foreground keys are independent. The preview uses the full scene and actual per-object reveals.'),timeline,tools,fields,preview,field('Preview time',scrub),readout,keyHost);
  const header=el('div','sa-toolbar-v0730');header.append(toggle);wrap.append(header,staticHost,motionHost,status);host.append(wrap);staticHost.hidden=animating;motionHost.hidden=!animating;
  if(animating){mountKey();sync();try{draw();}catch(e){status.textContent=e.message;}}else{mountStatic();sync();}
  wrap.closest('dialog')?.addEventListener('close',()=>{stop();referenceController?.abort();},{once:true});
  return {value(){stop();checked();R.requireRenderer();return Q.check(base);},sceneMotion(){return checked();}};
 }
 root.MangoUnifiedSceneMotionUIV0734=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
