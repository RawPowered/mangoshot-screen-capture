const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'raster-layer-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});
  const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoRasterLayerUIV0727);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d');g.fillStyle='#343b43';g.fillRect(0,0,320,180);await MangoCaptureStore.save('raster-layer-fixture',{width:320,height:180,pageHeight:180,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=raster-layer-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!!window.MangoRasterLayerUIV0727);
  const raw=await p.evaluate(async()=>{const H=MangoImageDocumentV0723,s=H.state(),doc=H.save(s.stamp,'Raster layer');
   const c=document.createElement('canvas');c.width=32;c.height=16;const g=c.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,16,16);g.fillStyle='#0000ff';g.fillRect(16,0,16,16);
   const png=c.toDataURL();doc.assets=[{id:'asset1',name:'Original pixels',width:32,height:16,png}];doc.mattes=[{id:'matte1',width:32,height:16,alpha:MangoImageDocumentCoreV0723.encode(Uint8Array.from({length:512},(_,i)=>i%32<16?255:0))}];
   doc.layers=[{id:'photo',type:'image',name:'Photo',assetId:'asset1',cutoutKey:'matte1',width:128,height:64,points:[{x:50,y:50,p:1}],opacity:1,visible:true,locked:false},{id:'redact',type:'redact',name:'Protected',points:[{x:5,y:5,p:1},{x:24,y:24,p:1}],size:4,color:'#000000',visible:true,opacity:1}];
   await H.open(doc,s.stamp);MangoLayerImageV0712.select(['photo']);return {png,base:doc.base};});
  const pixels=()=>p.locator('#ink').evaluate(c=>c.toDataURL()),draftPixels=()=>p.locator('#rl-after-v0727').evaluate(c=>c.toDataURL()),initial=await pixels();
  await p.locator('#rl-open-v0727').click();await p.locator('#rl-add-v0727').click();
  await p.waitForFunction(()=>document.getElementById('rl-engine-v0727').textContent.includes('Rust / Wasm worker')&&!document.getElementById('rl-apply-v0727').disabled);
  const wasm=await draftPixels();assert.equal(await pixels(),initial);
  await p.locator('#rl-backend-v0727').selectOption('js');await p.waitForFunction(()=>document.getElementById('rl-engine-v0727').textContent.includes('JS worker')&&!document.getElementById('rl-apply-v0727').disabled);assert.equal(await draftPixels(),wasm);
  await p.locator('#rl-add-v0727').click();await p.locator('#rl-op-v0727').selectOption('sharp');await p.locator('#rl-number-v0727').fill('40');await p.locator('#rl-number-v0727').press('Tab');await p.waitForFunction(()=>!document.getElementById('rl-apply-v0727').disabled);
  await p.screenshot({path:path.join(out,'01-editable-raster.png')});await p.locator('#rl-apply-v0727').click();await p.locator('#rl-dialog-v0727').waitFor({state:'hidden'});
  const committed=await pixels();assert.notEqual(committed,initial);
  const px=await p.evaluate(()=>{const q=document.getElementById('ink').getContext('2d'),get=(x,y)=>Array.from(q.getImageData(x,y,1,1).data);return {visible:get(70,80),hidden:get(150,80),redact:get(12,12),cache:MangoRasterLayerV0727.stats()};});
  assert.deepEqual(px.visible,[77,77,77,255]);assert.equal(px.hidden[3],0);assert.deepEqual(px.redact,[17,17,17,255]);assert.ok(px.cache.hits>0);
  const save=()=>p.evaluate(()=>{const H=MangoImageDocumentV0723;return H.save(H.state().stamp,'Raster project');});
  const project=await save();assert.equal(project.version,5);assert.equal(project.layers[0].rasterFx.length,2);assert.equal(project.assets[0].png,raw.png);assert.equal(project.base,raw.base);
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);await p.evaluate(()=>MangoImageActions.run('redo'));assert.equal(await pixels(),committed);
  const exported=await p.evaluate(()=>{const H=MangoRasterImageV0722;return H.capture(H.state().stamp,'full').toDataURL();});
  await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);await p.evaluate(async project=>{const H=MangoImageDocumentV0723;await H.open(project,H.state().stamp);},project);
  assert.equal(await pixels(),committed);assert.deepEqual((await save()).layers,project.layers);assert.equal(await p.evaluate(()=>{const H=MangoRasterImageV0722;return H.capture(H.state().stamp,'full').toDataURL();}),exported);
  assert.equal(await p.evaluate(()=>{const E=MangoRasterLayerV0727;E.retain([]);const H=MangoLayerImageV0712;H.select(['photo']);return document.getElementById('ink').toDataURL();}),committed);
  assert.ok(await p.evaluate(()=>MangoRasterLayerV0727.stats().last.backend==='JS synchronous fallback'));
  await p.evaluate(()=>MangoLayerImageV0712.select(['redact']));await p.waitForFunction(()=>document.getElementById('rl-open-v0727').disabled);
  await p.evaluate(()=>MangoLayerImageV0712.select(['photo']));await p.locator('#rl-open-v0727').click();await p.locator('#rl-remove-v0727').click();await p.keyboard.press('Escape');await p.locator('#rl-dialog-v0727').waitFor({state:'hidden'});assert.equal(await pixels(),committed);
  await p.setViewportSize({width:1024,height:600});await p.locator('#rl-open-v0727').click();await p.locator('#rl-dialog-v0727').waitFor({state:'visible'});const box=await p.locator('#rl-dialog-v0727').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=1025&&box.y+box.height<=601);
  const probe=await p.evaluate(()=>MangoRasterLayerV0727.gpuProbe());assert.ok(['passed','unavailable','failed'].includes(probe.status));console.log('WebGPU optional probe:',probe.status,probe.detail);await p.screenshot({path:path.join(out,'02-compact-raster.png')});
  console.log('Editable raster actual Wasm/JS preview parity, masks, immutable assets, undo/redo, cache fallback and v5 roundtrip passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
