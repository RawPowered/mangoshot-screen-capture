/* MangoShot v0.7.3 — packaged Transformers.js Whisper worker.
 * Bundled JS and ONNX WASM are shipped with the extension. The model weights
 * are fetched from the Hugging Face Hub only after explicit user opt-in.
 * No recorded audio is uploaded; Float32 PCM stays inside this worker.
 */
import {pipeline,env} from './asr-runtime/transformers.web.min.js';
const MODEL_EN='onnx-community/whisper-tiny.en';
const MODEL_MULTI='onnx-community/whisper-tiny';
const RUNTIME=new URL('./asr-runtime/',self.location.href).href;
env.backends.onnx.wasm.wasmPaths=RUNTIME;
env.backends.onnx.wasm.numThreads=1;
env.allowRemoteModels=true;
env.allowLocalModels=false;
env.useBrowserCache=true;
let initialized=false;
const notify=(kind,data={})=>self.postMessage({kind,...data});
async function transcribe(job){
 const {pcm,language='en-US',device='wasm'}=job;
 if(!(pcm instanceof Float32Array)||pcm.length<1600||pcm.length>16000*60*22)throw Error('Audio length is not supported');
 const english=language.startsWith('en');
 const model=english?MODEL_EN:MODEL_MULTI;
 const start=Date.now();
 const progress_callback=p=>{
  if(!p||typeof p!=='object')return;
  // Only scalar metadata from the model download is sent back to the UI.
  if(['initiate','progress','done','ready'].includes(p.status))
   notify('progress',{stage:'model',status:p.status,file:String(p.file||'').slice(0,110),
    loaded:Number(p.loaded)||0,total:Number(p.total)||0,progress:Number(p.progress)||0});
 };
 notify('progress',{stage:'model',status:'loading'});
 const pipe=await pipeline('automatic-speech-recognition',model,{
  device:device==='webgpu'&&self.navigator?.gpu?'webgpu':'wasm',
  dtype:'q8',progress_callback
 });
 initialized=true;
 notify('progress',{stage:'recognition',status:'running',seconds:pcm.length/16000});
 const output=await pipe(pcm,{return_timestamps:'word',chunk_length_s:30,stride_length_s:5});
 if(!Array.isArray(output?.chunks)||!output.chunks.length)
  throw Error('Model did not provide word timestamps; try a clearer recording or different language');
 const words=output.chunks.flatMap(chunk=>{
  const raw=String(chunk?.text||'').trim();
  const a=Number(chunk?.timestamp?.[0]),b=Number(chunk?.timestamp?.[1]);
  if(!raw||!Number.isFinite(a)||!Number.isFinite(b)||b<a)return [];
  return [{text:raw,start:Math.max(0,a),end:Math.min(pcm.length/16000,Math.max(a+.05,b))}];
 }).filter(w=>w.end-w.start>.02);
 if(!words.length)throw Error('No timed spoken words detected');
 notify('result',{words,language,model,device:device==='webgpu'?'webgpu':'wasm',
  elapsedSeconds:(Date.now()-start)/1000,local:true});
}
self.onmessage=event=>{
 const data=event.data||{};
 if(data.kind!=='transcribe')return;
 void transcribe(data).catch(error=>notify('error',{message:String(error?.message||error).slice(0,300)}));
};
