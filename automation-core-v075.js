/* MangoShot Automation Studio: strict declarative recipes, local review tickets.
 * No eval, dynamic imports, network, browser permission changes or native bridge. */
(function(root){'use strict';
 const SCHEMA='mangoshot.automation.recipe.v1',LIMIT=16384,TTL=300000;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x));
 const numeric=(min,max)=>({type:'number',min,max}),enumeration=(...values)=>({type:'enum',values}),bool={type:'boolean'},str=(max,min=1)=>({type:'string',min,max}),object=fields=>({type:'object',fields});
 const optional=(type,value)=>({...type,optional:true,default:value});
 const cursorStyle={spotlight:optional(bool,true),ring:optional(bool,false),pulse:optional(bool,false),marker:optional(enumeration('none','dot','arrow'),'none'),radius:optional(numeric(3,25),9),dim:optional(numeric(0,.85),.55),feather:optional(numeric(0,.9),.35),color:optional({type:'color'},'#d0ff87'),smooth:optional(numeric(0,600),180),markerSize:optional(numeric(.5,3),1)};
 const liveSettings={spotlight:bool,ring:bool,zoomMode:enumeration('off','follow','click'),scale:numeric(1,4),radius:numeric(3,25),dim:numeric(0,.85),feather:numeric(0,.9),smooth:numeric(60,1200),hold:numeric(.3,8),color:{type:'color'}};
 for(const k of Object.keys(liveSettings))liveSettings[k]={...liveSettings[k],optional:true};
 const start=numeric(0,86400),layerId={type:'id'},opac=numeric(0,1);
 const defs=[];
 function command(studio,id,title,description,fields,example){defs.push({studio,id,title,description,fields,example});}
 command('image','image.layer.opacity','Set layer opacity','Set opacity of the currently selected editable annotation.',{value:opac},{value:.7});
 command('image','image.layer.translate','Move selected layer','Translate the selected annotation in source image pixels.',{dx:numeric(-16000,16000),dy:numeric(-16000,16000)},{dx:24,dy:12});
 command('image','image.layer.style','Apply layer style','Apply an existing appearance preset to the selected layer.',{preset:enumeration('none','shadow','glow','floating','crisp')},{preset:'shadow'});
 command('image','image.layer.duplicate','Duplicate selected layer','Duplicate the selected layer using the existing layer operation.',{},{});
 command('image','image.layer.visibility','Set layer visibility','Show or hide an ordinary selected annotation.',{visible:bool},{visible:false});
 command('image','image.layer.lock','Set layer lock','Lock or unlock an ordinary selected annotation.',{locked:bool},{locked:true});
 command('clip','clip.graphics.add','Add title or callout','Create one editable graphic with exact sequence timing.',{kind:enumeration('text','callout'),text:str(1000),start,duration:numeric(.1,86400),preset:optional(enumeration('none','title','lowerThird','callout','glass','step','warning','minimal','outline','editorial','kinetic','techNote','softBadge','quoteCard','pointerPop','premium','checklist'),'title')},{kind:'text',text:'Step 1',start:0,duration:3,preset:'title'});
 command('clip','clip.graphics.opacity','Set graphic opacity','Set opacity of a graphic identified in the current context.',{id:layerId,value:opac},{id:'replace-with-graphic-id',value:.8});
 command('clip','clip.timeline.rippleDelete','Ripple delete range','Remove an edited sequence range, leaving the original file intact.',{start,end:start},{start:2,end:3});
 command('clip','clip.camera.zoomRange','Add camera zoom range','Add a non-overlapping zoom-in, hold and return.',{start,scale:numeric(1.1,4),x:numeric(0,1),y:numeric(0,1),transition:optional(numeric(.1,2),.4),hold:optional(numeric(.3,8),1.2)},{start:1,scale:2,x:.5,y:.5,transition:.4,hold:1.2});
 command('clip','clip.cursor.effects.add','Add cursor effect region','Attach a style to retained source footage in the sequence range.',{start,end:start,style:optional(object(cursorStyle),{})},{start:0,end:4,style:{spotlight:true,ring:true,pulse:true}});
 command('clip','clip.cursor.effects.update','Update cursor region','Change an existing region style or source interval.',{id:layerId,style:{...object(cursorStyle),optional:true},enabled:{...bool,optional:true},start:{...start,optional:true},end:{...start,optional:true}},{id:'replace-with-region-id',enabled:false});
 command('clip','clip.cursor.effects.remove','Remove cursor region','Remove an identified cursor effect region.',{id:layerId},{id:'replace-with-region-id'});
 command('clip','clip.cursor.smartZoom','Generate Smart Zoom edits','Preview an entire bounded batch of click/dwell-based camera ranges.',{mode:optional(enumeration('auto','clicks','dwell'),'auto'),scale:optional(numeric(1.1,4),1.75),transition:optional(numeric(.1,2),.4),hold:optional(numeric(.3,8),1.2),limit:optional({...numeric(1,40),integer:true},8)},{mode:'auto',scale:2,transition:.4,hold:1.2,limit:8});
 command('recorder','recorder.cursor.configure','Configure cursor effects','Configure live tutorial effects; never starts capture or grants tracking consent.',{preset:optional(enumeration('off','spotlight','ring','tutorial','follow','detail'),'tutorial'),settings:optional(object(liveSettings),{})},{preset:'tutorial',settings:{scale:2,radius:10,smooth:300}});
 function fail(path,message){throw Error(path+': '+message);}
 function validateValue(v,s,path){
  if(s.type==='object')return validateFields(v,s.fields,path);
  if(s.type==='number'){if(typeof v!=='number'||!Number.isFinite(v)||v<s.min||v>s.max||s.integer&&!Number.isInteger(v))fail(path,'expected '+s.min+'–'+s.max+(s.integer?' integer':''));return v;}
  if(s.type==='boolean'){if(typeof v!=='boolean')fail(path,'expected boolean');return v;}
  if(s.type==='enum'){if(!s.values.includes(v))fail(path,'choose '+s.values.join(', '));return v;}
  if(s.type==='color'){if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v))fail(path,'expected #RRGGBB');return v;}
  if(s.type==='id'){if(typeof v!=='string'||!/^[\w-]{1,90}$/.test(v))fail(path,'invalid local ID');return v;}
  if(s.type==='string'){if(typeof v!=='string'||v.length<s.min||v.length>s.max||!v.trim())fail(path,'expected nonempty text up to '+s.max+' characters');return v;}
  fail(path,'unsupported field');
 }
 function validateFields(raw,fields,path){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail(path,'expected object');
  for(const k of Object.keys(raw))if(!own(fields,k))fail(path+'.'+k,'unknown field');
  const out={};
  for(const [k,s] of Object.entries(fields)){
   if(!own(raw,k)){if(!s.optional)fail(path+'.'+k,'required');if(own(s,'default'))out[k]=validateValue(copy(s.default),s,path+'.'+k);continue;}
   out[k]=validateValue(raw[k],s,path+'.'+k);
  }return out;
 }
 function parse(raw){
  if(typeof raw==='string'){if(raw.length>LIMIT)throw Error('Recipe exceeds 16 KiB character limit');raw=JSON.parse(raw);}
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['schema','command','args'].includes(k))||raw.schema!==SCHEMA)throw Error('Expected '+SCHEMA+' with command and args');
  const d=defs.find(x=>x.id===raw.command);if(!d)throw Error('Unknown automation command');
  const args=validateFields(raw.args,d.fields,'args');const result={schema:SCHEMA,command:d.id,args};
  if(JSON.stringify(result).length>LIMIT)throw Error('Recipe too large');return result;
 }
 const catalog=studio=>copy(defs.filter(d=>!studio||d.studio===studio));
 const template=id=>{const d=defs.find(x=>x.id===id);if(!d)throw Error('Unknown command');return {schema:SCHEMA,command:d.id,args:copy(d.example)};};
 const stampId=()=>root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
 function createEngine(studio,adapter,options={}){
  if(!['image','clip','recorder'].includes(studio)||!adapter||typeof adapter.capture!=='function'||typeof adapter.plan!=='function')throw Error('Invalid studio adapter');
  const now=options.now||Date.now;let pending=null;const log=[];
  function record(status,command,message){log.unshift({at:new Date(now()).toISOString(),status,command:command||'unknown',message});if(log.length>100)log.pop();}
  const equal=(a,b)=>a&&b&&a.identity===b.identity&&a.stamp===b.stamp&&a.trace===b.trace;
  function preview(raw){
   pending=null;let recipe;
   try{
    recipe=parse(raw);const d=defs.find(x=>x.id===recipe.command);if(d.studio!==studio)throw Error('This recipe belongs to '+d.studio+' studio');
    const state=adapter.capture();if(!state.ready)throw Error(state.reason||'Studio is not ready');
    const plan=adapter.plan(recipe.command,copy(recipe.args),state);
    if(!plan||typeof plan.execute!=='function'||!Array.isArray(plan.changes)||!plan.changes.length)throw Error('No applicable changes');
    if(!equal(state,adapter.capture()))throw Error('Editor changed during validation; preview again');
    const ticket=stampId(),expires=now()+TTL;pending={ticket,expires,state,recipe,plan};
    record('previewed',recipe.command,'Validated; awaiting explicit application');
    return {ticket,expires,recipe:copy(recipe),summary:String(plan.summary),changes:copy(plan.changes),warnings:copy(plan.warnings||[])};
   }catch(e){record('rejected',recipe?.command,'Validation rejected');throw e;}
  }
  function apply(ticket){
   if(!pending||pending.ticket!==ticket)throw Error('No current review ticket');
   const p=pending;pending=null;
   try{if(now()>p.expires)throw Error('Review expired; preview again');
    const state=adapter.capture();if(!state.ready||!equal(p.state,state))throw Error('Studio changed; preview again');
    const result=p.plan.execute();if(result===false)throw Error('Editor rejected the command or no change was made');
    if(result&&typeof result.then==='function')throw Error('Async command not supported by this transaction boundary');
    record('applied',p.recipe.command,'Editor operation completed');return {command:p.recipe.command,summary:p.plan.summary};
   }catch(e){record('rejected',p.recipe.command,'Application rejected');throw e;}
  }
  return Object.freeze({studio,catalog:()=>catalog(studio),inspect:()=>copy(adapter.inspect()),preview,apply,cancel:()=>{pending=null;},history:()=>copy(log),clearHistory:()=>{log.length=0;}});
 }
 function library(raw){
  if(!Array.isArray(raw)||raw.length>40)throw Error('Recipe library exceeds 40 entries');
  const out=raw.map(r=>{
   if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.trim().length>48||/[\u0000-\u001f]/.test(r.name))throw Error('Invalid recipe name');
   return {name:r.name.trim(),recipe:parse(r.recipe)};
  });
  if(new Set(out.map(x=>x.name)).size!==out.length)throw Error('Duplicate recipe names');return out;
 }
 const api=Object.freeze({SCHEMA,LIMIT,TTL,catalog,template,parse,createEngine,library});
 root.MangoAutomationCoreV075=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
