/* Local bridge policy: external requests can prepare work, never approve it. */
(function(root){'use strict';
 const TTL=1800000,REVIEW=300000,FRAME=60000,MAX=16;
 const id=()=>root.crypto?.randomUUID?.()||Array.from(root.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const clone=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const shape=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
 const identifier=x=>typeof x==='string'&&/^[a-f0-9-]{16,64}$/.test(x);
 const safe=(s,n=240)=>String(s).slice(0,n);
 function create(host,options={}){
  const now=options.now||Date.now,makeId=options.id||id;
  let session=null,pending=null,results=[],audit=[];
  const log=(event,kind)=>{audit.unshift({at:new Date(now()).toISOString(),event,kind});audit=audit.slice(0,60);};
  function cancel(reason='rejected'){
   if(!pending)return;results.push({id:pending.id,status:reason,kind:pending.kind,expires:now()+REVIEW});
   host.cancel();pending=null;log(reason,'review');
  }
  function disconnect(){
   host.cancel();session=null;pending=null;results=[];audit=[];host.changed?.();
  }
  function active(){
   if(!session)return false;
   if(now()>=session.expires||host.identity()!==session.identity){disconnect();return false;}
   if(pending&&now()>=pending.expires){cancel('expired');host.changed?.();}
   results=results.filter(x=>x.expires>now()).slice(-MAX);
   return true;
  }
  function start(scopes,expires=TTL){
   const identity=host.identity(),state=host.capture();
   if(!state.ready||!identity||!Array.isArray(scopes)||!scopes.length||new Set(scopes).size!==scopes.length||scopes.some(s=>!['inspect','propose','frame'].includes(s)))throw Error('Load and pause a video, then select access scopes');
   disconnect();session={identity,scopes:[...scopes],expires:now()+Math.min(TTL,expires)};log('paired','session');
  }
  function assertScope(scope){if(!active())throw Error('Pairing expired or source changed');if(scope&&!session.scopes.includes(scope))throw Error('Scope not granted');}
  function ready(){const s=host.capture();if(!s.ready)throw Error('Pause editing/playback/export before review');return s;}
  function same(a,b){return a&&b&&a.identity===b.identity&&a.trace===b.trace&&a.voice===b.voice&&a.stamp===b.stamp;}
  function newRequest(kind,data,state){
   if(pending)throw Error('One review is already pending. Approve or reject it in MangoShot.');
   pending={id:makeId(),kind,data,state,expires:now()+REVIEW,frame:null};log('requested',kind);host.changed?.();
   return {requestId:pending.id,status:'pending',kind};
  }
  function receive(method,args){
   assertScope(null);
   if(method==='catalog'){
    if(!shape(args,[]))throw Error('Unexpected arguments');
    return {schema:'mangoshot.sequence.recipe.v1',maxCommands:40,commands:host.catalog(),grammar:{variables:'scalar values',functions:'named step blocks',references:['var','ref'],conditions:['hasCursorPath','hasGraphics','minDuration']}};
   }
   if(method==='inspect'){
    assertScope('inspect');if(!shape(args,[]))throw Error('Unexpected arguments');ready();
    return host.inspect();
   }
   if(method==='propose'){
    assertScope('propose');if(!shape(args,['recipe'])||!args.recipe||typeof args.recipe!=='object'||Array.isArray(args.recipe)||JSON.stringify(args.recipe).length>32768)throw Error('Invalid recipe');
    if(pending)throw Error('One review is already pending');
    const state=ready(),review=host.preview(args.recipe);
    return newRequest('sequence',{recipe:clone(args.recipe),review},state);
   }
   if(method==='frame'){
    assertScope('frame');if(!shape(args,['time'])||typeof args.time!=='number'||!Number.isFinite(args.time)||args.time<0||args.time>=host.duration())throw Error('Invalid sequence frame time');
    return newRequest('frame',{time:args.time},ready());
   }
   if(method==='status'){
    if(!shape(args,['requestId'])||!identifier(args.requestId))throw Error('Invalid request ID');
    if(pending?.id===args.requestId)return {requestId:pending.id,status:'pending',kind:pending.kind};
    const r=results.find(x=>x.id===args.requestId);if(!r)return {requestId:args.requestId,status:'unknown_or_expired'};
    const out={requestId:r.id,status:r.status,kind:r.kind};if(r.image){out.image=r.image;delete r.image;r.status='delivered';r.expires=now()+REVIEW;log('delivered','frame');}
    return out;
   }
   throw Error('Unsupported bridge method');
  }
  function current(kind){
   assertScope(kind==='frame'?'frame':'propose');if(!pending||pending.kind!==kind)throw Error('No matching pending review');
   if(!same(pending.state,ready())){cancel('stale');host.changed?.();throw Error('Editor changed; ask the client for a new request');}
   return pending;
  }
  function frameRequest(){const p=current('frame');return {id:p.id,time:p.data.time,state:p.state};}
  function stageFrame(requestId,image){
   const p=current('frame');if(p.frame)throw Error('Frame already staged');if(p.id!==requestId||!shape(image,['mimeType','data'])||image.mimeType!=='image/jpeg'||typeof image.data!=='string'||image.data.length>300000||!/^[A-Za-z0-9+/=]+$/.test(image.data))throw Error('Invalid review frame');
   p.frame=clone(image);host.changed?.();
  }
  function approve(){
   assertScope(null);if(!pending)throw Error('No pending review');
   const p=current(pending.kind);
   if(p.kind==='frame'&&!p.frame)throw Error('Render and inspect the frame first');
   try{
    if(p.kind==='sequence')host.apply(p.data.review.ticket);
    const result={id:p.id,kind:p.kind,status:p.kind==='frame'?'approved':'applied',expires:now()+(p.kind==='frame'?FRAME:REVIEW)};
    if(p.kind==='frame')result.image=p.frame;
    results.push(result);pending=null;log(result.status,p.kind);host.changed?.();return result.status;
   }catch(e){cancel('failed');host.changed?.();throw e;}
  }
  function reject(){if(active()){cancel();host.changed?.();}}
  function state(){
   active();return {connected:!!session,scopes:session?[...session.scopes]:[],expires:session?.expires||null,
    pending:pending?{id:pending.id,kind:pending.kind,data:clone(pending.kind==='sequence'?{recipe:pending.data.recipe,changes:pending.data.review.changes,warnings:pending.data.review.warnings,beforeDuration:pending.data.review.beforeDuration,afterDuration:pending.data.review.afterDuration}:pending.data),frameReady:!!pending.frame,expires:pending.expires}:null,audit:clone(audit)};
  }
  return Object.freeze({start,disconnect,active,receive,frameRequest,stageFrame,approve,reject,state});
 }
 const api=Object.freeze({create,TTL,REVIEW,FRAME,MAX,identifier,safe});
 root.MangoBridgeCoreV077=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
