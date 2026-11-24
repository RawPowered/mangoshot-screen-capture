const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const dir=path.resolve(__dirname,'..'),ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
try{let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const id=new URL(worker.url()).host,p=await ctx.newPage();
for(const size of [{width:1366,height:768},{width:768,height:600}]){
 await p.setViewportSize(size);
 for(const file of ['editor.html','clip-studio.html','recorder.html']){
  await p.goto('chrome-extension://'+id+'/'+file);await p.waitForFunction(()=>!!window.MangoAutomationV075);
  if(file!=='recorder.html')await p.locator('.v06-menu > summary').filter({hasText:'Automation'}).click();
  await p.locator('#automation-open-v075').click();const dialog=p.locator('#automation-dialog-v075');await dialog.waitFor({state:'visible'});
  const r=await dialog.boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=size.width+1&&r.y+r.height<=size.height+1,JSON.stringify({file,size,r}));
  assert.equal(await p.locator('#au-apply-v075').isDisabled(),true);
  await p.locator('#au-preview-v075').click();
  if(file==='recorder.html'){
   assert.equal(await p.locator('#au-apply-v075').isDisabled(),false);
   assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().settings.zoomMode),'off');
   await p.locator('#au-apply-v075').click();assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().settings.zoomMode),'click');
   assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().retain),false);
   assert.equal(await p.locator('#cursor-consent-v073').isChecked(),false);
   await p.locator('[data-au-tab="library"]').click();await p.locator('#au-name-v075').fill('Browser tutorial recipe');await p.locator('#au-save-v075').click();
   assert.match(await p.locator('#au-library-v075').textContent(),/Browser tutorial recipe/);
   await p.locator('[data-au-tab="history"]').click();assert.match(await p.locator('#au-history-v075').textContent(),/applied/);
  }else{assert.equal(await p.locator('#au-apply-v075').isDisabled(),true);assert.match(await p.locator('#au-review-v075').textContent(),/Rejected/);}
  await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 }
}
console.log('Actual Image, Clip and Record Studio modal bounds, review gating, recorder apply, recipe library and history passed');
}finally{await ctx.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
