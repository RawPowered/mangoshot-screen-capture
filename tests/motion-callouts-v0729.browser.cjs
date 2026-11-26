const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'motion-callout-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(bg.url()).host+'/',p=await ctx.newPage();await p.setViewportSize({width:1440,height:900});
  await p.goto(base+'editor.html');await p.waitForFunction(()=>!!window.MangoDimensionalImageUIV0729);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=480;c.height=270;const q=c.getContext('2d');q.fillStyle='#222d3a';q.fillRect(0,0,480,270);await MangoCaptureStore.save('3d-fixture',{width:480,height:270,pageHeight:270,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:c.toDataURL()}]);});
  await p.goto(base+'editor.html?stored=3d-fixture');await p.waitForFunction(()=>MangoImageDocumentV0723.state().ready&&!!window.MangoDimensionalImageUIV0729);await p.locator('#mc-image-open').click();await p.locator('#mc-image-preset-curved').click();
  await p.locator('#mc-image-curve').evaluate(n=>{n.value='.42';n.dispatchEvent(new Event('input',{bubbles:true}));});await p.screenshot({path:path.join(out,'01-3d-image-draft.png')});await p.locator('#mc-image-apply').click();
  const ink=p.locator('#ink'),pixels=()=>ink.evaluate(c=>c.toDataURL()),first=await pixels(),project=await p.evaluate(()=>{const H=MangoImageDocumentV0723;return H.save(H.state().stamp,'3D shape');});assert.equal(project.version,7);assert.equal(project.layers[0].callout3d.curve,.42);
  assert.ok(await ink.evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
  await p.locator('#mc-image-open').click();await p.locator('#mc-image-preset-straight').click();await p.locator('#mc-image-apply').click();assert.notEqual(await pixels(),first);await p.evaluate(()=>MangoImageActions.run('undo'));assert.equal(await pixels(),first);
  await p.reload();await p.waitForFunction(()=>MangoImageDocumentV0723.state().canOpen);await p.evaluate(async project=>{const H=MangoImageDocumentV0723;await H.open(project,H.state().stamp);},project);assert.equal(await pixels(),first);
  await p.goto(base+'professional-sequence.html');const state=()=>p.evaluate(()=>MangoSequenceWorkspaceV0719.state()),idle=()=>p.waitForFunction(()=>!MangoSequenceWorkspaceV0719.state().busy&&document.getElementById('seq-monitor-state').hidden);
  await p.waitForFunction(()=>!!window.MangoSequenceWorkspaceV0719);await idle();await p.locator('#seq-new').click();await p.locator('#seq-width').fill('320');await p.locator('#seq-height').fill('180');await p.locator('#seq-fps').selectOption('24');await p.locator('#seq-length').fill('4');await p.locator('#seq-settings-apply').click();await idle();
  await p.locator('#seq-import').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoSequenceWorkspaceV0719.state().project.assets.length===1&&!MangoSequenceWorkspaceV0719.state().busy);const a=(await state()).project.assets[0];await p.locator('[data-asset="'+a.id+'"]').click();await p.locator('#seq-add').click();await p.locator('#seq-inspect').click();
  await p.locator('#seq-field-end').fill('2');await p.locator('#seq-speed-preset').selectOption('rise');await p.screenshot({path:path.join(out,'02-speed-ramp.png')});await p.locator('#seq-clip-apply').click();await idle();
  let s=await state(),video=s.project.clips.find(c=>c.track==='V1');assert.equal(s.project.version,4);assert.equal(video.speedRamp.length,4);assert.ok(Math.abs(video.sourceOut-2.5)<.001);
  await p.locator('#seq-callout3d').click();await p.locator('#seq-3d-preset-neon').click();await p.locator('#seq-clip-apply').click();await idle();s=await state();assert.ok(s.project.clips.some(c=>c.track==='G2'&&c.callout3d.color==='#45aaff'));
  await p.locator('#seq-callout3d').click();await p.locator('#seq-3d-preset-chevron').click();await p.locator('#seq-field-x').fill('.02');await p.locator('#seq-field-y').fill('.03');await p.locator('#seq-field-width').fill('.28');await p.locator('#seq-field-height').fill('.28');await p.locator('#seq-clip-apply').click();await idle();assert.ok((await state()).project.clips.some(c=>c.track==='G3'));
  await p.screenshot({path:path.join(out,'03-shapes-timeline.png')});
  // Scrub the time-coded native source in a region not obscured by either shape.
  await p.locator('#seq-scrub').evaluate(n=>{n.value='1';n.dispatchEvent(new Event('input',{bubbles:true}));});await idle();
  const sourceAt=await p.evaluate(()=>{const P=MangoIndependentSequenceV0719,c=MangoSequenceWorkspaceV0719.state().project.clips.find(c=>c.track==='V1');return P.sourceAt(c,1);});assert.ok(sourceAt>.5&&sourceAt<1.25);
  const dl=p.waitForEvent('download',{timeout:60000});await p.locator('#seq-export-webm').click();const file=await (await dl).path();assert.ok(fs.statSync(file).size>1000);
  const pixelsAt=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',file,'-frames:v','1','-vf','crop=2:2:4:170','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
  const before=pixelsAt(.3),after=pixelsAt(1.8);assert.ok(before.length&&after.length&&before[0]>150&&after[2]>120,'ramped native source must move from red to blue: '+[...before.slice(0,3),...after.slice(0,3)]);
  const frame=execFileSync('ffmpeg',['-v','error','-ss','1','-i',file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);assert.ok(frame.length===320*180*3);let blue=0;for(let i=0;i<frame.length;i+=3)if(frame[i+2]>150&&frame[i+1]>90&&frame[i]<130)blue++;assert.ok(blue>80,'projected blue shape must appear in encoded video');
  await idle();const save=p.waitForEvent('download');await p.locator('#seq-save').click();const saved=JSON.parse(fs.readFileSync(await (await save).path(),'utf8'));assert.equal(saved.schema,'mangoshot.sequence.v4');assert.ok(saved.clips.some(c=>c.speedRamp)&&saved.clips.filter(c=>c.callout3d).length===2);
  console.log('Editable image mesh, undo and v7 roundtrip; real ramped source export and independent 3D shape tracks passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
