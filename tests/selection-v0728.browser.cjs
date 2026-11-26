const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'selection-studio-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoSelectionStudioV0728);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d');g.fillStyle='#334455';g.fillRect(0,0,320,180);await MangoCaptureStore.save('selection-fixture',{width:320,height:180,pageHeight:180,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=selection-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!!window.MangoSelectionStudioV0728);
  const raw=await p.evaluate(async()=>{const H=MangoImageDocumentV0723,s=H.state(),doc=H.save(s.stamp,'Selection');
   const c=document.createElement('canvas');c.width=100;c.height=100;const g=c.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,100,100);
   doc.assets=[{id:'asset1',name:'Red source',width:100,height:100,png:c.toDataURL()}];doc.mattes=[{id:'matte1',width:100,height:100,alpha:MangoImageDocumentCoreV0723.encode(Uint8Array.from({length:10000},(_,i)=>i%100<80?255:0))}];
   doc.layers=[{id:'photo',type:'image',name:'Photo',assetId:'asset1',cutoutKey:'matte1',width:100,height:100,points:[{x:50,y:40,p:1}],opacity:1,visible:true,locked:false},{id:'redact',type:'redact',name:'Protected',points:[{x:5,y:5,p:1},{x:24,y:24,p:1}],size:4,color:'#000000',visible:true,opacity:1}];
   await H.open(doc,s.stamp);MangoLayerImageV0712.select(['photo']);return {base:doc.base,png:doc.assets[0].png};});
  const ink=p.locator('#ink'),pixels=()=>ink.evaluate(c=>c.toDataURL()),initial=await pixels();
  await p.locator('#ps-open-v0728').click();assert.equal(await p.locator('#ps-scope-v0728').inputValue(),'source');const view=p.locator('#ps-view-v0728');
  async function drag(x1,y1,x2,y2){const b=await view.boundingBox();await p.mouse.move(b.x+b.width*x1,b.y+b.height*y1);await p.mouse.down();await p.mouse.move(b.x+b.width*x2,b.y+b.height*y2,{steps:12});await p.mouse.up();}
  await drag(.1,.1,.95,.95);await p.locator('#ps-combine-v0728').selectOption('subtract');await p.locator('#ps-tool-ellipse-v0728').click();await drag(.35,.35,.65,.65);
  await p.waitForFunction(()=>!document.getElementById('ps-apply-v0728').disabled&&document.getElementById('ps-status-v0728').textContent.includes('2 selection regions'));
  assert.equal(await pixels(),initial);await p.locator('#ps-preview-composition-v0728').click();assert.equal(await pixels(),initial);await p.screenshot({path:path.join(out,'01-selection-mask-draft.png')});
  await p.locator('#ps-apply-v0728').click();await p.locator('#ps-dialog-v0728').waitFor({state:'hidden'});
  const px=await ink.evaluate(c=>{const g=c.getContext('2d'),p=(x,y)=>Array.from(g.getImageData(x,y,1,1).data);return {visible:p(70,60),hole:p(100,90),outside:p(52,90),matte:p(140,60),redact:p(12,12)};});
  assert.deepEqual(px.visible,[255,0,0,255]);assert.equal(px.hole[3],0);assert.equal(px.outside[3],0);assert.equal(px.matte[3],0);assert.deepEqual(px.redact,[17,17,17,255]);
  const committed=await pixels();await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);await p.evaluate(()=>MangoImageActions.run('redo'));assert.equal(await pixels(),committed);
  const save=()=>p.evaluate(()=>{const H=MangoImageDocumentV0723;return H.save(H.state().stamp,'Masked selection');});
  const project=await save();assert.equal(project.version,6);assert.equal(project.layers[0].selectionMask.regions.length,2);assert.equal(project.assets[0].png,raw.png);assert.equal(project.base,raw.base);
  await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);await p.evaluate(async doc=>{const H=MangoImageDocumentV0723;await H.open(doc,H.state().stamp);},project);assert.equal(await pixels(),committed);assert.deepEqual((await save()).layers,project.layers);
  // Verify true raster Boolean operations, inversion and feathering independent of UI.
  const result=await p.evaluate(()=>{const S=MangoSelectionV0728,r=(kind,op,points)=>({kind,op,points:points.map(([x,y])=>({x,y}))}),a=S.add(S.empty(),r('rectangle','replace',[[0,0],[.6,.8]])),b=S.add(a,r('polygon','add',[[.7,0],[1,0],[1,1]])),v=S.add(b,r('rectangle','intersect',[[.2,.2],[.9,.9]])),sample=(mask,x,y)=>{const c=S.render(mask,100,100);const a=c.getContext('2d').getImageData(x,y,1,1).data[3];c.width=c.height=1;return a;};
   const feather={...a,feather:6};return [sample(v,30,30),sample(v,10,10),sample(v,85,30),sample({...v,inverted:true},10,10),sample(feather,60,40)];});
  assert.deepEqual(result.slice(0,4),[255,0,255,255]);assert.ok(result[4]>0&&result[4]<255);
  await p.evaluate(()=>MangoLayerImageV0712.select(['photo']));await p.locator('#ps-open-v0728').click();assert.equal(await p.locator('#ps-scope-v0728').inputValue(),'source');
  await p.locator('#ps-invert-v0728').check();await p.keyboard.press('Escape');await p.locator('#ps-dialog-v0728').waitFor({state:'hidden'});assert.equal(await pixels(),committed);
  await p.locator('#ps-open-v0728').click();await p.locator('#ps-scope-v0728').selectOption('composition');await p.locator('#ps-all-v0728').click();await p.locator('#ps-combine-v0728').selectOption('intersect');await drag(.002,.002,.5,.8);
  await p.waitForFunction(()=>!document.getElementById('ps-apply-v0728').disabled);const [download]=await Promise.all([p.waitForEvent('download'),p.locator('#ps-apply-v0728').click()]);const bytes=fs.readFileSync(await download.path());assert.equal(bytes.readUInt32BE(16),320);assert.equal(bytes.readUInt32BE(20),180);
  const exported=await p.evaluate(async b64=>{const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src='data:image/png;base64,'+b64;});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.drawImage(im,0,0);return [Array.from(q.getImageData(12,12,1,1).data),q.getImageData(250,150,1,1).data[3]];},bytes.toString('base64'));
  assert.deepEqual(exported,[[17,17,17,255],0]);assert.equal(await pixels(),committed);
  await p.locator('#ps-close-v0728').click();await p.setViewportSize({width:1024,height:600});await p.locator('#ps-open-v0728').click();const box=await p.locator('#ps-dialog-v0728').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=1025&&box.y+box.height<=601);await p.screenshot({path:path.join(out,'02-compact-selection.png')});
  console.log('Pixel selections, Boolean alpha, existing matte intersection, safe PNG export, native v6 roundtrip and undo passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
