/* Browser-native connection and human approval surface. No content-script relay. */
(function(root){'use strict';
 const doc=root.document,view=root.MangoClipView,C=root.MangoBridgeCoreV077,S=root.MangoSequenceEngineV076;
 const panel=doc.querySelector('.bridge-v077'),dialog=doc.getElementById('automation-dialog-v075');
 if(!panel||!view||!C||!S)return;
 const api=root.browser||root.chrome,el=k=>doc.getElementById('br-'+k+'-v077'),menu=doc.getElementById('bridge-open-v077'),indicator=doc.getElementById('bridge-indicator-v077');
 const hostName='com.rawpowered.mangoshot.bridge',permission={permissions:['nativeMessaging']},scopeKeys=['inspect','propose','frame'];
 const seq=S.controller({capture:()=>view.automationCapture(),draft:()=>view.sequenceDraft(),commit:(d,s)=>view.commitSequenceAutomation(d,s)});
 let port=null,endpoint=null,connecting=false,generation=0,pairTimer=null,decoder=null,lastRequest=null,rendering=false,connectionIdentity=null;
 const note=t=>{el('status').textContent=C.safe(t,350);},json=x=>JSON.stringify(x,null,2);
 function inspect(){
  const s=view.automationInspect();
  return {studio:'clip',sourceDuration:s.sourceDuration,sequenceDuration:s.sequenceDuration,segments:s.segments,graphics:s.graphics.map(l=>({id:l.id,kind:l.kind,start:l.start,end:l.end,opacity:l.opacity,locked:l.locked})),cameraEvents:s.cameraEvents,cursorPath:s.cursorPath,cursorRegions:s.cursorRegions};
 }
 const bridge=C.create({identity:()=>view.original(),capture:()=>view.automationCapture(),duration:()=>view.outputDuration(),catalog:()=>root.MangoAutomationCoreV075.catalog('clip'),inspect,preview:r=>seq.preview(r),apply:t=>seq.apply(t),cancel:()=>seq.cancel(),changed:render});
 function stopDecoder(){if(decoder){const d=decoder;decoder=null;d.cancel?.();d.video.pause();d.video.removeAttribute('src');d.video.load();URL.revokeObjectURL(d.url);}rendering=false;}
 function clearImage(){el('image').removeAttribute('src');el('image').hidden=true;}
 function disconnect(reason='Disconnected'){
  generation++;clearTimeout(pairTimer);pairTimer=null;connecting=false;endpoint=null;connectionIdentity=null;stopDecoder();clearImage();
  const p=port;port=null;bridge.disconnect();if(p){try{p.postMessage({type:'stop'});}catch{}try{p.disconnect();}catch{}}
  el('config').value='';el('config-details').open=false;note(reason);render();
 }
 function render(){
  const s=bridge.state(),p=s.pending,linked=s.connected&&!!endpoint;
  el('state').textContent=connecting?'Connecting…':linked?'Paired · local':'Disconnected';
  menu.textContent='Intelligence Bridge · '+(p?'Review pending':linked?'Paired':connecting?'Connecting':'Off');
  indicator.textContent=p?'LOCAL · REVIEW PENDING':linked?'LOCAL · BRIDGE ON':'LOCAL · NO CLOUD';
  for(const k of scopeKeys)el(k).disabled=connecting||linked;
  el('connect').disabled=connecting||linked||!view.original();
  el('disconnect').disabled=!connecting&&!port;
  el('config-details').hidden=!linked;
  if(!linked)el('config').value='';
  el('expiry').textContent=linked?'Session ends '+new Date(s.expires).toLocaleTimeString()+' · current video only.':'';
  el('audit').textContent=s.audit.map(a=>a.at+' · '+a.kind+' · '+a.event).join('\n')||'No activity';
  if(p?.id!==lastRequest){stopDecoder();clearImage();lastRequest=p?.id||null;}
  el('review-kind').textContent=p?(p.kind==='sequence'?'Sequence proposal · '+p.id:'Frame request · '+p.data.time.toFixed(3)+'s'):'No pending requests';
  el('review').textContent=p?(p.kind==='sequence'?json({recipe:p.data.recipe,changes:p.data.changes,beforeDuration:p.data.beforeDuration,afterDuration:p.data.afterDuration,warnings:p.data.warnings}):'Requested sequence time: '+p.data.time.toFixed(3)+' seconds. Render a frame locally and inspect it before sharing.'): 'No edits or frames are shared automatically.';
  el('frame-panel').hidden=p?.kind!=='frame';
  el('render').disabled=!p||p.kind!=='frame'||rendering;
  el('approve').disabled=!p||(p.kind==='frame'&&!p.frameReady)||rendering;
  el('approve').textContent=p?.kind==='frame'?'Share reviewed frame':'Apply reviewed sequence';
  el('reject').disabled=!p;
 }
 function browserPermission(method){
  if(root.browser)return root.browser.permissions[method](permission);
  return new Promise((resolve,reject)=>{api.permissions[method](permission,value=>{const e=api.runtime.lastError;if(e)reject(Error(e.message));else resolve(value);});});
 }
 function post(p,message){if(p!==port)return;try{p.postMessage(message);}catch{disconnect('Local companion disconnected');}}
 function onMessage(p,message){
  if(p!==port)return;
  if(message?.type==='ready'&&connecting&&!endpoint){
   if(!Number.isInteger(message.port)||message.port<1||message.port>65535||typeof message.token!=='string'||!/^[a-f0-9]{64}$/.test(message.token)||message.expiresIn!==1800||view.original()!==connectionIdentity){disconnect('Invalid or stale pairing');return;}
   try{const scopes=scopeKeys.filter(k=>el(k).checked);bridge.start(scopes,message.expiresIn*1000);endpoint={port:message.port,token:message.token};
    clearTimeout(pairTimer);connecting=false;
    el('config').value=json({mcpServers:{mangoshot:{command:'C:\\path\\to\\MangoShotBridge.exe',args:['--mcp'],env:{MANGOSHOT_BRIDGE_PORT:String(endpoint.port),MANGOSHOT_BRIDGE_TOKEN:endpoint.token}}}});
    note('Paired. Reveal configuration for your trusted local MCP client.');render();
   }catch(e){disconnect(e.message);}return;
  }
  if(message?.type!=='request'||!C.identifier(message.id))return;
  if(!endpoint||!bridge.active()){disconnect('Session ended');return;}
  try{const result=bridge.receive(message.method,message.args);post(p,{type:'response',id:message.id,ok:true,result});}
  catch(e){post(p,{type:'response',id:message.id,ok:false,error:C.safe(e.message)});}
  render();
 }
 async function connect(event){
  if(!event.isTrusted||connecting||port)return;
  const scopes=scopeKeys.filter(k=>el(k).checked),state=view.automationCapture();
  if(!state.ready||!scopes.length){note('Load and pause a video, then select at least one permission.');return;}
  if(!api?.permissions?.request||!api?.runtime){note('Native messaging is unavailable in this browser.');return;}
  connecting=true;connectionIdentity=view.original();const run=++generation;render();
  try{
   const allowed=await browserPermission('request');if(run!==generation)return;
   if(!allowed){disconnect('Browser permission was declined');return;}
   if(view.original()!==connectionIdentity||!view.automationCapture().ready)throw Error('Source or playback changed during pairing');
   const p=api.runtime.connectNative(hostName);port=p;
   p.onMessage.addListener(m=>onMessage(p,m));
   p.onDisconnect.addListener(()=>{if(p!==port)return;const error=api.runtime.lastError?.message;disconnect(error?'Companion unavailable: '+error:'Companion disconnected');});
   pairTimer=setTimeout(()=>{if(p===port&&connecting)disconnect('Companion pairing timed out. Check installation and extension ID.');},25000);
   p.postMessage({type:'start',scopes});note('Starting local companion…');
  }catch(e){if(run===generation)disconnect('Pairing failed: '+e.message);}
 }
 function wait(video,event,begin){return new Promise((resolve,reject)=>{
  let done=false;const finish=e=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',bad);e?reject(e):resolve();};
  const ok=()=>finish(),bad=()=>finish(Error('Frame decode failed')),timer=setTimeout(()=>finish(Error('Frame decode timed out')),10000);
  video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});if(decoder)decoder.cancel=()=>finish(Error('Frame canceled'));try{begin();}catch(e){finish(e);}
 });}
 async function renderFrame(event){
  if(!event.isTrusted||rendering||!dialog.open||panel.hidden)return;
  let request,run=generation;
  try{
   request=bridge.frameRequest();clearImage();rendering=true;render();el('frame-note').textContent='Decoding locally…';
   const s=view.sequenceDraft(),source=root.MangoEditOps.toSource(s.segments,request.time);
   if(source===null)throw Error('Frame time unavailable');
   const v=doc.createElement('video'),url=URL.createObjectURL(view.original());decoder={video:v,url,cancel:null};v.muted=true;v.preload='auto';v.playsInline=true;
   await wait(v,'loadeddata',()=>{v.src=url;v.load();});
   const current=()=>run===generation&&decoder?.video===v&&bridge.state().pending?.id===request.id;
   if(!current())return;
   const target=Number.isFinite(v.duration)?Math.min(Math.max(0,source),Math.max(0,v.duration-.005)):source;
   if(Math.abs(v.currentTime-target)>.0001)await wait(v,'seeked',()=>{v.currentTime=target;});
   if(!current())return;
   const fresh=bridge.frameRequest();if(fresh.id!==request.id)throw Error('Frame request changed');
   const canvas=doc.createElement('canvas'),factor=Math.min(1,640/Math.max(1,v.videoWidth),360/Math.max(1,v.videoHeight));
   canvas.width=Math.max(1,Math.round(v.videoWidth*factor));canvas.height=Math.max(1,Math.round(v.videoHeight*factor));
   const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');
   if(!root.MangoMotion.paintTransition(ctx,v,s.zoomFrames,s.segments,s.transitions,request.time,w,h)){const z=root.MangoCreativeZoom.draw(ctx,v,s.zoomFrames,request.time,w,h);root.MangoCursorDirectorCoreV074.paint(ctx,s.cursorTrace,s.cursorRegions,s.segments,request.time,z,w,h);}
   root.MangoGraphics.render(ctx,s.layers,request.time,w,h);
   const data=canvas.toDataURL('image/jpeg',.78),prefix='data:image/jpeg;base64,';
   if(!data.startsWith(prefix)||data.length-prefix.length>300000)throw Error('Rendered frame exceeds sharing limit');
   el('image').src=data;await el('image').decode();if(!current())return;
   bridge.stageFrame(request.id,{mimeType:'image/jpeg',data:data.slice(prefix.length)});
   el('image').hidden=false;el('frame-note').textContent='Exact '+w+' × '+h+' JPEG. Inspect it before selecting Share reviewed frame.';
  }catch(e){if(run===generation){clearImage();el('frame-note').textContent='Frame not shared: '+C.safe(e.message);}}
  finally{if(run===generation){stopDecoder();render();}}
 }
 menu.addEventListener('click',()=>{root.MangoAutomationV075.open();if(dialog.open)dialog.querySelector('[data-au-tab="access"]').click();render();});
 el('connect').addEventListener('click',connect);
 el('disconnect').addEventListener('click',e=>{if(e.isTrusted)disconnect('Session revoked. Re-pair to connect again.');});
 el('revoke').addEventListener('click',async e=>{if(!e.isTrusted)return;disconnect('Session revoked');try{await browserPermission('remove');note('Native messaging permission removal requested.');}catch(err){note('Permission removal failed: '+err.message);}});
 el('select-config').addEventListener('click',()=>{el('config').focus();el('config').select();});
 el('render').addEventListener('click',renderFrame);
 el('approve').addEventListener('click',e=>{if(!e.isTrusted||!dialog.open||panel.hidden)return;try{const s=bridge.approve();note(s==='applied'?'Sequence applied · undo in editor':'Frame approved · available to paired client for 60 seconds');}catch(err){note(err.message);}render();});
 el('reject').addEventListener('click',e=>{if(e.isTrusted){bridge.reject();note('Request rejected');render();}});
 api?.permissions?.onRemoved?.addListener(p=>{if(p.permissions?.includes('nativeMessaging'))disconnect('Browser permission revoked');});
 dialog.querySelector('[data-au-tab="access"]').addEventListener('click',render);
 dialog.addEventListener('close',()=>{if(rendering){stopDecoder();clearImage();render();}});
 root.addEventListener('pagehide',()=>disconnect('Page closed'));
 setInterval(()=>{if(endpoint&&!bridge.active())disconnect('Session expired or source changed');else render();},1000);
 root.MangoBridgeV077=Object.freeze({disconnect,inspect:()=>{const s=bridge.state();return {connected:s.connected,pending:s.pending?{id:s.pending.id,kind:s.pending.kind,frameReady:s.pending.frameReady}:null};}});
 render();
})(typeof globalThis!=='undefined'?globalThis:this);
