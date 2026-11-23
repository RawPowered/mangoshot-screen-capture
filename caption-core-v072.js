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
  const p=presets[preset],v={...p,highlightColor:'#ffd05c',wordHighlight:true,...value,preset};
  if(!Object.hasOwn(fontMap,v.font)||!Number.isFinite(v.size)||v.size<14||v.size>120||
   !Number.isFinite(v.outlineWidth)||v.outlineWidth<0||v.outlineWidth>12||
   !Number.isFinite(v.position)||v.position<40||v.position>96||![400,500,600,700,800].includes(v.weight)||
   !/^#[0-9a-f]{6}$/i.test(v.color)||!/^#[0-9a-f]{6}$/i.test(v.outline)||
   !/^#[0-9a-f]{6}$/i.test(v.highlightColor)||typeof v.wordHighlight!=='boolean'||
   !(v.background==='transparent'||/^#[0-9a-f]{8}$/i.test(v.background)))
   throw new Error('Invalid caption appearance');
  return {preset:v.preset,font:v.font,size:v.size,color:v.color,outline:v.outline,
   outlineWidth:v.outlineWidth,background:v.background,position:v.position,weight:v.weight,
   highlightColor:v.highlightColor,wordHighlight:v.wordHighlight};
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
   let words;
   if(c.words!=null){
    if(!Array.isArray(c.words)||c.words.length>120)throw new Error('Invalid caption word timestamps');
    words=c.words.map(w=>{
     if(!w||typeof w.text!=='string'||!w.text.trim()||w.text.length>80||
      !Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<c.start-.005||
      w.end>c.end+.005||w.end-w.start<.02)throw new Error('Invalid caption word timing');
     return {text:w.text.trim(),start:w.start,end:w.end};
    });
   }
   return {id:c.id,start:c.start,end:c.end,text:c.text.trim(),...(words?.length?{words}:{})};
  }).sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
 }
 const nextId=()=> 'cc-'+(root.crypto?.randomUUID?.()||(''+Date.now()+'-'+Math.random().toString(36).slice(2,12)));
 function add(items,cue,duration){const v={id:nextId(),...cue};return check([...items,v],duration);}
 function update(items,id,changes,duration){const found=items.find(c=>c.id===id);if(!found)throw new Error('Caption not found');
  return check(items.map(c=>{
   if(c.id!==id)return c;
   // A user rewrite invalidates ASR token alignment; do not highlight
   // unrelated words or persist stale timestamps after a manual edit.
   const next={...c,...changes,id:c.id};
   if(Object.hasOwn(changes,'text')&&changes.text!==c.text)delete next.words;
   if(Object.hasOwn(changes,'start')||Object.hasOwn(changes,'end')){
    // Explicit cue time edits change the phrase boundary. Drop alignment
    // until word timing is manually corrected or transcription is rerun.
    if(next.start!==c.start||next.end!==c.end)delete next.words;
   }
   return next;
  }),duration);}
 function remove(items,id){return items.filter(c=>c.id!==id).map(c=>({...c}));}
 function ripple(items,start,end){
  const d=end-start;if(!Number.isFinite(start)||!Number.isFinite(end)||d<=0)return clone(items);
  const moveWord=w=>{
   if(w.end<=start+EPS)return {...w};
   if(w.start>=end-EPS)return {...w,start:w.start-d,end:w.end-d};
   if(w.start<start-EPS&&w.end>end+EPS)return {...w,end:w.end-d};
   if(w.start<start-EPS)return start-w.start>=.02?{...w,end:start}:null;
   if(w.end>end+EPS)return w.end-end>=.02?{...w,start,end:w.end-d}:null;
   return null;
  };
  const next=[];
  for(const c of items){
   let shifted=null;
   if(c.end<=start+EPS)shifted={...c};
   else if(c.start>=end-EPS)shifted={...c,start:c.start-d,end:c.end-d};
   else if(c.start<start-EPS&&c.end>end+EPS)shifted={...c,end:c.end-d};
   else if(c.start<start-EPS&&start-c.start>=.04)shifted={...c,end:start};
   else if(c.end>end+EPS&&c.end-end>=.04)shifted={...c,start,end:c.end-d};
   if(!shifted)continue;
   if(Array.isArray(c.words)){
    const words=c.words.map(moveWord).filter(Boolean).filter(w=>w.start>=shifted.start-.005&&w.end<=shifted.end+.005);
    shifted.words=words;
    if(words.length)shifted.text=words.map(w=>w.text).join(' ').slice(0,350);
   }
   next.push(shifted);
  }
  return next.sort((a,b)=>a.start-b.start||a.end-b.end);
 }
 function trim(items,start,end){
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  return items.flatMap(c=>{
   const a=Math.max(c.start,start),b=Math.min(c.end,end);
   if(b-a<.04)return [];
   const next={...c,start:a-start,end:b-start};
   if(Array.isArray(c.words)){
    next.words=c.words.flatMap(w=>{
     const lo=Math.max(a,w.start),hi=Math.min(b,w.end);
     return hi-lo>=.02?[{text:w.text,start:lo-start,end:hi-start}]:[];
    });
    if(next.words.length)next.text=next.words.map(w=>w.text).join(' ').slice(0,350);
   }
   return [next];
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
  const wordCue=cues.length===1&&Array.isArray(cues[0].words)&&cues[0].words.length&&a.wordHighlight?cues[0]:null;
  let wordIndex=0;
  for(let i=0;i<content.length;i++){
   const y=top+pad+leading*(i+.5);
   if(!wordCue){
    if(ctx.lineWidth>0)ctx.strokeText(content[i],w/2,y);
    ctx.fillText(content[i],w/2,y);continue;
   }
   const tokens=content[i].split(/\s+/),spaceWidth=ctx.measureText(' ').width;
   const full=ctx.measureText(content[i]).width;let x=(w-full)/2;
   for(const token of tokens){
    const match=wordCue.words[wordIndex++];
    const active=match&&seconds>=match.start&&seconds<match.end;
    ctx.fillStyle=active?a.highlightColor:a.color;
    const text=token||'';
    const width=ctx.measureText(text).width;
    if(ctx.lineWidth>0)ctx.strokeText(text,x+width/2,y);
    ctx.fillText(text,x+width/2,y);
    x+=width+spaceWidth;
   }
  }
  ctx.restore();
 }
 root.MangoCaptionsV072={presets,style,check,add,update,remove,ripple,trim,parse,serialize,active,draw};
})(typeof globalThis!=='undefined'?globalThis:this);
