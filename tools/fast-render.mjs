#!/usr/bin/env node
/* Optional native FFmpeg high-speed export for cut-only MangoShot projects.
 * Does not replace the cross-browser editor. No shell interpolation, no uploads.
 * Text/callout/graphics overlays are NOT supported here; fail closed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function args(argv){
 const result={};for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--')||i+1>=argv.length)throw Error('Use --source <video> --project <json> --output <mp4> [--encoder auto|cpu|nvenc|qsv|amf].');
  result[argv[i].slice(2)]=argv[++i];
 }
 const allowed=new Set(['source','project','output','encoder','ffmpeg','ffprobe']);
 for(const key of Object.keys(result))if(!allowed.has(key))throw Error('Unknown option: '+key);
 for(const key of ['source','project','output'])if(!result[key])throw Error('Missing --'+key);
 result.encoder=result.encoder||'auto';if(!['auto','cpu','nvenc','qsv','amf'].includes(result.encoder))throw Error('Unsupported encoder');
 if(path.extname(result.output).toLowerCase()!=='.mp4')throw Error('The output must be an MP4 file.');
 if(fs.existsSync(result.output))throw Error('Output already exists; choose a new filename rather than overwriting it.');
 return result;
}
function probe(binary,source){const result=spawnSync(binary,['-v','error','-show_format','-show_streams','-of','json',source],{encoding:'utf8',timeout:30000});
 if(result.error||result.status!==0)throw Error('ffprobe failed: '+(result.error?.message||result.stderr));
 return JSON.parse(result.stdout);
}
function validate(project,stat,info){
 if(!project||project.schema!=='mangoshot.project.v1'||!project.source)throw Error('Unsupported MangoShot project format.');
 if(project.source.size!==stat.size)throw Error('Source file size does not match the project.');
 const probedDuration=Number(info.format?.duration),duration=project.source.duration;
 if(!Number.isFinite(duration)||duration<=0||Math.abs(duration-probedDuration)>.35)throw Error('Source duration does not match the project.');
 if(!Array.isArray(project.segments)||!project.segments.length||project.segments.length>150)throw Error('Invalid or oversized cut list.');
 const visible=(project.layers||[]).filter(x=>x.visible!==false&&x.end>x.start);
 if(visible.length)throw Error('This fast path supports cuts only; visible graphics must be exported inside Clip Studio.');
 if(project.transitions?.length)throw Error('This fast path supports cuts only; transitions must be exported inside Clip Studio.');
 for(const [i,s] of project.segments.entries()){
  if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end-s.start<.04||s.end>duration+.10)
   throw Error('Invalid segment '+i);
 }
 if(!info.streams?.some(s=>s.codec_type==='video'))throw Error('No video track in the source.');
 return {duration:project.segments.reduce((n,s)=>n+s.end-s.start,0),hasAudio:info.streams.some(s=>s.codec_type==='audio')};
}
function filter(project,hasAudio){
 let expr='',join='';project.segments.forEach((part,i)=>{
  const a=part.start.toFixed(6),b=part.end.toFixed(6);
  expr+=`[0:v:0]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}];\n`;
  if(hasAudio)expr+=`[0:a:0]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[a${i}];\n`;
  join+=`[v${i}]${hasAudio?`[a${i}]`:''}`;
 });
 expr+=`${join}concat=n=${project.segments.length}:v=1:a=${hasAudio?1:0}[outv]${hasAudio?'[outa]':''}\n`;
 return expr;
}
const candidates={cpu:[['libx264','-preset','veryfast','-crf','20']],nvenc:[['h264_nvenc','-preset','p4','-cq','21','-b:v','0']],qsv:[['h264_qsv','-preset','veryfast','-global_quality','23']],amf:[['h264_amf','-quality','speed','-qp_i','22']]};
async function tryExport(binary,source,output,script,codec,hasAudio){
 const [encoder,...options]=codec;
 return new Promise(resolve=>{
  const p=spawn(binary,['-hide_banner','-loglevel','error','-nostdin','-n','-i',source,'-filter_complex_script',script,
   '-map','[outv]',...(hasAudio?['-map','[outa]']:['-an']),'-c:v',encoder,...options,'-pix_fmt','yuv420p',
   ...(hasAudio?['-c:a','aac','-b:a','192k']:[]),'-movflags','+faststart','-f','mp4',output],{stdio:['ignore','ignore','pipe']});
  let error='';p.stderr.on('data',chunk=>{error=(error+String(chunk)).slice(-7000);});
  p.on('error',e=>resolve({ok:false,error:e.message}));p.on('close',code=>resolve({ok:code===0,error}));
 });
}
async function main(){
 const cfg=args(process.argv.slice(2));
 const ffmpeg=cfg.ffmpeg||'ffmpeg',ffprobe=cfg.ffprobe||'ffprobe';
 const info=probe(ffprobe,cfg.source),project=JSON.parse(fs.readFileSync(cfg.project,'utf8'));
 const checked=validate(project,fs.statSync(cfg.source),info);
 const encoders=cfg.encoder==='auto'?['nvenc','qsv','amf','cpu']:[cfg.encoder];
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mangoshot-render-'));
 const script=path.join(tmp,'sequence.filter');fs.writeFileSync(script,filter(project,checked.hasAudio),'utf8');
 const start=performance.now();let success=false;
 try{
  for(const encoder of encoders){
   const name=candidates[encoder][0][0];console.log('Trying '+name+' with '+project.segments.length+' retained clip(s)…');
   const result=await tryExport(ffmpeg,cfg.source,cfg.output,script,candidates[encoder][0],checked.hasAudio);
   if(result.ok){success=true;const elapsed=(performance.now()-start)/1000;
    console.log('Rendered '+checked.duration.toFixed(2)+' seconds of edited media in '+elapsed.toFixed(2)+' seconds ('+(checked.duration/Math.max(.001,elapsed)).toFixed(2)+'x real-time).');
    console.log('Saved: '+cfg.output);break;
   }
   try{if(fs.existsSync(cfg.output))fs.unlinkSync(cfg.output);}catch{}
   if(cfg.encoder!=='auto')throw Error(name+' failed: '+result.error.slice(-1500));
   console.warn(name+' unavailable: '+result.error.split('\n').filter(Boolean).slice(-1)[0]);
  }
  if(!success)throw Error('All FFmpeg encoders failed. Verify your GPU drivers or use --encoder cpu.');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error('MangoShot fast export:',error.message);process.exitCode=1;});
export {args,validate,filter};
