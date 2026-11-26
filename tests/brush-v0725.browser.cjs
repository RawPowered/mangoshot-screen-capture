const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'brush-studio-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();await p.setViewportSize({width:1440,height:900});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoBrushStudioV0725);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const g=c.getContext('2d');g.fillStyle='#24384a';g.fillRect(0,0,640,360);await MangoCaptureStore.save('brush-fixture',{width:640,height:360,pageHeight:360,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=brush-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!document.getElementById('bs-open-v0725').disabled);
  await p.locator('#bs-open-v0725').click();await p.locator('#bs-preset-calligraphy-v0725').click();const knot=p.locator('#bs-knot-2-v0725');await knot.fill('75');await knot.press('Tab');await p.waitForFunction(()=>!document.getElementById('bs-apply-v0725').disabled);
  await p.locator('#bs-custom-name-v0725').fill('My nib');await p.locator('#bs-store-v0725').click();await p.screenshot({path:path.join(out,'01-pressure-curve.png')});await p.locator('#bs-apply-v0725').click();
  assert.equal(await p.evaluate(()=>MangoBrushV0725.read().custom[0].name),'My nib');
  await p.evaluate(()=>{MangoToolGroupsV071.activate('pen');document.getElementById('size').value='24';document.getElementById('color').value='#ff0000';});
  const ink=p.locator('#ink'),b=await ink.boundingBox(),client=await ctx.newCDPSession(p);
  const x=b.x+b.width*.2,y=b.y+b.height*.45;
  // Chromium protocol delivers actual PointerEvent pen pressure, not fabricated tablet hardware.
  await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen',force:.15});
  for(let i=1;i<=24;i++)await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+b.width*.55*i/24,y:y+Math.sin(i/24*Math.PI)*18,button:'left',buttons:1,pointerType:'pen',force:.15+.8*i/24});
  await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+b.width*.55,y,button:'left',buttons:0,clickCount:1,pointerType:'pen',force:0});
  await p.waitForFunction(()=>MangoLayerImageV0712.state().layers.length===1);
  const save=()=>p.evaluate(()=>{const H=MangoImageDocumentV0723;return H.save(H.state().stamp,'Brush fixture');}),pixels=()=>ink.evaluate(c=>c.toDataURL());
  const project=await save();assert.equal(project.version,3);const layer=project.layers[0];assert.equal(layer.brush.tip,'chisel');assert.equal(layer.brush.curve[2],.75);assert.ok(Math.max(...layer.points.map(p=>p.p))-Math.min(...layer.points.map(p=>p.p))>.3);
  const original=await pixels();assert.ok(await ink.evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
  await p.evaluate(id=>MangoLayerImageV0712.select([id]),layer.id);await p.locator('#bs-open-v0725').click();assert.equal(await p.locator('#bs-mode-v0725').inputValue(),'selected');
  await p.locator('#bs-preset-soft-v0725').click();await p.waitForFunction(()=>!document.getElementById('bs-apply-v0725').disabled);assert.equal(await pixels(),original);
  await p.locator('#bs-apply-v0725').click();assert.notEqual(await pixels(),original);await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),original);
  await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);await p.evaluate(async project=>{const H=MangoImageDocumentV0723;await H.open(project,H.state().stamp);},project);
  assert.equal(await pixels(),original);assert.deepEqual((await save()).layers,project.layers);
  await p.evaluate(id=>MangoLayerImageV0712.select([id]),layer.id);await p.locator('#bs-open-v0725').click();await p.locator('#bs-preset-marker-v0725').click();await p.keyboard.press('Escape');await p.locator('#bs-dialog-v0725').waitFor({state:'hidden'});assert.equal(await pixels(),original);
  await p.setViewportSize({width:1024,height:600});await p.locator('#bs-open-v0725').click();await p.locator('#bs-dialog-v0725').waitFor({state:'visible'});const box=await p.locator('#bs-dialog-v0725').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=1025&&box.y+box.height<=601);await p.screenshot({path:path.join(out,'02-compact-brush.png')});
  console.log('Actual pressure events, brush preview, local presets, selected-stroke undo, version 3 roundtrip and compact modal passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
