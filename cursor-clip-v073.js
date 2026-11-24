/* Cursor-aware camera actions. Existing Clip Studio keyframes own undo/export. */
(function(root){'use strict';
 const core=root.MangoCursorCoreV073,doc=root.document;if(!core||!doc)return;
 const el=id=>doc.getElementById(id),panel=el('cursor-clip-v073');if(!panel)return;
 const view=()=>root.MangoClipView,report=t=>{el('cursor-clip-status-v073').textContent=t;};
 function inspect(at){
  const v=view(),trace=v?.cursorTrace?.();
  const time=at??v?.sequencePosition?.()??0;
  if(!v?.original?.()||!trace)return {point:null,time,trace};
  const map=root.MangoSequenceMedia.atOutput(v.segments(),time);
  return {point:map?core.sampleAt(trace,map.source):null,time,trace};
 }
 function applyRecipe(raw){
  const r=core.recipe(raw);if(r.action!=='clip.cursor.zoom')throw Error('This recipe is for Record Studio');
  const v=view();if(!v?.original?.()||v.exporting())throw Error('Load a recording and finish any export first');
  const {point,time}=inspect(r.at);
  if(!point)throw Error('No tracked cursor at this playhead. Record with cursor-path retention and move to a tracked moment.');
  const end=time+r.transition+r.hold;
  if(time<0||end>=v.outputDuration()-.005)throw Error('Not enough sequence time for the requested zoom and return; move earlier or shorten the hold.');
  // addZoomRange performs one existing history transaction and uses the
  // same camera keyframes for preview and render; original video is unchanged.
  v.addZoomRange(time,end,r.scale,point.x,point.y,r.transition);
  report('Cursor zoom added at '+time.toFixed(2)+'s. Edit its camera keyframes or undo the operation.');
  return {time,end,point,scale:r.scale};
 }
 function recipeFromControls(){return {schema:core.RECIPE,action:'clip.cursor.zoom',scale:Number(el('cursor-clip-scale-v073').value),transition:Number(el('cursor-clip-transition-v073').value),hold:Number(el('cursor-clip-hold-v073').value)};}
 function refresh(){
  const v=view(),trace=v?.cursorTrace?.();
  el('cursor-clip-count-v073').textContent=trace?trace.samples.filter(s=>s[1]!==null).length+' cursor samples'+(trace.truncated?' · truncated':'')+(trace.baked?' · live effects baked into source':' · no live cursor effects recorded'):'No cursor path attached to this recording.';
  el('cursor-clip-apply-v073').disabled=!trace||!!v?.exporting?.();
  el('cursor-clip-download-v073').disabled=!trace;
 }
 el('cursor-clip-apply-v073').addEventListener('click',()=>{try{const r=recipeFromControls();el('cursor-clip-recipe-v073').value=JSON.stringify(r,null,2);applyRecipe(r);}catch(e){report(e.message);}});
 el('cursor-clip-script-v073').addEventListener('click',()=>{try{const raw=el('cursor-clip-recipe-v073').value;if(raw.length>4096)throw Error('Recipe exceeds 4 KB');applyRecipe(JSON.parse(raw));}catch(e){report(e.message);}});
 el('cursor-clip-download-v073').addEventListener('click',()=>{const trace=view()?.cursorTrace?.();if(!trace)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(trace)],{type:'application/json'})),a=doc.createElement('a');
  a.href=url;a.download='MangoShot-cursor-path.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 });
 el('cursor-clip-recipe-v073').value=JSON.stringify(recipeFromControls(),null,2);
 root.MangoCursorClipV073=Object.freeze({inspect,applyRecipe,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
