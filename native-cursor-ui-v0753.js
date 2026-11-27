/* Explicit monitor-only native cursor connection. The native host cannot
 * start screen capture or modify recorder settings, and has no overlay support. */
(function(root){'use strict';
 const d=root.document,P=root.MangoNativeCursorProtocolV0753,H=root.MangoRecorderCursorHostV073,api=root.chrome??root.browser,el=id=>d.getElementById(id);
 const open=el('native-connect-v0753'),select=el('native-monitor-v0753'),agree=el('native-consent-v0753'),start=el('native-start-v0753'),close=el('native-stop-v0753'),status=el('native-status-v0753');
 if(!P||!H||!open||!select||!agree||!start||!close||!status)return;
 let port=null,phase='idle',monitors=[],chosen=null,session=null,last={seq:0,elapsed_ms:0},claimed=false,heartbeatAt=0,receivedAt=0,watch=null,ticket=0,captureIdentity=null,clockOffset=null;
 const now=()=>root.performance.now(),say=s=>status.textContent=s;
 const active=()=>H.active()&&H.surface()==='monitor';
 function paint(){open.disabled=!!port;select.disabled=phase!=='ready';agree.disabled=phase!=='ready';start.disabled=phase!=='ready'||!agree.checked||!select.value;close.disabled=!port;}
 function stop(message='Native tracking stopped. Preview tracking remains available.'){
  const old=port,id=session,wasClaimed=claimed;port=null;phase='idle';session=null;claimed=false;chosen=null;monitors=[];captureIdentity=null;ticket++;clearInterval(watch);watch=null;
  if(old){try{if(id)old.postMessage({type:'stop',session:id});}catch{}try{old.disconnect();}catch{}}
  if(wasClaimed)root.MangoRecorderCursorV073?.releaseNative?.();
  select.replaceChildren();agree.checked=false;paint();say(message);
 }
 function post(m){if(!port)throw Error('Native host disconnected');port.postMessage(m);}
 function checkSession(){return active()&&captureIdentity===H.automationCapture().identity;}
 function beat(){const n=now();if(n-heartbeatAt>=2000){post({type:'heartbeat',session});heartbeatAt=n;}}
 function message(m,p){if(port!==p)return;try{
  if(!checkSession())return stop('Recording source changed or paused. Reconnect after selecting the monitor.');
  if(m?.type==='error')return stop('Native host stopped: '+(typeof m.code==='string'?m.code.slice(0,80):'unknown error'));
  if(m?.type==='ended')return stop('Native tracking ended: '+(typeof m.reason==='string'?m.reason.slice(0,80):'session closed'));
  if(phase==='connecting'){monitors=P.hello(m);phase='ready';select.replaceChildren();for(const item of monitors){const o=d.createElement('option');o.value=item.id;o.textContent=item.id+' · '+item.width+' × '+item.height+' · ('+item.left+', '+item.top+')';select.append(o);}agree.checked=false;paint();say('Host ready. Choose the exact monitor selected in the browser share picker, then confirm. No pointer sampling yet.');return;}
  if(phase==='starting'){if(m?.type!=='started'||m.session!==session||!P.same(P.monitor(m.monitor),chosen)||!P.matches(chosen,H.captureSize()))throw Error('Selected monitor changed or does not match the capture dimensions.');if(!root.MangoRecorderCursorV073?.claimNative?.())throw Error('Recorder could not accept native telemetry.');claimed=true;phase='active';last={seq:0,elapsed_ms:0};clockOffset=null;heartbeatAt=receivedAt=now();paint();say('Native cursor ACTIVE · selected monitor only · live preview and editable telemetry.');return;}
  if(phase!=='active')throw Error('Unexpected native host message');const s=P.sample(m,session,last),received=now();if(clockOffset===null)clockOffset=received-s.elapsed_ms;if(Math.abs(received-s.elapsed_ms-clockOffset)>2000)throw Error('Native sample delivery lost synchronization. Reconnect tracking.');last=s;receivedAt=received;root.MangoRecorderCursorV073?.nativeSample?.(s.point,s.click);beat();
 }catch(e){stop(e.message);}}
 open.addEventListener('click',()=>{if(!active())return say('Begin an entire-screen recording first. Window and tab capture are not supported by this companion.');if(!api?.runtime?.connectNative)return say('Native messaging is unavailable in this browser.');if(port)return;
  try{captureIdentity=H.automationCapture().identity;const p=api.runtime.connectNative(P.HOST);port=p;phase='connecting';const t=++ticket;p.onMessage.addListener(m=>message(m,p));p.onDisconnect.addListener(()=>{const e=api.runtime.lastError?.message;if(port===p)stop(e?'Native host unavailable: '+e.slice(0,180):'Native host disconnected.');});paint();say('Connecting to installed Windows companion…');post({type:'hello',protocol:P.VERSION});root.setTimeout(()=>{if(ticket===t&&phase==='connecting')stop('Native host handshake timed out.');},8000);
  }catch(e){stop('Native host unavailable: '+e.message);}
 });
 agree.addEventListener('change',paint);select.addEventListener('change',()=>{agree.checked=false;paint();});
 start.addEventListener('click',()=>{if(phase!=='ready'||!checkSession()||!agree.checked)return;try{chosen=monitors.find(m=>m.id===select.value);if(!chosen||!P.matches(chosen,H.captureSize()))throw Error('Monitor aspect ratio does not match the selected capture. Check the exact monitor.');session=root.crypto.randomUUID();phase='starting';paint();say('Approve the Windows consent dialog for this monitor.');const t=ticket;post({type:'start',protocol:P.VERSION,session,monitor_id:chosen.id});root.setTimeout(()=>{if(ticket===t&&phase==='starting')stop('Native consent timed out. Connect again when ready.');},45000);
   watch=root.setInterval(()=>{if(!port)return;if(!checkSession())return stop('Recording paused or source changed.');if(phase==='active'){try{if(now()-receivedAt>5000)return stop('Native pointer feed timed out.');beat();}catch(e){stop(e.message);}}},1000);
  }catch(e){stop(e.message);}
 });
 close.addEventListener('click',()=>stop());root.addEventListener('pagehide',()=>stop(),{once:true});paint();
 root.MangoNativeCursorV0753=Object.freeze({stop,active:()=>phase==='active'});
})(globalThis);
