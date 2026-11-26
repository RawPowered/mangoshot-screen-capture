const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(process.env.MANGO_EXTENSION_ROOT||path.resolve(__dirname,'..')),out=path.join(dir,'carbon-image-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});
  const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');
  await p.waitForFunction(()=>!!window.MangoCaptureStore&&!!window.MangoCarbonImageV0720);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const g=c.getContext('2d');g.fillStyle='#28323c';g.fillRect(0,0,1000,600);await MangoCaptureStore.save('carbon-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=carbon-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoCarbonImageV0720);
  const ink=p.locator('#ink'),state=()=>p.evaluate(()=>MangoLayerImageV0712.state()),pixels=()=>ink.evaluate(c=>c.toDataURL());
  await p.evaluate(()=>MangoToolGroupsV071.activate('rectangle'));
  const box=await ink.boundingBox();await p.mouse.move(box.x+box.width*.25,box.y+box.height*.3);await p.mouse.down();await p.mouse.move(box.x+box.width*.65,box.y+box.height*.48,{steps:8});await p.mouse.up();
  const id=(await state()).layers[0].id;await p.evaluate(id=>MangoLayerImageV0712.select([id]),id);
  await p.waitForFunction(()=>MangoCarbonImageV0720.pinned());
  await p.locator('[data-image-tab=type]').click();assert.equal(await p.locator('.ci-layer-dock-v0720 #stroke-list').isVisible(),true);
  await p.locator('[data-image-tab=layers]').click();await p.waitForFunction(()=>!document.getElementById('ci-open-v0720').disabled);
  const initial=await pixels();await p.locator('#zs38-image-precision').click();
  await p.locator('#ci-precision-v0720').waitFor({state:'visible'});
  const dial=p.locator('#ci-dial-rotation-v0720');await dial.focus();await dial.press('ArrowRight');assert.equal(Number(await p.locator('#ci-number-rotation-v0720').inputValue()),1);assert.equal((await state()).layers[0].rotation,0);
  const rotation=p.locator('#ci-number-rotation-v0720');await rotation.fill('45');await rotation.press('Enter');
  await p.waitForFunction(()=>!document.getElementById('ci-apply-v0720').disabled);
  assert.equal((await state()).layers[0].rotation,0);assert.equal(await pixels(),initial);
  await p.screenshot({path:path.join(out,'01-precision-draft.png')});
  await p.locator('#ci-apply-v0720').click();await p.waitForFunction(()=>MangoLayerImageV0712.state().layers[0].rotation===45);
  assert.notEqual(await pixels(),initial);await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal((await state()).layers[0].rotation,0);assert.equal(await pixels(),initial);
  await p.locator('#ci-open-v0720').click();await p.locator('#ci-number-opacity-v0720').fill('40');await p.locator('#ci-number-opacity-v0720').press('Enter');await p.keyboard.press('Escape');
  await p.locator('#ci-precision-v0720').waitFor({state:'hidden'});assert.equal(await pixels(),initial);
  await p.screenshot({path:path.join(out,'02-layer-dock.png')});
  await p.setViewportSize({width:1024,height:600});await p.waitForFunction(()=>!MangoCarbonImageV0720.pinned());
  assert.equal(await p.locator('#image-panel-layers #stroke-list').count(),1);
  await p.locator('#ci-workspace-v0720').selectOption('focus');assert.equal(await p.locator('.image-inspector').isVisible(),false);
  await p.locator('#ci-workspace-v0720').selectOption('design');assert.equal(await p.locator('.image-inspector').isVisible(),true);
  assert.ok(await p.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2));
  await p.screenshot({path:path.join(out,'03-compact.png')});
  console.log('Carbon Image Studio browser gates passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
