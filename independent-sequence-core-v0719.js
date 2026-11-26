/* Independent sequence document. Local media references only; no recording clock. */
(function(root){'use strict';
 const SCHEMA='mangoshot.sequence.v3',SCHEMA4='mangoshot.sequence.v4',SCHEMA5='mangoshot.sequence.v5',SCHEMA6='mangoshot.sequence.v6',SCHEMA7='mangoshot.sequence.v7',SCHEMA8='mangoshot.sequence.v8',SCHEMA9='mangoshot.sequence.v9',SCHEMA10='mangoshot.sequence.v10',TRACKS=['V1','V2','V3','A1','A2','G1','G2','G3'],FPS=[24,25,30,50,60],MAX_CLIPS=64,MAX_SECONDS=3600,MAX_PIXELS=4096*2160,MIN=.1,EPS=.00001;
 const PRESETS=['title','lowerThird','minimal','editorial','kinetic','glass','premium','outline'];
 const copy=x=>JSON.parse(JSON.stringify(x)),finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const uid=()=>root.crypto?.randomUUID?.()||'clip-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const visual=t=>t==='V1'||t==='V2'||t==='V3',audio=t=>t==='A1'||t==='A2',graphic=t=>['G1','G2','G3'].includes(t),dimensional=t=>t==='G2'||t==='G3';
 const speed=()=>root.MangoSpeedRampV0729,mesh=()=>root.MangoDimensionalV0729;
 const bezier=v=>!!(v?.bezier||v?.objects?.some(o=>o.geometry.bezier));
 const advanced=v=>v?.mode==='spatial'&&(v.shape!=='arrow'||!!v.camera?.roll);
 const motionAdvanced=m=>m?.maskMode==='keyed'||m?.keys?.some(k=>advanced(k.pose));
 const upgrade=(p,version=4)=>{if(p.version<version){p.schema=version===10?SCHEMA10:version===9?SCHEMA9:version===8?SCHEMA8:version===7?SCHEMA7:version===6?SCHEMA6:version===5?SCHEMA5:SCHEMA4;p.version=version;}return p;};
 const color=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x),id=x=>typeof x==='string'&&/^[\w-]{1,90}$/.test(x);
 function settings(x){
  if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!Number.isInteger(x.width)||!Number.isInteger(x.height)||x.width%2||x.height%2||!finite(x.width,160,4096)||!finite(x.height,160,4096)||x.width*x.height>MAX_PIXELS||!FPS.includes(x.fps)||!finite(x.duration,1,MAX_SECONDS)||!color(x.background))throw Error('Invalid sequence settings. Use even dimensions, at most 8.85 MP, 24/25/30/50/60 fps, and 1–3600 seconds.');
  return {name:x.name.trim(),width:x.width,height:x.height,fps:x.fps,duration:x.duration,background:x.background};
 }
 function empty(x={}){return {schema:SCHEMA,version:3,settings:settings({name:'Untitled sequence',width:1920,height:1080,fps:30,duration:30,background:'#000000',...x}),assets:[],tracks:Object.fromEntries(TRACKS.map(t=>[t,{visible:true,muted:false,locked:false,opacity:1,gain:1}])),clips:[],transitions:[]};}
 function assetAllowed(a){if(!root.MangoMediaAssets?.validMeta(a)||a.id==='source-primary'||a.size<=0||a.size>(a.kind==='image'?64:512)*1024**2)throw Error('Invalid asset or media file budget exceeded (512 MiB video/audio, 64 MiB image).');
  if(a.kind==='image'){if(/\.gif$/i.test(a.name)||a.mime==='image/gif')throw Error('Animated GIF is not supported in this workspace. Convert it to WebM or PNG.');if(!finite(a.width,1,16384)||!finite(a.height,1,16384)||a.width*a.height>24000000)throw Error('Still image dimensions unavailable or exceed 24 MP.');}
  else {if(!finite(a.duration,MIN,864000))throw Error('Media duration is unavailable.');if(a.kind==='video'&&(!finite(a.width,1,16384)||!finite(a.height,1,16384)||a.width*a.height>24000000))throw Error('Video dimensions unavailable or exceed 24 MP.');}
  return {id:a.id,name:a.name,kind:a.kind,size:a.size,lastModified:a.lastModified,mime:a.mime,duration:a.duration??null,width:a.width??null,height:a.height??null};
 }
 function check(p){
  if(!p||!((p.schema===SCHEMA&&p.version===3)||(p.schema===SCHEMA4&&p.version===4)||(p.schema===SCHEMA5&&p.version===5)||(p.schema===SCHEMA6&&p.version===6)||(p.schema===SCHEMA7&&p.version===7)||(p.schema===SCHEMA8&&p.version===8)||(p.schema===SCHEMA9&&p.version===9)||(p.schema===SCHEMA10&&p.version===10))||!Array.isArray(p.assets)||p.assets.length>200||!Array.isArray(p.clips)||p.clips.length>MAX_CLIPS||!Array.isArray(p.transitions)||p.transitions.length>MAX_CLIPS||!p.tracks)throw Error('Invalid independent sequence document or clip budget.');
  const out=empty(p.settings),assets=new Map(),ids=new Set();if(p.version>=4)upgrade(out,p.version);
  for(const raw of p.assets){const a=assetAllowed(raw);if(assets.has(a.id))throw Error('Duplicate media asset.');assets.set(a.id,a);out.assets.push(a);}
  for(const t of TRACKS){const a=p.tracks[t]||(p.version===3&&dimensional(t)?out.tracks[t]:null);if(!a||typeof a.visible!=='boolean'||typeof a.muted!=='boolean'||typeof a.locked!=='boolean'||!finite(a.opacity,0,1)||!finite(a.gain,0,2))throw Error('Invalid track controls.');out.tracks[t]={visible:a.visible,muted:a.muted,locked:a.locked,opacity:a.opacity,gain:a.gain};}
  for(const c of p.clips){
   if(!c||!id(c.id)||ids.has(c.id)||!TRACKS.includes(c.track))throw Error('Invalid clip ID or track.');
   const title=c.track==='G1',g=graphic(c.track),shape=dimensional(c.track),a=g?null:assets.get(c.assetId);if(g?c.assetId!==null:!a||audio(c.track)!==(a.kind==='audio'))throw Error('Media type does not match track.');
   let ramp=null;if(c.speedRamp!=null){if(p.version<4||!a||a.kind==='image'||!speed())throw Error('Speed ramps require a v4 video or audio clip.');ramp=speed().check(c.speedRamp);}
   if(!finite(c.start,0,out.settings.duration)||!finite(c.end,c.start+MIN-EPS,out.settings.duration+EPS)||!finite(c.sourceIn,0,864000)||!finite(c.sourceOut,c.sourceIn+(ramp?MIN*.25:MIN)-EPS,864000)||Math.abs((c.end-c.start)*(ramp?speed().integral(ramp):1)-c.sourceOut+c.sourceIn)>.001)throw Error('Clip timing exceeds sequence or does not match integrated source length.');
   if(a&&a.kind!=='image'&&c.sourceOut>a.duration+.025)throw Error('Clip exceeds its source duration.');
   if(!finite(c.opacity,0,1)||!finite(c.gain,0,2)||!finite(c.x,-1,1)||!finite(c.y,-1,1)||!finite(c.width,.05,2)||!finite(c.height,.05,2)||!['contain','cover','stretch'].includes(c.fit)||!finite(c.fadeIn,0,c.end-c.start+EPS)||!finite(c.fadeOut,0,c.end-c.start+EPS)||typeof c.visible!=='boolean'||typeof c.muted!=='boolean'||typeof c.locked!=='boolean')throw Error('Invalid clip controls or fades.');
   const grade=root.MangoCompositorV0714?.checkStack(c.grade||[])||[];if((g||audio(c.track))&&grade.length)throw Error('Media grades require visual media.');
   if(title&&(!PRESETS.includes(c.preset)||typeof c.text!=='string'||c.text.length>400||!finite(c.fontSize,12,220)||!color(c.color)||c.x<0||c.y<0||c.width>1||c.width<.1))throw Error('Invalid title settings.');
   if(shape&&(p.version<4||!mesh()||!c.callout3d))throw Error('Dimensional graphics require a v4 callout.');if(!shape&&c.callout3d!=null)throw Error('Dimensional callout requires a graphics track.');
   const normalized={id:c.id,assetId:g?null:c.assetId,track:c.track,start:c.start,end:c.end,sourceIn:c.sourceIn,sourceOut:c.sourceOut,opacity:c.opacity,gain:c.gain,visible:c.visible,muted:c.muted,locked:c.locked,x:c.x,y:c.y,width:c.width,height:c.height,fit:c.fit,fadeIn:c.fadeIn,fadeOut:c.fadeOut,grade};
   if(title)Object.assign(normalized,{text:c.text,preset:c.preset,fontSize:c.fontSize,color:c.color});if(shape){normalized.callout3d=mesh().check(c.callout3d);if(bezier(normalized.callout3d)&&p.version<10)throw Error('Bezier geometry requires sequence v10.');if(normalized.callout3d.mode==='spatial'&&p.version<5)throw Error('Spatial arrows require sequence v5.');if(normalized.callout3d.mode==='scene'&&p.version<8)throw Error('Unified scenes require sequence v8.');if(advanced(normalized.callout3d)&&p.version<7)throw Error('Advanced spatial primitives and camera roll require sequence v7.');if(normalized.callout3d.occlusion?.length&&p.version<6)throw Error('Foreground masks require sequence v6.');}if(c.spatialMotion!=null){if(p.version<6||normalized.callout3d?.mode!=='spatial'||!root.MangoSpatialMotionV0731)throw Error('Spatial motion requires a v6 spatial arrow.');normalized.spatialMotion=root.MangoSpatialMotionV0731.check(c.spatialMotion,normalized.callout3d);if(motionAdvanced(normalized.spatialMotion)&&p.version<7)throw Error('Advanced spatial motion requires sequence v7.');}if(c.sceneMotion!=null){if(p.version<9||normalized.callout3d?.mode!=='scene'||!root.MangoUnifiedSceneMotionV0734)throw Error('Unified scene motion requires sequence v9.');normalized.sceneMotion=root.MangoUnifiedSceneMotionV0734.check(c.sceneMotion,normalized.callout3d);}if(ramp)normalized.speedRamp=ramp;
   ids.add(c.id);out.clips.push(normalized);
  }
  out.clips.sort((a,b)=>TRACKS.indexOf(a.track)-TRACKS.indexOf(b.track)||a.start-b.start||a.id.localeCompare(b.id));
  const by=new Map(out.clips.map(c=>[c.id,c])),pairs=new Map();
  for(const tr of p.transitions){
   const a=by.get(tr?.from),b=by.get(tr?.to),key=tr?.from+'>'+tr?.to;
   if(!a||!b||a.speedRamp||b.speedRamp||a.track!=='V1'||b.track!=='V1'||a.id===b.id||pairs.has(key)||tr.type!=='dissolve'||!finite(tr.duration,.1,5)||a.start>=b.start-EPS||a.end>=b.end-EPS||Math.abs(a.end-b.start-tr.duration)>.001)throw Error('Invalid primary-source dissolve.');
   pairs.set(key,tr);out.transitions.push({from:a.id,to:b.id,type:'dissolve',duration:tr.duration});
  }
  let seen=0;
  for(const t of TRACKS){
   const rows=out.clips.filter(c=>c.track===t);
   for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length&&rows[j].start<rows[i].end-EPS;j++){
    const a=rows[i],b=rows[j];if(t!=='V1'||j!==i+1||!pairs.has(a.id+'>'+b.id))throw Error('Overlapping clips require an explicit adjacent V1 dissolve; no triple overlaps.');seen++;
   }
  }
  if(seen!==pairs.size)throw Error('Dissolve does not correspond to a clip overlap.');
  return out;
 }
 const asset=(p,c)=>p.assets.find(a=>a.id===c.assetId);
 const attached=(p,c)=>p.transitions.some(t=>t.from===c.id||t.to===c.id);
 function unlocked(p,c,t=c.track){if(c.locked||p.tracks[c.track].locked||p.tracks[t]?.locked)throw Error('Unlock the clip and track before editing.');}
 function make(p,a,track,at,span){
  if(!TRACKS.includes(track)||p.tracks[track].locked)throw Error('Choose an unlocked track.');
  const title=track==='G1',g=graphic(track),shape=dimensional(track);if(!g&&(!a||audio(track)!==(a.kind==='audio')))throw Error('Choose a compatible local asset.');
  const length=span??Math.min(g||a.kind==='image'?4:a.duration,p.settings.duration-at);
  if(length<MIN-EPS)throw Error('Move the playhead earlier or extend the sequence.');
  return {id:uid(),assetId:g?null:a.id,track,start:at,end:at+length,sourceIn:0,sourceOut:length,opacity:1,gain:1,visible:true,muted:track==='V2'||track==='V3',locked:false,x:shape?.20:title?.08:0,y:shape?.22:title?.24:0,width:shape?.60:title?.84:1,height:shape?.56:1,fit:'contain',fadeIn:0,fadeOut:0,grade:[],...(title?{text:'Add title',preset:'title',fontSize:74,color:'#ffffff'}:{}),...(shape?{callout3d:mesh().defaults()}: {})};
 }
 function add(p,a,track,at,append=false){
  const n=copy(p);if(a&&!n.assets.some(x=>x.id===a.id))n.assets.push(assetAllowed(a));
  if(append){if(track!=='V1')throw Error('Append is a V1 operation.');at=Math.max(0,...n.clips.filter(c=>c.track==='V1').map(c=>c.end));const span=a.kind==='image'?4:a.duration;n.settings.duration=Math.max(n.settings.duration,Math.ceil((at+span)*1000)/1000);n.clips.push(make(n,a,track,at,span));}
  else n.clips.push(make(n,a,track,at));
  if(dimensional(track))upgrade(n);return check(n);
 }
 function addCallout(p,at,value){const n=copy(p),end=Math.min(n.settings.duration,at+4),t=['G2','G3'].find(t=>!n.tracks[t].locked&&!n.clips.some(c=>c.track===t&&c.start<end-EPS&&c.end>at+EPS));if(!t)throw Error('Both dimensional graphics tracks overlap this range or are locked.');const c=make(n,null,t,at);c.callout3d=mesh().check(value);const spatial=['spatial','scene'].includes(c.callout3d.mode);if(spatial)Object.assign(c,{x:0,y:0,width:1,height:1});n.clips.push(c);return check(upgrade(n,bezier(c.callout3d)?10:c.callout3d.mode==='scene'?8:advanced(c.callout3d)?7:c.callout3d.occlusion?.length?6:spatial?5:4));}
 function change(p,id,patch){
  const n=copy(p),i=n.clips.findIndex(c=>c.id===id);if(i<0)throw Error('Clip no longer exists.');const c=n.clips[i];
  if(patch===null){unlocked(n,c);if(attached(n,c))throw Error('Remove its dissolve before deleting the clip.');n.clips.splice(i,1);}
  else{
   const keys=Object.keys(patch);if(keys.some(k=>!['track','start','end','sourceIn','sourceOut','opacity','gain','visible','muted','locked','x','y','width','height','fit','fadeIn','fadeOut','grade','text','preset','fontSize','color','speedRamp','callout3d','spatialMotion','sceneMotion'].includes(k)))throw Error('Unsupported clip property.');
   if(!(keys.length===1&&keys[0]==='locked'&&!n.tracks[c.track].locked))unlocked(n,c,patch.track||c.track);
   if(attached(n,c)&&keys.some(k=>['track','start','end','sourceIn','sourceOut','speedRamp'].includes(k)&&patch[k]!==c[k]))throw Error('Remove the attached dissolve before editing clip timing.');
   const next={...c,...patch};if(Object.hasOwn(patch,'speedRamp')){if(patch.speedRamp===null)delete next.speedRamp;else{next.speedRamp=speed().check(patch.speedRamp);upgrade(n);}}
   if(next.speedRamp||Object.hasOwn(patch,'speedRamp')){if(keys.some(k=>['start','end','sourceIn','speedRamp'].includes(k)))next.sourceOut=speed().sourceOut(next);}
   if(Object.hasOwn(patch,'spatialMotion')&&patch.spatialMotion===null)delete next.spatialMotion;if(Object.hasOwn(patch,'sceneMotion')&&patch.sceneMotion===null)delete next.sceneMotion;if(bezier(next.callout3d))upgrade(n,10);else if(next.sceneMotion)upgrade(n,9);else if(next.callout3d?.mode==='scene')upgrade(n,8);else if(advanced(next.callout3d)||motionAdvanced(next.spatialMotion))upgrade(n,7);else if(next.spatialMotion||next.callout3d?.occlusion?.length)upgrade(n,6);else if(Object.hasOwn(patch,'callout3d'))upgrade(n,next.callout3d?.mode==='spatial'?5:4);n.clips[i]=next;
  }return check(n);
 }
 function move(p,id,mode,delta,track,snap=0,playhead=0){
  const c=p.clips.find(x=>x.id===id);if(!c||!finite(delta,-MAX_SECONDS,MAX_SECONDS))throw Error('Invalid clip gesture.');unlocked(p,c,track||c.track);if(attached(p,c))throw Error('Remove the dissolve before dragging its clips.');
  const a=asset(p,c),span=c.end-c.start,n={...c};if(c.speedRamp&&mode!=='move')throw Error('Trim a ramped clip in its inspector or remove the ramp first.');
  if(mode==='move'){n.track=track||c.track;if((visual(n.track)!==visual(c.track))||(audio(n.track)!==audio(c.track))||(graphic(n.track)!==graphic(c.track))||(graphic(c.track)&&dimensional(n.track)!==dimensional(c.track))||!TRACKS.includes(n.track))throw Error('Track types cannot be exchanged.');n.start=clamp(c.start+delta,0,p.settings.duration-span);n.end=n.start+span;}
  else if(mode==='in'){n.start=clamp(c.start+delta,Math.max(0,c.start-c.sourceIn),c.end-MIN);n.sourceIn=c.sourceIn+n.start-c.start;}
  else if(mode==='out'){const limit=a&&a.kind!=='image'?Math.min(p.settings.duration,c.end+a.duration-c.sourceOut):p.settings.duration;n.end=clamp(c.end+delta,c.start+MIN,limit);n.sourceOut=c.sourceOut+n.end-c.end;}
  else throw Error('Unknown timeline gesture.');
  if(snap>0){const edges=mode==='move'?[n.start,n.end]:[mode==='in'?n.start:n.end],points=[0,p.settings.duration,playhead,...p.clips.filter(x=>x.id!==id).flatMap(x=>[x.start,x.end])];let best=null;for(const edge of edges)for(const t of points){const d=t-edge;if(Math.abs(d)<=snap&&(best===null||Math.abs(d)<Math.abs(best)))best=d;}if(best!==null)return move(p,id,mode,delta+best,track,0,playhead);}
  const d=n.end-n.start;return change(p,id,{track:n.track,start:n.start,end:n.end,sourceIn:n.sourceIn,sourceOut:n.sourceOut,fadeIn:Math.min(n.fadeIn,d),fadeOut:Math.min(n.fadeOut,d)});
 }
 function dissolve(p,to,seconds){
  const n=copy(p),rows=n.clips.filter(c=>c.track==='V1'),index=rows.findIndex(c=>c.id===to),a=rows[index-1],b=rows[index];
  if(!a||!b||a.speedRamp||b.speedRamp||!finite(seconds,.1,5)||seconds>Math.min(a.end-a.start,b.end-b.start)-MIN+EPS||Math.abs(a.end-b.start)>.001)throw Error('Select the incoming V1 clip immediately after another V1 clip, with enough source duration.');
  unlocked(n,a);for(const c of rows.slice(index)){unlocked(n,c);c.start-=seconds;c.end-=seconds;}n.transitions.push({from:a.id,to:b.id,type:'dissolve',duration:seconds});return check(n);
 }
 function removeDissolve(p,to){
  const n=copy(p),tr=n.transitions.find(t=>t.to===to);if(!tr)throw Error('Select the incoming clip of a dissolve.');
  const a=n.clips.find(c=>c.id===tr.from),b=n.clips.find(c=>c.id===to);unlocked(n,a);
  for(const c of n.clips.filter(c=>c.track==='V1'&&c.start>=b.start-EPS)){unlocked(n,c);c.start+=tr.duration;c.end+=tr.duration;}
  n.transitions=n.transitions.filter(t=>t!==tr);return check(n);
 }
 function active(p,t){return p.clips.filter(c=>c.start<=t+EPS&&t<c.end-EPS);}
 const show=(p,c)=>!audio(c.track)&&c.visible&&p.tracks[c.track].visible&&c.opacity*p.tracks[c.track].opacity>0;
 const sound=(p,c)=>{const a=asset(p,c);return !!a&&a.kind!=='image'&&!c.muted&&!p.tracks[c.track].muted&&c.gain*p.tracks[c.track].gain>0;};
 const needed=(p,t)=>active(p,t).filter(c=>!graphic(c.track)&&(show(p,c)||sound(p,c)));
 function fade(c,t){return clamp(Math.min(1,c.fadeIn?(t-c.start)/c.fadeIn:1,c.fadeOut?(c.end-t)/c.fadeOut:1),0,1);}
 function mix(p,c,t){
  let opacity=c.opacity*p.tracks[c.track].opacity*fade(c,t),gain=c.gain*p.tracks[c.track].gain*fade(c,t);
  for(const tr of p.transitions){if(c.id!==tr.from&&c.id!==tr.to)continue;const b=p.clips.find(x=>x.id===tr.to),q=clamp((t-b.start)/tr.duration,0,1);
   if(t<b.start-EPS||t>=b.start+tr.duration-EPS)continue;
   if(c.id===tr.to){opacity*=q;gain*=Math.sin(q*Math.PI/2);}else gain*=Math.cos(q*Math.PI/2);
  }
  return {opacity:show(p,c)?opacity:0,gain:sound(p,c)?gain:0};
 }
 function intervals(p,from=0){const end=p.settings.duration,at=clamp(from,0,end),marks=[at,end,...p.clips.flatMap(c=>[c.start,c.end]).filter(t=>t>at+EPS&&t<end-EPS)].sort((a,b)=>a-b),unique=marks.filter((t,i)=>!i||t-marks[i-1]>EPS);return unique.slice(0,-1).map((t,i)=>({start:t,end:unique[i+1]}));}
 const sourceAt=(c,t)=>c.speedRamp?speed().source(c,t):clamp(c.sourceIn+t-c.start,c.sourceIn,c.sourceOut);
 const rateAt=(c,t)=>c.speedRamp?speed().rate(c.speedRamp,speed().fraction(c,t)):1;
 function fit(sw,sh,dw,dh,mode){if(mode==='stretch')return {x:0,y:0,w:dw,h:dh};const f=(mode==='cover'?Math.max:Math.min)(dw/sw,dh/sh);return {x:(dw-sw*f)/2,y:(dh-sh*f)/2,w:sw*f,h:sh*f};}
 const api=Object.freeze({SCHEMA,SCHEMA4,SCHEMA5,SCHEMA6,SCHEMA7,SCHEMA8,SCHEMA9,SCHEMA10,TRACKS,FPS,PRESETS,MAX_CLIPS,MAX_SECONDS,MAX_PIXELS,MIN,EPS,copy,settings,empty,assetAllowed,check,asset,attached,visual,audio,graphic,dimensional,make,add,addCallout,change,move,dissolve,removeDissolve,active,show,sound,needed,fade,mix,intervals,sourceAt,rateAt,fit});
 root.MangoIndependentSequenceV0719=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
