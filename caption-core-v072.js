/* MangoShot Caption Studio v0.7.2 — local timed captions and SRT/VTT.
 * Captions are sequence-time editorial data, NOT HTML and NOT ASR results. */
(function(root){'use strict';
 const MAX=3000,EPS=.00001;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const presets={
  classic:{name:'Classic CC',font:'sans',size:44,color:'#ffffff',outline:'#050505',outlineWidth:4,background:'#000000b8',position:88,weight:700},
  creator:{name:'Creator Bold',font:'sans',size:58,color:'#f7ff8e',outline:'#151c19',outlineWidth:5,background:'transparent',position:80,weight:800},
  editorial:{name:'Editorial',font:'serif',size:46,color:'#ffffff',outline:'#101010',outlineWidth:2,background:'#10151ccc',position:84,weight:600},
  clean:{name:'Clean',font:'sans',size:42,color:'#ffffff',outline:'#101010',outlineWidth:3,background:'transparent',position:90,weight:600},
  mango:{name:'MangoShot',font:'sans',size:54,color:'#d4ff94',outline:'#142621',outlineWidth:4,background:'#152921c8',position:84,weight:800}
 };
 const fontMap={sans:'system-ui,Arial,sans-serif',serif:'Georgia,serif',mono:'ui-monospace,Consolas,monospace'};
 function style(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid caption style');
  const preset=Object.hasOwn(presets,value.preset)?value.preset:'classic';
  const p=presets[preset],v={...p,...value,preset};
  if(!Object.hasOwn(fontMap,v.font)||!Number.isFinite(v.size)||v.size<14||v.size>120||
   !Number.isFinite(v.outlineWidth)||v.outlineWidth<0||v.outlineWidth>12||
   !Number.isFinite(v.position)||v.position<40||v.position>96||![400,500,600,700,800].includes(v.weight)||
   !/^#[0-9a-f]{6}$/i.test(v.color)||!/^#[0-9a-f]{6}$/i.test(v.outline)||
   !(v.background==='transparent'||/^#[0-9a-f]{8}$/i.test(v.background)))
   throw new Error('Invalid caption appearance');
  return {preset:v.preset,font:v.font,size:v.size,color:v.color,outline:v.outline,
   outlineWidth:v.outlineWidth,background:v.background,position:v.position,weight:v.weight};
 }
 function check(items,duration=Infinity){
  if(!Array.isArray(items)||items.length>MAX)throw new Error('Too many captions');
  const ids=new Set();
  return items.map((raw,index)=>{
   const c=raw||{};
   if(typeof c.id!=='string'||!/^[-\w]{1,90}$/.test(c.id)||ids.has(c.id))throw new Error('Invalid caption ID');
   ids.add(c.id);
   if(typeof c.text!=='string'||!c.text.trim()||c.text.length>350||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(c.text))
    throw new Error('Invalid caption text');
   if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||
    c.end-c.start<.04||c.end>duration+.005)throw new Error('Invalid caption timing');
   return {id:c.id,start:c.start,end:c.end,text:c.text.trim()};
  }).sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
 }
 const nextId=()=> 'cc-'+(root.crypto?.randomUUID?.()||(''+Date.now()+'-'+Math.random().toString(36).slice(2,12)));
 function add(items,cue,duration){const v={id:nextId(),...cue};return check([...items,v],duration);}
 function update(items,id,changes,duration){const found=items.find(c=>c.id===id);if(!found)throw new Error('Caption not found');
  return check(items.map(c=>c.id===id?{...c,...changes,id:c.id}:c),duration);}
 function remove(items,id){return items.filter(c=>c.id!==id).map(c=>({...c}));}
 function ripple(items,start,end){
  const d=end-start;if(!Number.isFinite(start)||!Number.isFinite(end)||d<=0)return clone(items);
  const next=[];
  for(const c of items){
   if(c.end<=start+EPS)next.push({...c});
   else if(c.start>=end-EPS)next.push({...c,start:c.start-d,end:c.end-d});
   else if(c.start<start-EPS&&c.end>end+EPS)next.push({...c,end:c.end-d});
   else if(c.start<start-EPS){if(start-c.start>=.04)next.push({...c,end:start});}
   else if(c.end>end+EPS){if(c.end-end>=.04)next.push({...c,start,end:c.end-d});}
  }
  return next.sort((a,b)=>a.start-b.start);
 }
 function trim(items,start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  return items.flatMap(c=>{
   const a=Math.max(c.start,start),b=Math.min(c.end,end);
   return b-a>=.04?[{...c,start:a-start,end:b-start}]:[];
  }).sort((a,b)=>a.start-b.start||a.end-b.end);
 }
 function parseStamp(value){
  const m=String(value||'').trim().match(/^(?:(\d{1,3}):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if(!m)return null;const h=Number(m[1]||0),min=Number(m[2]),sec=Number(m[3]),ms=Number(m[4]);
  return min<60&&sec<60?h*3600+min*60+sec+ms/1000:null;
 }
 function parse(input,duration=Infinity){
  if(typeof input!=='string'||input.length>1024*1024)throw new Error('Subtitle text is too large');
  const raw=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  const isVtt=/^WEBVTT(?:\s|$)/.test(raw);
  const body=isVtt?raw.replace(/^WEBVTT[^\n]*(?:\n|$)/,''):raw;
  const blocks=body.split(/\n\s*\n+/);
  const result=[];
  for(const block of blocks){
   let lines=block.trim().split('\n');
   if(!lines.length||/^NOTE(?:\s|$)|^(?:STYLE|REGION)(?:\s|$)/.test(lines[0]))continue;
   const index=lines.findIndex(l=>l.includes('-->'));
   if(index<0)continue;
   const times=lines[index].match(/^\s*([^\s]+)\s*-->\s*([^\s]+)(?:\s+.*)?$/);
   if(!times)continue;
   const start=parseStamp(times[1]),end=parseStamp(times[2]);
   const text=lines.slice(index+1).join('\n').replace(/<[^>]*>/g,'').trim();
   if(start===null||end===null||end-start<.04||!text)continue;
   if(end>duration+.005)continue;
   if(result.length>=MAX)throw new Error('Subtitle file exceeds 3000 cues');
   result.push({id:'cc-import-'+(result.length+1),start,end,text:text.slice(0,350)});
  }
  if(!result.length)throw new Error('No valid caption cues in this SRT/WebVTT file');
  return check(result,duration);
 }
 const stamp=(seconds,vtt)=>{
  const ms=Math.round(seconds*1000),hh=Math.floor(ms/3600000),
   mm=Math.floor(ms%3600000/60000),ss=Math.floor(ms%60000/1000),frac=ms%1000;
  return [hh,mm,ss].map(n=>String(n).padStart(2,'0')).join(':')+(vtt?'.':',')+String(frac).padStart(3,'0');
 };
 function serialize(items,kind='srt'){
  const vtt=kind==='vtt';if(kind!=='srt'&&!vtt)throw new Error('Unsupported subtitle format');
  const checked=check(items);
  const data=checked.map((c,i)=>(vtt?'':String(i+1)+'\n')+
    stamp(c.start,vtt)+' --> '+stamp(c.end,vtt)+'\n'+c.text.replace(/\r/g,'')).join('\n\n');
  return (vtt?'WEBVTT\n\n':'')+data+'\n';
 }
 function active(items,time){return items.filter(c=>time>=c.start&&time<c.end).slice(0,3);}
 function draw(ctx,items,seconds,w,h,appearance=style()){
  if(!ctx||!Number.isFinite(seconds)||!w||!h)return;
  const cues=active(items,seconds);if(!cues.length)return;
  const a=style(appearance),scale=h/1080,fontsize=Math.max(13,a.size*scale);
  const maxWidth=w*.84,leading=fontsize*1.3,pad=fontsize*.24;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`${a.weight} ${fontsize}px ${fontMap[a.font]}`;
  const rows=[];
  for(const c of cues){
   for(const line of c.text.split('\n')){
    const words=line.split(/\s+/),part=[];
    for(const word of words){
     const proposed=[...part,word].join(' ');
     if(part.length&&ctx.measureText(proposed).width>maxWidth){rows.push(part.join(' '));part.length=0;}
     part.push(word);
    }
    if(part.length)rows.push(part.join(' '));
   }
  }
  const content=rows.slice(0,6),boxH=content.length*leading+pad*2;
  const bottom=clamp(h*a.position/100,boxH+4,h-3),top=bottom-boxH;
  if(a.background!=='transparent'){
   const widest=content.reduce((n,line)=>Math.max(n,ctx.measureText(line).width),0);
   ctx.fillStyle=a.background;
   ctx.fillRect((w-widest)/2-pad*2,top,widest+pad*4,boxH);
  }
  ctx.fillStyle=a.color;ctx.strokeStyle=a.outline;ctx.lineWidth=a.outlineWidth*scale;
  ctx.lineJoin='round';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=fontsize*.14;
  for(let i=0;i<content.length;i++){
   const y=top+pad+leading*(i+.5);
   if(ctx.lineWidth>0)ctx.strokeText(content[i],w/2,y);
   ctx.fillText(content[i],w/2,y);
  }
  ctx.restore();
 }
 root.MangoCaptionsV072={presets,style,check,add,update,remove,ripple,trim,parse,serialize,active,draw};
})(typeof globalThis!=='undefined'?globalThis:this);
