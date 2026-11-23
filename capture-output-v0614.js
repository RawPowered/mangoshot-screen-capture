/* MangoShot v0.6.14: shared screenshot composition and explicitly user-directed
 * image clipboard. No network, tracking, automatic clipboard reads or remote upload.
 * The same pixel compositor is used by capture-result quick-copy and Image Studio.
 */
(function(root){'use strict';
 const MAX_PIXELS=48_000_000,MAX_EDGE=30_000,MAX_BLOB=40*1024*1024;
 const isImage=type=>['image/png','image/jpeg','image/webp'].includes(type);
 function canvas(w,h){
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||
    w>MAX_EDGE||h>MAX_EDGE||w*h>MAX_PIXELS)throw Error('Screenshot exceeds the supported image limit.');
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
 }
 function decode(dataUrl){
  if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/png;base64,'))
   return Promise.reject(Error('Invalid capture image data.'));
  return new Promise((resolve,reject)=>{const img=new Image();
   img.onload=()=>img.naturalWidth&&img.naturalHeight?resolve(img):reject(Error('Screenshot is empty.'));
   img.onerror=()=>reject(Error('Screenshot could not be decoded.'));
   img.src=dataUrl;
  });
 }
 async function compose(meta,frames,target){
  if(!meta||!Array.isArray(frames)||frames.length!==meta.frames||
     frames.some((f,i)=>f?.index!==i||typeof f.dataUrl!=='string'))
   throw Error('Capture is incomplete.');
  const first=await decode(frames[0].dataUrl),baseWidth=first.naturalWidth;
  const ratio=baseWidth/meta.width;
  if(!Number.isFinite(ratio)||ratio<=0||!Number.isFinite(meta.pageHeight))
   throw Error('Capture geometry is invalid.');
  const crop=meta.selection;
  const fullWidth=baseWidth,fullHeight=Math.round(meta.pageHeight*ratio);
  let originX=0,originY=0,w=fullWidth,h=fullHeight;
  if(crop){
   if(meta.full||frames.length!==1||[crop.x,crop.y,crop.width,crop.height].some(v=>!Number.isFinite(v))||
      crop.x<0||crop.y<0||crop.width<4||crop.height<4||
      crop.x+crop.width>meta.width+1||crop.y+crop.height>meta.pageHeight+1)
    throw Error('Selected screenshot area is invalid.');
   originX=Math.max(0,Math.floor(crop.x*ratio));originY=Math.max(0,Math.floor(crop.y*ratio));
   w=Math.min(fullWidth-originX,Math.round(crop.width*ratio));
   h=Math.min(fullHeight-originY,Math.round(crop.height*ratio));
  }
  const out=target||canvas(w,h);
  out.width=w;out.height=h;
  if(!w||!h||w*h>MAX_PIXELS||w>MAX_EDGE||h>MAX_EDGE)
   throw Error('Screenshot exceeds the supported image limit.');
  const ctx=out.getContext('2d');if(!ctx)throw Error('Canvas is unavailable.');
  if(crop){
   ctx.drawImage(first,originX,originY,w,h,0,0,w,h);
  }else{
   for(const frame of frames.slice().sort((a,b)=>a.index-b.index)){
    const bitmap=frame.index===frames[0].index?first:await decode(frame.dataUrl);
    const top=Math.round((meta.full?frame.scrollY:0)*ratio);
    const available=Math.min(bitmap.naturalHeight||bitmap.height,h-top);
    if(available>0)ctx.drawImage(bitmap,0,0,bitmap.naturalWidth||bitmap.width,available,0,top,w,available);
   }
  }
  return out;
 }
 function toBlob(c){
  if(!c?.width||!c.height||!c.toBlob)return Promise.reject(Error('Image is not ready.'));
  return new Promise((resolve,reject)=>c.toBlob(b=>b&&b.size?resolve(b):reject(Error('PNG encoding failed.')),'image/png'));
 }
 async function write(blobPromise){
  const png=Promise.resolve(blobPromise);
  if(root.navigator?.clipboard?.write&&typeof root.ClipboardItem==='function'){
   try{
    // ClipboardItem and navigator.clipboard.write are invoked synchronously from the
    // handler for manual copy. With clipboardWrite permission this also supports auto-copy.
    await root.navigator.clipboard.write([new root.ClipboardItem({'image/png':png})]);
    return 'clipboard';
   }catch(error){
    if(!root.browser?.clipboard?.setImageData)throw error;
   }
  }
  if(root.browser?.clipboard?.setImageData){
   const blob=await png;
   await root.browser.clipboard.setImageData(await blob.arrayBuffer(),'png');
   return 'browser-clipboard';
  }
  throw Error('PNG clipboard writing is unavailable. Use Copy again or Export PNG.');
 }
 async function read(){
  if(!root.navigator?.clipboard?.read)
   throw Error('Direct clipboard access is unavailable. Press Ctrl+V to paste an image instead.');
  const entries=await root.navigator.clipboard.read();
  for(const entry of entries){
   const match=entry.types?.find(isImage);
   if(match){const blob=await entry.getType(match);validateBlob(blob);return blob;}
  }
  throw Error('The clipboard has no PNG, JPEG or WebP image. Copy an image and try again.');
 }
 function validateBlob(blob){
  if(!blob||!isImage(blob.type)||!blob.size||blob.size>MAX_BLOB)
   throw Error('Choose a PNG, JPEG or WebP image under 40 MB.');
  return blob;
 }
 async function blobImage(blob){
  validateBlob(blob);
  const url=URL.createObjectURL(blob);
  try{
   const image=await new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);
    im.onerror=()=>reject(Error('Clipboard image could not be decoded.'));
    im.src=url;
   });
   const w=image.naturalWidth,h=image.naturalHeight;
   const target=canvas(w,h),ctx=target.getContext('2d');
   ctx.drawImage(image,0,0);
   return target;
  }finally{URL.revokeObjectURL(url);}
 }
 root.MangoCaptureOutputV0614={compose,toBlob,write,read,validateBlob,blobImage};
})(typeof globalThis!=='undefined'?globalThis:this);
