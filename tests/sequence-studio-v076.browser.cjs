const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),fixture=process.argv[2];assert.ok(fixture);
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
 let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const id=new URL(worker.url()).host,p=await ctx.newPage();
 await p.setViewportSize({width:1366,height:768});await p.goto('chrome-extension://'+id+'/clip-studio.html');await p.waitForFunction(()=>!!window.MangoSequenceStudioV076);
 await p.locator('#file').setInputFiles(fixture);await p.waitForFunction(()=>MangoClipView.automationCapture().ready);
 const before=await p.evaluate(()=>({duration:MangoClipView.outputDuration(),layers:MangoClipView.layers().length,zoom:MangoClipView.zoomFrames().length,source:MangoClipView.video().currentTime}));
 await p.locator('.v06-menu > summary').filter({hasText:'Automation'}).click();await p.locator('#automation-open-v075').click();await p.locator('[data-au-tab="sequence"]').click();
 const panel=p.locator('[data-au-page="sequence"]');await panel.waitFor({state:'visible'});
 await p.locator('#sq-validate-v076').click();assert.equal(await p.locator('#sq-apply-v076').isDisabled(),false);
 assert.equal(await p.evaluate(()=>MangoClipView.layers().length),0);assert.equal(await p.evaluate(()=>MangoClipView.zoomFrames().length),0);
 await p.locator('#sq-time-v076').fill('1.5');await p.locator('#sq-render-v076').click();
 await p.waitForFunction(()=>document.getElementById('sq-frame-note-v076').textContent.startsWith('Rendered proposed frame'),null,{timeout:20000});
 const pixel=await p.evaluate(()=>{const c=document.getElementById('sq-canvas-v076'),p=c.getContext('2d').getImageData(2,2,1,1).data;return [...p];});
 assert.ok(pixel[2]>150&&pixel[3]===255,'Actual decoded blue WebM frame expected');
 assert.equal(await p.evaluate(()=>MangoClipView.video().currentTime),before.source,'Separate preview decoder may not seek original');
 await p.locator('.sq-checkpoints-v076 > summary').click();await p.locator('#sq-name-v076').fill('Before tutorial');await p.locator('#sq-save-v076').click();
 await p.locator('#sq-apply-v076').click();assert.equal(await p.evaluate(()=>MangoClipView.layers().length),1);assert.equal(await p.evaluate(()=>MangoClipView.zoomFrames().length),2);
 await p.locator('#sq-points-v076 button').filter({hasText:'Review restore'}).click();assert.equal(await p.locator('#sq-apply-v076').isDisabled(),false);await p.locator('#sq-apply-v076').click();
 assert.equal(await p.evaluate(()=>MangoClipView.layers().length),0);assert.equal(await p.evaluate(()=>MangoClipView.zoomFrames().length),0);
 await p.keyboard.press('Escape');await p.locator('#automation-dialog-v075').waitFor({state:'hidden'});
 await p.evaluate(()=>document.getElementById('undo').click());assert.equal(await p.evaluate(()=>MangoClipView.layers().length),1);
 await p.evaluate(()=>document.getElementById('undo').click());assert.equal(await p.evaluate(()=>MangoClipView.layers().length),0);
 assert.equal(await p.evaluate(()=>MangoClipView.outputDuration()),before.duration);
 await p.setViewportSize({width:768,height:600});await p.locator('.v06-menu > summary').filter({hasText:'Automation'}).click();await p.locator('#automation-open-v075').click();await p.locator('[data-au-tab="sequence"]').click();
 const bounds=await p.locator('#automation-dialog-v075').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=769&&bounds.y+bounds.height<=601);
 await p.locator('#sq-validate-v076').click();assert.equal(await p.locator('#sq-apply-v076').isDisabled(),false);await p.keyboard.press('Escape');
 await p.locator('#automation-dialog-v075').waitFor({state:'hidden'});
 await p.waitForFunction(()=>!MangoSequenceStudioV076.inspect().reviewPending);
 assert.equal(await p.evaluate(()=>MangoSequenceStudioV076.inspect().reviewPending),false);
 console.log('Actual decoded WebM proposed-frame pixels, non-mutating preview, batch commit, checkpoint restore, undo and small viewport passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
