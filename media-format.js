/* Content-signature validation prevents misleading MP4/WebM extensions. */
(function(root){
 function typeFromHeader(bytes){
   if(!bytes || bytes.length<8)return null;
   if(bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return 'webm';
   if(bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70)return 'mp4';
   return null;
 }
 async function detect(blob){
   if(!blob?.size)return null;
   const header=new Uint8Array(await blob.slice(0,32).arrayBuffer());
   return typeFromHeader(header);
 }
 function unchanged(segments,duration){
   if(!Array.isArray(segments)||!segments.length||!Number.isFinite(duration)||duration<=0)return false;
   let cursor=0;
   for(const s of segments){if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start||Math.abs(s.start-cursor)>.01)return false;cursor=s.end;}
   return Math.abs(cursor-duration)<.01;
 }
 function fastCopy(sourceFormat,targetFormat,segments,duration){
   return !!sourceFormat&&sourceFormat===targetFormat&&unchanged(segments,duration);
 }
 root.MangoFormat={typeFromHeader,detect,unchanged,fastCopy};
})(typeof globalThis!=='undefined'?globalThis:this);
