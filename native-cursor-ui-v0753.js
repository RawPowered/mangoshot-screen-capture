/* Explicit monitor-only native cursor connection. The native host cannot
 * start screen capture. Optional visible overlays and registered hotkeys
 * are scoped to the explicitly approved session. */
(function(root){'use strict';
 const d=root.document,P=root.MangoNativeCursorProtocolV0753,H=root.MangoRecorderCursorHostV073,api=root.chrome??root.browser,el=id=>d.getElementById(id);
 const open=el('native-connect-v0753'),select=el('native-monitor-v0753'),agree=el('native-consent-v0753'),start=el('native-start-v0753'),close=el('native-stop-v0753'),status=el('native-status-v0753');
 const overlay=el('native-overlay-v0754'),shortcuts=el('native-shortcuts-v0754'),hint=el('native-overlay-hint-v0754');
 if(!P||!H||!open||!select||!agree||!start||!close||!status||!overlay||!shortcuts||!hint)return;
 let port=null,phase='idle',monitors=[],chosen=null,session=null,last={seq:0,elapsed_ms:0},claimed=false,heartbeatAt=0,receivedAt=0,watch=null,ticket=0,captureIdentity=null,clockOffset=null,caps={overlay:false,shortcuts:false},requested={},effectSignature='';
 const now=()=>root.performance.now(),say=s=>status.textContent=s;
 const active=()=>H.active()&&H.surface()==='monitor';
 function paint(){open.disabled=!!port;select.disabled=phase!=='ready';agree.disabled=phase!=='ready';start.disabled=phase!=='ready'||!agree.checked||!select.value;close.disabled=!port;overlay.disabled=phase!=='ready'||!caps.overlay||H.cleanMaster?.();shortcuts.disabled=phase!=='ready'||!caps.shortcuts;hint.textContent=H.cleanMaster?.()?'Clean master: desktop overlays blocked; preview effects and authorized hotkeys remain available.':phase==='active'&&requested.desktop_overlay?'Desktop effects enabled for this composite. The capture may contain baked effects.':'Experimental composite-only overlay. Capture inclusion is browser-dependent; not certified.';}
 function stop(message='Native tracking stopped. Preview tracking remains available.'){
  const old=port,id=session,wasClaimed=claimed;port=null;phase='idle';session=null;claimed=false;chosen=null;monitors=[];captureIdentity=null;ticket++;clearInterval(watch);watch=null;
  if(old){try{if(id)old.postMessage({type:'stop',session:id});}catch{}try{old.disconnect();}catch{}}
  if(wasClaimed)root.MangoRecorderCursorV073?.releaseNative?.();
  select.replaceChildren();agree.checked=false;overlay.checked=false;shortcuts.checked=false;caps={overlay:false,shortcuts:false};requested={};effectSignature='';paint();say(message);
 }
 function post(m){if(!port)throw Error('Native host disconnected');port.postMessage(m);}
 function checkSession(){return active()&&captureIdentity===H.automationCapture().identity;}
 function beat(){const n=now();if(n-heartbeatAt>=2000){post({type:'heartbeat',session});heartbeatAt=n;}}
 function syncEffects(){if(phase!=='active'||!requested.desktop_overlay)return;const s=root.MangoRecorderCursorV073?.state?.();if(!s)throw Error('Cursor settings unavailable');const style=P.effects({...s.settings,spotlight:s.effectiveSpotlight});const sig=JSON.stringify(style);if(sig!==effectSignature){post({type:'effects',session,style});effectSignature=sig;}}
 function message(m,p){if(port!==p)return;try{
  if(!checkSession())return stop('Recording source changed or paused. Reconnect after selecting the monitor.');
  if(m?.type==='error')return stop('Native host stopped: '+(typeof m.code==='string'?m.code.slice(0,80):'unknown error'));
  if(m?.type==='ended')return stop('Native tracking ended: '+(typeof m.reason==='string'?m.reason.slice(0,80):'session closed'));
  if(phase==='connecting'){monitors=P.hello(m);caps=P.capabilities(m);phase='ready';select.replaceChildren();for(const item of monitors){const o=d.createElement('option');o.value=item.id;o.textContent=item.id+' · '+item.width+' × '+item.height+' · ('+item.left+', '+item.top+')';select.append(o);}agree.checked=false;paint();say('Host ready. Choose the exact monitor selected in the browser share picker, then confirm. No pointer sampling yet.');return;}
  if(phase==='starting'){if(m?.type!=='started'||m.session!==session||!P.same(P.monitor(m.monitor),chosen)||!P.matches(chosen,H.captureSize()))throw Error('Selected monitor changed or does not match the capture dimensions.');if(!!m.desktop_overlay!==!!requested.desktop_overlay||!!m.shortcuts!==!!requested.shortcuts)throw Error('Native host did not confirm the requested features.');if(!root.MangoRecorderCursorV073?.claimNative?.(!!requested.desktop_overlay))throw Error('Recorder could not accept native telemetry.');claimed=true;phase='active';last={seq:0,elapsed_ms:0};clockOffset=null;heartbeatAt=receivedAt=now();paint();say(requested.desktop_overlay?'Native desktop FX ACTIVE · composite only · selected monitor':'Native cursor ACTIVE · selected monitor only · preview effects and telemetry');syncEffects();return;}
  if(phase!=='active')throw Error('Unexpected native host message');if(m?.type==='hotkey'){const action=P.hotkey(m,session,!!requested.shortcuts);if(!root.MangoRecorderCursorV073?.nativeToggleEffect?.(action))throw Error('Native shortcut not accepted');syncEffects();return;}const s=P.sample(m,session,last),received=now();if(clockOffset===null)clockOffset=received-s.elapsed_ms;if(Math.abs(received-s.elapsed_ms-clockOffset)>2000)throw Error('Native sample delivery lost synchronization. Reconnect tracking.');last=s;receivedAt=received;root.MangoRecorderCursorV073?.nativeSample?.(s.point,s.click);syncEffects();beat();
 }catch(e){stop(e.message);}}
 open.addEventListener('click',()=>{if(!active())return say('Begin an entire-screen recording first. Window and tab capture are not supported by this companion.');if(!api?.runtime?.connectNative)return say('Native messaging is unavailable in this browser.');if(port)return;
  try{captureIdentity=H.automationCapture().identity;const p=api.runtime.connectNative(P.HOST);port=p;phase='connecting';const t=++ticket;p.onMessage.addListener(m=>message(m,p));p.onDisconnect.addListener(()=>{const e=api.runtime.lastError?.message;if(port===p)stop(e?'Native host unavailable: '+e.slice(0,180):'Native host disconnected.');});paint();say('Connecting to installed Windows companion…');post({type:'hello',protocol:P.VERSION});root.setTimeout(()=>{if(ticket===t&&phase==='connecting')stop('Native host handshake timed out.');},8000);
  }catch(e){stop('Native host unavailable: '+e.message);}
 });
 agree.addEventListener('change',paint);select.addEventListener('change',()=>{agree.checked=false;paint();});
 start.addEventListener('click',()=>{if(phase!=='ready'||!checkSession()||!agree.checked)return;try{chosen=monitors.find(m=>m.id===select.value);if(!chosen||!P.matches(chosen,H.captureSize()))throw Error('Monitor aspect ratio does not match the selected capture. Check the exact monitor.');requested=P.options(caps,overlay.checked,shortcuts.checked,!!H.cleanMaster?.());session=root.crypto.randomUUID();phase='starting';paint();say('Approve the Windows consent dialog for this monitor.');const t=ticket;post({type:'start',protocol:P.VERSION,session,monitor_id:chosen.id,...requested});root.setTimeout(()=>{if(ticket===t&&phase==='starting')stop('Native consent timed out. Connect again when ready.');},45000);
   watch=root.setInterval(()=>{if(!port)return;if(!checkSession())return stop('Recording paused or source changed.');if(phase==='active'){try{if(now()-receivedAt>5000)return stop('Native pointer feed timed out.');beat();}catch(e){stop(e.message);}}},1000);
  }catch(e){stop(e.message);}
 });
 close.addEventListener('click',()=>stop());root.addEventListener('pagehide',()=>stop(),{once:true});paint();
 root.MangoNativeCursorV0753=Object.freeze({stop,active:()=>phase==='active',desktopOverlay:()=>phase==='active'&&!!requested.desktop_overlay});
})(globalThis);
