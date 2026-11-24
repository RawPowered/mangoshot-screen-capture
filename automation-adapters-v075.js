/* Adapters use the editor's authoritative operations; no synthetic input clicks. */
(function(root){'use strict';
 const plan=(summary,changes,execute,warnings=[])=>({summary,changes,execute,warnings});
 const clone=x=>JSON.parse(JSON.stringify(x));
 function cameraRange(existing,a,length){
  const end=a.start+2*a.transition+a.hold;
  if(end>length-.005)throw Error('Zoom and return must fit within the sequence');
  const prev=existing.filter(k=>k.start<=a.start).sort((x,y)=>x.start-y.start).at(-1);
  if(prev&&(prev.scale!==1||prev.start+prev.duration>a.start)||existing.some(k=>k.start>=a.start-.00001&&k.start<=end+.00001))throw Error('Zoom conflicts with existing camera animation');
  let next=root.MangoCreativeZoom.add(existing,a.start,a.scale,a.x,a.y,a.transition);
  next=root.MangoCreativeZoom.add(next,a.start+a.transition+a.hold,1,.5,.5,a.transition);
  return {next,end};
 }
 function clipAdapter(){
  const v=root.MangoClipView,d=root.MangoCursorDirectorCoreV074;
  return {capture:()=>v.automationCapture(),inspect:()=>v.automationInspect(),plan(command,a){
   const length=v.outputDuration(),existing=v.zoomFrames(),list=v.cursorRegions(),trace=v.cursorTrace();
   if(command==='clip.graphics.add'){
    if(a.start+a.duration>length+.000001)throw Error('Graphic extends beyond sequence');
    const draft=root.MangoGraphics.create(a.kind,a.preset,a.start,{text:a.text,end:a.start+a.duration});
    return plan('Add '+a.kind+' graphic',[{kind:a.kind,start:a.start,end:a.start+a.duration,preset:a.preset,text:a.text}],()=>v.commitAutomationGraphic(draft));
   }
   if(command==='clip.graphics.opacity'){
    const l=v.layers().find(x=>x.id===a.id);if(!l||l.locked)throw Error('Graphic is missing or locked');if((l.opacity??1)===a.value)throw Error('Opacity already set');
    return plan('Change graphic opacity',[{id:l.id,from:l.opacity??1,to:a.value}],()=>{v.updateLayer(l.id,{opacity:a.value});return true;});
   }
   if(command==='clip.timeline.rippleDelete'){
    if(a.end<=a.start||a.end>length)throw Error('Invalid sequence range');
    const tx=root.MangoSequenceOps.range(v.segments(),v.layers(),root.MangoClipTimeline?.markers?.()||[],a.start,a.end);
    if(!tx?.segments?.length||!Number.isFinite(tx.removed)||tx.removed<=0)throw Error('Range cannot be removed');
    return plan('Ripple delete '+tx.removed.toFixed(2)+' seconds',[{start:a.start,end:a.end,removed:tx.removed,newDuration:root.MangoEditOps.length(tx.segments)}],()=>v.rippleDelete(a.start,a.end),['Edit decisions, graphics and markers may ripple. Original media is preserved.']);
   }
   if(command==='clip.camera.zoomRange'){
    const z=cameraRange(existing,a,length);return plan('Add camera zoom and return',[{start:a.start,end:z.end,scale:a.scale,x:a.x,y:a.y}],()=>v.commitCursorDirector({zoomFrames:z.next}));
   }
   if(!trace)throw Error('This command requires a retained cursor path');
   if(command==='clip.cursor.effects.add'){
    const id='auto-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
    const next=d.addRange(list,v.segments(),a.start,a.end,a.style,id,v.duration());
    return plan('Add source-anchored cursor effects',next.filter(x=>!list.some(y=>y.id===x.id)).map(x=>({id:x.id,sourceStart:x.start,sourceEnd:x.end,style:x.style})),()=>v.commitCursorDirector({regions:next}),trace.baked?['Live effects are already baked into this recording.']:[]);
   }
   if(command==='clip.cursor.effects.update'||command==='clip.cursor.effects.remove'){
    const old=list.find(x=>x.id===a.id);if(!old)throw Error('Cursor region not found');
    const remove=command.endsWith('.remove'),patch=Object.fromEntries(Object.entries(a).filter(([k])=>k!=='id'));
    if(!remove&&!Object.keys(patch).length)throw Error('No update fields provided');
    const next=d.regions(remove?list.filter(x=>x.id!==a.id):list.map(x=>x.id===a.id?{...x,...patch}:x),v.duration());
    if(JSON.stringify(next)===JSON.stringify(list))throw Error('No changes');
    return plan(remove?'Remove cursor effect':'Update cursor effect',[{before:old,after:next.find(x=>x.id===a.id)||null}],()=>v.commitCursorDirector({regions:next}));
   }
   if(command==='clip.cursor.smartZoom'){
    const items=d.suggest(trace,v.segments(),existing,a);if(!items.length)throw Error('No eligible non-conflicting cursor events');
    let z=clone(existing);for(const i of items){z=root.MangoCreativeZoom.add(z,i.start,i.scale,i.x,i.y,i.transition);z=root.MangoCreativeZoom.add(z,i.start+i.transition+i.hold,1,.5,.5,i.transition);}
    return plan('Apply '+items.length+' proposed camera ranges',items.map(x=>({start:x.start,end:x.end,scale:x.scale,x:x.x,y:x.y,reason:x.reason})),()=>v.commitCursorDirector({zoomFrames:z}),['Review every candidate before applying the batch. Use Cursor Director for individual candidate selection.']);
   }
   throw Error('Unsupported Clip Studio command');
  }};
 }
 function recorderAdapter(){
  const host=root.MangoRecorderCursorHostV073,cursor=root.MangoRecorderCursorV073,c=root.MangoCursorCoreV073;
  return {capture(){const h=host.automationCapture(),s=cursor.state();return {ready:h.ready,reason:h.reason,identity:h.identity,stamp:JSON.stringify([h.phase,s])};},
   inspect(){const h=host.automationCapture(),s=cursor.state();return {studio:'recorder',ready:h.ready,phase:h.phase,settings:s.settings,tracking:s.mode,retain:s.retain};},
   plan(command,a){if(command!=='recorder.cursor.configure')throw Error('Unsupported recorder command');
    const checked=c.recipe({schema:c.RECIPE,action:'recorder.cursor.configure',preset:a.preset,settings:a.settings}),before=cursor.state().settings;
    if(JSON.stringify(before)===JSON.stringify(checked.settings))throw Error('Settings are already applied');
    const changes=Object.entries(checked.settings).filter(([k,v])=>before[k]!==v).map(([property,to])=>({property,from:before[property],to}));
    return plan('Configure live cursor effects',changes,()=>{cursor.applyRecipe({schema:c.RECIPE,action:'recorder.cursor.configure',settings:checked.settings});return true;},['Does not start recording, link a tab, grant consent, or enable path retention. Turning effects off may disconnect an unused linked tracker.']);
   }};
 }
 function adapter(studio){if(studio==='image')return root.MangoImageAutomationV075;if(studio==='clip')return clipAdapter();if(studio==='recorder')return recorderAdapter();throw Error('Unknown studio');}
 root.MangoAutomationAdaptersV075=Object.freeze({adapter});
})(typeof globalThis!=='undefined'?globalThis:this);
