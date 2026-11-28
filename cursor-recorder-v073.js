/* Recorder cursor controls. Explicit scope, no passive desktop mouse hooks. */
(function(root){'use strict';
 const core=root.MangoCursorCoreV073,captureCore=root.MangoCursorCaptureV0751,host=root.MangoRecorderCursorHostV073,control=root.MangoRecorderControlV0710,doc=root.document;
 if(!core||!host||!doc)return;
 const el=id=>doc.getElementById(id),panel=el('cursor-studio-v073'),wrap=el('screen-wrap'),ink=el('ink');
 if(!panel||!wrap||!ink)return;
 const api=root.chrome??root.browser,now=()=>performance.now();
 let settings=core.preset('off'),mode='preview',port=null,pointer=null,clicked=null,clickAt=-Infinity,lastAt=-Infinity,lastFrame=0,lastCamera=null;
 let trace=null,capture=null,retain=!!el('cursor-retain-v073').checked,focusTool=false,session=false,automationRevisionV075=0,traceWarning=false;
 const setStatus=t=>{el('cursor-status-v073').textContent=t;};
 const fields={spotlight:'cursor-spotlight-v073',ring:'cursor-ring-v073',zoomMode:'cursor-zoom-mode-v073',scale:'cursor-scale-v073',radius:'cursor-radius-v073',dim:'cursor-dim-v073',feather:'cursor-feather-v073',smooth:'cursor-smooth-v073',hold:'cursor-hold-v073',color:'cursor-color-v073'};
 const hot=control.spotlight(()=>settings.spotlight,value=>{settings=core.config({...settings,spotlight:value});el('cursor-preset-v073').value='custom';renderSettings();},renderHotkey);
 function renderHotkey(){
  const active=hot.effective(),held=hot.held();
  el('cursor-spotlight-v073').checked=active;
  const badge=el('cursor-state-v0710');badge.textContent=held?'HELD':active?'ON':'OFF';badge.dataset.active=String(active);
  const quick=el('spotlight-quick-v0710');quick.setAttribute('aria-pressed',String(active));
  quick.title=held?'Momentary spotlight · release to restore':active?'Spotlight ON · tap 1 to turn off':'Spotlight OFF · tap 1 or hold';
 }
 function renderSettings(){
  automationRevisionV075++;
  for(const [k,id] of Object.entries(fields)){const n=el(id);if(n.type==='checkbox')n.checked=settings[k];else n.value=settings[k];}
  el('cursor-recipe-v073').value=JSON.stringify({schema:core.RECIPE,action:'recorder.cursor.configure',settings},null,2);
  for(const [k,v] of [['radius',settings.radius+'%'],['dim',Math.round(settings.dim*100)+'%'],['feather',Math.round(settings.feather*100)+'%']])el('cursor-'+k+'-value-v0710').textContent=v;
  renderHotkey();
 }
 function applyRecipe(raw){const checked=core.recipe(raw);if(checked.action!=='recorder.cursor.configure')throw Error('This recipe is for Clip Studio');
  hot.cancel();settings=checked.settings;clicked=null;clickAt=-Infinity;renderSettings();el('cursor-preset-v073').value='custom';return {...settings};}
 function clear(){const t=host.seconds?.();if(pointer&&session&&retain&&Number.isFinite(t)){trace?.add(t,null);capture?.gap(t);}pointer=null;clicked=null;clickAt=-Infinity;lastAt=-Infinity;}
 function disconnectLink(){const old=port;port=null;if(old)try{old.disconnect();}catch{}mode='preview';clear();
  el('cursor-link-v073').textContent='Connect linked tab';el('cursor-link-v073').setAttribute('aria-pressed','false');}
 function disconnect(){root.MangoNativeCursorV0753?.stop?.('Native tracking disconnected. Reconnect for a new or resumed recording.');disconnectLink();}
 function claimNative(desktopOverlay=false){if(!session||!host.active()||host.surface()!=='monitor'||desktopOverlay&&host.cleanMaster?.())return false;if(desktopOverlay)trace?.markBaked();disconnectLink();el('cursor-consent-v073').checked=false;mode='native';setStatus(desktopOverlay?'Native monitor tracking active. Desktop FX may be baked into the composite.':'Native monitor tracking active. Cursor effects are rendered in the live preview.');return true;}
 function nativeToggleEffect(action){if(mode!=='native'||!session||!host.active()||!['spotlight','ring'].includes(action))return false;hot.cancel();settings=core.config({...settings,[action]:!settings[action]});el('cursor-preset-v073').value='custom';renderSettings();return true;}
 function releaseNative(){if(mode!=='native')return;hot.cancel();clear();mode='preview';setStatus('Native monitor tracking stopped. Preview tracking only.');}
 function nativeSample(p,click){if(mode!=='native'||!session||!host.active())return false;if(p==null){clear();return true;}ingest(p,click===true);return true;}
 function enabled(){return retain||hot.effective()||settings.ring||settings.zoomMode!=='off';}
 function ingest(p,click=false){
  if(!session||!host.active())return;
  pointer=core.point(p);lastAt=now();
  if(pointer&&click){clicked={...pointer};clickAt=lastAt;const t=host.seconds?.();if(retain&&Number.isFinite(t)){if(mode==='linked'||mode==='native')capture?.click(t,pointer);const output=control.outFrame(host.cleanMaster?.()?pointer:core.outputPoint(pointer,lastCamera||host.camera()),host.frame());trace?.click(t,output);traceStarted=true;}}
 }
 function previewPoint(e,click=false){
  if(mode!=='preview'||!session||!host.active())return;
  const r=ink.getBoundingClientRect();
  const p=core.point({x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height)});
  ingest(p&&core.sourcePoint(control.inFrame(p,host.frame()),lastCamera||host.camera()),click);
 }
 wrap.addEventListener('pointermove',e=>previewPoint(e),true);
 wrap.addEventListener('pointerdown',e=>{if(e.button===0)previewPoint(e,true);},true);
 wrap.addEventListener('pointerleave',()=>{if(mode==='preview')clear();});
 root.addEventListener('blur',()=>{if(mode==='preview')clear();});
 async function connect(){
  if(port){disconnect();el('cursor-consent-v073').checked=false;setStatus('Linked tracking disconnected. Preview only.');return;}
  if(!session||!host.active()||host.surface()!=='browser'||!host.linked()||!api?.tabs?.connect){setStatus('Start a browser-tab capture from the linked webpage first.');return;}
  if(!el('cursor-consent-v073').checked){setStatus('Confirm the linked webpage is the same tab selected in the screen picker.');return;}
  try{
   const p=api.tabs.connect(host.source(),{name:'mangoshot-cursor-v073',frameId:0});port=p;mode='linked';clear();
   p.onMessage.addListener(m=>{
    if(port!==p||!session||!host.active()||mode!=='linked')return;
    if(m?.type==='ready'){setStatus('Linked tab connected. Move the mouse in the selected webpage.');return;}
    if(m?.type==='leave'){clear();return;}
    if(m?.type==='point')ingest({x:m.x,y:m.y},m.click===true);
   });
   p.onDisconnect.addListener(()=>{if(port===p){disconnect();el('cursor-consent-v073').checked=false;setStatus('Linked tab disconnected. Reconfirm the selected tab to reconnect.');}});
   el('cursor-link-v073').textContent='Disconnect linked tab';el('cursor-link-v073').setAttribute('aria-pressed','true');setStatus('Connecting to the authorized linked tab…');
  }catch(e){disconnect();setStatus('Linked tracking unavailable: '+e.message);}
 }
 el('cursor-link-v073').addEventListener('click',connect);
 el('cursor-consent-v073').addEventListener('change',e=>{if(!e.target.checked&&port){disconnect();setStatus('Linked tracking consent revoked.');}});
 el('cursor-preset-v073').addEventListener('change',e=>{if(e.target.value==='custom')return;hot.cancel();settings=core.preset(e.target.value);clicked=null;clickAt=-Infinity;renderSettings();});
 for(const [k,id] of Object.entries(fields))el(id).addEventListener(el(id).type==='range'?'input':'change',e=>{
  const n=e.target,v=n.type==='checkbox'?n.checked:['zoomMode','color'].includes(k)?n.value:Number(n.value);
  try{if(k==='spotlight')hot.cancel();settings=core.config({...settings,[k]:v});el('cursor-preset-v073').value='custom';renderSettings();}
  catch(err){setStatus(err.message);renderSettings();}
 });
 el('spotlight-quick-v0710').addEventListener('click',()=>{hot.cancel();settings=core.config({...settings,spotlight:!settings.spotlight});el('cursor-preset-v073').value='custom';renderSettings();});
 el('cursor-retain-v073').addEventListener('change',e=>{const t=host.seconds?.();if(!e.target.checked&&retain&&Number.isFinite(t)){trace?.add(t,null);capture?.gap(t);}retain=e.target.checked;setStatus(retain?'Cursor path retention ON (local).':'Cursor path retention OFF; earlier samples are preserved.');});
 el('cursor-focus-tool-v073').addEventListener('change',e=>{focusTool=e.target.checked;});
 el('cursor-apply-recipe-v073').addEventListener('click',()=>{try{
  const raw=el('cursor-recipe-v073').value;if(raw.length>4096)throw Error('Recipe exceeds 4 KB');
  applyRecipe(JSON.parse(raw));setStatus('Cursor recipe applied. Tracking permissions unchanged.');
 }catch(e){setStatus(e.message);}});
 renderSettings();
 function begin(){disconnect();session=true;retain=!!el('cursor-retain-v073').checked;trace=core.createTrace();capture=captureCore?.create(core.config,host.cleanMaster?.()?'clean':'composite')||null;traceWarning=false;lastFrame=now();lastCamera=null;el('cursor-consent-v073').checked=false;
  setStatus(retain?'Cursor path retention ON (local). PREVIEW ONLY until source tracking connects. For the real recorded pointer, connect the matching browser tab or the installed Windows companion.':'Cursor path retention OFF. Enable it to preserve tracked movement.');}
 function snapshot(){if(!trace||!traceStarted)return null;let meta=null;try{meta=capture?.finish()||null;}catch{}try{return trace.finish(meta);}catch{return trace.finish();}}
 function end(){hot.cancel();let meta=null,result=null,notice='';try{if(traceStarted)meta=capture?.finish()||null;}catch(e){notice='Source metadata failed validation; recorded-frame path retained.';}try{result=trace?.finish(meta)||null;}catch(e){notice='Capture metadata rejected: '+e.message;try{result=trace?.finish()||null;}catch{notice+='; cursor path unavailable.';}}trace=null;capture=null;session=false;disconnect();lastCamera=null;el('cursor-consent-v073').checked=false;setStatus(notice|| (result&&(result.truncated||result.capture?.truncated)?'Cursor trace limit reached; recording retained but telemetry may be incomplete.':'Cursor tracking stopped.'));return result&&(result.samples.some(s=>s[1]!==null)||result.clicks?.length||result.capture?.cameraFrames.length)?result:null;}
 function frame(ctx,media,base,w,h,seconds){
  const n=now(),dt=n-lastFrame;lastFrame=n;
  if((mode==='linked'||mode==='native')&&n-lastAt>1000)clear();
  const p=session&&enabled()?pointer:null,age=n-clickAt,effective={...settings,spotlight:hot.effective()};
  const c=core.advance(lastCamera,base,p,effective,dt,age,clicked);
  lastCamera=c;
  const fitted=control.drawSource(ctx,media,c,w,h);
  const output=control.outFrame(core.outputPoint(p,c),fitted);
  // Desktop FX already originate in the captured source. Suppress the second
  // compositor pass to avoid double dimming/rings in composite mode.
  if(host.cleanMaster?.()||!root.MangoNativeCursorV0753?.desktopOverlay?.())core.draw(ctx,output,effective,w,h,age);
  if(trace&&seconds!=null){
   if(!host.cleanMaster?.()&&(!!output&&(effective.spotlight||effective.ring)||Math.abs(c.zoom-1)>.001))trace.markBaked();
   if(retain||traceStarted){traceStarted=traceStarted||retain;trace.add(seconds,retain?(host.cleanMaster?.()?control.outFrame(p,fitted):output):null);try{capture?.frame(seconds,p,c,fitted,effective,mode,retain);}catch(e){capture=null;setStatus('Source telemetry failed; continuing recorded-frame path: '+e.message);}}
   if(!traceWarning&&(trace.truncated()||capture?.truncated())){traceWarning=true;setStatus('Cursor trace capacity reached; video recording continues.');}
  }
  return c;
 }
 let traceStarted=false;
 function resetSession(){traceStarted=false;begin();}
 function manualCamera(){if(settings.zoomMode!=='off'){settings={...settings,zoomMode:'off'};el('cursor-preset-v073').value='custom';renderSettings();}lastCamera=null;}
 function suspend(){hot.cancel();disconnect();el('cursor-consent-v073').checked=false;setStatus('Tracking paused; reconfirm and reconnect linked tab after resuming if needed.');}
 function sourceChanged(){const t=host.seconds?.();if(Number.isFinite(t))capture?.sourceChanged(t);hot.cancel();disconnect();lastCamera=null;el('cursor-consent-v073').checked=false;setStatus('Source changed · preview tracking; reconnect the linked tab if appropriate.');}
 root.MangoRecorderCursorV073=Object.freeze({begin:resetSession,end,snapshot,suspend,frame,manualCamera,sourceChanged,claimNative,releaseNative,nativeSample,nativeToggleEffect,spotlightDown:hot.down,spotlightUp:hot.up,spotlightCancel:hot.cancel,focusTool:()=>focusTool&&enabled(),applyRecipe,
  state:()=>({settings:{...settings},effectiveSpotlight:hot.effective(),spotlightHeld:hot.held(),mode,session,retain,focusTool,automationRevision:automationRevisionV075})});
})(typeof globalThis!=='undefined'?globalThis:this);
