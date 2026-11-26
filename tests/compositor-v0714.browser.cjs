const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'compositor-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;c.getContext('2d').fillRect(0,0,1000,600);await MangoCaptureStore.save('pc-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=pc-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoCompositorUIV0714);
  await p.evaluate(async()=>{await MangoCreativeV079.ready;MangoCreativeImageV079.insert('fonts','manrope','600','COMPOSITOR');});
  const dlg=p.locator('#compositor-v0714');await p.evaluate(()=>MangoCompositorUIV0714.open());await dlg.waitFor({state:'visible'});
  await p.locator('#pc-preset-silver-v0714').click();await p.locator('#pc-add-kind-v0714').selectOption('invert');await p.locator('#pc-add-effect-v0714').click();await p.locator('#pc-effect-value-2').fill('1');
  const before=await p.locator('#ink').evaluate(c=>c.toDataURL());await p.locator('#pc-apply-v0714').click();assert.notEqual(await p.locator('#ink').evaluate(c=>c.toDataURL()),before);
  assert.equal(await p.evaluate(()=>MangoLayerImageV0712.state().layers[0].effectStack.length),3);
  await p.locator('#pc-custom-name-v0714').fill('Custom silver');await p.locator('#pc-save-preset-v0714').click();assert.equal(await p.locator('#pc-custom-v0714 option').count(),2);
  await p.screenshot({path:path.join(out,'01-image-effects.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await p.locator('#ink').evaluate(c=>c.toDataURL()),before);
  await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoCompositorUIV0714&&MangoClipView.video().readyState>=2);
  await p.evaluate(()=>MangoCompositorUIV0714.open('grade'));await p.locator('#pc-preset-silver-v0714').click();await p.locator('#pc-apply-v0714').click();assert.equal(await p.evaluate(()=>MangoClipView.sourceGrade()[0].kind),'monochrome');
  await p.screenshot({path:path.join(out,'02-source-grade.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});
  await p.evaluate(()=>MangoClipView.seekOutput(1));await p.waitForFunction(()=>{const c=document.getElementById('graphics-preview'),[r,g,b]=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return Math.abs(r-g)<4&&Math.abs(g-b)<4&&r>10;});
  const downloaded=p.waitForEvent('download',{timeout:60000});await p.locator('#export-webm').evaluate(b=>b.click());const d=await downloaded,rendered=await d.path();assert.ok(rendered);
  const raw=execFileSync('ffmpeg',['-v','error','-i',rendered,'-vf','scale=2:2','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);let gray=0,color=0;for(let i=0;i+11<raw.length;i+=12){let r=raw[i],g=raw[i+1],b=raw[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)<15&&r>10)gray++;if(Math.max(r,g,b)-Math.min(r,g,b)>40)color++;}assert.ok(gray>0&&color===0,JSON.stringify({gray,color}));
  await p.waitForFunction(()=>!MangoClipView.exporting());
  await p.evaluate(()=>{MangoClipView.addLayer('text','title');MangoCompositorUIV0714.open('keys');});await p.locator('#pc-key-default-v0714').click();await p.locator('#pc-key-1-x').fill('25');await p.locator('#pc-key-1-rotation').fill('40');await p.locator('#pc-key-1-opacity').fill('40');
  await p.locator('#pc-apply-v0714').click();assert.equal(await p.evaluate(()=>MangoClipView.layers()[0].keyframes[1].rotation),40);
  await p.screenshot({path:path.join(out,'03-keyframes.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});
  const data=await p.evaluate(()=>{const v=MangoClipView,s=v.sequenceDraft(),l=s.layers[0];const project=MangoProject.check(MangoProject.pack(s.source,s.segments,s.layers,s.markers,s.transitions,s.sourceGrade),s.source);
    const frames=[l.start+.01,l.start+(l.end-l.start)*.9].map(t=>{const c=document.createElement('canvas');c.width=640;c.height=360;MangoGraphics.render(c.getContext('2d'),[l],t,640,360);return c.toDataURL();});
    return {different:frames[0]!==frames[1],key:project.layers[0].keyframes[1],grade:project.sourceGrade[0].kind};});assert.ok(data.different);assert.equal(data.key.x,.25);assert.equal(data.grade,'monochrome');
  await p.evaluate(()=>document.getElementById('undo').click());assert.equal(await p.evaluate(()=>MangoClipView.layers()[0].keyframes?.length||0),0);assert.equal(await p.evaluate(()=>MangoClipView.sourceGrade()[0].kind),'monochrome');
  await p.setViewportSize({width:768,height:600});await p.evaluate(()=>MangoCompositorUIV0714.open('effects'));const b=await dlg.boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=769&&b.y+b.height<=601);await p.screenshot({path:path.join(out,'04-compact.png')});await p.keyboard.press('Escape');
  console.log('Actual Image layer filters, preset storage, source grade and encoded WebM pixels, animated layer pixels, undo and compact modal passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
