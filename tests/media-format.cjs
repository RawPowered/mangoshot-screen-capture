const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const context={Blob,Uint8Array};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','media-format.js'),'utf8'),context);
const format=context.MangoFormat;
(async()=>{
 const mp4=new Blob([Uint8Array.from([0,0,0,24,102,116,121,112,109,112,52,50])],{type:'video/webm'});
 const webm=new Blob([Uint8Array.from([0x1a,0x45,0xdf,0xa3,0,0,0,0])],{type:'video/mp4'});
 assert.equal(await format.detect(mp4),'mp4');
 assert.equal(await format.detect(webm),'webm');
 const full=[{start:0,end:102.213733}];
 assert.equal(format.fastCopy('mp4','mp4',full,102.213733),true);
 assert.equal(format.fastCopy('mp4','webm',full,102.213733),false);
 assert.equal(format.fastCopy('mp4','mp4',[{start:2,end:100}],102.213733),false);
 assert.equal(format.fastCopy('mp4','mp4',[{start:0,end:20},{start:30,end:102.213733}],102.213733),false);
 console.log('PASS: format sniffing and no-edit fast-copy rules');
})().catch(e=>{console.error(e);process.exitCode=1});
