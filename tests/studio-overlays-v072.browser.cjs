/* Browser smoke: actual unpacked extension pages, no capture permission or network. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..');
 const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,
  args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker',{timeout:20000});
  const id=new URL(worker.url()).host,page=await context.newPage();
  const ready=()=>page.waitForFunction(()=>!!window.MangoStudioOverlaysV072);
  async function bounded(selector){
   const loc=page.locator(selector).first();
   await loc.waitFor({state:'visible'});
   await page.waitForFunction(s=>document.querySelector(s)?.hasAttribute('data-mango-overlay'),selector);
   const bounds=await loc.boundingBox(),view=page.viewportSize();
   assert.ok(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=view.width+1&&bounds.y+bounds.height<=view.height+1,JSON.stringify({selector,bounds,view}));
   const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+Math.min(12,r.height/2)));});
   assert.ok(hit,'Overlay must be pointer-accessible: '+selector);
  }
  for(const size of [{width:1366,height:768},{width:1024,height:600},{width:768,height:600}]){
   await page.setViewportSize(size);
   for(const file of ['editor.html','clip-studio.html']){
    await page.goto('chrome-extension://'+id+'/'+file);await ready();
    await page.locator('.v06-menu > summary').first().click();
    await bounded('.v06-menu[open] > .v06-menu-pop');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.v06-menu[open]'));
    await page.locator('.v070-settings > summary').click();
    await bounded('.v070-settings[open] > .v070-settings-menu');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.v070-settings[open]'));
    if(file==='editor.html'){
     await page.locator('.v071-tool-slot[data-group="shapes"] .v071-tool-more').click();
     await bounded('.v071-tool-slot[data-group="shapes"] .v071-tool-flyout:not([hidden])');
     await page.keyboard.press('Escape');
     await page.waitForFunction(()=>document.querySelector('.v071-tool-slot[data-group="shapes"] .v071-tool-flyout').hidden);
    }
    await page.locator('.v06-menu > summary').first().click();
    await bounded('.v06-menu[open] > .v06-menu-pop');
    await page.evaluate(()=>document.getElementById('studio-command-palette').showModal());
    await page.waitForFunction(()=>!document.querySelector('.v06-menu[open]')&&document.getElementById('studio-command-palette').open);
    assert.equal(await page.evaluate(()=>window.MangoStudioOverlaysV072.state().active),null);
    await page.evaluate(()=>document.getElementById('studio-command-palette').close());
    assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2));
   }
  }
  console.log('Actual Chromium extension editor overlay smoke passed');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
