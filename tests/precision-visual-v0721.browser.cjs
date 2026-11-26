const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'precision-visual-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore&&!!window.MangoCarbonImageV0720);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const g=c.getContext('2d');g.fillStyle='#28323c';g.fillRect(0,0,1000,600);await MangoCaptureStore.save('precision-visual-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=precision-visual-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoPrecisionVisualV0721);
  const ink=p.locator('#ink'),state=()=>p.evaluate(()=>MangoLayerImageV0712.state()),pixels=()=>ink.evaluate(c=>c.toDataURL());
  await p.evaluate(()=>MangoToolGroupsV071.activate('rectangle'));const b=await ink.boundingBox();await p.mouse.move(b.x+b.width*.25,b.y+b.height*.25);await p.mouse.down();await p.mouse.move(b.x+b.width*.68,b.y+b.height*.52,{steps:8});await p.mouse.up();
  const id=(await state()).layers[0].id;await p.evaluate(id=>MangoLayerImageV0712.select([id]),id);
  await p.waitForFunction(()=>MangoCarbonImageV0720.pinned()&&!document.getElementById('ci-open-v0720').disabled);
  const split=p.locator('#pv-dock-split-v0721');await split.focus();const prior=Number(await split.getAttribute('aria-valuenow'));await split.press('ArrowUp');assert.equal(Number(await split.getAttribute('aria-valuenow')),Math.min(60,prior+5));
  const initial=await pixels(),layer=(await state()).layers[0];await p.locator('#ci-open-v0720').click();await p.locator('#pv-advanced-v0721 summary').click();
  await p.locator('#pv-preset-gold-v0721').click();await p.locator('#ci-kind-v0720').selectOption('shadow');await p.locator('#pv-target-v0721').selectOption('fx');
  const hex=p.locator('#pv-hex-v0721');await hex.fill('#44aaee');await hex.press('Tab');
  const x=p.locator('#pv-x-v0721');await x.fill('25');await x.press('Tab');
  const y=p.locator('#pv-y-v0721');await y.fill('-12');await y.press('Tab');
  await p.waitForFunction(()=>!document.getElementById('ci-apply-v0720').disabled);
  assert.equal(await pixels(),initial);assert.deepEqual((await state()).layers[0],layer);
  await p.screenshot({path:path.join(out,'01-material-color-draft.png')});
  await p.locator('#ci-apply-v0720').click();await p.waitForFunction(()=>MangoLayerImageV0712.state().layers[0].material?.kind==='metal');
  const next=(await state()).layers[0];assert.equal(next.fx.color,'#44aaee');assert.equal(next.fx.offsetX,25);assert.equal(next.fx.offsetY,-12);assert.notEqual(await pixels(),initial);
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);assert.deepEqual((await state()).layers[0],layer);
  await p.locator('#ci-open-v0720').click();if(!await p.locator('#pv-advanced-v0721').evaluate(e=>e.open))await p.locator('#pv-advanced-v0721 summary').click();await p.locator('#pv-preset-silver-v0721').click();await p.keyboard.press('Escape');await p.locator('#ci-precision-v0720').waitFor({state:'hidden'});assert.equal(await pixels(),initial);
  await p.setViewportSize({width:1024,height:600});await p.waitForFunction(()=>!MangoCarbonImageV0720.pinned());assert.ok(await p.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2));
  console.log('Precision visual browser gates passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
