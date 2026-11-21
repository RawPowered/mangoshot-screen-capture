/* MangoShot AutoCut: pure non-destructive analysis and sequence-time edit planner.
   Never changes source media; no network requests, AI, or server processing. */
(function(root){
 'use strict';
 const EPS=1e-5;
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const durationOf=segments=>segments.reduce((n,p)=>n+p.end-p.start,0);
 function merge(ranges,gap=0){
  const valid=ranges.filter(r=>finite(r.start)&&finite(r.end)&&r.end-r.start>EPS)
   .map(r=>({...r})).sort((a,b)=>a.start-b.start||a.end-b.end);
  const result=[];
  for(const r of valid){const prev=result[result.length-1];if(prev&&r.start<=prev.end+gap){prev.end=Math.max(prev.end,r.end);prev.reason=prev.reason===r.reason?r.reason:'combined';}
   else result.push(r);}
  return result;
 }
 function intervalsFromFlags(samples,opts={}){
  const {minDuration=1.2,padding=.18,cutBefore=.2,cutAfter=.2,sourceDuration=0,reason='silence'}=opts;
  if(!samples.length||!finite(sourceDuration)||sourceDuration<=0)return [];
  const frames=[...samples].sort((a,b)=>a.start-b.start);
  const result=[];let active=null;
  function flush(){if(!active)return;
   if(active.end-active.start>=minDuration){const start=clamp(active.start+padding,cutBefore,sourceDuration-cutAfter),end=clamp(active.end-padding,cutBefore,sourceDuration-cutAfter);
    if(end-start>=.08)result.push({start,end,reason});}active=null;}
  for(const sample of frames){if(!finite(sample.start)||!finite(sample.end)||sample.end<=sample.start)continue;
   if(sample.inactive){if(active&&sample.start<=active.end+.035)active.end=Math.max(active.end,sample.end);
    else{flush();active={start:sample.start,end:sample.end};}}
   else flush();}
  flush();return merge(result,.015);
 }
 // Fast but bounded channel decimation. The decoded PCM is never retained.
 function silence(audioBuffer,{thresholdDb=-38,minDuration=1.2,padding=.18,frameSeconds=.06}={}){
  const sr=audioBuffer?.sampleRate,channels=audioBuffer?.numberOfChannels,len=audioBuffer?.length;
  if(!finite(sr)||sr<4000||!Number.isInteger(channels)||channels<1||!Number.isInteger(len)||len<1)throw new Error('Decoded audio is not available.');
  const samplesPerFrame=Math.max(256,Math.round(sr*frameSeconds)),threshold=Math.pow(10,thresholdDb/20);
  const arrays=Array.from({length:Math.min(channels,2)},(_,i)=>audioBuffer.getChannelData(i));
  const samples=[];for(let pos=0;pos<len;pos+=samplesPerFrame){const end=Math.min(len,pos+samplesPerFrame),stride=Math.max(1,Math.floor((end-pos)/512));let sum=0,n=0;
   for(let i=pos;i<end;i+=stride){let v=0;for(const arr of arrays)v+=arr[i]**2;sum+=v/arrays.length;n++;}
   const rms=Math.sqrt(sum/Math.max(1,n));samples.push({start:pos/sr,end:end/sr,inactive:rms<threshold});}
  return intervalsFromFlags(samples,{minDuration,padding,sourceDuration:len/sr,reason:'silence'});
 }
 // Each visual observation measures the change FROM the previous frame.
 function stillFrames(observations,{minDuration=3,padding=.25,threshold=.009,sourceDuration}={}){
  if(!finite(sourceDuration)||sourceDuration<=0)return [];
  const samples=[];for(const f of observations){if(!finite(f.start)||!finite(f.end)||!finite(f.motion))continue;
   samples.push({start:f.start,end:f.end,inactive:f.motion<=threshold});}
  return intervalsFromFlags(samples,{minDuration,padding,sourceDuration,reason:'still screen'});
 }
 // Audio/visual suggestions are made in SOURCE time. Map to CURRENT SEQUENCE
 // time by intersecting each retained source segment. A source interval outside
 // the edited sequence must never cause deletion of unrelated material.
 function toSequence(sourceRanges,segments){const result=[];let cursor=0;
  for(const p of segments){for(const r of sourceRanges){const lo=Math.max(p.start,r.start),hi=Math.min(p.end,r.end);
    if(hi-lo>=.08)result.push({start:cursor+lo-p.start,end:cursor+hi-p.start,reason:r.reason});}
   cursor+=p.end-p.start;}
  return merge(result,.025);
 }
 function protectGraphics(candidates,layers){if(!layers?.length)return candidates;
  const visible=layers.filter(l=>l.visible!==false&&finite(l.start)&&finite(l.end)&&l.end>l.start);
  return candidates.flatMap(r=>{let fragments=[r];for(const layer of visible){fragments=fragments.flatMap(f=>{
    if(layer.start>=f.end||layer.end<=f.start)return [f];
    return [{...f,end:Math.min(f.end,layer.start)},{...f,start:Math.max(f.start,layer.end)}].filter(x=>x.end-x.start>=.25);
   });}return fragments;});
 }
 function proposals(sourceRanges,segments,layers=[],{protectOverlays=true,maxFraction=.7}={}){
  if(!Array.isArray(segments)||!segments.length)throw new Error('Load a video first.');
  const length=durationOf(segments);if(!finite(length)||length<=.1)return [];
  let candidates=toSequence(sourceRanges,segments)
   .map(r=>({...r,start:Math.max(.1,r.start),end:Math.min(length-.1,r.end)}))
   .filter(r=>r.end-r.start>=.18);
  if(protectOverlays)candidates=protectGraphics(candidates,layers);
  // Non-overlapping, bounded candidates in sequence time. Prefer longest
  // intervals if the safety budget would be exceeded; never remove all footage.
  candidates=merge(candidates,.02);
  const budget=Math.min(length-.35,length*clamp(maxFraction,.05,.85));let used=0,result=[];
  for(const r of [...candidates].sort((a,b)=>(b.end-b.start)-(a.end-a.start))){
   const available=budget-used;if(available<.18)break;
   const size=r.end-r.start;
   if(size<=available+.00001){result.push({...r,enabled:true});used+=size;}
  }
  return result.sort((a,b)=>a.start-b.start);
 }
 function apply(segments,layers,markers,ranges){
  if(!Array.isArray(ranges)||!ranges.length)throw new Error('No AutoCut ranges selected.');
  const ordered=merge(ranges).sort((a,b)=>b.start-a.start);
  if(!ordered.length)throw new Error('No valid AutoCut intervals were provided.');
  let current={segments,layers,markers,playhead:0};let removed=0;
  for(const interval of ordered){
   const tx=root.MangoSequenceOps.range(current.segments,current.layers,current.markers,interval.start,interval.end);
   current={segments:tx.segments,layers:tx.layers,markers:tx.markers,playhead:interval.start};removed+=tx.removed;
  }
  return {...current,playhead:Math.min(ordered[ordered.length-1].start,durationOf(current.segments)),removed,applied:ordered.length};
 }
 root.MangoAutoCut={silence,stillFrames,intervalsFromFlags,merge,toSequence,protectGraphics,proposals,apply};
})(typeof globalThis!=='undefined'?globalThis:this);
