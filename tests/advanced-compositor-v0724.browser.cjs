const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'advanced-compositor-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoAdvancedCompositingUIV0724);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,320,180);await MangoCaptureStore.save('composite-fixture',{width:320,height:180,pageHeight:180,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=composite-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!!window.MangoAdvancedCompositingUIV0724);
  await p.evaluate(async()=>{const H=MangoImageDocumentV0723,s=H.state(),doc=H.save(s.stamp,'Composite');
   const rect=(id,x1,y1,x2,y2,color)=>({id,type:'shape',kind:'rectangle',name:id,points:[{x:x1,y:y1,p:1},{x:x2,y:y2,p:1}],size:1,color,opacity:1,visible:true,locked:false,vector:{stroke:color,strokeWidth:1,fill:color,fillEnabled:true,lineStyle:'solid',cornerRadius:0,starPoints:5,starInner:.46,arrowHead:'end'}});
   doc.layers=[rect('red',30,30,180,130,'#ff0000'),rect('blue',80,50,230,150,'#0000ff'),rect('green',260,25,290,55,'#00ff00'),{id:'redaction',type:'redact',name:'redaction',points:[{x:5,y:5,p:1},{x:24,y:24,p:1}],size:4,color:'#000000',visible:true,opacity:1}];
   await H.open(doc,s.stamp);MangoLayerImageV0712.select(['red','blue']);});
  const pixels=()=>p.locator('#ink').evaluate(c=>c.toDataURL()),initial=await pixels(),inkPixel=()=>p.locator('#ink').evaluate(c=>Array.from(c.getContext('2d').getImageData(100,80,1,1).data));
  await p.locator('#ac-open-v0724').click();await p.locator('#ac-group-add-v0724').click();
  await p.locator('#ac-group-opacity-v0724').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.locator('#ac-adjust-add-v0724').click();await p.locator('#ac-adjust-kind-v0724').selectOption('monochrome');await p.locator('#ac-adjust-value-v0724').fill('1');await p.locator('#ac-adjust-value-v0724').press('Tab');
  await p.waitForFunction(()=>!document.getElementById('ac-apply-v0724').disabled);assert.equal(await pixels(),initial);
  await p.screenshot({path:path.join(out,'01-compositing-draft.png')});await p.locator('#ac-apply-v0724').click();await p.locator('#ac-dialog-v0724').waitFor({state:'hidden'});
  const px=await inkPixel();assert.equal(px[2],255);assert.ok(px[3]>=127&&px[3]<=129,'group alpha must be applied once: '+px);
  const grade=await p.evaluate(()=>{const H=MangoRasterImageV0722,c=H.capture(H.state().stamp,'full'),g=c.getContext('2d');return {corner:Array.from(g.getImageData(300,170,1,1).data),redaction:Array.from(g.getImageData(12,12,1,1).data),raw:Array.from(document.getElementById('base').getContext('2d').getImageData(300,170,1,1).data),png:c.toDataURL()};});
  assert.ok(Math.abs(grade.corner[0]-grade.corner[1])<=1&&Math.abs(grade.corner[1]-grade.corner[2])<=1&&grade.corner[0]>20);assert.deepEqual(grade.raw,[255,0,0,255]);assert.deepEqual(grade.redaction,[17,17,17,255]);
  const committed=await pixels();await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);assert.equal(await p.locator('#adjusted-source-v0724').isVisible(),false);
  await p.evaluate(()=>MangoImageActions.run('redo'));assert.equal(await pixels(),committed);
  // Wrap the existing group plus a third layer in a true nested group.
  await p.evaluate(()=>MangoLayerImageV0712.select(['red','blue','green']));await p.locator('#ac-open-v0724').click();await p.locator('#ac-group-add-v0724').click();await p.waitForFunction(()=>!document.getElementById('ac-apply-v0724').disabled);await p.locator('#ac-apply-v0724').click();
  const nested=await p.evaluate(()=>MangoAdvancedImageV0724.state());assert.equal(nested.composition.groups.length,2);
  const saved=await p.evaluate(()=>{const H=MangoImageDocumentV0723;return H.save(H.state().stamp,'Nested composition');});assert.equal(saved.version,2);assert.equal(saved.composition.groups.length,2);
  const expected=await p.evaluate(()=>{const H=MangoRasterImageV0722;return H.capture(H.state().stamp,'full').toDataURL();});
  await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);await p.evaluate(async doc=>{const H=MangoImageDocumentV0723;await H.open(doc,H.state().stamp);},saved);
  assert.equal(await p.evaluate(()=>{const H=MangoRasterImageV0722;return H.capture(H.state().stamp,'full').toDataURL();}),expected);
  await p.screenshot({path:path.join(out,'02-native-v2-reopened.png')});
  console.log('Actual isolated group alpha, nested hierarchy, protected redaction, base adjustment, undo/redo and version 2 project pixel roundtrip passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
