/* Pure secondary clip and keyframe editing. All times are output seconds. */
(function(root){'use strict';
 const MIN=.1,EPS=.000001,copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite;
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function assert(c,m,track){if(!c||!m?.tracks[c.track]||!m.tracks[track]||c.locked||m.tracks[c.track].locked||m.tracks[track].locked)throw Error('Unlock the clip and destination track before editing.');if((c.track==='A2')!==(track==='A2'))throw Error('Audio and visual tracks cannot be exchanged.');}
 function transform(c,kind,delta,m,asset,length,track=c.track){
  assert(c,m,track);if(!finite(delta)||!finite(length)||length<MIN||!asset)throw Error('Invalid clip gesture.');
  const n={...c,track};
  if(kind==='move'){const span=c.end-c.start;n.start=clamp(c.start+delta,0,length-span);n.end=n.start+span;}
  else if(kind==='start'){const low=Math.max(0,c.start-c.sourceIn);n.start=clamp(c.start+delta,low,c.end-MIN);n.sourceIn=c.sourceIn+n.start-c.start;n.track=c.track;}
  else if(kind==='end'){const limit=asset.kind==='image'?length:Math.min(length,c.end+asset.duration-c.sourceOut);n.end=clamp(c.end+delta,c.start+MIN,limit);n.sourceOut=c.sourceOut+n.end-c.end;n.track=c.track;}
  else throw Error('Unknown clip gesture.');
  return n;
 }
 function snap(c,kind,delta,m,asset,length,track,anchors,tolerance){
  let n=transform(c,kind,delta,m,asset,length,track);if(!(tolerance>0))return n;
  const edges=kind==='move'?[n.start,n.end]:[n[kind]],points=[0,length,...anchors,...m.clips.filter(x=>x.id!==c.id).flatMap(x=>[x.start,x.end])].filter(finite);
  let best=null;
  for(const edge of edges)for(const a of points){const d=a-edge;if(Math.abs(d)<=tolerance&&(best===null||Math.abs(d)<Math.abs(best)))best=d;}
  return best===null?n:transform(c,kind,delta+best,m,asset,length,track);
 }
 function change(model,id,next){const m=copy(model),i=m.clips.findIndex(c=>c.id===id);if(i<0)throw Error('Clip no longer exists.');assert(m.clips[i],m,next?.track||m.clips[i].track);if(next)m.clips[i]={...next,id};else m.clips.splice(i,1);return m;}
 function removeRanges(ranges,length){if(!Array.isArray(ranges)||ranges.some(r=>!r||!finite(r.start)||!finite(r.end)||r.start<0||r.end>length+EPS||r.end<=r.start))throw Error('Invalid primary removal mapping.');
  const sorted=ranges.map(r=>({...r,end:Math.min(r.end,length)})).sort((a,b)=>a.start-b.start),merged=[];
  for(const r of sorted){const p=merged.at(-1);if(p&&r.start<=p.end+EPS)p.end=Math.max(p.end,r.end);else merged.push({...r});}return merged;}
 // Intersect each secondary clip with retained output intervals. For an
 // interior removal the split pieces keep their original source offsets.
 function ripple(model,ranges,length,expected,id=()=>root.crypto.randomUUID()){
  const removed=removeRanges(ranges,length),kept=[];let cursor=0,out=0;
  for(const r of removed){if(r.start>cursor){kept.push({start:cursor,end:r.start,out});out+=r.start-cursor;}cursor=r.end;}
  if(cursor<length){kept.push({start:cursor,end:length,out});out+=length-cursor;}
  if(Math.abs(out-expected)>.00001)throw Error('Primary edit mapping does not match new duration.');
  const m=copy(model),used=new Set(m.clips.map(c=>c.id)),result=[];
  for(const c of m.clips){const parts=[];for(const r of kept){const a=Math.max(c.start,r.start),b=Math.min(c.end,r.end);if(b-a<MIN-EPS)continue;
    const start=r.out+a-r.start,end=start+b-a;parts.push({...c,start,end,sourceIn:c.sourceIn+a-c.start,sourceOut:c.sourceIn+b-c.start});}
   const unchanged=parts.length===1&&['start','end','sourceIn','sourceOut'].every(k=>Math.abs(parts[0][k]-c[k])<EPS);
   if(unchanged){result.push(c);continue;}
   assert(c,m,c.track);
   for(const [i,p] of parts.entries()){if(i){let key=id();if(typeof key!=='string'||!/^[\w-]{1,90}$/.test(key)||used.has(key))throw Error('Duplicate split clip ID.');used.add(key);p.id=key;}result.push(p);}
  }
  m.clips=result;return m;
 }
 function keyTime(keys,index,value){
  if(!Array.isArray(keys)||!Number.isInteger(index)||!keys[index]||!finite(value))throw Error('Invalid keyframe timing.');
  const before=keys[index-1]?.t,after=keys[index+1]?.t,lo=before==null?0:before+.00001,hi=after==null?1:after-.00001;
  if(lo>hi)throw Error('Keyframes are too close to move.');
  return keys.map((k,i)=>i===index?{...k,t:clamp(value,lo,hi)}:{...k});
 }
 function decodeSignature(model,asset,framesFor,gif){
  // Position, opacity, locks and grades do not change the decoded source.
  return JSON.stringify(model.clips.map(c=>{const a=asset(c.assetId);return [c.id,c.assetId,a?.url||null,a?.kind||null,a?.kind==='video'||a&&gif(a)?c.sourceIn:null,a?.kind==='video'||a&&gif(a)?c.sourceOut:null,a&&a.kind!=='audio'?framesFor(c,a):0];}).sort((a,b)=>a[0].localeCompare(b[0])));
 }
 const api=Object.freeze({MIN,eq,transform,snap,change,ripple,removeRanges,keyTime,decodeSignature});
 root.MangoProfessionalTimelineV0717=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
