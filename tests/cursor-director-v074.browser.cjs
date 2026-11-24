const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});
  const id=new URL(worker.url()).host,p=await ctx.newPage();await p.setViewportSize({width:1366,height:768});
  await p.goto('chrome-extension://'+id+'/clip-studio.html');await p.waitForFunction(()=>!!window.MangoCursorDirectorV074);
  await p.locator('[data-v062-tab="cursor"]').click();await p.locator('#cursor-director-v074').waitFor({state:'visible'});
  assert.equal(await p.locator('#cd-add-v074').isDisabled(),true);
  const result=await p.evaluate(()=>{
   const c=MangoCursorCoreV073,d=MangoCursorDirectorCoreV074,trace=c.createTrace();for(let i=0;i<100;i++)trace.add(i*.2,{x:.5,y:.5});trace.click(2,{x:.5,y:.5});
   const t=trace.finish();let regions=[],zoom=[],commits=0;const parts=[{start:0,end:20}];
   window.MangoClipView={original:()=>({}),duration:()=>20,outputDuration:()=>20,exporting:()=>false,segments:()=>parts,zoomFrames:()=>zoom,cursorRegions:()=>regions,cursorTrace:()=>t,seekOutput:()=>{},commitCursorDirector(p){commits++;if(p.regions)regions=p.regions;if(p.zoomFrames)zoom=p.zoomFrames;MangoCursorDirectorV074.refresh();}};
   MangoCursorDirectorV074.refresh();
   MangoCursorDirectorV074.run({schema:d.RECIPE,action:'effects.add',start:0,end:8,style:d.preset('spotlight')});
   const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;const paint=canvas.getContext('2d');paint.fillStyle='#fff';paint.fillRect(0,0,200,100);
   d.paint(paint,t,regions,parts,2,{x:.5,y:.5,scale:1},200,100);
   const pixels=[paint.getImageData(100,50,1,1).data[0],paint.getImageData(0,0,1,1).data[0]];
   const proposal=MangoCursorDirectorV074.run({schema:d.RECIPE,action:'smartZoom.propose',settings:{mode:'clicks'}});
   const before=commits;
   const applied=MangoCursorDirectorV074.run({schema:d.RECIPE,action:'smartZoom.apply',proposalId:proposal.proposalId,selected:proposal.items.map(x=>x.id)});
   return {pixels,before,commits,applied,zoom:zoom.length,regions:regions.length};
  });
  assert.equal(result.pixels[0],255);assert.ok(result.pixels[1]<150);assert.equal(result.before,1);assert.equal(result.commits,2);assert.equal(result.zoom,2);assert.equal(result.regions,1);
  await p.locator('#cd-track-v074 button').first().waitFor({state:'visible'});
  await p.locator('[data-cd-tab="presets"]').click();await p.locator('#cd-preset-name-v074').fill('Browser test preset');await p.locator('#cd-save-preset-v074').click();
  assert.ok((await p.locator('#cd-presets-v074').textContent()).includes('Browser test preset'));
  console.log('Actual editor Cursor tab, timeline track, canvas pixels, reviewed proposals and preset persistence smoke passed (mocked source model)');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
