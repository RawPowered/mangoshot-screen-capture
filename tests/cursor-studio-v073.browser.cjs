const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=context.serviceWorkers();if(!worker)worker=await context.waitForEvent('serviceworker',{timeout:20000});
  const id=new URL(worker.url()).host,p=await context.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto('chrome-extension://'+id+'/recorder.html');
  await p.waitForFunction(()=>!!window.MangoRecorderCursorV073);
  await p.locator('#cursor-preset-v073').selectOption('tutorial');
  assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().settings.zoomMode),'click');
  await p.locator('#cursor-link-v073').click();
  assert.match(await p.locator('#cursor-status-v073').textContent(),/Start a browser-tab/);
  await p.locator('#cursor-studio-v073 .cursor-script-v073>summary').click();
  await p.locator('#cursor-recipe-v073').fill(JSON.stringify({schema:'mangoshot.cursor.recipe.v1',action:'recorder.cursor.configure',preset:'follow',settings:{scale:2.2}}));
  await p.locator('#cursor-apply-recipe-v073').click();assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().settings.scale),2.2);
  assert.equal(await p.evaluate(()=>MangoRecorderCursorV073.state().mode),'preview');
  await p.goto('chrome-extension://'+id+'/clip-studio.html');await p.waitForFunction(()=>!!window.MangoCursorClipV073);
  assert.equal(await p.locator('#cursor-clip-apply-v073').isDisabled(),true);
  assert.equal(await p.evaluate(()=>MangoCursorClipV073.inspect().point),null);
  // Exercise actual existing camera transaction through a deterministic stub
  // without claiming an encoder or operating-system mouse integration test.
  const applied=await p.evaluate(()=>{
   let calls=[];window.MangoClipView={original:()=>({}),exporting:()=>false,outputDuration:()=>10,sequencePosition:()=>1,
    segments:()=>[{start:2,end:12}],cursorTrace:()=>({samples:[[3,.25,.75],[3.2,.25,.75]]}),addZoomRange:(...a)=>calls.push(a)};
   const r=MangoCursorClipV073.applyRecipe({schema:'mangoshot.cursor.recipe.v1',action:'clip.cursor.zoom',scale:2,transition:.4,hold:1});
   return {r,calls};
  });
  assert.deepEqual(applied.calls,[[1,2.4,2,.25,.75,.4]]);
  console.log('Recorder and Clip Studio cursor controls and recipe browser smoke passed');
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
