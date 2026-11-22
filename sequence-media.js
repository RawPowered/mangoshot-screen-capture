/* One timeline coordinate system for clips, thumbnails, waveform and preview.
 * Pure functions. Positions are SEQUENCE seconds except explicit source fields.
 */
(function(root){
 'use strict';
 const EPS=0.00001;
 function sections(parts){
  if(!Array.isArray(parts))throw new Error('Invalid sequence');
  let at=0;
  return parts.map((part,index)=>{
   if(!Number.isFinite(part.start)||!Number.isFinite(part.end)||part.end<=part.start)
    throw new Error('Invalid media segment');
   const length=part.end-part.start;
   const row={index,sourceStart:part.start,sourceEnd:part.end,outputStart:at,outputEnd:at+length,length};
   at+=length;return row;
  });
 }
 function duration(parts){return sections(parts).reduce((n,s)=>n+s.length,0);}
 function atOutput(parts,seconds){
  const rows=sections(parts);
  if(!rows.length||!Number.isFinite(seconds))return null;
  const d=rows[rows.length-1].outputEnd,t=Math.max(0,Math.min(d,seconds));
  // The exact cut boundary belongs to the next clip, not the deleted frame.
  const row=rows.find(s=>t<s.outputEnd-EPS)||rows[rows.length-1];
  return {source:Math.min(row.sourceEnd,row.sourceStart+Math.max(0,t-row.outputStart)),output:t,index:row.index,segment:row};
 }
 function atSource(parts,seconds){
  const rows=sections(parts);
  if(!Number.isFinite(seconds))return null;
  for(const row of rows){if(seconds>=row.sourceStart-EPS&&seconds<row.sourceEnd-EPS)
    return {source:seconds,output:row.outputStart+Math.max(0,seconds-row.sourceStart),index:row.index,segment:row};}
  const last=rows[rows.length-1];
  return last&&Math.abs(seconds-last.sourceEnd)<EPS?{source:seconds,output:last.outputEnd,index:last.index,segment:last}:null;
 }
 function thumbnailPlan(parts,count){
  const rows=sections(parts),d=rows.length?rows[rows.length-1].outputEnd:0;
  if(!d)return [];
  const n=Math.max(1,Math.min(160,Math.round(count)||1));
  return Array.from({length:n},(_,i)=>{
    const output=Math.min(d-.002,(i+.5)*d/n);
    const map=atOutput(parts,output);
    return {output,source:map.source,index:map.index};
  });
 }
 function peakSeries(parts,peaks,sourceSeconds,width){
  const rows=sections(parts),d=rows.length?rows[rows.length-1].outputEnd:0;
  const n=Math.max(1,Math.min(8192,Math.round(width)||1)),arr=new Float32Array(n);
  if(!d||!peaks?.length||!sourceSeconds)return arr;
  // Take maxima from samples INSIDE each retained sequence interval;
  // do not interpolate across deleted source-time gaps.
  for(let x=0;x<n;x++){
   const start=x*d/n,end=(x+1)*d/n;
   let peak=0;
   for(const row of rows){
    if(row.outputEnd<=start||row.outputStart>=end)continue;
    const a=row.sourceStart+Math.max(0,start-row.outputStart);
    const b=row.sourceStart+Math.min(row.length,end-row.outputStart);
    const ia=Math.max(0,Math.min(peaks.length-1,Math.floor(a/sourceSeconds*peaks.length)));
    const ib=Math.max(ia,Math.min(peaks.length-1,Math.ceil(b/sourceSeconds*peaks.length)-1));
    const stride=Math.max(1,Math.floor((ib-ia)/12));
    for(let k=ia;k<=ib;k+=stride)peak=Math.max(peak,peaks[k]);
    peak=Math.max(peak,peaks[ib]);
   }
   arr[x]=peak;
  }
  return arr;
 }
 function audioPeaks(samples,bins){
  if(!samples?.length)return new Float32Array(0);
  const n=Math.max(1,Math.min(24000,Math.round(bins)||2048));const out=new Float32Array(n);
  for(let i=0;i<n;i++){
   const from=Math.floor(i*samples.length/n),to=Math.min(samples.length,Math.ceil((i+1)*samples.length/n));
   const stride=Math.max(1,Math.floor((to-from)/48));
   let peak=0;for(let j=from;j<to;j+=stride)peak=Math.max(peak,Math.abs(samples[j]));
   out[i]=peak;
  }
  return out;
 }
 root.MangoSequenceMedia={sections,duration,atOutput,atSource,thumbnailPlan,peakSeries,audioPeaks};
})(typeof globalThis!=='undefined'?globalThis:this);
