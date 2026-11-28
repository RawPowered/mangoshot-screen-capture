/* Clean-master reconstruction: bounded, deterministic import into existing
 * camera and cursor-effect editing models. Never attempts to remove baked pixels. */
(function(root){'use strict';
 const MIN=.05,MAX_ZOOM=5,MAX_KEYS=240,MAX_REGIONS=120,EPS=1e-6;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=(v,d=1000000)=>Math.round(v*d)/d;
 const neutral=()=>({t:0,z:1,tx:0,ty:0});
 const isLive=id=>typeof id==='string'&&id.startsWith('live-capture-');
 const near=(a,b)=>Math.max(Math.abs(a.z-b.z),Math.abs(a.tx-b.tx),Math.abs(a.ty-b.ty));
 function point(s){const [t,z,cx,cy,fx,fy,fw,fh]=s;return {t,z,tx:fx*(1-z)+fw*(.5-z*cx),ty:fy*(1-z)+fh*(.5-z*cy)};}
 function anchor(p){return p.z<=1+EPS?{scale:1,x:.5,y:.5}:{scale:clamp(p.z,1,MAX_ZOOM),x:clamp(-p.tx/(p.z-1),0,1),y:clamp(-p.ty/(p.z-1),0,1)};}
 function lerp(a,b,t){const f=clamp((t-a.t)/Math.max(EPS,b.t-a.t),0,1);return {t,z:a.z+(b.z-a.z)*f,tx:a.tx+(b.tx-a.tx)*f,ty:a.ty+(b.ty-a.ty)*f};}
 function compact(points,tolerance){if(points.length<3)return points;const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
  while(stack.length){const [a,b]=stack.pop();let best=tolerance,index=-1;for(let i=a+1;i<b;i++){const error=near(points[i],lerp(points[a],points[b],points[i].t));if(error>best){best=error;index=i;}}if(index>=0){keep.add(index);if(keep.size>MAX_KEYS*4)return null;stack.push([a,index],[index,b]);}}
  return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
 }
 function camera(frames,duration){
  const source=(frames||[]).filter(s=>s[0]<=duration);if(!source.some(s=>s[1]>1.0001))return {items:[],notice:''};
  if(source.some(s=>s[1]>MAX_ZOOM+.0001))return {items:[],notice:'Captured zoom exceeds the editor limit; camera history retained without automatic reconstruction.'};
  if(source.some(s=>s[1]>1.0001&&(Math.abs(s[4])>.001||Math.abs(s[5])>.001||Math.abs(s[6]-1)>.001||Math.abs(s[7]-1)>.001)))return {items:[],notice:'Zoomed letterboxed frames require crop-aware reconstruction; camera history retained.'};
  if(source[0][0]>.55||source.some((s,i)=>i&&s[0]-source[i-1][0]>.55)||duration-source.at(-1)[0]>.75)return {items:[],notice:'Camera samples contain gaps; history retained without automatic reconstruction.'};
  // Preserve neutral at the start, unless the first capture already contains a zoom.
  let points=[neutral()];for(const s of source){const p=point(s);if(p.t<MIN){if(points.length===1&&p.z>1.0001)points.push({...p,t:MIN});continue;}if(p.t-points.at(-1).t>=MIN-EPS)points.push(p);else if(near(p,points.at(-1))>EPS&&p.t===source.at(-1)[0]&&points.length>1){const prev=points.at(-2);if(p.t-prev.t>=MIN-EPS)points[points.length-1]=p;}}
  if(points.length<2)return {items:[],notice:'Recording too short to reconstruct camera motion.'};
  const reduced=compact(points,.006);if(!reduced)return {items:[],notice:'Camera path exceeds the editable keyframe budget; history retained.'};
  const items=[];let i=0;
  for(let n=1;n<reduced.length;n++){const a=reduced[n-1],b=reduced[n],delta=b.t-a.t;if(near(a,b)<EPS)continue;if(delta<MIN-EPS)continue;
   const pieces=Math.ceil(delta/5);for(let k=1;k<=pieces;k++){const begin=a.t+delta*(k-1)/pieces,end=a.t+delta*k/pieces,p=lerp(a,b,end);const start=round(begin),length=round(end)-start;if(length<MIN-EPS||start>=duration)continue;
    items.push({id:'live-camera-'+(++i),start,duration:round(length),...anchor(p),ease:'linear'});if(items.length>MAX_KEYS)return {items:[],notice:'Camera path exceeds 240 editable events; history retained.'};}}
  return {items,notice:items.length?'Camera reconstructed from sampled motion (approximate).':''};
 }
 function effects(states,duration){
  const list=[];for(let i=0;i<(states||[]).length;i++){const s=states[i],v=s[3],start=clamp(s[0],0,duration),end=clamp(states[i+1]?.[0]??duration,0,duration);if(!v||!v.spotlight&&!v.ring||end-start<.03999)continue;
   const style={spotlight:v.spotlight,ring:v.ring,pulse:v.ring,marker:'none',radius:v.radius,dim:v.dim,feather:v.feather,color:v.color,smooth:0,markerSize:1};
   const previous=list.at(-1);if(previous&&Math.abs(previous.end-start)<EPS&&JSON.stringify(previous.style)===JSON.stringify(style))previous.end=end;
   else list.push({id:'live-capture-'+list.length,start,end,enabled:true,style});
   if(list.length>MAX_REGIONS)return {items:[],notice:'Live effect settings exceed 120 regions; history retained without automatic reconstruction.'};
  }return {items:list,notice:''};
 }
 function rebuild(trace,duration){if(!Number.isFinite(duration)||duration<=0||duration>86400)throw Error('Invalid clean master duration');
  const meta=trace?.capture;if(trace?.baked||meta?.master!=='clean')throw Error('A clean master with compatible capture telemetry is required.');
  if(trace.truncated||meta.truncated)return {zoomFrames:[],regions:[],notices:['Capture telemetry is truncated; automatic reconstruction withheld.']};
  const z=meta.states.at(-1)?.[1]==='off'?{items:[],notice:'Capture retention ended; camera history retained without extrapolating motion.'}:camera(meta.cameraFrames,duration),fx=effects(meta.states,duration);
  return {zoomFrames:z.items,regions:fx.items,notices:[z.notice,fx.notice].filter(Boolean)};
 }
 const api=Object.freeze({isLive,camera,effects,rebuild});root.MangoCleanMasterV0752=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
