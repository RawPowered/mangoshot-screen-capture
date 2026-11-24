/* Recorder cursor controls. Explicit scope, no passive desktop mouse hooks. */
(function(root){'use strict';
 const core=root.MangoCursorCoreV073,host=root.MangoRecorderCursorHostV073,doc=root.document;
 if(!core||!host||!doc)return;
 const el=id=>doc.getElementById(id),panel=el('cursor-studio-v073'),wrap=el('screen-wrap'),ink=el('ink');
 if(!panel||!wrap||!ink)return;
 const api=root.chrome??root.browser,now=()=>performance.now();
 let settings=core.preset('off'),mode='preview',port=null,pointer=null,clicked=null,clickAt=-Infinity,lastAt=-Infinity,lastFrame=0,lastCamera=null;
 let trace=null,retain=false,focusTool=false,session=false;
 const setStatus=t=>{el('cursor-status-v073').textContent=t;};
 const fields={spotlight:'cursor-spotlight-v073',ring:'cursor-ring-v073',zoomMode:'cursor-zoom-mode-v073',scale:'cursor-scale-v073',radius:'cursor-radius-v073',dim:'cursor-dim-v073',feather:'cursor-feather-v073',smooth:'cursor-smooth-v073',hold:'cursor-hold-v073',color:'cursor-color-v073'};
 function renderSettings(){
  for(const [k,id] of Object.entries(fields)){const n=el(id);if(n.type==='checkbox')n.checked=settings[k];else n.value=settings[k];}
  el('cursor-recipe-v073').value=JSON.stringify({schema:core.RECIPE,action:'recorder.cursor.configure',settings},null,2);
 }
 function applyRecipe(raw){const checked=core.recipe(raw);if(checked.action!=='recorder.cursor.configure')throw Error('This recipe is for Clip Studio');
  settings=checked.settings;clicked=null;clickAt=-Infinity;renderSettings();el('cursor-preset-v073').value='custom';return {...settings};}
 function clear(){pointer=null;clicked=null;clickAt=-Infinity;lastAt=-Infinity;}
 function disconnect(){const old=port;port=null;if(old)try{old.disconnect();}catch{}mode='preview';clear();
  el('cursor-link-v073').textContent='Connect linked tab';el('cursor-link-v073').setAttribute('aria-pressed','false');}
 function enabled(){return retain||settings.spotlight||settings.ring||settings.zoomMode!=='off';}
 function ingest(p,click=false){
  if(!session||!host.active()||!enabled())return;
  pointer=core.point(p);lastAt=now();
  if(pointer&&click){clicked={...pointer};clickAt=lastAt;}
 }
 function previewPoint(e,click=false){
  if(mode!=='preview'||!session||!host.active()||!enabled())return;
  const r=ink.getBoundingClientRect();
  const p=core.point({x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height)});
  ingest(p&&core.sourcePoint(p,lastCamera||host.camera()),click);
 }
 wrap.addEventListener('pointermove',e=>previewPoint(e),true);
 wrap.addEventListener('pointerdown',e=>{if(e.button===0)previewPoint(e,true);},true);
 wrap.addEventListener('pointerleave',()=>{if(mode==='preview')clear();});
 root.addEventListener('blur',()=>{if(mode==='preview')clear();});
 async function connect(){
  if(port){disconnect();setStatus('Linked tracking disconnected. Preview only.');return;}
  if(!session||!host.active()||host.surface()!=='browser'||!host.linked()||!api?.tabs?.connect){setStatus('Start a browser-tab capture from the linked webpage first.');return;}
  if(!enabled()){setStatus('Choose a cursor effect or enable cursor-path retention first.');return;}
  if(!el('cursor-consent-v073').checked){setStatus('Confirm the linked webpage is the same tab selected in the screen picker.');return;}
  try{
   const p=api.tabs.connect(host.source(),{name:'mangoshot-cursor-v073',frameId:0});port=p;mode='linked';clear();
   p.onMessage.addListener(m=>{
    if(port!==p||!session||!host.active()||mode!=='linked')return;
    if(m?.type==='ready'){setStatus('Linked tab connected. Move the mouse in the selected webpage.');return;}
    if(m?.type==='leave'){clear();return;}
    if(m?.type==='point')ingest({x:m.x,y:m.y},m.click===true);
   });
   p.onDisconnect.addListener(()=>{if(port===p){disconnect();setStatus('Linked tab disconnected. Reconfirm the selected tab to reconnect.');}});
   el('cursor-link-v073').textContent='Disconnect linked tab';el('cursor-link-v073').setAttribute('aria-pressed','true');setStatus('Connecting to the authorized linked tab…');
  }catch(e){disconnect();setStatus('Linked tracking unavailable: '+e.message);}
 }
 el('cursor-link-v073').addEventListener('click',connect);
 el('cursor-consent-v073').addEventListener('change',e=>{if(!e.target.checked&&port){disconnect();setStatus('Linked tracking consent revoked.');}});
 el('cursor-preset-v073').addEventListener('change',e=>{if(e.target.value==='custom')return;settings=core.preset(e.target.value);clicked=null;clickAt=-Infinity;renderSettings();if(!enabled())disconnect();});
 for(const [k,id] of Object.entries(fields))el(id).addEventListener('change',e=>{
  const n=e.target,v=n.type==='checkbox'?n.checked:['zoomMode','color'].includes(k)?n.value:Number(n.value);
  try{settings=core.config({...settings,[k]:v});el('cursor-preset-v073').value='custom';renderSettings();if(!enabled())disconnect();}
  catch(err){setStatus(err.message);renderSettings();}
 });
 el('cursor-retain-v073').addEventListener('change',e=>{retain=e.target.checked;if(!enabled())disconnect();});
 el('cursor-focus-tool-v073').addEventListener('change',e=>{focusTool=e.target.checked;});
 el('cursor-apply-recipe-v073').addEventListener('click',()=>{try{
  const raw=el('cursor-recipe-v073').value;if(raw.length>4096)throw Error('Recipe exceeds 4 KB');
  applyRecipe(JSON.parse(raw));if(!enabled())disconnect();setStatus('Cursor recipe applied. Tracking permissions unchanged.');
 }catch(e){setStatus(e.message);}});
 renderSettings();
 function begin(){disconnect();session=true;trace=core.createTrace();lastFrame=now();lastCamera=null;el('cursor-consent-v073').checked=false;
  setStatus('Preview tracking available. Connect the same captured webpage for source tracking.');}
 function end(){const result=trace?.finish();trace=null;session=false;disconnect();lastCamera=null;el('cursor-consent-v073').checked=false;setStatus('Cursor tracking stopped.');return result?.samples.some(s=>s[1]!==null)?result:null;}
 function frame(ctx,media,base,w,h,seconds){
  const n=now(),dt=n-lastFrame;lastFrame=n;
  if(mode==='linked'&&n-lastAt>1000)clear();
  const p=session&&enabled()?pointer:null,age=n-clickAt;
  const c=core.advance(lastCamera,base,p,settings,dt,age,clicked);
  lastCamera=c;
  if(media.readyState>=2){
   const crop=root.MangoCamera.crop(c,w,h);
   ctx.drawImage(media,crop.sx,crop.sy,crop.sw,crop.sh,0,0,w,h);
  }
  const output=core.outputPoint(p,c);
  core.draw(ctx,output,settings,w,h,age);
  if(trace&&seconds!=null&&(retain||traceStarted)){
   traceStarted=traceStarted||retain;
   trace.add(seconds,retain?output:null,!!output&&(settings.spotlight||settings.ring)||Math.abs(c.zoom-base.zoom)>.01);
  }
  return c;
 }
 let traceStarted=false;
 function resetSession(){traceStarted=false;begin();}
 function manualCamera(){if(settings.zoomMode!=='off'){settings={...settings,zoomMode:'off'};el('cursor-preset-v073').value='custom';renderSettings();}lastCamera=null;}
 function suspend(){disconnect();setStatus('Tracking paused; reconnect linked tab after resuming if needed.');}
 root.MangoRecorderCursorV073=Object.freeze({begin:resetSession,end,suspend,frame,manualCamera,focusTool:()=>focusTool&&enabled(),applyRecipe,
  state:()=>({settings:{...settings},mode,session,retain,focusTool})});
})(typeof globalThis!=='undefined'?globalThis:this);
