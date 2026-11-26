const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'cinematic-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoCinematicUIV0713);
  await p.evaluate(()=>{const v=MangoClipView,s=v.sequenceDraft();s.segments=[{start:0,end:2},{start:4,end:6}];v.restoreLegacyProject(MangoProject.pack(s.source,s.segments,[],[],[]));});
  await p.evaluate(()=>MangoCinematicUIV0713.open());const dlg=p.locator('#cinematic-studio-v0713');await dlg.waitFor({state:'visible'});assert.ok(await p.locator('#cs-apply-v0713').isDisabled());
  await p.locator('#cs-handles-v0713').check();await p.locator('#cs-duration-v0713').fill('0.5');await p.locator('#cs-ease-v0713').selectOption('linear');await p.locator('#cs-prepare-v0713').click();
  await p.waitForFunction(()=>!document.getElementById('cs-apply-v0713').disabled,{},{timeout:60000});
  const mid=await p.locator('#cs-preview-v0713').evaluate(c=>Array.from(c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data));assert.ok(mid[0]>65&&mid[2]>65&&mid[1]<70,JSON.stringify(mid));
  await p.screenshot({path:path.join(out,'01-real-cross-dissolve.png')});
  await p.locator('#cs-apply-v0713').click();await dlg.waitFor({state:'hidden',timeout:60000});
  assert.equal(await p.evaluate(()=>MangoClipView.transitions()[0].type),'crossDissolve');assert.equal(await p.evaluate(()=>MangoClipView.outputDuration()),4);
  await p.evaluate(()=>MangoClipView.seekOutput(2));await p.waitForFunction(()=>{const c=document.getElementById('graphics-preview'),a=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return a[0]>65&&a[2]>65&&a[1]<70;});
  const project=await p.evaluate(()=>{const s=MangoClipView.sequenceDraft();return MangoProject.check(MangoProject.pack(s.source,s.segments,s.layers,s.markers,s.transitions),s.source).transitions;});assert.equal(project[0].type,'crossDissolve');
  await p.evaluate(()=>document.getElementById('undo').click());assert.equal(await p.evaluate(()=>MangoClipView.transitions().length),0);await p.evaluate(()=>document.getElementById('redo').click());assert.equal(await p.evaluate(()=>MangoClipView.transitions()[0].type),'crossDissolve');
  // Verify the real browser encoder output, not just the editor canvas. Source has red and blue halves.
  const downloadPromise=p.waitForEvent('download',{timeout:60000});await p.locator('#export-webm').evaluate(b=>b.click());const download=await downloadPromise;const rendered=await download.path();assert.ok(rendered);
  const raw=execFileSync('ffmpeg',['-v','error','-i',rendered,'-vf','scale=2:2','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);let red=0,blue=0,mixed=0;
  for(let i=0;i+11<raw.length;i+=12){const r=raw[i],g=raw[i+1],b=raw[i+2];if(r>150&&b<60)red++;if(b>150&&r<60)blue++;if(r>65&&b>65&&g<75)mixed++;}assert.ok(red>0&&blue>0&&mixed>0,JSON.stringify({red,blue,mixed}));
  await p.waitForFunction(()=>!MangoClipView.exporting());
  await p.setViewportSize({width:768,height:600});await p.evaluate(()=>MangoCinematicUIV0713.open());const bounds=await dlg.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=769&&bounds.y+bounds.height<=601);await p.screenshot({path:path.join(out,'02-compact-cinematic.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});
  await p.evaluate(()=>{MangoClipView.addLayer('text','title');MangoClipView.addLayer('callout','callout');MangoLayerStudioUIV0712.open('effects');});await p.locator('#ls-select-shown-v0712').click();await p.locator('#fx43-motion-tab').click();await p.locator('#ls-use-motion-v0713').check();await p.locator('#ls-enter-v0713').selectOption('slideUp');await p.locator('#ls-exit-v0713').selectOption('fade');await p.locator('#ls-apply-v0712').click();assert.deepEqual(await p.evaluate(()=>MangoClipView.layers().map(l=>l.motion.enter.type)),['slideUp','slideUp']);await p.keyboard.press('Escape');await p.locator('#layer-studio-v0712').waitFor({state:'hidden'});await p.evaluate(()=>document.getElementById('undo').click());assert.ok(await p.evaluate(()=>MangoClipView.layers().every(l=>l.motion.enter.type==='none')));
  console.log('Actual red/blue source decode, reviewed cinematic apply, Program Monitor pixels, project roundtrip, undo/redo, decoded browser WebM, compact modal and batch graphic motion passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
