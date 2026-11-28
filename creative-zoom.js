/* Shared camera pose, exact retained-time mapping and Canvas2D rendering. */
(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),EPS=1e-8;
 const neutral=()=>({scale:1,x:.5,y:.5}),smooth=t=>t*t*(3-2*t);
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 function poseCheck(p){if(!p||!finite(p.scale,1,5)||!finite(p.x,0,1)||!finite(p.y,0,1))throw Error('Invalid camera boundary pose');return {scale:p.scale,x:p.x,y:p.y};}
 function curveCheck(v){if(!Array.isArray(v)||v.length!==2||!finite(v[0],0,1)||!finite(v[1],0,1)||v[1]-v[0]<=EPS)throw Error('Invalid camera easing interval');return [...v];}
 function check(items){if(!Array.isArray(items)||items.length>240)throw Error('Invalid zoom timeline (maximum 240 events)');
  const list=items.map(x=>{const e={id:x.id,start:Number(x.start),duration:Number(x.duration),scale:Number(x.scale),x:Number(x.x),y:Number(x.y),...(x.ease!=null?{ease:x.ease}:{}),...(x.from!=null?{from:poseCheck(x.from)}:{}),...(x.curve!=null?{curve:curveCheck(x.curve)}:{}),...(x.boundary===true?{boundary:true}:{}),...(x.slice===true?{slice:true}:{})};
   if(typeof e.id!=='string'||!/^[-\w]{1,90}$/.test(e.id)||!Number.isFinite(e.start)||e.start<0||!Number.isFinite(e.duration)||e.duration>5+EPS||(e.boundary?e.duration!==0:e.duration<(e.slice?EPS:.05)-EPS)||e.ease!=null&&!['linear','smooth'].includes(e.ease)||e.boundary&&(e.from||e.curve)||e.curve&&!e.from)throw Error('Invalid zoom event');poseCheck(e);return e;}).sort((a,b)=>a.start-b.start);
  if(new Set(list.map(e=>e.id)).size!==list.length)throw Error('Duplicate camera event ID');return list;
 }
 function nonOverlap(raw){const items=check(raw);for(let i=1;i<items.length;i++)if(items[i].start<items[i-1].start+items[i-1].duration-EPS||Math.abs(items[i].start-items[i-1].start)<EPS)throw Error('Resolve overlapping camera moves before editing their timing.');return items;}
 function phase(e,u){u=clamp(u,0,1);if(e.ease==='linear')return u;if(!e.curve)return smooth(u);const [a,b]=e.curve,lo=smooth(a),hi=smooth(b);return hi-lo>1e-14?(smooth(a+(b-a)*u)-lo)/(hi-lo):u;}
 function interpolate(e,from,u){const f=phase(e,u),scale=clamp(from.scale+(e.scale-from.scale)*f,1,5);
   if(e.ease==='linear'){if(scale<=1.000001)return neutral();return {scale,x:clamp((from.x*(from.scale-1)*(1-f)+e.x*(e.scale-1)*f)/(scale-1),0,1),y:clamp((from.y*(from.scale-1)*(1-f)+e.y*(e.scale-1)*f)/(scale-1),0,1)};}
   return {scale,x:clamp(from.x+(e.x-from.x)*f,0,1),y:clamp(from.y+(e.y-from.y)*f,0,1)};
 }
 function at(items,time){let before=neutral();for(const e of check(items)){if(time<e.start)return before;const next=poseCheck(e);if(e.duration>0&&time<e.start+e.duration)return interpolate(e,e.from||before,(time-e.start)/e.duration);before=next;}return before;}
 const same=(a,b)=>Math.abs(a.scale-b.scale)<EPS&&(Math.abs(a.scale-1)<EPS||Math.abs(a.x-b.x)<EPS&&Math.abs(a.y-b.y)<EPS);
 function retime(raw,ranges,length){
  if(!Array.isArray(ranges)||!Number.isFinite(length)||length<=0)throw Error('Invalid camera timing map');
  if(!ranges.length||!raw.length)return check(raw);
  const items=nonOverlap(raw),removed=[...ranges].sort((a,b)=>a.start-b.start),spans=[];let atOld=0,out=0;
  for(const r of removed){if(!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start<atOld-EPS||r.end<=r.start||r.end>length+EPS)throw Error('Invalid or overlapping removed camera ranges');if(r.start>atOld+EPS){spans.push({a:atOld,b:r.start,out});out+=r.start-atOld;}atOld=r.end;}
  if(atOld<length-EPS)spans.push({a:atOld,b:length,out});
  let before=neutral();const source=items.map(e=>{const from=e.from||before;before=poseCheck(e);return {e,from};}),result=[],used=new Set();let previous=neutral(),serial=0;
  const uid=preferred=>{if(preferred&&!used.has(preferred)){used.add(preferred);return preferred;}let v;do{v='retime-camera-'+(++serial);}while(used.has(v)||items.some(e=>e.id===v));used.add(v);return v;};
  for(const s of spans){
   const starts=source.some(({e})=>e.start<=s.a+EPS&&e.start+e.duration>s.a+EPS||Math.abs(e.start-s.a)<EPS);
   const initial=at(items,s.a);if(!starts&&!same(previous,initial)){result.push({id:uid(),start:s.out,duration:0,...initial,boundary:true});previous=initial;}
   for(const {e,from} of source){
    if(e.duration===0){if(e.start>=s.a-EPS&&e.start<s.b-EPS){result.push({...e,id:uid(e.id),start:s.out+Math.max(0,e.start-s.a)});previous=poseCheck(e);}continue;}
    const a=Math.max(s.a,e.start),b=Math.min(s.b,e.start+e.duration);if(b-a<=EPS)continue;
    const u=clamp((a-e.start)/e.duration,0,1),v=clamp((b-e.start)/e.duration,0,1),left=interpolate(e,from,u),right=interpolate(e,from,v);
    const whole=u<=EPS&&v>=1-EPS,entry={...e,id:uid(e.id),start:s.out+a-s.a,duration:b-a,...(whole?poseCheck(e):right)};
    if(!whole||e.from||!same(previous,left)){entry.from=left;if(!whole){entry.slice=true;if(e.ease!=='linear'){const [lo,hi]=e.curve||[0,1];entry.curve=curveCheck([clamp(lo+(hi-lo)*u,0,1),clamp(lo+(hi-lo)*v,0,1)]);}else delete entry.curve;}}
    result.push(entry);previous=poseCheck(entry);
   }
  }
  return nonOverlap(result);
 }
 function add(items,start,scale,x=.5,y=.5,duration=.4){return nonOverlap([...items,{id:'zoom-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),start,duration,scale,x,y}]);}
 function remove(items,id){return check(items.filter(e=>e.id!==id));}
 function ripple(items,start,end,length){if(end<=start)return check(items);return retime(items,[{start,end}],length??Math.max(end,...items.map(e=>e.start+e.duration)));}
 function draw(ctx,media,items,time,w,h){const z=at(items,time),x=z.x*w,y=z.y*h;ctx.save();ctx.translate(x,y);ctx.scale(z.scale,z.scale);ctx.translate(-x,-y);ctx.drawImage(media,0,0,w,h);ctx.restore();return z;}
 function preview(video,items,time){const z=at(items,time);if(video?.style){video.style.transformOrigin=(z.x*100)+'% '+(z.y*100)+'%';video.style.transform='scale('+z.scale+')';}return z;}
 root.MangoCreativeZoom={check,nonOverlap,at,add,remove,ripple,retime,draw,preview};
})(typeof globalThis!=='undefined'?globalThis:this);
