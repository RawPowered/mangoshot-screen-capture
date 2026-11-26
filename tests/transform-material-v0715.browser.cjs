const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'transform-material-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const g=c.getContext('2d');g.fillStyle='#28323c';g.fillRect(0,0,1000,600);await MangoCaptureStore.save('rotation-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=rotation-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoCompositorUIV0714);
  const ink=p.locator('#ink'),state=()=>p.evaluate(()=>MangoLayerImageV0712.state()),pixels=()=>ink.evaluate(c=>c.toDataURL());
  async function drag(a,b){const r=await ink.boundingBox();await p.mouse.move(r.x+r.width*a[0],r.y+r.height*a[1]);await p.mouse.down();await p.mouse.move(r.x+r.width*b[0],r.y+r.height*b[1],{steps:9});await p.mouse.up();}
  await p.evaluate(()=>MangoToolGroupsV071.activate('rectangle'));await drag([.28,.36],[.62,.49]);await p.evaluate(()=>MangoToolGroupsV071.activate('select'));
  await drag([.45,.40],[.45,.40]);await p.locator('[data-image-tab=layers]').click();const initial=await pixels(),before=(await state()).layers[0];
  const input=p.locator('#image-layer-rotation-v0715');await input.fill('90');await input.press('Enter');await p.waitForFunction(()=>MangoLayerImageV0712.state().layers[0].rotation===90);
  assert.notEqual(await pixels(),initial);const transformed=await p.locator('#vector-selection-box').evaluate(x=>getComputedStyle(x).transform);assert.ok(transformed!=='none');
  await p.screenshot({path:path.join(out,'01-rotated-vector.png')});
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal((await state()).layers[0].rotation,0);assert.equal(await pixels(),initial);
  await p.evaluate(()=>MangoLayerImageV0712.select([MangoLayerImageV0712.state().layers[0].id]));const handle=p.locator('#vector-selection-box [data-rotation-handle-v0715]'),box=await handle.boundingBox(),bounds=await p.locator('#vector-selection-box').boundingBox();
  const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.keyboard.down('Shift');await p.mouse.move(center.x+Math.max(40,bounds.height),center.y,{steps:12});await p.keyboard.up('Shift');await p.mouse.up();
  const angle=(await state()).layers[0].rotation;assert.ok(Math.abs(angle)>15&&Math.abs(angle%15)<.001,angle);await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);
  await p.evaluate(()=>{const h=MangoLayerImageV0712,s=h.state();h.select([s.layers[0].id]);MangoCompositorUIV0714.open('material');});const dlg=p.locator('#compositor-v0714');await dlg.waitFor({state:'visible'});
  await p.locator('#pc-material-gold-v0715').click();await p.locator('#pc-apply-v0714').click();assert.equal((await state()).layers[0].material.kind,'metal');assert.notEqual(await pixels(),initial);await p.screenshot({path:path.join(out,'02-image-material.png')});
  await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),initial);
  await p.evaluate(async()=>{await MangoCreativeV079.ready;MangoCreativeImageV079.insert('fonts','manrope','600','Rotation text');const h=MangoLayerImageV0712,s=h.state(),id=s.layers.find(l=>l.type==='text').id;h.apply('effects',[id],{rotation:45},s.stamp);});assert.equal((await state()).layers.find(l=>l.type==='text').rotation,45);
  // Captures are consumed on first load. Seed a fresh, independent mask fixture.
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const g=c.getContext('2d');g.fillStyle='#28323c';g.fillRect(0,0,1000,600);await MangoCaptureStore.save('rotation-mask-fixture',{width:1000,height:600,pageHeight:600,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=rotation-mask-fixture');await p.waitForFunction(()=>MangoImageActions.state().ready&&!!window.MangoCompositorUIV0714);
  // Import an asymmetric source and confirm inverse mask mapping and actual PNG output.
  const asset=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=160;c.height=80;const q=c.getContext('2d');q.fillStyle='#ff0000';q.fillRect(0,0,80,80);q.fillStyle='#0000ff';q.fillRect(80,0,80,80);return c.toDataURL().split(',')[1];});
  await p.locator('#image-import-file').setInputFiles({name:'rotation-test.png',mimeType:'image/png',buffer:Buffer.from(asset,'base64')});await p.waitForFunction(()=>MangoLayerImageV0712.state().layers.some(l=>l.type==='image'));
  await p.evaluate(()=>{const h=MangoLayerImageV0712,s=h.state();h.apply('effects',[s.layers.find(l=>l.type==='image').id],{rotation:90},s.stamp);});
  const sample=()=>ink.evaluate(c=>Array.from(c.getContext('2d').getImageData(500,235,1,1).data));
  const top=await sample();assert.ok(top[0]>240&&top[2]<10&&top[3]===255,JSON.stringify(top));
  await p.evaluate(()=>MangoToolGroupsV071.activate('mask-erase'));assert.equal(await p.evaluate(()=>MangoToolImageV0711.state().tool),'mask-erase');
  const target=await ink.boundingBox(),sx=target.x+target.width*.5,sy=target.y+target.height*235/600;const hit=await p.evaluate(([x,y])=>document.elementFromPoint(x,y)?.id,[sx,sy]);assert.equal(hit,'ink','Mask target must be the annotation canvas.');
  await p.mouse.move(sx,sy);await p.mouse.down();await p.mouse.move(sx+target.width*.005,sy,{steps:4});await p.mouse.up();assert.ok((await sample())[3]<20,JSON.stringify({sample:await sample(),selection:(await state()).selection,status:await p.locator('#status').textContent()}));
  await p.screenshot({path:path.join(out,'02b-rotated-mask.png')});
  await p.evaluate(()=>MangoImageActions.run('undo'));assert.deepEqual(await sample(),top);
  const pngPromise=p.waitForEvent('download',{timeout:30000});await p.locator('#png').evaluate(b=>b.click());const png=await pngPromise,pngPath=await png.path();assert.ok(pngPath);
  const exported=await p.evaluate(async raw=>{const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(raw),x=>x.charCodeAt(0))],{type:'image/png'}));const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const q=c.getContext('2d');q.drawImage(bitmap,0,0);return Array.from(q.getImageData(500,235,1,1).data);},fs.readFileSync(pngPath).toString('base64'));assert.deepEqual(exported,top);
  await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoCompositorUIV0714);await p.evaluate(()=>{MangoClipView.addLayer('text','title');MangoCompositorUIV0714.open('material');});
  await p.locator('#pc-material-silver-v0715').click();await p.locator('#pc-apply-v0714').click();assert.equal(await p.evaluate(()=>MangoClipView.layers()[0].material.kind),'metal');
  const proof=await p.evaluate(()=>{const v=MangoClipView,s=v.sequenceDraft(),l=s.layers[0],t=(l.start+l.end)/2,a=document.createElement('canvas'),b=document.createElement('canvas');for(const c of [a,b]){c.width=640;c.height=360;}MangoGraphics.render(a.getContext('2d'),[l],t,640,360);MangoGraphics.render(b.getContext('2d'),[{...l,material:null}],t,640,360);const restored=MangoProject.check(MangoProject.pack(s.source,s.segments,s.layers,s.markers,s.transitions,s.sourceGrade),s.source);return {different:a.toDataURL()!==b.toDataURL(),kind:restored.layers[0].material.kind};});assert.ok(proof.different);assert.equal(proof.kind,'metal');
  await p.screenshot({path:path.join(out,'03-video-material.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});await p.evaluate(()=>document.getElementById('undo').click());assert.equal(await p.evaluate(()=>MangoClipView.layers()[0].material||null),null);
  await p.setViewportSize({width:768,height:600});await p.evaluate(()=>MangoCompositorUIV0714.open('material'));const b=await dlg.boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=769&&b.y+b.height<=601);await p.screenshot({path:path.join(out,'04-compact-material.png')});await p.keyboard.press('Escape');await dlg.waitFor({state:'hidden'});
  console.log('Actual object rotation, snapped handle, undo/pixels, text rotation, rotated image mask and exported PNG, image and video material renderer, project roundtrip and modal bounds passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
