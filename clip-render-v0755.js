/* One committed-frame composition path for preview and export.
 * No UI drafts or selection outlines enter export. */
(function(root){'use strict';
 function compose({ctx,media,width:w,height:h,time,transition,zoom,grade,cursor,secondary,graphics,strict=false,running=false}){
  if(!ctx||!Number.isFinite(time)||time<0||!w||!h)throw Error('Invalid composition frame');
  if(!media||media.readyState<2||media.seeking){if(strict)throw Error('Decoded primary frame unavailable; export stopped.');return {ready:false,cursor:false,zoom:false};}
  ctx.save();try{
   ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
   ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
   let z=null,transitionPainted=false;
   const overlay=pose=>{z=pose;transitionPainted=cursor?.(ctx,time,pose,w,h)===true||transitionPainted;};
   const inTransition=transition?.(ctx,media,time,w,h,overlay)===true;
   if(!inTransition)z=zoom(ctx,media,time,w,h);
   grade?.(ctx,time,w,h);
   const painted=inTransition?transitionPainted:cursor?.(ctx,time,z,w,h)===true;
   if(secondary&&secondary(ctx,time,w,h,strict,running)===false){if(strict)throw Error('Secondary composition unavailable');return {ready:false,cursor:false,zoom:false};}
   graphics?.(ctx,time,w,h);
   return {ready:true,cursor:painted,zoom:!!z&&Math.abs(z.scale-1)>.0001,transition:inTransition};
  }finally{ctx.restore();}
 }
 function coverage(trace,regions,parts){const c=root.MangoCursorCaptureV0751;if(!c||!trace)return {seconds:0,regions:0};const enabled=(regions||[]).filter(r=>r.enabled&&(r.style.spotlight&&r.style.dim>0||r.style.ring||r.style.pulse||r.style.marker!=='none'));const path=c.pathIntervals(trace.samples,86400),intervals=c.projectIntervals(path,parts),fx=c.projectIntervals(enabled,parts);let seconds=0;for(const r of fx)for(const p of intervals){if(p.start>=r.end)break;seconds+=Math.max(0,Math.min(p.end,r.end)-Math.max(p.start,r.start));}return {seconds,regions:enabled.length};}
 function stats(){return {frames:0,cursor:0,zoom:0,transitions:0};}
 function count(s,r){if(!r.ready)return;s.frames++;if(r.cursor)s.cursor++;if(r.zoom)s.zoom++;if(r.transition)s.transitions++;}
 function clipTail(trace,duration,partialThrough=null){
  if(partialThrough!==null){const end=Math.max(0,Math.min(duration,partialThrough));const limit=Math.floor(end*1000)/1000;
   const trim=a=>(a||[]).filter(s=>s[0]<limit);
   const closePath=a=>{const p=trim(a);if(p.length&&p.at(-1)[1]!==null){if(p.length===60000)p.pop();p.push([limit,null,null]);}return p;};
   const meta=trace.capture?{...trace.capture,sourceSamples:closePath(trace.capture.sourceSamples),sourceClicks:trim(trace.capture.sourceClicks),cameraFrames:trim(trace.capture.cameraFrames),states:trim(trace.capture.states)}:null;
   if(meta?.states.length&&meta.states.at(-1)[1]!=='off'){const epoch=meta.states.at(-1)[2];if(meta.states.length===6000)meta.states.pop();meta.states.push([limit,'off',epoch,null]);}
   return {trace:{...trace,samples:closePath(trace.samples),clicks:trim(trace.clicks),...(meta?{capture:meta}:{})},trimmed:true};
  }
  const lists=[trace.samples,trace.clicks||[],...(trace.capture?['sourceSamples','sourceClicks','cameraFrames','states'].map(k=>trace.capture[k]):[])];
  const max=Math.max(0,...lists.map(a=>a.at(-1)?.[0]||0));if(max<=duration+.5)return {trace,trimmed:false};const tolerance=Math.min(2,Math.max(.5,duration*.01));
  if(max-duration>tolerance)throw Error('Cursor timing exceeds verified source duration by '+(max-duration).toFixed(2)+'s');
  const trim=a=>a.filter(s=>s[0]<=duration);
  return {trace:{...trace,samples:trim(trace.samples),clicks:trim(trace.clicks||[]),...(trace.capture?{capture:{...trace.capture,...Object.fromEntries(['sourceSamples','sourceClicks','cameraFrames','states'].map(k=>[k,trim(trace.capture[k])]))}}:{})},trimmed:true};
 }
 const api=Object.freeze({compose,coverage,stats,count,clipTail});root.MangoClipRenderV0755=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
