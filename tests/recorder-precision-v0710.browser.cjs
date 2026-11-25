/* Real Chromium MediaRecorder and canvas/audio tracks; deterministic synthetic
 * getDisplayMedia instead of automating the protected OS capture picker. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),out=path.join(dir,'recorder-screenshots');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,acceptDownloads:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mango-switch-'));
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const id=new URL(worker.url()).host,p=await ctx.newPage();
  await p.setViewportSize({width:1366,height:768});
  await p.goto('chrome-extension://'+id+'/recorder.html');await p.waitForFunction(()=>!!window.MangoRecorderCursorV073&&!!window.MangoRecorderSessionV0710);
  const inspect=()=>p.evaluate(()=>MangoRecorderSessionV0710.inspect()),cursor=()=>p.evaluate(()=>MangoRecorderCursorV073.state());
  const spotlight=()=>p.locator('#spotlight-quick-v0710').getAttribute('aria-pressed');
  await p.locator('body').click({position:{x:200,y:15}});
  await p.keyboard.press('Digit1');assert.equal((await cursor()).settings.spotlight,true);
  await p.keyboard.press('Numpad1');assert.equal((await cursor()).settings.spotlight,false);
  await p.keyboard.down('Digit1');assert.equal(await spotlight(),'true');assert.equal((await cursor()).settings.spotlight,false);
  await p.waitForTimeout(350);await p.keyboard.up('Digit1');assert.equal(await spotlight(),'false');
  await p.keyboard.press('Numpad1');assert.equal(await spotlight(),'true');await p.keyboard.down('Numpad1');await p.waitForTimeout(350);await p.keyboard.up('Numpad1');assert.equal(await spotlight(),'true');
  await p.keyboard.press('Digit1');assert.equal(await spotlight(),'false');
  await p.locator('#cursor-scale-v073').focus();await p.keyboard.press('Digit1');assert.equal(await spotlight(),'false');
  await p.locator('#cursor-scale-v073').fill('1.75');await p.locator('#cursor-scale-v073').blur();await p.locator('body').click({position:{x:200,y:15}});
  await p.keyboard.down('Digit1');await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.keyboard.up('Digit1');assert.equal(await spotlight(),'false');
  assert.ok(await p.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2),'Desktop recorder must fit viewport');
  const quick=await p.locator('#spotlight-quick-v0710').boundingBox();assert.ok(quick.y>=0&&quick.y+quick.height<=768);
  await p.screenshot({path:path.join(out,'01-recorder-compact.png')});
  assert.equal(await p.locator('.cursor-fold-v0710[open]').count(),0);
  await p.locator('.cursor-fold-v0710').first().locator('summary').click();assert.ok(await p.locator('#cursor-radius-v073').isVisible());
  await p.locator('.cursor-fold-v0710').first().locator('summary').click();
  await p.evaluate(()=>{
   const make=(w,h,color,withAudio=true)=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
    let count=0;const paint=()=>{g.fillStyle=color;g.fillRect(0,0,w,h);g.fillStyle='#ffffff';g.fillRect(1,1,1+(count++%7),1);};paint();
    const stream=c.captureStream(24);const video=stream.getVideoTracks()[0],original=video.getSettings.bind(video);
    video.getSettings=()=>({...original(),width:w,height:h,displaySurface:'monitor'});
    const timer=setInterval(()=>{if(video.readyState==='ended'){clearInterval(timer);return;}paint();},40);
    if(withAudio){const ac=new AudioContext(),dest=ac.createMediaStreamDestination(),osc=ac.createOscillator(),gain=ac.createGain();osc.frequency.value=color==='#d02020'?330:660;gain.gain.value=.025;osc.connect(gain).connect(dest);osc.start();ac.resume();stream.addTrack(dest.stream.getAudioTracks()[0]);}
    return stream;
   };
   window.__captures=[];window.__mic=null;window.__pickerCalls=0;window.__deferredPicker=null;window.__encoders=[];
   const Native=window.MediaRecorder;window.MediaRecorder=class extends Native{constructor(stream,opts){super(stream,opts);window.__encoders.push({recorder:this,tracks:stream.getTracks().map(t=>t.id)});}};
   navigator.mediaDevices.getDisplayMedia=async()=>{
    const i=++window.__pickerCalls;
    if(i===2)throw new DOMException('Synthetic picker cancellation','NotAllowedError');
    if(i===4)return new Promise(resolve=>{window.__deferredPicker=()=>{const stream=make(640,360,'#20c020');window.__captures.push(stream);resolve(stream);};});
    const stream=i===1?make(640,360,'#d02020'):make(360,640,'#2040d0');window.__captures.push(stream);return stream;
   };
   navigator.mediaDevices.getUserMedia=async()=>{const ac=new AudioContext(),dest=ac.createMediaStreamDestination(),osc=ac.createOscillator(),gain=ac.createGain();gain.gain.value=.015;osc.frequency.value=440;osc.connect(gain).connect(dest);osc.start();await ac.resume();window.__mic=dest.stream;return dest.stream;};
  });
  await p.locator('#mic').check();await p.locator('#audio').check();await p.locator('#start').click();await p.waitForFunction(()=>MangoRecorderSessionV0710.inspect().state==='recording');
  const first=await inspect();assert.equal(first.outputWidth,640);assert.equal(first.outputHeight,360);assert.equal(first.audioOutput,true);assert.equal(first.sharedAudioNodes,1);
  const pixel=(x,y)=>p.evaluate(([x,y])=>[...document.getElementById('live-composite').getContext('2d').getImageData(x,y,1,1).data],[x,y]);
  await p.waitForFunction(()=>{const d=document.getElementById('live-composite').getContext('2d').getImageData(320,180,1,1).data;return d[0]>170&&d[2]<80;});
  await p.locator('#mode').click();assert.equal((await inspect()).interaction,true);
  await p.keyboard.press('Control+Backquote');assert.equal((await inspect()).interaction,false);
  await p.keyboard.press('Control+Backquote');assert.equal((await inspect()).interaction,true);
  await p.keyboard.press('Control+Backquote');assert.equal((await inspect()).interaction,false);
  // Keep a real recorded interval before switching. Spotlight is burned into the composite.
  await p.locator('#ink').hover();
  await p.keyboard.down('Numpad1');assert.equal((await cursor()).effectiveSpotlight,true);
  await p.waitForFunction(()=>document.getElementById('live-composite').getContext('2d').getImageData(25,25,1,1).data[0]<140,null,{timeout:3000});
  await p.waitForTimeout(300);await p.keyboard.up('Numpad1');assert.equal(await spotlight(),'false');
  await p.waitForTimeout(450);
  await p.keyboard.press('Shift+Backquote');const dlg=p.locator('#source-dialog-v0710');await dlg.waitFor({state:'visible'});
  assert.match(await p.locator('#source-current-v0710').textContent(),/Entire screen/);
  await p.screenshot({path:path.join(out,'02-switch-dialog.png')});
  await p.locator('#source-choose-v0710').click();
  await p.waitForFunction(()=>document.getElementById('source-switch-status-v0710').textContent.includes('Existing recording unchanged'));
  assert.equal((await inspect()).sessionId,first.sessionId);assert.equal((await inspect()).sourceChanges,0);
  assert.equal(await p.evaluate(()=>__captures[0].getVideoTracks()[0].readyState),'live');
  await p.locator('#source-cancel-v0710').click();
  await p.locator('#switch-source-v0710').click();await p.locator('#source-choose-v0710').click();
  await p.waitForFunction(()=>MangoRecorderSessionV0710.inspect().sourceChanges===1);
  assert.equal((await inspect()).sessionId,first.sessionId);assert.equal((await inspect()).outputWidth,640);assert.equal((await inspect()).outputHeight,360);
  assert.equal((await inspect()).sharedAudioNodes,1);assert.equal(await p.evaluate(()=>__encoders.length),1);
  assert.equal(await p.evaluate(()=>__captures[0].getTracks().every(t=>t.readyState==='ended')),true);
  assert.equal(await p.evaluate(()=>__mic.getAudioTracks()[0].readyState),'live');
  await p.waitForFunction(()=>{const d=document.getElementById('live-composite').getContext('2d').getImageData(320,180,1,1).data;return d[2]>150&&d[0]<100;});
  assert.deepEqual((await pixel(5,180)).slice(0,3),[0,0,0],'Portrait source must be fitted, not stretched');
  assert.equal((await inspect()).interaction,false);
  await p.screenshot({path:path.join(out,'03-switched-portrait-source.png')});
  await p.waitForTimeout(500);
  await p.locator('#switch-source-v0710').click();await p.locator('#source-choose-v0710').click();await p.waitForFunction(()=>!!window.__deferredPicker);
  await p.locator('#source-cancel-v0710').click();
  await p.evaluate(()=>__deferredPicker());await p.waitForFunction(()=>__captures[2]?.getTracks().every(t=>t.readyState==='ended'));
  assert.equal((await inspect()).sourceChanges,1);assert.equal((await inspect()).sessionId,first.sessionId);
  const dl=p.waitForEvent('download',{timeout:25000});await p.locator('#stop').click();const download=await dl;const file=path.join(tmp,download.suggestedFilename());await download.saveAs(file);
  assert.ok(fs.statSync(file).size>1000);assert.equal(await p.evaluate(()=>__encoders.length),1);
  assert.equal(await p.evaluate(()=>__mic.getAudioTracks()[0].readyState),'ended');
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height','-of','json',file],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);
  const streams=JSON.parse(probe.stdout).streams;assert.deepEqual(streams.find(s=>s.codec_type==='video'),{codec_type:'video',width:640,height:360});assert.ok(streams.some(s=>s.codec_type==='audio'));
  const frames=spawnSync('ffmpeg',['-v','error','-i',file,'-vf','crop=2:2:320:180,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:4*1024*1024});
  assert.equal(frames.status,0,frames.stderr.toString());let red=false,blue=false;
  for(let i=0;i+2<frames.stdout.length;i+=3){const [r,g,b]=frames.stdout.subarray(i,i+3);if(r>140&&b<100)red=true;if(b>140&&r<100)blue=true;}
  assert.ok(red&&blue,'One decoded output must contain both capture sources');
  await p.setViewportSize({width:1024,height:600});assert.ok(await p.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2));await p.screenshot({path:path.join(out,'04-recorder-1024.png')});
  console.log('Actual recorder: tap/hold both keys, focus/blur, interaction toggle, canceled and accepted source swap, fixed resolution, shared audio/mic continuity, stale candidate cleanup, one decoded two-source recording passed');
 }finally{await ctx.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
