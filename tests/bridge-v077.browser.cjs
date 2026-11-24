const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline'),{chromium}=require('playwright');
(async()=>{
 const repo=path.resolve(__dirname,'..'),fixture=process.argv[2],tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mangoshot-native-')),dir=path.join(tmp,'extension'),home=path.join(tmp,'home'),config=path.join(home,'.config');
 fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(config,{recursive:true});
 for(const name of fs.readdirSync(repo)){const p=path.join(repo,name);if(fs.statSync(p).isFile()&&/\.(html|js|css)$|^manifest\.json$/.test(name))fs.copyFileSync(p,path.join(dir,name));}
 for(const folder of ['assets','icons'])fs.cpSync(path.join(repo,folder),path.join(dir,folder),{recursive:true});
 // Use the exact shipping manifest without injecting or overriding permissions.
 const mf=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));assert.ok(mf.permissions.includes('nativeMessaging'));assert.equal(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'),fs.readFileSync(path.join(repo,'manifest.json'),'utf8'));
 const host=path.join(repo,'companion','mangoshot_bridge.py');fs.chmodSync(host,0o755);
 let ctx,child;
 try{
 ctx=await chromium.launchPersistentContext(path.join(tmp,'profile'),{channel:'chromium',headless:true,env:{...process.env,HOME:home,XDG_CONFIG_HOME:config},args:['--disable-extensions-except='+dir,'--load-extension='+dir,'--no-sandbox']});
 let [worker]=ctx.serviceWorkers();if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:20000});const id=new URL(worker.url()).host;
 for(const folder of [path.join(tmp,'profile','NativeMessagingHosts'),...['chromium','google-chrome','google-chrome-for-testing'].map(browser=>path.join(config,browser,'NativeMessagingHosts'))]){
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'com.rawpowered.mangoshot.bridge.json'),JSON.stringify({name:'com.rawpowered.mangoshot.bridge',description:'MangoShot test host',path:host,type:'stdio',allowed_origins:['chrome-extension://'+id+'/']}));
 }
 const p=await ctx.newPage();await p.setViewportSize({width:1366,height:768});
 await p.goto('chrome-extension://'+id+'/clip-studio.html');await p.waitForFunction(()=>!!window.MangoBridgeV077);
 await p.locator('#file').setInputFiles(fixture);await p.waitForFunction(()=>MangoClipView.automationCapture().ready);
 await p.locator('.v06-menu > summary').filter({hasText:'Automation'}).click();await p.locator('#bridge-open-v077').click();
 await p.locator('.bridge-v077').waitFor({state:'visible'});
 assert.match(await p.locator('#br-permission-info-v077').textContent(),/Native messaging: required/);assert.ok(await p.locator('#br-revoke-v077').isDisabled());
 assert.ok(await p.evaluate(()=>new Promise(resolve=>chrome.permissions.contains({permissions:['nativeMessaging']},resolve))));
 for(const k of ['inspect','propose','frame'])await p.locator('#br-'+k+'-v077').check();
 await p.locator('#br-connect-v077').click();
 await p.waitForFunction(()=>MangoBridgeV077.inspect().connected,null,{timeout:30000}).catch(async e=>{throw Error('Native host pairing failed: '+await p.locator('#br-status-v077').textContent());});
 const secret=JSON.parse(await p.locator('#br-config-v077').inputValue()).mcpServers.mangoshot.env;
 child=spawn('python3',[host,'--mcp'],{env:{...process.env,...secret},stdio:['pipe','pipe','pipe']});
 let req=0;const pending=new Map(),lines=readline.createInterface({input:child.stdout});
 lines.on('line',line=>{const r=JSON.parse(line),resolve=pending.get(r.id);if(resolve){pending.delete(r.id);resolve(r);}});
 function rpc(method,params={}){const id=++req;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP response timeout: '+method));},20000);pending.set(id,r=>{clearTimeout(timer);resolve(r);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
 const handshake=await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'browser-test',version:'1'}});assert.equal(handshake.result.protocolVersion,'2025-11-25');
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const call=async(name,args={})=>(await rpc('tools/call',{name,arguments:args})).result;
 const data=r=>JSON.parse(r.content[0].text);
 assert.ok(data(await call('inspect_project')).segments.length);
 const recipe={schema:'mangoshot.sequence.recipe.v1',steps:[{command:'clip.graphics.add',args:{kind:'text',text:'Approved title',start:0,duration:3}}]};
 let proposal=data(await call('propose_sequence',{recipe}));assert.equal(proposal.status,'pending');assert.equal(await p.evaluate(()=>MangoClipView.layers().length),0);
 await p.locator('#br-approve-v077').click();assert.equal(await p.evaluate(()=>MangoClipView.layers().length),1);
 assert.equal(data(await call('request_status',{requestId:proposal.requestId})).status,'applied');
 const beforeTime=await p.evaluate(()=>MangoClipView.video().currentTime);
 const frame=data(await call('request_frame',{time:1.2}));assert.equal(frame.status,'pending');
 assert.equal((await call('request_status',{requestId:frame.requestId})).content.length,1);
 assert.ok(await p.locator('#br-approve-v077').isDisabled());await p.locator('#br-render-v077').click();
 await p.locator('#br-image-v077').waitFor({state:'visible',timeout:25000});
 const shown=(await p.locator('#br-image-v077').getAttribute('src')).split(',')[1];assert.ok(shown.length>100);
 assert.equal(await p.evaluate(()=>MangoClipView.video().currentTime),beforeTime);
 await p.locator('#br-approve-v077').click();
 const delivered=await call('request_status',{requestId:frame.requestId});
 assert.equal(delivered.content[1].type,'image');assert.equal(delivered.content[1].data,shown,'MCP must receive the exact displayed JPEG');
 assert.equal((await call('request_status',{requestId:frame.requestId})).content.length,1);
 proposal=data(await call('propose_sequence',{recipe}));await p.evaluate(()=>MangoClipView.addLayer('text','none'));
 await p.locator('#br-approve-v077').click();assert.equal(data(await call('request_status',{requestId:proposal.requestId})).status,'stale');
 await p.locator('#br-disconnect-v077').click();assert.equal(await p.evaluate(()=>MangoBridgeV077.inspect().connected),false);
 assert.ok((await call('inspect_project')).isError);assert.equal(await p.locator('#br-config-v077').inputValue(),'');
 console.log('Actual native messaging host + MCP stdio client + Clip Studio: approved sequence, exact displayed JPEG, stale rejection, and revocation passed');
 }finally{if(child&&!child.killed)child.kill();if(ctx)await ctx.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
