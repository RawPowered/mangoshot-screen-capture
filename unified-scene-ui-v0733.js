/* One scene explorer plus a real shared-depth viewport. Reuse the qualified
 * spatial gizmos for selected object geometry, and store the camera once. */
(function(root){'use strict';
 const d=root.document,S=root.MangoSpatialArrowV0730,Q=root.MangoUnifiedSceneV0733,R=root.MangoSpatialRendererV0730,U=root.MangoSpatialArrowUIV0730;if(!d||!S||!Q||!R||!U)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const btn=(id,t,fn)=>{const b=el('button','',t);b.id=id;b.type='button';b.onclick=fn;return b;};
 const field=(t,n)=>{const l=el('label','sa-field-v0730',t);l.append(n);return l;};
 const select=(id,items=[])=>{const n=el('select');n.id=id;for(const [v,t] of items){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 function editor(host,initial,opts={}){
  let scene=Q.check(initial),selected=scene.objects[0].id,child=null,controller=null;
  const prefix=opts.prefix||'scene',locked=!!opts.locked,wrap=el('section','us-scene-v0733'),panel=el('section','sa-panel-v0730'),bar=el('div','sa-toolbar-v0730'),fields=el('div','sa-grid-v0730'),list=select(prefix+'-objects'),kind=select(prefix+'-add-kind',S.SHAPES.map(k=>[k,k[0].toUpperCase()+k.slice(1)])),name=el('input'),visible=el('input'),lock=el('input'),sub=el('div'),status=el('p','sa-status-v0730');
  name.id=prefix+'-name';name.type='text';name.maxLength=64;visible.id=prefix+'-visible';visible.type='checkbox';lock.id=prefix+'-locked';lock.type='checkbox';status.id=prefix+'-scene-status';status.setAttribute('role','status');
  const current=()=>scene.objects.find(o=>o.id===selected);
  function flush(){if(child)scene=Q.replace(scene,selected,child.draft());return scene;}
  function safe(fn,rebuild=false){try{flush();fn();if(rebuild)mount();else{sync();child?.refresh();}status.textContent=scene.objects.length+' / '+Q.MAX_OBJECTS+' objects · shared camera · shared GPU depth';}catch(e){status.textContent=e.message;sync();}}
  const add=btn(prefix+'-add','Add 3D object',()=>safe(()=>{scene=Q.addObject(scene,kind.value);selected=scene.objects.at(-1).id;},true));
  const dup=btn(prefix+'-duplicate','Duplicate',()=>safe(()=>{scene=Q.duplicate(scene,selected);selected=scene.objects.at(-1).id;},true));
  const del=btn(prefix+'-delete','Remove',()=>safe(()=>{scene=Q.remove(scene,selected);selected=scene.objects[0].id;},true));
  const referenceTime=el('input');referenceTime.type='range';referenceTime.min=0;referenceTime.max=1000;referenceTime.step=1;referenceTime.value=0;referenceTime.id=prefix+'-reference-time';referenceTime.setAttribute('aria-label','Reference time within scene clip');
  const reference=btn(prefix+'-sample-reference','Load footage reference',async()=>{if(!opts.loadReference)return;controller?.abort();const signaler=new AbortController();controller=signaler;reference.disabled=true;try{await opts.loadReference(Number(referenceTime.value)/1000,signaler.signal);if(signaler.signal.aborted||!wrap.isConnected||!wrap.closest('dialog')?.open)return;child?.refresh();status.textContent='Reference refreshed · '+(Number(referenceTime.value)/10).toFixed(1)+'% of clip';}catch(e){if(!signaler.signal.aborted)status.textContent=e.message;}finally{if(controller===signaler){controller=null;reference.disabled=false;}}});
  list.onchange=()=>{const id=list.value;safe(()=>{selected=id;},true);};name.onchange=()=>safe(()=>{scene=Q.update(scene,selected,{name:name.value});});visible.onchange=()=>safe(()=>{scene=Q.update(scene,selected,{visible:visible.checked});});lock.onchange=()=>safe(()=>{scene=Q.update(scene,selected,{locked:lock.checked});},true);
  function sync(){const o=current();list.replaceChildren();for(const x of scene.objects){const n=el('option','',(x.visible?'':'Hidden · ')+(x.locked?'Locked · ':'')+x.name+' · '+x.geometry.shape);n.value=x.id;list.append(n);}list.value=selected;name.value=o.name;visible.checked=o.visible;lock.checked=o.locked;
   name.disabled=locked||o.locked;visible.disabled=lock.disabled=kind.disabled=locked;add.disabled=locked||scene.objects.length>=Q.MAX_OBJECTS;dup.disabled=locked||o.locked||scene.objects.length>=Q.MAX_OBJECTS;del.disabled=locked||o.locked||scene.objects.length<=1;
  }
  function compose(p){return Q.replace(scene,selected,p);}
  function drawGuides(q,camera,w,h){q.save();try{q.font='10px system-ui';for(const o of scene.objects){if(o.id===selected||!o.visible)continue;const p=S.project(o.geometry.points[0],camera,w,h);if(!p)continue;q.fillStyle='#a5b9cb';q.strokeStyle='#13171d';q.beginPath();q.arc(p.x,p.y,4,0,Math.PI*2);q.fill();q.stroke();q.fillText(o.name,p.x+7,p.y-5);}}finally{q.restore();}}
  function pickObject(p,camera,w,h){let best=null;for(const o of scene.objects){if(o.id===selected||!o.visible)continue;const a=S.project(o.geometry.points[0],camera,w,h);if(!a)continue;const dist=Math.hypot(p.x-a.x,p.y-a.y);if(dist<14&&(!best||dist<best.dist))best={id:o.id,dist};}if(best)safe(()=>{selected=best.id;},true);}
  function mount(){sub.replaceChildren();child=U.editor(sub,Q.selectedPose(scene,selected),{...opts,prefix:prefix+'-object',locked:locked||current().locked,scene:true,compose,drawGuides,pickObject});sync();}
  fields.append(field('Scene objects',list),field('Selected object name',name),field('Visible',visible),field('Lock geometry',lock),field('New primitive',kind));
  bar.append(add,dup,del);panel.append(el('strong','','3D SCENE EXPLORER'),fields,bar,el('small','','Select objects using the list or their labeled origin in the viewport. All objects use one camera and occlude each other through a shared depth buffer. Foreground polygons apply to the entire scene.'));
  if(opts.loadReference)panel.append(field('Footage time within clip',referenceTime),reference);
  wrap.append(panel,sub,status);host.append(wrap);mount();status.textContent='Shared world · one camera · '+scene.objects.length+' object';
  wrap.closest('dialog')?.addEventListener('close',()=>controller?.abort(),{once:true});
  return {value(){flush();R.requireRenderer();R.render(scene,480,Math.max(1,Math.round(480/(opts.aspect||16/9))));return Q.check(scene);},draft(){return Q.check(flush());}};
 }
 root.MangoUnifiedSceneUIV0733=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
