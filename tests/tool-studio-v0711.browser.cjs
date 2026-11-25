const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'tool-studio-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const x=c.getContext('2d');x.fillStyle='#23405c';x.fillRect(0,0,1000,600);await MangoCaptureStore.save('tool-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=tool-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready);
  const state=()=>p.evaluate(()=>MangoToolImageV0711.state());
  async function drag(a,b){const r=await p.locator('#ink').boundingBox();await p.mouse.move(r.x+a[0]*r.width,r.y+a[1]*r.height);await p.mouse.down();await p.mouse.move(r.x+b[0]*r.width,r.y+b[1]*r.height,{steps:7});await p.mouse.up();}
  await p.evaluate(()=>MangoToolGroupsV071.activate('rectangle'));
  for(const [a,b] of [[[.12,.15],[.26,.28]],[[.38,.36],[.52,.49]],[[.68,.19],[.82,.32]]])await drag(a,b);
  assert.equal((await state()).layers.length,3);assert.equal(new Set((await state()).layers.map(l=>l.id)).size,3);
  await p.evaluate(()=>MangoToolGroupsV071.activate('marquee'));await drag([.06,.06],[.9,.6]);
  let sel=await state();assert.equal(sel.selection.length,3);assert.equal(await p.locator('#ts-selection-overlay-v0711 .ts-box-v0711').count(),3);
  await p.screenshot({path:path.join(out,'01-marquee-layers.png')});
  const before=sel.layers.map(l=>l.bounds.y);
  await p.locator('[data-ts-batch=top]').click();let aligned=await state();assert.ok(aligned.layers.every(l=>Math.abs(l.bounds.y-aligned.layers[0].bounds.y)<.001));
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.deepEqual((await state()).layers.map(l=>l.bounds.y),before);
  await p.locator('[data-image-tab=layers]').click();await p.locator('#ts-select-filtered-v0711').click();assert.equal((await state()).selection.length,3);
  await p.evaluate(()=>MangoImageActions.run('nudgeRightFast'));assert.equal(Math.round((await state()).layers[0].bounds.x-sel.layers[0].bounds.x),10);
  await p.evaluate(()=>MangoImageActions.run('undo'));
  await p.locator('#ts-select-filtered-v0711').click();await p.locator('[data-ts-batch=duplicate]').click();assert.equal((await state()).layers.length,6);
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal((await state()).layers.length,3);
  await p.locator('#ts-layer-search-v0711').fill('no-match');assert.equal(await p.locator('.image-layer-row').count(),0);await p.locator('#ts-layer-search-v0711').fill('');
  await p.locator('#ts-layer-kind-v0711').selectOption('text');assert.equal(await p.locator('.image-layer-row').count(),0);await p.locator('#ts-layer-kind-v0711').selectOption('vector');
  const rows=p.locator('.image-layer-row .image-object-select');assert.equal(await rows.count(),3);
  await rows.nth(0).click();await p.locator('[data-image-tab=layers]').click();await rows.nth(1).click({modifiers:['Control']});assert.equal((await state()).selection.length,2);
  await p.locator('[data-ts-batch=lock]').click();assert.equal(await p.locator('[data-ts-batch=top]').isDisabled(),true);
  await p.locator('[data-ts-batch=lock]').click();assert.equal(await p.locator('[data-ts-batch=top]').isDisabled(),false);
  async function library(){await p.locator('.v06-menu > summary').filter({hasText:'View'}).click();await p.locator('#ts-open-v0711').click();await p.locator('#tool-library-v0711').waitFor({state:'visible'});}
  await library();await p.locator('#ts-search-v0711').fill('marquee');assert.equal(await p.locator('.ts-entry-v0711').count(),1);await p.locator('.ts-entry-v0711 button').nth(1).click();await p.locator('#ts-favorites-v0711').check();assert.equal(await p.locator('.ts-entry-v0711').count(),1);await p.screenshot({path:path.join(out,'02-tool-library.png')});await p.locator('.ts-entry-v0711 button').first().click();assert.equal((await state()).tool,'marquee');
  await p.reload();await p.waitForFunction(()=>MangoImageActions.state().ready);assert.equal(await p.evaluate(()=>MangoToolLibraryV0711.state().preferences.last.select),'marquee');assert.ok(await p.evaluate(()=>MangoToolLibraryV0711.state().preferences.favorites.includes('marquee')));
  await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready);await library();await p.locator('#ts-search-v0711').fill('razor');assert.equal(await p.locator('.ts-entry-v0711').count(),1);await p.screenshot({path:path.join(out,'03-video-tool-library.png')});await p.locator('.ts-entry-v0711 button').first().click();assert.equal(await p.locator('[data-v06-tool=tool-razor]').getAttribute('aria-pressed'),'true');
  await p.setViewportSize({width:1024,height:600});await library();const bounds=await p.locator('#tool-library-v0711').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1025&&bounds.y+bounds.height<=601);
  console.log('Actual Image Studio marquee, batch align and undo, nudge, duplicate, filtering, locked-layer guard, persistent tools/favorites and Clip Studio tool dispatch passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
