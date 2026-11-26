const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'professional-timeline-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const base='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'clip-studio.html');await p.locator('#file').setInputFiles(process.argv[2]);await p.waitForFunction(()=>MangoClipView.automationCapture().ready&&!!window.MangoProfessionalTimelineUIV0717);
  await p.locator('#v06-media-input').setInputFiles(process.argv[3]);await p.waitForFunction(()=>MangoMediaBin.registry.count()===1&&Number.isFinite(MangoMediaBin.snapshot()[0].duration));
  // Prepared real video, then use actual pointer and keyboard gestures, not a mock timeline.
  const id=await p.evaluate(async()=>{const V=MangoClipView,a=MangoMediaBin.snapshot()[0],m=MangoMultitrackV0716.defaults(),c=MangoMultitrackV0716.make(a,1,V.outputDuration(),'V2');c.end=3;c.sourceOut=2;m.clips=[c];await V.applyMultitrack(m,V.automationCapture().stamp);return c.id;});
  const state=()=>p.evaluate(()=>MangoClipView.multitrack()),tile=p.locator('#pt-clip-'+id);await tile.waitFor({state:'visible'});await tile.scrollIntoViewIfNeeded();
  const width=(await p.locator('#timeline-inner').boundingBox()).width,total=await p.evaluate(()=>MangoClipView.outputDuration()),before=(await state()).clips[0],box=await tile.boundingBox(),dest=await p.locator('#pt-rail-V3').boundingBox();
  await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.keyboard.down('Alt');await p.mouse.move(box.x+box.width/2+.5*width/total,dest.y+dest.height/2,{steps:8});await p.keyboard.up('Alt');await p.mouse.up();
  await p.waitForFunction(id=>MangoClipView.multitrack().clips.find(c=>c.id===id).track==='V3',id);let moved=(await state()).clips[0];assert.ok(Math.abs(moved.start-1.5)<.15,moved.start);assert.equal(moved.sourceIn,before.sourceIn);
  await p.evaluate(()=>document.getElementById('undo').click());assert.equal((await state()).clips[0].track,'V2');await p.evaluate(()=>document.getElementById('redo').click());assert.equal((await state()).clips[0].track,'V3');
  await tile.scrollIntoViewIfNeeded();const edge=await tile.locator('.pt-trim-v0717.start').boundingBox();await p.mouse.move(edge.x+edge.width/2,edge.y+edge.height/2);await p.mouse.down();await p.keyboard.down('Alt');await p.mouse.move(edge.x+edge.width/2+.3*width/total,edge.y+edge.height/2,{steps:7});await p.keyboard.up('Alt');await p.mouse.up();await p.waitForFunction(()=>MangoClipView.multitrack().clips[0].sourceIn>.15);
  const trimmed=(await state()).clips[0];assert.ok(Math.abs(trimmed.end-moved.end)<.01);assert.ok(Math.abs(trimmed.sourceIn-(trimmed.start-moved.start))<.01);
  await tile.focus();await tile.press('ArrowRight');await p.waitForFunction(t=>MangoClipView.multitrack().clips[0].start>t+.02,trimmed.start);
  // Graphic markers preserve transform values and allow direct retiming.
  const lid=await p.evaluate(()=>{const v=MangoClipView;v.seekOutput(.4);v.addLayer('text','title');const l=v.layers().at(-1),a=MangoCompositorV0714.neutral();v.updateLayer(l.id,{start:.4,end:4,keyframes:[a,{...a,t:.5,x:.3},{...a,t:1,rotation:50}]});return l.id;});
  const key=p.locator('[data-layer-id="'+lid+'"] .pt-key-marker-v0717[data-key-index="1"]');await key.scrollIntoViewIfNeeded();const kb=await key.boundingBox();await p.mouse.move(kb.x+kb.width/2,kb.y+kb.height/2);await p.mouse.down();await p.keyboard.down('Alt');await p.mouse.move(kb.x+kb.width/2+.4*width/total,kb.y+kb.height/2,{steps:8});await p.keyboard.up('Alt');await p.mouse.up();
  await p.waitForFunction(id=>MangoClipView.layers().find(l=>l.id===id).keyframes[1].t>.55,lid);const keys=await p.evaluate(id=>MangoClipView.layers().find(l=>l.id===id).keyframes,lid);assert.equal(keys[1].x,.3);assert.equal(keys[2].rotation,50);
  await p.screenshot({path:path.join(out,'01-timeline-keys-and-tracks.png')});
  // Ripple across an active secondary clip creates two source-continuous fragments.
  const old=await state(),c=old.clips[0],cutStart=c.start+.3,cutEnd=cutStart+.3;
  assert.equal(await p.evaluate(([a,b])=>MangoClipView.rippleDelete(a,b),[cutStart,cutEnd]),true);
  const split=(await state()).clips;assert.equal(split.length,2);assert.ok(Math.abs(split[0].end-split[1].start)<.001);assert.ok(Math.abs(split[1].sourceIn-split[0].sourceOut-.3)<.001);
  await p.evaluate(()=>document.getElementById('undo').click());assert.deepEqual(await state(),old);
  await p.setViewportSize({width:768,height:600});await p.evaluate(()=>MangoMultitrackUIV0716.open());const dlg=p.locator('#multitrack-v0716'),r=await dlg.boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=769&&r.y+r.height<=601);await p.screenshot({path:path.join(out,'02-compact-inspector.png')});
  console.log('Professional timeline: real cross-track drag, source-in trim, keyboard nudge, graphic keyframe marker, ripple split, undo and compact inspector passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
