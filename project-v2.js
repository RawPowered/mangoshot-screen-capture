/* MangoShot v0.6 project schema. Referential, non-destructive and non-executable.
 * V2 secondary clips are staging metadata until multi-source compositor is shipped. */
(function(root){
 'use strict';
 const schema='mangoshot.project.v2';
 const tracks=[{id:'V3',kind:'video',order:3},{id:'V2',kind:'video',order:2},{id:'V1',kind:'video',order:1},
  {id:'G3',kind:'graphic',order:3},{id:'G2',kind:'graphic',order:2},{id:'A2',kind:'audio',order:2},{id:'A1',kind:'audio',order:1}];
 const copy=x=>JSON.parse(JSON.stringify(x));
 function check(project){
  if(!project||project.schema!==schema||project.version!==2)throw new Error('Unsupported project schema.');
  if(!Array.isArray(project.assets)||project.assets.length>200)throw new Error('Invalid media registry.');
  const ids=new Set();
  for(const a of project.assets){if(!root.MangoMediaAssets.validMeta(a)||ids.has(a.id))throw new Error('Invalid or duplicate media asset.');ids.add(a.id);}
  if(!project.timeline||!Array.isArray(project.timeline.clips)||project.timeline.clips.length>1500)throw new Error('Invalid timeline.');
  const clipIds=new Set(),knownTracks=new Map(tracks.map(x=>[x.id,x.kind]));
  for(const clip of project.timeline.clips){
   if(!clip||typeof clip.id!=='string'||!/^[\w-]{1,90}$/.test(clip.id)||clipIds.has(clip.id))throw new Error('Invalid clip identity.');
   clipIds.add(clip.id);if(!ids.has(clip.assetId))throw new Error('Timeline clip references missing asset.');
   const trackKind=knownTracks.get(clip.track);if(!trackKind||!['V1','V2','V3','A1','A2'].includes(clip.track))throw new Error('Unsupported media track.');
   const asset=project.assets.find(a=>a.id===clip.assetId);
   if(trackKind!==asset.kind&&!(asset.kind==='image'&&trackKind==='video')&&!(asset.kind==='video'&&trackKind==='audio'))throw new Error('Asset type does not match track.');
   if(!Number.isFinite(clip.start)||clip.start<0||!Number.isFinite(clip.end)||clip.end<=clip.start+.03||clip.end>864000||
      !Number.isFinite(clip.sourceIn)||clip.sourceIn<0||!Number.isFinite(clip.sourceOut)||clip.sourceOut<=clip.sourceIn+.03||
      !Number.isFinite(clip.opacity)||clip.opacity<0||clip.opacity>1||!Number.isFinite(clip.volume)||clip.volume<0||clip.volume>4)
    throw new Error('Invalid timeline clip timing or style.');
   if(asset.duration!=null&&clip.sourceOut>asset.duration+.2)throw new Error('Clip extends beyond source duration.');
   if(typeof clip.staged!=='boolean')throw new Error('Staging state is required.');
  }
  if(project.creative?.zoomFrames!=null){if(!root.MangoCreativeZoom)throw new Error('Camera schema unavailable');root.MangoCreativeZoom.check(project.creative.zoomFrames);}
  if(project.legacyV1!=null){if(!project.legacyV1||project.legacyV1.schema!=='mangoshot.project.v1'||!project.legacyV1.source||
    !Array.isArray(project.legacyV1.segments)||!Array.isArray(project.legacyV1.layers))throw new Error('Invalid legacy editing decisions.');}
  return copy(project);
 }
 function create({assets=[],clips=[],legacyV1=null}={}){
  return check({schema,version:2,created:new Date().toISOString(),assets:copy(assets),
   timeline:{tracks:copy(tracks),clips:copy(clips)},legacyV1:legacyV1?copy(legacyV1):null});
 }
 function fromV1(data,expectedSource,validator){
  if(!validator||typeof validator.check!=='function')throw new Error('v1 validation adapter is required.');
  const restored=validator.check(data,expectedSource);
  const src={id:'source-primary',kind:'video',name:'primary-recording.'+expectedSource.format,
   size:expectedSource.size,lastModified:0,mime:'video/'+expectedSource.format,duration:expectedSource.duration,width:null,height:null};
  let at=0;const clips=restored.segments.map((s,i)=>{const duration=s.end-s.start;
   const c={id:'v1-'+(i+1),assetId:src.id,track:'V1',start:at,end:at+duration,
    sourceIn:s.start,sourceOut:s.end,opacity:1,volume:1,staged:false};at+=duration;return c;});
  return create({assets:[src],clips,legacyV1:data});
 }
 function stage(project,asset,options={}){
  const draft=check(project);
  if(!draft.assets.some(a=>a.id===asset.id))throw new Error('Import the asset into the project first.');
  const track=asset.kind==='audio'?'A2':'V2',start=Math.max(0,Number(options.start)||0);
  const duration=asset.kind==='image'?5:asset.duration;
  if(!Number.isFinite(duration)||duration<=.03)throw new Error('Media duration is unavailable; wait for metadata or choose an image.');
  const end=start+duration;
  if(end>864000)throw new Error('Timeline extent too large.');
  const clip={id:options.id||('staged-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)),assetId:asset.id,track,
   start,end,sourceIn:0,sourceOut:duration,opacity:1,volume:1,staged:true};
  draft.timeline.clips.push(clip);return check(draft);
 }
 function unstage(project,id){const draft=check(project);draft.timeline.clips=draft.timeline.clips.filter(x=>x.id!==id||!x.staged);return check(draft);}
 root.MangoProjectV2={schema,tracks:copy(tracks),check,create,fromV1,stage,unstage};
})(typeof globalThis!=='undefined'?globalThis:this);
