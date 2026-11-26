/* MangoShot v0.6.12: local image layer assets, non-destructive alpha masks and flat-background cutout.
 * No cloud, network, remote model or third-party library.
 * "Quick Cutout" is chromatic connected-region cleanup, NOT AI segmentation.
 */
(function(root){'use strict';
 const assets=new Map(),masks=new Map();
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):min));
 const id=()=>root.crypto?.randomUUID?.()||'asset-'+Date.now()+'-'+Math.floor(Math.random()*1e7);
 const freshCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const imageTypes=new Set(['image/png','image/jpeg','image/webp']);
 function checkFile(file){
  if(!file||!imageTypes.has(file.type))throw Error('Import PNG, JPEG or WebP images only.');
  if(file.size>20*1024*1024||file.size<1)throw Error('Image must be between 1 byte and 20 MB.');
  return true;
 }
 async function importFile(file){
  checkFile(file);
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();
   await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(Error('The imported image could not be decoded.'));
    image.src=url;
   });
   const width=image.naturalWidth,height=image.naturalHeight;
   if(!width||!height||width>8192||height>8192||width*height>24000000)
    throw Error('Image exceeds the 24 megapixel layer limit; resize before importing.');
   const assetId=id();assets.set(assetId,{image,width,height,name:String(file.name||'Image').slice(0,120),version:0});
   return {type:'image',assetId,id:'layer-'+assetId,name:String(file.name||'Imported image').slice(0,120),
    points:[{x:0,y:0,p:1}],width,height,visible:true,locked:false,opacity:1,
    mask:{paths:[],feather:0},cutoutKey:null};
  }finally{URL.revokeObjectURL(url);}
 }
 function asset(stroke){return assets.get(stroke?.assetId)||null;}
 function bounds(stroke){return {x:stroke.points?.[0]?.x||0,y:stroke.points?.[0]?.y||0,
  width:Math.max(1,Number(stroke.width)||asset(stroke)?.width||1),
  height:Math.max(1,Number(stroke.height)||asset(stroke)?.height||1)};}
 function hit(stroke,x,y,pad=8){if(stroke?.type!=='image')return false;const b=bounds(stroke);
  return x>=b.x-pad&&y>=b.y-pad&&x<=b.x+b.width+pad&&y<=b.y+b.height+pad;}
 function normalize(stroke,x,y){const b=bounds(stroke);return {x:clamp((x-b.x)/b.width,0,1),y:clamp((y-b.y)/b.height,0,1)};}
 const maskedCache=new WeakMap();
 function circlePath(ctx,points,radius,w,h){
  if(!points?.length)return;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(1,radius*Math.min(w,h)*2);
  // A click or repeated stationary samples must paint a real disk.
  ctx.beginPath();ctx.arc(points[0].x*w,points[0].y*h,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();
  if(points.length===1)return;
  ctx.beginPath();ctx.moveTo(points[0].x*w,points[0].y*h);
  for(const p of points.slice(1))ctx.lineTo(p.x*w,p.y*h);
  ctx.stroke();
 }
 function makeMask(stroke,item,w,h){
  const mask=freshCanvas(w,h),ctx=mask.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  // Automatically removed flat-color regions are a separate editable matte.
  if(stroke.cutoutKey&&masks.has(stroke.cutoutKey)){
   const quick=masks.get(stroke.cutoutKey),off=freshCanvas(quick.width,quick.height),oc=off.getContext('2d');
   const pixels=oc.createImageData(quick.width,quick.height);
   for(let i=0;i<quick.data.length;i++){const j=i*4;pixels.data[j]=255;pixels.data[j+1]=255;
    pixels.data[j+2]=255;pixels.data[j+3]=quick.data[i];}
   oc.putImageData(pixels,0,0);
   ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,w,h);
  }
  for(const path of stroke.mask?.paths||[]){
   ctx.globalCompositeOperation=path.mode==='restore'?'source-over':'destination-out';
   ctx.strokeStyle='#fff';ctx.fillStyle='#fff';
   circlePath(ctx,path.points,clamp(path.radius,.001,.5),w,h);
  }
  ctx.globalCompositeOperation='source-over';
  return mask;
 }
 function composite(stroke){
  const item=asset(stroke);if(!item)return null;
  const b=bounds(stroke),paths=stroke.mask?.paths||[],last=paths.at(-1);
  const R=root.MangoRasterLayerV0727,recipe=stroke.rasterFx?R.key(stroke.rasterFx):'';
  const source=stroke.rasterFx?R.source(item,stroke.rasterFx):item.image;
  const S=root.MangoSelectionV0728,selection=S?.active(stroke.selectionMask)?stroke.selectionMask:null;
  if(!paths.length&&!stroke.cutoutKey&&!selection)return source;
  // Import stays source-resolution for clean edges; max 16MP temporary canvas to avoid huge allocations.
  const factor=selection&&!paths.length&&!stroke.cutoutKey?1:Math.min(1,4096/item.width,4096/item.height,Math.sqrt(16000000/(item.width*item.height)));
  const w=Math.max(1,Math.round(item.width*factor)),h=Math.max(1,Math.round(item.height*factor));
  const key=[item.version,recipe,selection?JSON.stringify(selection):'',stroke.cutoutKey||'',w,h,paths.length,last?.points?.length||0,
   last?.points?.at(-1)?.x||0,last?.points?.at(-1)?.y||0,stroke.mask?.feather||0].join(':');
  const prior=maskedCache.get(stroke);if(prior?.key===key)return prior.canvas;
  const output=freshCanvas(w,h),ctx=output.getContext('2d');
  ctx.drawImage(source,0,0,w,h);
  if(paths.length||stroke.cutoutKey){const mask=makeMask(stroke,item,w,h);
   ctx.globalCompositeOperation='destination-in';const feather=clamp(stroke.mask?.feather||0,0,20);
   if(feather)ctx.filter='blur('+feather*factor+'px)';ctx.drawImage(mask,0,0);ctx.filter='none';ctx.globalCompositeOperation='source-over';mask.width=mask.height=1;
  }
  if(selection)S.apply(ctx,selection,item.width,item.height);
  maskedCache.set(stroke,{key,canvas:output});
  return output;
 }
 function paint(ctx,stroke){
  if(stroke.type!=='image'||stroke.visible===false)return;
  const image=composite(stroke);if(!image)return;
  const b=bounds(stroke);ctx.save();ctx.globalAlpha*=clamp(stroke.opacity??1,0,1);
  ctx.drawImage(image,b.x,b.y,b.width,b.height);ctx.restore();
 }
 function quickCutout(stroke,{tolerance=35,feather=1}={}){
  const item=asset(stroke);if(!item)throw Error('Select an imported image.');
  // Bounded preview matte: scans only edge-connected near-solid colors.
  const ratio=Math.min(1,900/item.width,900/item.height);
  const w=Math.max(1,Math.round(item.width*ratio)),h=Math.max(1,Math.round(item.height*ratio));
  const c=freshCanvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(item.image,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h).data,count=w*h;
  const alpha=new Uint8Array(count).fill(255),visit=new Uint8Array(count);
  const sample=(x,y)=>{const k=(y*w+x)*4;return [rgba[k],rgba[k+1],rgba[k+2]];};
  const corners=[sample(0,0),sample(w-1,0),sample(0,h-1),sample(w-1,h-1)];
  const average=corners.reduce((a,c)=>a.map((v,i)=>v+c[i]),[0,0,0]).map(n=>n/4);
  const spread=Math.max(...corners.flatMap(c=>c.map((v,i)=>Math.abs(v-average[i]))));
  if(spread>clamp(tolerance,0,120)*1.5)
   throw Error('Background is not sufficiently uniform. Use Mask Erase/Restore, or an AI cutout provider.');
  const threshold=clamp(tolerance,0,120)**2*3;
  const queue=new Int32Array(count);let front=0,end=0;
  for(let x=0;x<w;x++)for(const y of [0,h-1]){const k=y*w+x;if(!visit[k]){visit[k]=1;queue[end++]=k;}}
  for(let y=0;y<h;y++)for(const x of [0,w-1]){const k=y*w+x;if(!visit[k]){visit[k]=1;queue[end++]=k;}}
  while(front<end){
   const i=queue[front++],k=i*4;
   const dr=rgba[k]-average[0],dg=rgba[k+1]-average[1],db=rgba[k+2]-average[2];
   if(dr*dr+dg*dg+db*db>threshold)continue;
   alpha[i]=0;
   const x=i%w,y=(i/w)|0;
   const candidates=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
   for(const next of candidates)if(next>=0&&!visit[next]){visit[next]=1;queue[end++]=next;}
  }
  const cutoutKey='matte-'+id();masks.set(cutoutKey,{width:w,height:h,data:alpha});
  return {cutoutKey,width:w,height:h,removed:alpha.reduce((n,a)=>n+(a===0),0)};
 }
 function clearCutout(stroke){return {...stroke,cutoutKey:null};}
 root.MangoImageLayersV0612={assets,checkFile,importFile,asset,bounds,hit,normalize,paint,composite,quickCutout,clearCutout,
  projectMattes:()=>new Map(masks),replaceProjectRegistry(nextAssets,nextMattes){assets.clear();for(const [key,value] of nextAssets)assets.set(key,value);masks.clear();for(const [key,value] of nextMattes)masks.set(key,value);},
  clamp};
})(typeof globalThis!=='undefined'?globalThis:this);
