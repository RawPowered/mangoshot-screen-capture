/* MangoShot v0.6 media registry: local asset references only. No remote traffic. */
(function(root){
 'use strict';
 const types={image:['png','jpg','jpeg','webp','avif','gif'],video:['mp4','webm','ogv','mov'],audio:['mp3','wav','ogg','m4a','aac','flac','webm']};
 const cap=200;
 function typeOf(name,mime=''){
  const ext=String(name||'').toLowerCase().split('.').pop(),m=String(mime||'').toLowerCase();
  if(types.image.includes(ext)&&(!m||m.startsWith('image/')))return 'image';
  if(types.video.includes(ext)&&(!m||m.startsWith('video/')))return 'video';
  if(types.audio.includes(ext)&&(!m||m.startsWith('audio/')))return 'audio';
  return null;
 }
 function safeName(name){return String(name||'untitled').replace(/[\x00-\x1f<>]/g,'').slice(0,180)||'untitled';}
 function validMeta(a){return a&&typeof a.id==='string'&&/^[\w-]{1,90}$/.test(a.id)&&
   typeof a.name==='string'&&a.name.length>0&&a.name.length<=180&&
   ['image','video','audio'].includes(a.kind)&&Number.isFinite(a.size)&&a.size>=0&&a.size<=8*1024**3&&
   Number.isFinite(a.lastModified)&&a.lastModified>=0&&
   (a.duration==null||(Number.isFinite(a.duration)&&a.duration>=0&&a.duration<864000))&&
   (a.width==null||(Number.isFinite(a.width)&&a.width>=0&&a.width<=32768))&&
   (a.height==null||(Number.isFinite(a.height)&&a.height>=0&&a.height<=32768))&&
   typeof a.mime==='string'&&a.mime.length<=120;
 }
 const signature=a=>[a.name,a.size,a.lastModified,a.kind].join(':');
 function create(opts={}){
  const URLApi=opts.URLApi||root.URL;
  const id=opts.id||(()=>root.crypto?.randomUUID?.()||('asset-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)));
  const list=[],subscribers=new Set();
  const emit=()=>{for(const fn of subscribers)fn(list.map(x=>({...x,blob:undefined})));};
  const get=key=>list.find(a=>a.id===key)||null;
  const info=a=>{const {blob,url,...meta}=a;return {...meta};};
  const snapshot=()=>list.map(info);
  const clear=()=>{for(const a of list)if(a.url)URLApi?.revokeObjectURL?.(a.url);list.length=0;emit();};
  function register(file,preferredId){
   if(!file||!Number.isFinite(file.size)||file.size<=0)throw new Error('Choose a nonempty media file.');
   if(file.size>8*1024**3)throw new Error('This file exceeds the 8 GiB local media limit.');
   const kind=typeOf(file.name,file.type);
   if(!kind)throw new Error('Unsupported media file. Use PNG/JPEG/WebP/AVIF/GIF, MP4/WebM/MOV/OGV, or common audio formats.');
   const meta={id:preferredId||id(),kind,name:safeName(file.name),size:file.size,
    lastModified:Number.isFinite(file.lastModified)?file.lastModified:0,mime:file.type||'',duration:null,width:null,height:null};
   if(!validMeta(meta))throw new Error('Invalid asset metadata.');
   const existing=list.find(a=>signature(a)===signature(meta));
   if(existing){if(existing.missing)relink(existing.id,file);return {asset:info(existing),duplicate:true};}
   if(list.length>=cap)throw new Error('Media bin is full (200 assets).');
   if(get(meta.id))throw new Error('Duplicate media ID.');
   const url=URLApi?.createObjectURL?.(file);
   if(!url)throw new Error('Local media preview URLs are unavailable.');
   const entry={...meta,blob:file,url,missing:false};list.push(entry);emit();return {asset:info(entry),duplicate:false};
  }
  function addPlaceholder(meta){
   if(!validMeta(meta))throw new Error('Invalid saved media metadata.');
   if(get(meta.id))throw new Error('Duplicate media ID.');
   if(list.length>=cap)throw new Error('Media bin is full.');
   list.push({...info(meta),blob:null,url:null,missing:true});emit();return info(get(meta.id));
  }
  function relink(key,file){
   const a=get(key);if(!a)throw new Error('Unknown media asset.');
   if(!file||file.size!==a.size||safeName(file.name)!==a.name||typeOf(file.name,file.type)!==a.kind)
    throw new Error('Relink requires the same filename, size and compatible media type.');
   if(a.url)URLApi?.revokeObjectURL?.(a.url);
   a.url=URLApi?.createObjectURL?.(file);a.blob=file;a.missing=false;a.mime=file.type||a.mime;emit();return info(a);
  }
  function remove(key){const i=list.findIndex(a=>a.id===key);if(i<0)return false;
   if(list[i].url)URLApi?.revokeObjectURL?.(list[i].url);list.splice(i,1);emit();return true;}
  function updateMeta(key,fields){const a=get(key);if(!a)throw new Error('Unknown media asset.');
   const allowed=['duration','width','height'];for(const f of Object.keys(fields))if(!allowed.includes(f))throw new Error('Metadata field is read-only: '+f);
   if(!validMeta({...a,...fields}))throw new Error('Invalid dimensions or duration.');
   Object.assign(a,fields);emit();return info(a);}
  return {register,addPlaceholder,relink,remove,clear,get,updateMeta,snapshot,
   subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);},count:()=>list.length};
 }
 root.MangoMediaAssets={create,typeOf,validMeta,safeName};
})(typeof globalThis!=='undefined'?globalThis:this);
