const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'image-document-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoImageDocumentUIV0723);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const g=c.getContext('2d');g.fillStyle='#24384a';g.fillRect(0,0,640,360);await MangoCaptureStore.save('document-fixture',{width:640,height:360,pageHeight:360,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=document-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready);
  const data=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=48;c.height=32;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,48,32);g.fillStyle='#ff0000';g.fillRect(12,8,24,16);return c.toDataURL().split(',')[1];});
  await p.locator('#image-import-file').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  await p.waitForFunction(()=>MangoLayerImageV0712.state().layers.length===1);await p.evaluate(()=>{const H=MangoLayerImageV0712,s=H.state();H.select([s.layers[0].id]);});await p.locator('[data-image-tab=mask]').click();
  await p.locator('#image-quick-cutout').click();await p.waitForFunction(()=>!!MangoImageDocumentV0723.save(MangoImageDocumentV0723.state().stamp,'Test').layers[0].cutoutKey);
  await p.evaluate(()=>{const H=MangoLayerImageV0712,s=H.state();H.apply('effects',[s.layers[0].id],{rotation:32,opacity:.7,material:MangoTransformMaterialV0715.presets.find(x=>x.id==='gold').material},s.stamp);});
  await p.locator('[data-image-tab=layers]').click();await p.waitForFunction(()=>document.querySelector('.md-thumb-v0723[data-painted=true]'));await p.locator('.md-effects-v0723 summary').first().click();
  const original=await p.locator('#ink').evaluate(c=>c.toDataURL()),model=await p.evaluate(()=>MangoImageDocumentV0723.save(MangoImageDocumentV0723.state().stamp,'Fixture'));
  await p.screenshot({path:path.join(out,'01-layer-preview.png')});
  await p.evaluate(()=>MangoImageDocumentUIV0723.show('save'));await p.locator('#md-name-v0723').fill('Roundtrip');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('#md-confirm-v0723').click()]);const bytes=fs.readFileSync(await dl.path());const saved=JSON.parse(bytes);assert.equal(saved.name,'Roundtrip');assert.equal(saved.assets.length,1);assert.equal(saved.mattes.length,1);assert.deepEqual(saved.layers,model.layers);
  await p.locator('#md-close-v0723').click();await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);
  await p.evaluate(()=>MangoImageDocumentUIV0723.show('open'));await p.locator('#md-file-v0723').setInputFiles({name:'roundtrip.mangoimage',mimeType:'application/json',buffer:bytes});await p.locator('#md-confirm-v0723').click();await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!document.getElementById('md-dialog-v0723').open);
  assert.equal(await p.locator('#ink').evaluate(c=>c.toDataURL()),original);assert.deepEqual(await p.evaluate(()=>MangoImageDocumentV0723.save(MangoImageDocumentV0723.state().stamp,'Roundtrip').layers),saved.layers);
  const invalid={...saved,assets:[]};await p.evaluate(()=>MangoImageDocumentUIV0723.show('open'));await p.locator('#md-file-v0723').setInputFiles({name:'bad.mangoimage',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await p.locator('#md-confirm-v0723').click();await p.waitForFunction(()=>document.getElementById('md-status-v0723').textContent.includes('Missing image asset'));assert.equal(await p.locator('#ink').evaluate(c=>c.toDataURL()),original);
  await p.locator('#md-close-v0723').click();await p.screenshot({path:path.join(out,'02-reopened.png')});
  console.log('Editable image project actual download, asset/matte roundtrip, exact ink pixels, malformed rejection and thumbnail passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
