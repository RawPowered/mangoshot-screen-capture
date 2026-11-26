/* MangoShot: deterministic, non-destructive V1 sequence transactions.
 * Coordinates on the editing ruler are SEQUENCE seconds, never source seconds.
 * Every transaction returns video, graphics, markers and the next playhead.
 */
(function(root){
 const MIN=.04;
 const length=parts=>root.MangoEditOps.length(parts);
 function validate(parts,graphics,markers){
  if(!Array.isArray(parts)||!parts.length||!Array.isArray(graphics)||!Array.isArray(markers))throw new Error('No editable sequence.');
  const duration=length(parts);
  if(!Number.isFinite(duration)||duration<MIN)throw new Error('Sequence has no playable content.');
  return duration;
 }
 const clone=v=>v.map(x=>({...x}));
 function range(parts,graphics,markers,start,end){
  const duration=validate(parts,graphics,markers);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.0001||end-start<MIN)
   throw new Error('Select a valid range using In/Out or Shift+drag on the ruler.');
  if(end-start>=duration-MIN)throw new Error('Cannot delete the entire sequence. Trim or import a new recording instead.');
  const next=root.MangoEditOps.remove(parts,start,end);
  if(!next.length||length(next)<MIN)throw new Error('Deletion would leave an empty sequence.');
  const removed=end-start;
  return {segments:next,layers:root.MangoGraphics.ripple(graphics,start,end),
   markers:markers.flatMap(m=>m.time<start?[{...m}]:m.time>=end?[{...m,time:m.time-removed}]:[]),
   playhead:Math.min(start,length(next)),removed,removedRanges:[{start,end}]};
 }
 function clip(parts,graphics,markers,index){
  validate(parts,graphics,markers);
  if(!Number.isInteger(index)||index<0||index>=parts.length)throw new Error('Select a V1 video clip first.');
  const start=parts.slice(0,index).reduce((sum,p)=>sum+p.end-p.start,0);
  return range(parts,graphics,markers,start,start+parts[index].end-parts[index].start);
 }
 function trim(parts,graphics,markers,start,end){
  const duration=validate(parts,graphics,markers);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.0001||end-start<MIN)
   throw new Error('Choose a valid In/Out range before trimming.');
  const next=root.MangoEditOps.trim(parts,start,end);
  return {segments:next,layers:root.MangoGraphics.trim(graphics,start,end),
   markers:markers.filter(m=>m.time>=start&&m.time<end).map(m=>({...m,time:m.time-start})),playhead:0,removedRanges:[...(start>0?[{start:0,end:start}]:[]),...(end<duration?[{start:end,end:duration}]:[])]};
 }
 function edge(parts,graphics,markers,index,side,value,sourceDuration){
  validate(parts,graphics,markers);
  if(!Number.isInteger(index)||index<0||index>=parts.length)throw new Error('Unknown clip.');
  const before=parts[index],next=root.MangoTimeline.resize(parts,index,side,value,sourceDuration);
  const after=next[index],changed=side==='start'?after.start-before.start:before.end-after.end;
  if(changed<=.000001)return null;
  const begin=parts.slice(0,index).reduce((sum,s)=>sum+s.end-s.start,0);
  const cutStart=side==='start'?begin:begin+(before.end-before.start)-changed;
  // Removing a trim region has the same ripple effect on graphics and markers as deleting it.
  return {segments:next,layers:root.MangoGraphics.ripple(graphics,cutStart,cutStart+changed),
   markers:markers.flatMap(m=>m.time<cutStart?[{...m}]:m.time>=cutStart+changed?[{...m,time:m.time-changed}]:[]),
   playhead:Math.min(cutStart,length(next)),removed:changed,removedRanges:[{start:cutStart,end:cutStart+changed}]};
 }
 function bounds(parts,index){if(!Number.isInteger(index)||index<0||index>=parts.length)return null;
  const start=parts.slice(0,index).reduce((n,p)=>n+p.end-p.start,0);
  return {start,end:start+parts[index].end-parts[index].start};}
 root.MangoSequenceOps={range,clip,trim,edge,bounds};
})(typeof globalThis!=='undefined'?globalThis:this);
