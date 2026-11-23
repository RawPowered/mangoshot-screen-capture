const fs=require('fs'),vm=require('vm'),assert=require('assert');
const dir=__dirname;
class TestCanvas{constructor(){this.width=0;this.height=0;}getContext(){return {fillRect(){},drawImage(){}}}toBlob(callback){
  const key=this.height===870?870:460;
  callback(new Blob([fs.readFileSync(dir+'/strip_'+key+'.jpg')],{type:'image/jpeg'}));}}
const context={Blob,TextEncoder,document:{createElement:()=>new TestCanvas()}};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(dir+'/../pdf-export.js','utf8'),context);
(async()=>{
 const result=await context.MangoPDF.fromCanvas({width:600,height:2200});
 fs.writeFileSync(dir+'/sample.pdf',Buffer.from(await result.arrayBuffer()));
 console.log('PDF exported',result.size,'bytes');
 assert.ok(result.size>5000);
})().catch(e=>{console.error(e);process.exitCode=1});
