/* Pure layer timing and stacking operations. Output/sequence time is seconds.
   All operations are independent of DOM, browser playback and storage. */
(function(root){
 const MIN=.08;
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 const finite=x=>Number.isFinite(x);
 function assertContext(layer,duration){
  if(!layer||!finite(layer.start)||!finite(layer.end)||!finite(duration)||duration<MIN)
   throw new Error('Layer or sequence time is invalid.');
 }
 function transform(layer,kind,delta,duration,track=layer.track){
  assertContext(layer,duration);
  if(!finite(delta)||![2,3].includes(track))throw new Error('Invalid timing or graphic track.');
  const len=layer.end-layer.start;
  if(len<MIN-.001||len>duration+.001)throw new Error('Layer duration is invalid.');
  let start=layer.start,end=layer.end;
  if(kind==='move'){
   start=clamp(start+delta,0,Math.max(0,duration-len));end=start+len;
  }else if(kind==='start'){
   start=clamp(start+delta,0,end-MIN);
  }else if(kind==='end'){
   end=clamp(end+delta,start+MIN,duration);
  }else throw new Error('Unknown layer tool.');
  return {...layer,start,end,track};
 }
 function snap(value,targets,tolerance){
  if(!finite(value)||!Array.isArray(targets)||!finite(tolerance)||tolerance<0)return value;
  let result=value,diff=tolerance+1e-9;
  for(const target of targets){if(!finite(target))continue;
   const d=Math.abs(target-value);if(d<=tolerance&&d<diff){result=target;diff=d;}}
  return result;
 }
 function anchors(layers,except,playhead,duration){
  const all=[0,duration,playhead];
  for(const l of layers){if(l.id===except)continue;all.push(l.start,l.end);}
  return all.filter(finite);
 }
 function snapTransform(layer,kind,delta,duration,otherLayers=[],playhead=null,tolerance=0,enabled=true,track=layer.track){
  let draft=transform(layer,kind,delta,duration,track);
  if(!enabled)return draft;
  const points=anchors(otherLayers,layer.id,playhead,duration);
  if(kind==='move'){
   const a=snap(draft.start,points,tolerance),b=snap(draft.end,points,tolerance);
   const offsets=[a-draft.start,b-draft.end].filter(x=>Math.abs(x)>1e-8);
   const offset=offsets.length?offsets.reduce((x,y)=>Math.abs(x)<Math.abs(y)?x:y):0;
   if(Math.abs(offset)<=tolerance)draft=transform(layer,'move',delta+offset,duration,track);
  }else{
   const key=kind==='start'?'start':'end';
   draft=transform(layer,kind,delta+snap(draft[key],points,tolerance)-draft[key],duration,track);
  }
  return draft;
 }
 function reorder(layers,id,direction){
  const list=layers.slice(),index=list.findIndex(l=>l.id===id);
  if(index<0)return list;
  const track=list[index].track;
  let neighbor=-1;
  if(direction>0){for(let j=index+1;j<list.length;j++)if(list[j].track===track){neighbor=j;break;}}
  else if(direction<0){for(let j=index-1;j>=0;j--)if(list[j].track===track){neighbor=j;break;}}
  if(neighbor>=0)[list[index],list[neighbor]]=[list[neighbor],list[index]];
  return list;
 }
 function placeAbove(layers,id,targetId){
  const list=layers.map(l=>({...l}));if(id===targetId)return list;
  const index=list.findIndex(l=>l.id===id),target=list.find(l=>l.id===targetId);
  if(index<0||!target)return list;
  const [moving]=list.splice(index,1);
  moving.track=target.track;
  const targetIndex=list.findIndex(l=>l.id===targetId);
  list.splice(targetIndex+1,0,moving);
  return list;
 }
 function changed(a,b){return a.start!==b.start||a.end!==b.end||a.track!==b.track;}
 root.MangoLayerOps={MIN,transform,snap,snapTransform,anchors,reorder,placeAbove,changed};
})(typeof globalThis!=='undefined'?globalThis:this);
