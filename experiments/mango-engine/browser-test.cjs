// Research-only fixture. No production MangoShot permissions or renderer changes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mango-wasm-ext-'));let ctx;
 try{
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({manifest_version:3,name:'MangoEngine isolated test',version:'0.0.1',background:{service_worker:'background.js'},content_security_policy:{extension_pages:"script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"}}));
  fs.writeFileSync(path.join(dir,'background.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
  fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><title>Local Wasm worker test</title>');
  fs.copyFileSync(process.argv[2],path.join(dir,'mango-engine.wasm'));
  fs.writeFileSync(path.join(dir,'worker.js'),[
   "let instance;self.onmessage=async({data})=>{try{",
   "if(!(data instanceof ArrayBuffer)||data.byteLength===0||data.byteLength%4||data.byteLength>64*1024*1024)throw Error('Invalid RGBA buffer');",
   "if(!instance){const r=await fetch('mango-engine.wasm');instance=(await WebAssembly.instantiate(await r.arrayBuffer(),{})).instance;}",
   "const e=instance.exports,n=data.byteLength,p=e.mango_prepare(n);if(!p)throw Error('Allocation rejected');",
   "new Uint8Array(e.memory.buffer,p,n).set(new Uint8Array(data));if(e.mango_grayscale(n)!==1)throw Error('Kernel rejected');",
   "const result=new Uint8Array(e.memory.buffer,p,n).slice().buffer;self.postMessage({ok:true,buffer:result},[result]);",
   "}catch(e){self.postMessage({ok:false,error:String(e.message||e)});}};"
  ].join('\n'));
  ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
  let [bg]=ctx.serviceWorkers();if(!bg)bg=await ctx.waitForEvent('serviceworker',{timeout:20000});const page=await ctx.newPage();await page.goto('chrome-extension://'+new URL(bg.url()).host+'/index.html');
  const result=await page.evaluate(async()=>{
   const w=new Worker('worker.js');const call=data=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Worker timed out')),15000);w.onmessage=e=>{clearTimeout(timeout);resolve(e.data);};w.onerror=e=>{clearTimeout(timeout);reject(Error(e.message));};w.postMessage(data,[data]);});
   try{
    const rejected=await call(new ArrayBuffer(3));if(rejected.ok)throw Error('Malformed input accepted');const measurements=[];
    for(const [width,height] of [[1920,1080],[3840,2160]]){const a=new Uint8Array(width*height*4);let x=0x12345678;for(let i=0;i<a.length;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;a[i]=x>>>24;}const expected=a.slice();for(let i=0;i<expected.length;i+=4){const y=(77*expected[i]+150*expected[i+1]+29*expected[i+2]+128)>>8;expected[i]=expected[i+1]=expected[i+2]=y;}
     const start=performance.now(),res=await call(a.buffer),ms=performance.now()-start;if(!res.ok)throw Error(res.error);const out=new Uint8Array(res.buffer);if(out.length!==expected.length)throw Error('Length mismatch');for(let i=0;i<out.length;i++)if(out[i]!==expected[i])throw Error('Pixel mismatch at '+i);measurements.push({width,height,workerRoundtripMs:ms,parity:true,transferred:a.byteLength===0});}
    return {rejected:true,measurements};
   }finally{w.terminate();}
  });
  assert.equal(result.rejected,true);assert.ok(result.measurements.every(x=>x.parity&&x.transferred));console.log(JSON.stringify(result));
 }finally{await ctx?.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
