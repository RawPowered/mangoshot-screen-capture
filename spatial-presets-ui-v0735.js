/* Explicit local preset actions. Applying geometry remains a staged draft. */
(function(root){'use strict';
 const d=root.document,P=root.MangoSpatialPresetsV0735;if(!d||!P)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,t,f)=>{const n=el('button','',t);n.id=id;n.type='button';n.onclick=f;return n;};
 const field=(t,n)=>{const l=el('label','sa-field-v0730',t);l.append(n);return l;};
 function panel(host,opts){
  const prefix=opts.prefix+'-preset',kind=opts.kind,wrap=el('section','sa-panel-v0730 sp-presets-v0735'),fields=el('div','sa-grid-v0730'),bar=el('div','sa-toolbar-v0730'),list=el('select'),name=el('input'),status=el('p','sa-status-v0730');
  list.id=prefix+'-list';name.id=prefix+'-name';name.type='text';name.maxLength=64;name.placeholder='Custom preset name';status.id=prefix+'-status';status.setAttribute('role','status');
  const storage=()=>root.localStorage;
  const apply=button(prefix+'-apply',kind==='scene'?'Replace draft with preset':'Apply geometry preset',()=>act(()=>{opts.apply(P.load(storage(),kind,list.value));status.textContent='Preset loaded into draft. Apply the editor to commit.';}));
  const save=button(prefix+'-save','Save local preset',()=>act(()=>{const id=P.save(storage(),kind,name.value,opts.get());refresh('user:'+id);status.textContent='Saved locally for both studios.';}));
  const remove=button(prefix+'-delete','Delete saved preset',()=>act(()=>{if(!list.value.startsWith('user:'))return;P.remove(storage(),kind,list.value.slice(5));refresh();status.textContent='Local preset removed.';}));
  function act(fn){if(opts.disabled?.())return;try{fn();}catch(e){status.textContent=e.message;}sync();}
  function refresh(preferred=list.value){list.replaceChildren();let error=null;for(const x of P.builtins(kind)){const n=el('option','','Built-in · '+x.name);n.value='builtin:'+x.id;list.append(n);}try{for(const x of P.read(storage())[kind]){const n=el('option','','Saved · '+x.name);n.value='user:'+x.id;list.append(n);}}catch(e){error=e.message;}if([...list.options].some(o=>o.value===preferred))list.value=preferred;sync();if(error)status.textContent=error;}
  function sync(){const disabled=!!opts.disabled?.();list.disabled=name.disabled=save.disabled=disabled;apply.disabled=disabled||!list.value||!!opts.applyDisabled?.();remove.disabled=disabled||!list.value.startsWith('user:');}
  list.onchange=sync;fields.append(field(kind==='scene'?'Scene preset':'Object preset',list),field('Save as',name));bar.append(apply,save,remove);
  wrap.append(el('strong','',kind==='scene'?'SCENE PRESETS':'GEOMETRY PRESETS'),fields,bar,el('small','',kind==='scene'?'Scene presets save geometry, camera and object names, not footage, masks, locks or animation. Loading replaces the draft and creates new object IDs.':'Object presets save XYZ geometry and appearance only. Current scene camera and masks are retained.'),status);host.append(wrap);refresh();
  return {sync,refresh};
 }
 root.MangoSpatialPresetsUIV0735=Object.freeze({panel});
})(typeof globalThis!=='undefined'?globalThis:this);
