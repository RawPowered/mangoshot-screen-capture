/* MangoScript v1: bounded, pure Clip Studio sequence planner.
 * Every operation works on a private draft. No DOM mutation, eval or external I/O. */
(function(root){'use strict';
 const SCHEMA='mangoshot.sequence.recipe.v1',LIMIT=32768,MAX=40,TTL=300000,CPMAX=8;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const name=v=>typeof v==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
 const scalar=v=>typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=86400||typeof v==='string'&&v.length<=400;
 const object=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))throw Error('Invalid sequence object/field');return o;};
 const token=()=>root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
 const duration=s=>root.MangoEditOps.length(s.segments);
 function syntax(raw){
  if(typeof raw==='string'){if(raw.length>LIMIT)throw Error('Sequence exceeds 32 KiB');raw=JSON.parse(raw);}
  object(raw,['schema','name','variables','functions','steps']);if(raw.schema!==SCHEMA)throw Error('Expected '+SCHEMA);
  const size=JSON.stringify(raw).length;if(size>LIMIT)throw Error('Sequence exceeds 32 KiB');
  if(raw.name!=null&&(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>80))throw Error('Invalid sequence name');
  const variables=raw.variables??{},functions=raw.functions??{};
  for(const [v,label,max] of [[variables,'variables',32],[functions,'functions',12]]){
   if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length>max||Object.keys(v).some(k=>!name(k)))throw Error('Invalid '+label);
  }
  for(const v of Object.values(variables))if(!scalar(v))throw Error('Variables must be finite scalar values');
  let declared=0;
  function checkValue(v,depth=0){
   if(depth>8)throw Error('Argument nesting too deep');
   if(scalar(v))return;
   if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid argument value');
   if(own(v,'var')){object(v,['var']);if(!name(v.var))throw Error('Invalid variable reference');return;}
   if(own(v,'ref')){object(v,['ref']);if(typeof v.ref!=='string'||!/^[a-zA-Z][a-zA-Z0-9_]{0,31}\.(id|duration|count)$/.test(v.ref))throw Error('Invalid step result reference');return;}
   if(Object.keys(v).length>24||Object.keys(v).some(k=>!name(k)))throw Error('Invalid argument fields');
   for(const x of Object.values(v))checkValue(x,depth+1);
  }
  function steps(items,depth=0){
   if(depth>4||!Array.isArray(items)||!items.length||items.length>MAX)throw Error('Invalid step block');
   for(const s of items){
    if(++declared>100)throw Error('Too many declared steps');
    if(own(s??{},'call')){object(s,['call']);if(!name(s.call)||!own(functions,s.call))throw Error('Unknown function');}
    else if(own(s??{},'if')){object(s,['if','then','else']);object(s.if,['test','value']);
     if(!['hasCursorPath','minDuration','hasGraphics'].includes(s.if.test))throw Error('Unknown condition');
     if(s.if.test==='minDuration'){checkValue(s.if.value);}else if(own(s.if,'value'))throw Error('Unexpected condition value');
     steps(s.then,depth+1);if(s.else!=null)steps(s.else,depth+1);}
    else{object(s,['command','args','as']);if(typeof s.command!=='string'||!root.MangoAutomationCoreV075.catalog('clip').some(d=>d.id===s.command))throw Error('Only registered Clip Studio commands are supported');if(s.as!=null&&!name(s.as))throw Error('Invalid result name');checkValue(s.args);if(!s.args||typeof s.args!=='object'||Array.isArray(s.args))throw Error('Arguments must be an object');}
   }
  }
  for(const block of Object.values(functions))steps(block);
  steps(raw.steps);
  // Reject recursive calls even if a branch would not be selected.
  function edges(items){return items.flatMap(s=>s.call?[s.call]:s.if?[...edges(s.then),...(s.else?edges(s.else):[])]:[]);}
  function visit(k,path=[]){if(path.includes(k))throw Error('Recursive functions are not allowed');if(path.length>=5)throw Error('Function call depth exceeded');for(const n of edges(functions[k]))visit(n,[...path,k]);}
  for(const k of Object.keys(functions))visit(k);
  return {schema:SCHEMA,name:raw.name||'Untitled sequence',variables:copy(variables),functions:copy(functions),steps:copy(raw.steps)};
 }
 function validateDraft(s){
  const checked=root.MangoProject.check(root.MangoProject.pack(s.source,s.segments,s.layers,s.markers,s.transitions),s.source);
  const zoom=root.MangoCreativeZoom.check(s.zoomFrames);const len=root.MangoEditOps.length(checked.segments);
  if(zoom.some(e=>e.start>=len||e.start+e.duration>len+.005)||new Set(zoom.map(e=>e.id)).size!==zoom.length)throw Error('Camera events must fit in the sequence');
  const d=root.MangoCursorDirectorCoreV074.check({schema:root.MangoCursorDirectorCoreV074.SCHEMA,regions:s.cursorRegions,trace:s.cursorTrace},s.source.duration);
  return {...s,...checked,zoomFrames:zoom,cursorRegions:d.regions,cursorTrace:s.cursorTrace};
 }
 function cameraRange(s,a){
  const end=a.start+2*a.transition+a.hold,len=duration(s),existing=s.zoomFrames;
  if(end>len-.005)throw Error('Camera return exceeds sequence duration');
  const prev=existing.filter(k=>k.start<=a.start).sort((x,y)=>x.start-y.start).at(-1);
  if(prev&&(prev.scale!==1||prev.start+prev.duration>a.start)||existing.some(k=>k.start>=a.start-.00001&&k.start<=end+.00001))throw Error('Camera range conflicts with existing animation');
  let next=root.MangoCreativeZoom.add(existing,a.start,a.scale,a.x,a.y,a.transition);
  next=root.MangoCreativeZoom.add(next,a.start+a.transition+a.hold,1,.5,.5,a.transition);
  s.zoomFrames=next;return {start:a.start,end,scale:a.scale,x:a.x,y:a.y};
 }
 function step(s,command,a){
  const len=duration(s),d=root.MangoCursorDirectorCoreV074,trace=s.cursorTrace;
  if(command==='clip.graphics.add'){
   if(a.text.length>400||a.start+a.duration>len+.000001||s.layers.length>=200)throw Error('Graphic exceeds project text, timing or layer limits');
   const layer=root.MangoGraphics.create(a.kind,a.preset,a.start,{text:a.text,end:a.start+a.duration});s.layers.push(layer);
   return {id:layer.id,kind:layer.kind,start:layer.start,end:layer.end,text:layer.text};
  }
  if(command==='clip.graphics.opacity'){
   const l=s.layers.find(x=>x.id===a.id);if(!l||l.locked)throw Error('Graphic missing or locked');
   const before=l.opacity??1;if(before===a.value)throw Error('Opacity unchanged');l.opacity=a.value;return {id:l.id,from:before,to:a.value};
  }
  if(command==='clip.timeline.rippleDelete'){
   if(s.hasVoice)throw Error('Ripple edits with a recorded voiceover are not supported in sequence scripts');
   // Existing camera ripple can drop a return keyframe. Require cuts before camera animation.
   if(s.zoomFrames.length)throw Error('Perform ripple cuts before adding camera animation (or remove existing camera events)');
   if(a.end<=a.start||a.end>len)throw Error('Invalid ripple range');
   const tx=root.MangoSequenceOps.range(s.segments,s.layers,s.markers,a.start,a.end);
   const valid=new Set(tx.segments.slice(1).map((p,i)=>tx.segments[i].end.toFixed(5)+':'+p.start.toFixed(5)));
   s.segments=tx.segments;s.layers=tx.layers;s.markers=tx.markers;s.transitions=s.transitions.filter(t=>valid.has(t.fromEnd.toFixed(5)+':'+t.toStart.toFixed(5)));
   return {start:a.start,end:a.end,removed:tx.removed,duration:duration(s)};
  }
  if(command==='clip.camera.zoomRange')return cameraRange(s,a);
  if(!trace)throw Error('Retained cursor path required');
  if(command==='clip.cursor.effects.add'){
   const id='seq-'+token(),old=s.cursorRegions;s.cursorRegions=d.addRange(old,s.segments,a.start,a.end,a.style,id,s.source.duration);
   const added=s.cursorRegions.filter(x=>!old.some(y=>y.id===x.id));
   return {id:added.length===1?added[0].id:undefined,count:added.length,regions:added.map(x=>({id:x.id,start:x.start,end:x.end}))};
  }
  if(command==='clip.cursor.effects.update'||command==='clip.cursor.effects.remove'){
   const old=s.cursorRegions.find(x=>x.id===a.id);if(!old)throw Error('Cursor region not found');
   const remove=command.endsWith('.remove'),patch=Object.fromEntries(Object.entries(a).filter(([k])=>k!=='id'));
   if(!remove&&!Object.keys(patch).length)throw Error('No cursor fields supplied');
   const next=d.regions(remove?s.cursorRegions.filter(x=>x.id!==a.id):s.cursorRegions.map(x=>x.id===a.id?{...x,...patch}:x),s.source.duration);
   if(same(next,s.cursorRegions))throw Error('Cursor region unchanged');s.cursorRegions=next;return {id:a.id,removed:remove};
  }
  if(command==='clip.cursor.smartZoom'){
   const candidates=d.suggest(trace,s.segments,s.zoomFrames,a);if(!candidates.length)throw Error('No eligible Smart Zoom candidates');
   const ranges=candidates.map(i=>({...cameraRange(s,i),reason:i.reason}));return {count:ranges.length,ranges};
  }
  throw Error('Unsupported sequence command');
 }
 function plan(raw,input){
  const program=syntax(raw),s=validateDraft({...copy({...input,cursorTrace:null}),cursorTrace:input.cursorTrace}),initial=duration(s),results=Object.create(null),changes=[];
  let visited=0,applied=0;
  function resolve(v,depth=0){
   if(depth>8)throw Error('Argument nesting limit');
   if(scalar(v))return v;
   if(own(v,'var')){if(!own(program.variables,v.var))throw Error('Unknown variable '+v.var);return program.variables[v.var];}
   if(own(v,'ref')){const [id,key]=v.ref.split('.');if(!own(results,id)||!own(results[id],key)||!scalar(results[id][key]))throw Error('Unavailable result '+v.ref);return results[id][key];}
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolve(x,depth+1)]));
  }
  function run(items,depth=0){
   if(depth>8)throw Error('Expanded call depth exceeded');
   for(const op of items){
    if(++visited>160)throw Error('Expanded instruction budget exceeded');
    if(op.call){run(program.functions[op.call],depth+1);continue;}
    if(op.if){let pass;if(op.if.test==='hasCursorPath')pass=!!s.cursorTrace?.samples?.length;else if(op.if.test==='hasGraphics')pass=s.layers.length>0;else{const n=resolve(op.if.value);if(typeof n!=='number'||n<0||n>86400)throw Error('Invalid duration condition');pass=duration(s)>=n;}
     changes.push({condition:op.if.test,matched:pass});if(pass)run(op.then,depth+1);else if(op.else)run(op.else,depth+1);continue;}
    if(++applied>MAX)throw Error('Expanded command limit: 40');
    if(op.as&&own(results,op.as))throw Error('Duplicate result name '+op.as);
    try{const r=root.MangoAutomationCoreV075.parse({schema:root.MangoAutomationCoreV075.SCHEMA,command:op.command,args:resolve(op.args)});
     const result=step(s,r.command,r.args);if(op.as)results[op.as]=result;changes.push({step:applied,command:r.command,...result});}
    catch(e){throw Error('Step '+applied+' ('+op.command+'): '+e.message);}
   }
  }
  run(program.steps);if(!applied)throw Error('No commands selected by conditions');
  const draft=validateDraft(s);
  return {program,draft,changes,applied,beforeDuration:initial,afterDuration:duration(draft),warnings:[...(s.hasVoice?['Voiceover is preserved, not included in still-frame preview.']:[]),...(s.cursorTrace?.baked?['Live cursor effects may already be baked into the source.']:[])]};
 }
 const equal=(a,b)=>a&&b&&a.identity===b.identity&&a.trace===b.trace&&a.stamp===b.stamp&&a.voice===b.voice;
 function controller(host,options={}){
  const now=options.now||Date.now;let pending=null,points=[],log=[];
  const record=(status,message)=>{log.unshift({at:new Date(now()).toISOString(),status,message});log=log.slice(0,100);};
  function current(){const s=host.capture();if(!s.ready)throw Error(s.reason||'Clip Studio is not ready');points=points.filter(p=>p.identity===s.identity);return s;}
  function ticket(state,proposal){
   if(!equal(state,current()))throw Error('Editor changed during planning');pending={id:token(),state,proposal,expires:now()+TTL};
   record('reviewed',proposal.program?.name||'Checkpoint restore');
   return {ticket:pending.id,expires:pending.expires,changes:copy(proposal.changes),beforeDuration:proposal.beforeDuration,afterDuration:proposal.afterDuration,applied:proposal.applied,warnings:copy(proposal.warnings||[])};
  }
  function checked(id){if(!pending||pending.id!==id)throw Error('No current sequence review');if(now()>pending.expires||!equal(pending.state,current())){pending=null;throw Error('Review expired or editor changed; validate again');}return pending;}
  return Object.freeze({
   preview(raw){pending=null;try{const state=current();return ticket(state,plan(raw,host.draft()));}catch(e){record('rejected','Sequence validation failed');throw e;}},
   frame(id,t){const p=checked(id),s=p.proposal.draft;if(!Number.isFinite(t)||t<0||t>=duration(s))throw Error('Frame time outside planned sequence');return {source:p.state.identity,draft:s,time:t};},
   apply(id){const p=checked(id);pending=null;try{if(host.commit(p.proposal.draft,p.state)!==true)throw Error('Editor rejected sequence');record('applied',p.proposal.program?.name||'Checkpoint restore');return {applied:p.proposal.applied};}catch(e){record('rejected','Commit failed');throw e;}},
   cancel(){pending=null;},
   saveCheckpoint(label){const s=current();if(typeof label!=='string'||!label.trim()||label.length>48)throw Error('Checkpoint name must be 1–48 characters');
    if(points.length>=CPMAX)throw Error('Limit of eight session checkpoints');const id=token();points.push({id,name:label.trim(),identity:s.identity,voice:s.voice,draft:host.draft(),at:new Date(now()).toISOString()});return id;},
   checkpoints(){const s=host.capture();points=points.filter(p=>p.identity===s.identity);return points.map(({id,name,at,draft})=>({id,name,at,duration:duration(draft)}));},
   removeCheckpoint(id){points=points.filter(p=>p.id!==id);},
   restorePreview(id){pending=null;const s=current(),p=points.find(x=>x.id===id);if(!p||p.voice!==s.voice)throw Error('Checkpoint source or voiceover changed');
    const draft=validateDraft({...copy({...p.draft,cursorTrace:null}),cursorTrace:p.draft.cursorTrace}),before=host.draft();
    if(before.hasVoice&&!same(before.segments,draft.segments))throw Error('Cannot restore different timing with voiceover');
    return ticket(s,{draft,changes:[{restore:p.name,graphics:draft.layers.length,cameraEvents:draft.zoomFrames.length,cursorRegions:draft.cursorRegions.length}],beforeDuration:duration(before),afterDuration:duration(draft),applied:1,warnings:['Restores visual edit decisions only, not source files or audio.']});},
   history:()=>copy(log)
  });
 }
 const example=()=>({schema:SCHEMA,name:'Tutorial intro',variables:{title:'Step 1 — Getting Started',zoom:1.75},functions:{intro:[{command:'clip.graphics.add',as:'title',args:{kind:'text',text:{var:'title'},start:0,duration:3,preset:'title'}},{command:'clip.graphics.opacity',args:{id:{ref:'title.id'},value:.9}}]},steps:[{call:'intro'},{if:{test:'hasCursorPath'},then:[{command:'clip.cursor.effects.add',args:{start:0,end:3,style:{spotlight:true,ring:true}}}],else:[{command:'clip.camera.zoomRange',args:{start:1,scale:{var:'zoom'},x:.5,y:.5,transition:.4,hold:1.2}}]}]});
 const api=Object.freeze({SCHEMA,LIMIT,MAX,TTL,syntax,validateDraft,plan,controller,equal,example});root.MangoSequenceEngineV076=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
