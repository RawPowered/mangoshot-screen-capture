/* Portable, source-linked edit decisions; no embedded media or executable content. */
(function(root){
 const valid=n=>Number.isFinite(n);
 const fail=m=>{throw new Error('Invalid project: '+m);};
 function check(data,source){
  if(!data||data.schema!=='mangoshot.project.v1')fail('unsupported schema');
  if(!data.source||!valid(data.source.size)||!valid(data.source.duration)||!['webm','mp4'].includes(data.source.format))fail('source metadata');
  if(data.source.size!==source.size||data.source.format!==source.format||Math.abs(data.source.duration-source.duration)>.1)fail('select the matching source video first');
  if(!Array.isArray(data.segments)||!data.segments.length||data.segments.length>500)fail('video segments');
  const segments=data.segments.map(s=>{
   if(!valid(s.start)||!valid(s.end)||s.start<0||s.end<=s.start+.02||s.end>source.duration+.02)fail('segment time range');
   return {start:s.start,end:s.end};
  });
  const length=segments.reduce((n,s)=>n+s.end-s.start,0);
  if(!Array.isArray(data.layers)||data.layers.length>200)fail('graphics layers');
  const ids=new Set();
  const layers=data.layers.map(l=>{
    if(typeof l.id!=='string'||l.id.length>120||ids.has(l.id))fail('layer ID');ids.add(l.id);
    if(!['text','callout'].includes(l.kind)||![2,3].includes(l.track))fail('layer type/track');
    if(typeof l.text!=='string'||l.text.length>400||typeof l.name!=='string'||l.name.length>100)fail('layer text');
    for(const key of ['start','end','x','y','width','opacity','fontSize','fadeIn','fadeOut','outlineWidth','shadow','tailX','tailLength']){
      if(!valid(l[key]))fail('numeric field '+key);
    }
    if(l.start<0||l.end>length+.03||l.end-l.start<.04)fail('layer timing');
    if(l.x<0||l.x>1||l.y<0||l.y>1||l.width<.1||l.width>1||l.opacity<0||l.opacity>1||l.fontSize<12||l.fontSize>220||l.tailX<0||l.tailX>1||l.tailLength<0||l.tailLength>200)fail('layer position/style');
    if(typeof l.background!=='string'||!(/^transparent$/i.test(l.background)||/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(l.background)))fail('background');
    if(typeof l.color!=='string'||!/^#[0-9a-f]{6}$/i.test(l.color))fail('text color');
    if(typeof l.outline!=='string'||!/^#[0-9a-f]{6}$/i.test(l.outline))fail('outline color');
    if(!(root.MangoCreativeV079?.font(l.font)?/^[2-9]00$/.test(String(l.weight)):['400','500','600','700','800'].includes(String(l.weight)))||l.fadeIn<0||l.fadeIn>10||l.fadeOut<0||l.fadeOut>10)fail('weight/fade');
    if(typeof l.visible!=='boolean'||typeof l.locked!=='boolean')fail('layer toggles');
    if(!(['sans','mono','serif','rounded','condensed','display','handwritten'].includes(l.font)||root.MangoCreativeV079?.font(l.font))||!['left','right','center'].includes(l.align))fail('font/alignment');
    if(l.motion!=null){if(!root.MangoMotion)fail('motion schema unavailable');root.MangoMotion.checkLayer(l.motion);}
    if(l.premium!=null){if(!root.MangoPremium)fail('premium schema unavailable');root.MangoPremium.validate(l.premium);}
    return {...l};
  });
  const markers=Array.isArray(data.markers)?data.markers:[];
  if(markers.length>500||markers.some(m=>!valid(m.time)||m.time<0||m.time>length||typeof m.label!=='string'||m.label.length>120))fail('markers');
  if(data.transitions?.length&&!root.MangoMotion)fail('motion schema unavailable');
  const transitions=root.MangoMotion?.checkTransitions?.(data.transitions||[])||[];
  const boundaries=new Set(segments.slice(1).map((p,i)=>segments[i].end.toFixed(5)+':'+p.start.toFixed(5)));
  if(transitions.some(t=>!boundaries.has(t.fromEnd.toFixed(5)+':'+t.toStart.toFixed(5))))fail('transition boundary');
  return {segments,layers,markers,transitions};
 }
 function pack(source,segments,layers,markers=[],transitions=[]){return {schema:'mangoshot.project.v1',created:new Date().toISOString(),source,segments,layers,markers,transitions};}
 root.MangoProject={check,pack};
})(typeof globalThis!=='undefined'?globalThis:this);
