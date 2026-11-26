const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'streaming-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoStreamingV0718);
  await p.locator('#v06-media-input').setInputFiles(process.argv[3]);await p.waitForFunction(()=>MangoMediaBin.registry.count()===1&&Number.isFinite(MangoMediaBin.snapshot()[0].duration));
  const ids=await p.evaluate(async()=>{const V=MangoClipView,a=MangoMediaBin.snapshot()[0],M=MangoMultitrackV0716,m=M.defaults(),c=M.make(a,1,V.outputDuration(),'V2');c.end=15;c.sourceOut=14;
   const upper=M.make(a,6,V.outputDuration(),'V3');Object.assign(upper,{end:8,sourceIn:0,sourceOut:2,x:.02,y:.02,width:.22,height:.22,fit:'cover'});m.clips=[c,upper];await V.applyMultitrack(m,V.automationCapture().stamp);return [c.id,upper.id];});
  const rgb=(r,g,b,kind)=>kind==='green'?g>120&&r<80&&b<80:kind==='yellow'?r>120&&g>120&&b<80:kind==='cyan'?g>120&&b>120&&r<80:kind==='red'?r>120&&g<80&&b<80:b>120&&r<80&&g<80;
  async function seekColor(t,kind){await p.evaluate(t=>MangoClipView.seekOutput(t),t);await p.waitForFunction(kind=>{const c=document.getElementById('graphics-preview'),[r,g,b]=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return kind==='green'?g>120&&r<80&&b<80:kind==='yellow'?r>120&&g>120&&b<80:kind==='cyan'?g>120&&b>120&&r<80:g>0&&false;},kind);}
  await seekColor(2,'green');await seekColor(7,'yellow');await p.screenshot({path:path.join(out,'01-overlapping-native-video.png')});
  const stats=await p.evaluate(()=>MangoClipView.streamingStats());assert.equal(stats.cachedVideoFrames,0);assert.equal(stats.activeDecoders,2);assert.ok(stats.peakDecoders<=2);assert.equal(stats.nativeSources[0].width,1280);
  await seekColor(13,'cyan');await seekColor(2,'green');await seekColor(13,'cyan');
  // Reviewed still uses an isolated decoder, not a mutable live canvas frame.
  const exact=await p.evaluate(async()=>{const v=MangoClipView,m=v.multitrack(),c=document.createElement('canvas');c.width=320;c.height=180;await v.prepareSecondary(m,v.outputDuration());await v.paintSecondary(c.getContext('2d'),m,7,320,180);return Array.from(c.getContext('2d').getImageData(160,90,1,1).data);});assert.ok(rgb(...exact.slice(0,3),'yellow'),JSON.stringify(exact));
  await p.evaluate(()=>MangoClipView.seekOutput(5.6));await p.locator('#program-play').click();await p.waitForFunction(()=>MangoClipView.isPlaying());await p.waitForFunction(()=>MangoClipView.sequencePosition()>7.2,{},{timeout:12000});await p.locator('#program-play').click();await p.waitForFunction(()=>!MangoClipView.isPlaying());
  // Output proof checks actual colors at timeline seconds, not just a static preview.
  const dl=p.waitForEvent('download',{timeout:90000});await p.locator('#export-webm').evaluate(x=>x.click());const result=await dl,file=await result.path();assert.ok(file);
  const pixel=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',file,'-frames:v','1','-vf','crop=2:2:(iw-2)/2:(ih-2)/2,scale=2:2','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
  for(const [t,kind] of [[.5,'red'],[2,'green'],[7,'yellow'],[13,'cyan'],[16,'blue']]){const raw=pixel(t);assert.ok(raw.length>=3&&rgb(raw[0],raw[1],raw[2],kind),JSON.stringify({t,kind,pixel:[...raw.slice(0,3)]}));}
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim());
  if(Number.isFinite(duration))assert.ok(Math.abs(duration-18)<1.5,duration);
  await p.waitForFunction(()=>!MangoClipView.exporting());assert.equal(await p.evaluate(()=>MangoClipView.streamingStats().cachedVideoFrames),0);await p.screenshot({path:path.join(out,'02-streaming-export.png')});
  console.log('Streaming Media Engine: 14-second native 720p overlay, two decoders, exact repeated seeks, reviewed frame, playback crossing boundary, actual encoded time-indexed colors, no cached video raster frames passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
