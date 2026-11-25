const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'layer-studio-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;c.getContext('2d').fillRect(0,0,1000,600);await MangoCaptureStore.save('layer-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=layer-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoLayerStudioUIV0712);
  await p.evaluate(()=>MangoCreativeV079.ready);
  await p.evaluate(()=>{MangoCreativeImageV079.insert('fonts','manrope','600','First');MangoCreativeImageV079.insert('fonts','manrope','600','Second');});
  const dlg=p.locator('#layer-studio-v0712');
  const open=mode=>p.evaluate(mode=>MangoLayerStudioUIV0712.open(mode),mode);
  await open('layers');await p.locator('#ls-select-shown-v0712').click();await p.locator('#ls-path-v0712').fill('Brand / Titles');await p.locator('#ls-group-v0712').click();
  assert.deepEqual(await p.evaluate(()=>MangoLayerImageV0712.state().layers.map(l=>l.group)),[['Brand','Titles'],['Brand','Titles']]);
  await p.locator('[aria-label="Collapse Brand"]').click();assert.equal(await dlg.locator('.ls-row-v0712').count(),0);await p.locator('[aria-label="Expand Brand"]').click();
  await p.locator('#ls-fx-tab-v0712').click();await p.locator('#ls-preset-gold-v0712').click();await p.locator('#ls-use-opacity-v0712').check();await p.locator('#ls-opacity-v0712').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const before=await p.evaluate(()=>MangoLayerImageV0712.state().layers.map(l=>l.opacity));assert.deepEqual(before,[1,1]);const beforePixels=await p.locator('#ink').evaluate(c=>c.toDataURL());
  await p.screenshot({path:path.join(out,'01-image-effects.png')});await p.locator('#ls-apply-v0712').click();assert.deepEqual(await p.evaluate(()=>MangoLayerImageV0712.state().layers.map(l=>l.opacity)),[.5,.5]);assert.notEqual(await p.locator('#ink').evaluate(c=>c.toDataURL()),beforePixels);
  await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});await p.evaluate(()=>MangoImageActions.run('undo'));assert.deepEqual(await p.evaluate(()=>MangoLayerImageV0712.state().layers.map(l=>l.opacity)),[1,1]);assert.equal(await p.locator('#ink').evaluate(c=>c.toDataURL()),beforePixels);
  await open('layers');await p.locator('#ls-select-shown-v0712').click();await p.locator('#ls-duplicate-v0712').click();assert.equal(await p.evaluate(()=>MangoLayerImageV0712.state().layers.length),4);await p.keyboard.press('Escape');await p.evaluate(()=>MangoImageActions.run('undo'));
  await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoLayerStudioUIV0712);
  await p.evaluate(()=>{MangoClipView.addLayer('text','title');MangoClipView.addLayer('callout','callout');});
  await open('layers');await p.locator('#ls-select-shown-v0712').click();await p.locator('#ls-path-v0712').fill('Intro / Graphics');await p.locator('#ls-group-v0712').click();
  await p.locator('#ls-g3-v0712').click();assert.deepEqual(await p.evaluate(()=>MangoClipView.layers().map(l=>l.track)),[3,3]);
  await p.locator('#ls-fx-tab-v0712').click();await p.locator('#ls-preset-ice-v0712').click();await p.locator('#ls-use-opacity-v0712').check();await p.locator('#ls-opacity-v0712').evaluate(el=>{el.value='65';el.dispatchEvent(new Event('input',{bubbles:true}));});await p.locator('#ls-apply-v0712').click();
  assert.deepEqual(await p.evaluate(()=>MangoClipView.layers().map(l=>l.opacity)),[.65,.65]);
  const render=await p.evaluate(()=>{const l=MangoClipView.layers()[0],a=document.createElement('canvas'),b=document.createElement('canvas');for(const c of [a,b]){c.width=640;c.height=360;}
    MangoGraphics.render(a.getContext('2d'),[l],(l.start+l.end)/2,640,360);
    MangoGraphics.render(b.getContext('2d'),[{...l,layerFx:null}],(l.start+l.end)/2,640,360);
    const pa=a.getContext('2d').getImageData(0,0,640,360).data,pb=b.getContext('2d').getImageData(0,0,640,360).data;let changed=0;for(let i=0;i<pa.length;i++)if(pa[i]!==pb[i])changed++;
    const s=MangoClipView.sequenceDraft(),checked=MangoProject.check(MangoProject.pack(s.source,s.segments,s.layers,s.markers,s.transitions),s.source);
    return {changed,group:checked.layers[0].layerGroup,fx:checked.layers[0].layerFx.kind};});
  assert.ok(render.changed>100);assert.deepEqual(render.group,['Intro','Graphics']);assert.equal(render.fx,'glow');
  await p.screenshot({path:path.join(out,'02-clip-effects.png')});await p.keyboard.press('Escape');await p.evaluate(()=>document.getElementById('undo').click());assert.deepEqual(await p.evaluate(()=>MangoClipView.layers().map(l=>l.opacity)),[1,1]);
  await p.setViewportSize({width:768,height:600});await open('effects');const b=await dlg.boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=769&&b.y+b.height<=601);await p.screenshot({path:path.join(out,'03-compact.png')});await p.keyboard.press('Escape');
  console.log('Layer Studio real editor transactions, folders, batch effects, undo, video renderer pixels, project round-trip and compact modal passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
