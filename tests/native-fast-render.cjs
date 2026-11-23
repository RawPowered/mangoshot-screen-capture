const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const r=cp.spawnSync('ffmpeg',['-version'],{encoding:'utf8',timeout:15000});
if(r.error||r.status!==0){console.log('SKIP: optional native FFmpeg unavailable');process.exit(0);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mangoshot-test-'));
try{
 const source=path.join(dir,'synthetic.mp4'),projectPath=path.join(dir,'project.json'),out=path.join(dir,'cut.mp4');
 const make=cp.spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=240x136:rate=24:duration=3','-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=3','-c:v','mpeg4','-q:v','4','-c:a','aac','-shortest',source],{encoding:'utf8',timeout:40000});
 assert.equal(make.status,0,make.stderr);
 const info=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_format','-of','json',source],{encoding:'utf8'}));
 const original=Number(info.format.duration);
 const project={schema:'mangoshot.project.v1',source:{size:fs.statSync(source).size,format:'mp4',duration:original},segments:[{start:0,end:1},{start:2,end:2.8}],layers:[],markers:[]};
 fs.writeFileSync(projectPath,JSON.stringify(project));
 const rendered=cp.spawnSync(process.execPath,[path.join(__dirname,'..','tools','fast-render.mjs'),'--source',source,'--project',projectPath,'--output',out,'--encoder','cpu'],{encoding:'utf8',timeout:60000});
 assert.equal(rendered.status,0,rendered.stderr+'\n'+rendered.stdout);
 const result=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',out],{encoding:'utf8'}));
 assert.ok(Math.abs(Number(result.format.duration)-1.8)<.15,'Exported duration must equal retained A/V timeline');
 assert.ok(result.streams.some(s=>s.codec_type==='video'),'Must contain video');
 assert.ok(result.streams.some(s=>s.codec_type==='audio'),'Must retain audio');
 const overlaid={...project,layers:[{visible:true,start:0,end:1}]};fs.writeFileSync(projectPath,JSON.stringify(overlaid));
 const blocked=cp.spawnSync(process.execPath,[path.join(__dirname,'..','tools','fast-render.mjs'),'--source',source,'--project',projectPath,'--output',path.join(dir,'blocked.mp4'),'--encoder','cpu'],{encoding:'utf8',timeout:8000});
 assert.notEqual(blocked.status,0,'Native fast export must refuse graphics it cannot accurately render');
 console.log('PASS: optional FFmpeg cut export preserves A/V duration and rejects unsupported graphics');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
