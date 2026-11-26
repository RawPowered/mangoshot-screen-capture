const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const dir=path.resolve(__dirname,'..'),out=path.join(dir,'mango-raster-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const p=await ctx.newPage(),base='chrome-extension://'+new URL(worker.url()).host+'/';await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore&&!!window.MangoRasterUIV0722);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,320,180);await MangoCaptureStore.save('raster-fixture',{width:320,height:180,pageHeight:180,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=raster-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!document.getElementById('mr-open-v0722').disabled);
  const ink=p.locator('#ink'),b=await ink.boundingBox();await p.evaluate(()=>MangoToolGroupsV071.activate('redact'));await p.mouse.move(b.x+b.width*.4,b.y+b.height*.4);await p.mouse.down();await p.mouse.move(b.x+b.width*.6,b.y+b.height*.6,{steps:8});await p.mouse.up();
  const pixels=()=>ink.evaluate(c=>c.toDataURL()),initial=await pixels();await p.locator('#mr-open-v0722').click();await p.waitForFunction(()=>document.getElementById('mr-status-v0722').textContent.includes('Rust / Wasm worker')&&!document.getElementById('mr-save-v0722').disabled);
  const read=()=>p.locator('#mr-after-v0722').evaluate(c=>({corner:Array.from(c.getContext('2d').getImageData(2,2,1,1).data),center:Array.from(c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data),png:c.toDataURL()}));
  const original=await read();assert.deepEqual(original.corner,[77,77,77,255]);assert.ok(original.center[0]<35&&original.center[1]<35);assert.equal(await pixels(),initial);
  await p.locator('#mr-backend-v0722').selectOption('js');await p.waitForFunction(()=>document.getElementById('mr-status-v0722').textContent.includes('JS worker')&&!document.getElementById('mr-save-v0722').disabled);assert.equal((await read()).png,original.png);
  await p.locator('#mr-op-v0722').selectOption('sharp');await p.waitForFunction(()=>!document.getElementById('mr-save-v0722').disabled);
  await p.locator('#mr-op-v0722').selectOption('gray');await p.waitForFunction(()=>!document.getElementById('mr-save-v0722').disabled);
  await p.screenshot({path:path.join(out,'01-raster-lab.png')});
  const [download]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.locator('#mr-save-v0722').click()]);const bytes=fs.readFileSync(await download.path());assert.equal(bytes.readUInt32BE(16),320);assert.equal(bytes.readUInt32BE(20),180);
  assert.equal(await pixels(),initial);await p.keyboard.press('Escape');await p.locator('#mr-dialog-v0722').waitFor({state:'hidden'});
  console.log('Real extension Wasm and JS worker, redaction retention, full PNG and edit isolation passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
