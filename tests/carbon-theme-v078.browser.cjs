/* Actual unpacked extension, synthetic local image/video only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const dir=path.resolve(__dirname,'..'),fixture=process.argv[2],out=path.join(dir,'carbon-screenshots');assert.ok(fixture);fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 try{
  let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});
  const url='chrome-extension://'+new URL(worker.url()).host+'/',p=await ctx.newPage();
  const accent='rgb(183, 255, 60)';
  async function neutral(selector){
   const loc=p.locator(selector).first();await loc.waitFor({state:'visible'});
   const result=await loc.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,image:s.backgroundImage};});
   const colors=[...(result.background+' '+result.image).matchAll(/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/g)].filter(m=>m[4]===undefined||Number(m[4])>.1);
   assert.ok(colors.length,selector+' lacks a visible neutral surface: '+JSON.stringify(result));
   for(const m of colors){const [r,g,b]=m.slice(1,4).map(Number);assert.ok(g<=Math.max(r,b)+4&&Math.max(r,g,b)-Math.min(r,g,b)<=40,selector+' green/chromatic fill: '+m[0]);}
  }
  async function screenshot(name){await p.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}
  async function noScroll(){assert.ok(await p.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+2));}
  async function openAutomation(file){if(file!=='recorder.html')await p.locator('.v06-menu > summary').filter({hasText:'Automation'}).click();await p.locator('#automation-open-v075').click();await p.locator('#automation-dialog-v075').waitFor({state:'visible'});await neutral('#automation-dialog-v075');}
  await p.setViewportSize({width:1366,height:768});
  await p.goto(url+'editor.html');await p.waitForFunction(()=>!!window.MangoCaptureStore&&!!window.MangoStudioOverlaysV072);
  await p.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=720;const c=canvas.getContext('2d');
   c.fillStyle='#f2f4f8';c.fillRect(0,0,1200,720);
   c.fillStyle='#26364c';c.fillRect(0,0,1200,96);c.fillStyle='white';c.font='bold 36px sans-serif';c.fillText('Example capture | Project overview',42,62);
   c.fillStyle='#dce4ed';c.fillRect(0,96,245,624);c.fillStyle='#364d66';c.font='24px sans-serif';
   ['Overview','Activity','Reports','Settings'].forEach((s,i)=>c.fillText(s,36,159+i*74));
   c.fillStyle='#26364c';c.font='bold 34px sans-serif';c.fillText('Quarterly results',294,158);
   ['#2a70c7','#e45d47','#40a36a'].forEach((color,i)=>{c.fillStyle=color;c.fillRect(300+i*275,205,225,130);});
   c.fillStyle='#536983';c.font='23px sans-serif';c.fillText('Performance summary',300,405);
   for(let i=0;i<4;i++){c.fillStyle=i%2?'#e5eaf0':'#ffffff';c.fillRect(295,435+i*55,845,46);}
   await MangoCaptureStore.save('carbon-fixture-01',{width:1200,height:720,pageHeight:720,dpr:1,frames:1,full:false},[{index:0,scrollY:0,dataUrl:canvas.toDataURL('image/png')}]);
  });
  await p.goto(url+'editor.html?stored=carbon-fixture-01');await p.waitForFunction(()=>document.getElementById('base').width===1200&&!document.getElementById('png').disabled);
  await neutral('.studio-appbar');await neutral('.image-inspector');await neutral('.image-toolrail');await neutral('.v06-menu-bar');
  const active=p.locator('.v071-tool-slot[data-active=true]').first();await active.waitFor({state:'visible'});
  await neutral('.v071-tool-slot[data-active=true]');
  assert.equal(await active.locator('.v071-tool-main').evaluate(e=>getComputedStyle(e).color),accent);
  const pixel=await p.evaluate(()=>[...document.getElementById('base').getContext('2d').getImageData(310,210,1,1).data]);assert.deepEqual(pixel,[42,112,199,255]);
  await noScroll();await screenshot('01-image-studio');
  await p.locator('.v06-menu > summary').first().click();await neutral('.v06-menu[open]>.v06-menu-pop');await screenshot('02-image-menu');await p.keyboard.press('Escape');
  await openAutomation('editor.html');await screenshot('03-automation-dialog');await p.keyboard.press('Escape');
  await p.goto(url+'clip-studio.html');await p.locator('#file').setInputFiles(fixture);await p.waitForFunction(()=>MangoClipView.automationCapture().ready);
  await neutral('.studio-appbar');await neutral('.clip-properties');await neutral('.v06-rail');await neutral('.timeline-inner');
  const tool=p.locator('.v06-rail [data-v06-tool="tool-select"]');assert.equal(await tool.getAttribute('aria-pressed'),'true');
  assert.equal(await tool.evaluate(e=>getComputedStyle(e).color),accent);await neutral('.v06-rail [data-v06-tool="tool-select"]');
  assert.equal(await tool.locator('svg').first().evaluate(e=>getComputedStyle(e).stroke),accent);
  assert.equal(await p.locator('.timeline-playhead').first().evaluate(e=>getComputedStyle(e).backgroundColor),accent);
  await p.evaluate(()=>MangoClipView.addLayer('text','title'));
  await noScroll();await screenshot('04-clip-studio');
  for(const size of [{width:1024,height:600},{width:768,height:600}]){await p.setViewportSize(size);await noScroll();await p.locator('.v06-menu > summary').first().click();await neutral('.v06-menu[open]>.v06-menu-pop');await p.keyboard.press('Escape');}
  await screenshot('05-clip-studio-compact');
  await p.setViewportSize({width:1366,height:768});await p.goto(url+'recorder.html');await p.waitForFunction(()=>!!window.MangoAutomationV075);
  await neutral('.studio-appbar');await neutral('.studio-toolrail');await neutral('.studio-inspector');await screenshot('06-record-studio');
  await p.goto(url+'popup.html');assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).getPropertyValue('--carbon-accent').trim()),'#b7ff3c');await neutral('body');await screenshot('07-capture-menu');
  console.log('Carbon actual extension: neutral chrome, lime active tools/playhead, preserved source pixels, native menu/modal surfaces, compact viewport and screenshots passed');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
