/* Local sequence UI; render a still using a separate temporary decoder. */
(function(root){'use strict';
const doc=root.document,core=root.MangoSequenceEngineV076,view=root.MangoClipView;
const el=id=>doc.getElementById('sq-'+id+'-v076'),panel=doc.querySelector('[data-au-page="sequence"]'),dialog=doc.getElementById('automation-dialog-v075');
if(!core||!view||!panel)return;
const engine=core.controller({capture:()=>view.automationCapture(),draft:()=>view.sequenceDraft(),commit:(s,state)=>view.commitSequenceAutomation(s,state)});
let ticket=null,reviewText=null,plan=null,serial=0,activeDecoder=null;
const status=t=>{el('status').textContent=t;},json=x=>JSON.stringify(x,null,2);
function release(){serial++;if(activeDecoder){const d=activeDecoder;activeDecoder=null;d.video.pause();d.video.removeAttribute('src');d.video.load();URL.revokeObjectURL(d.url);d.cancel?.();}}
function clearFrame(){release();const canvas=el('canvas');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);el('frame-note').textContent='Still-frame review; no playback or audio.';}
function invalidate(){ticket=null;reviewText=null;plan=null;engine.cancel();el('apply').disabled=el('render').disabled=el('time').disabled=true;clearFrame();el('timeline').replaceChildren();}
function refreshHistory(){el('history').textContent=engine.history().map(x=>x.at+' · '+x.status+' · '+x.message).join('\n')||'No operations';el('history').style.whiteSpace='pre-wrap';}
function btn(label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{try{fn();}catch(e){status(e.message);}});return b;}
function timeline(draft,oldLength,newLength){
 const host=el('timeline');host.replaceChildren();const length=Math.max(oldLength,newLength,.001);
 function lane(label,items){const row=doc.createElement('div');row.className='sq-track-v076';const text=doc.createElement('span');text.textContent=label;const track=doc.createElement('div');track.className='sq-track-body-v076';for(const x of items){const b=doc.createElement('div');b.className='sq-block-v076';b.dataset.kind=x.kind||'video';b.style.left=(100*x.start/length)+'%';b.style.width=(100*(x.end-x.start)/length)+'%';b.textContent=x.label||'';b.title=(x.label||label)+' '+x.start.toFixed(2)+'–'+x.end.toFixed(2)+'s';track.append(b);}row.append(text,track);host.append(row);}
 lane('Before',[{start:0,end:oldLength,label:oldLength.toFixed(2)+'s'}]);
 let at=0;lane('After',draft.segments.map((s,i)=>{const start=at;at+=s.end-s.start;return {start,end:at,label:'Clip '+(i+1)};}));
 lane('Titles',draft.layers.map(x=>({start:x.start,end:x.end,kind:'graphics',label:x.kind})));
 lane('Camera',draft.zoomFrames.map(x=>({start:x.start,end:x.start+x.duration,kind:'camera',label:x.scale+'×'})));
 lane('Cursor',root.MangoCursorDirectorCoreV074.project(draft.segments,draft.cursorRegions).map(x=>({...x,kind:'cursor',label:'FX'})));
}
function review(p){
 ticket=p.ticket;reviewText=el('script').value;plan=p;el('review').textContent=p.beforeDuration.toFixed(2)+'s → '+p.afterDuration.toFixed(2)+'s · '+p.applied+' operation(s)\n\n'+json(p.changes)+(p.warnings.length?'\n\n'+p.warnings.join('\n'):'');
 el('apply').disabled=el('time').disabled=el('render').disabled=false;el('time').max=Math.max(0,p.afterDuration-.005);el('time').value=Math.min(1,Math.max(0,p.afterDuration-.005));
 timeline(engine.frame(ticket,0).draft,p.beforeDuration,p.afterDuration);refreshHistory();status('Validated. Review plan or render a frame; apply only when ready.');
}
function validate(){invalidate();try{review(engine.preview(el('script').value));}catch(e){el('review').textContent='Rejected: '+e.message;status('No edits applied');refreshHistory();}}
function wait(video,event,start){return new Promise((resolve,reject)=>{
 let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',bad);if(error)reject(error);else resolve();};
 const ok=()=>finish(),bad=()=>finish(Error('Video decode failed')),timer=setTimeout(()=>finish(Error('Frame decode timed out')),10000);
 video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});if(activeDecoder)activeDecoder.cancel=()=>finish(Error('Frame preview canceled'));try{start();}catch(e){finish(e);}
 });}
async function renderFrame(){
 if(!ticket||reviewText!==el('script').value)return;const t=Number(el('time').value);
 clearFrame();const run=serial;
 try{
  const p=engine.frame(ticket,t),source=root.MangoEditOps.toSource(p.draft.segments,t);
  if(!(p.source instanceof Blob)||source===null)throw Error('Source frame unavailable');
  const video=doc.createElement('video'),url=URL.createObjectURL(p.source);activeDecoder={video,url,cancel:null};video.muted=true;video.preload='auto';video.playsInline=true;
  el('render').disabled=true;el('frame-note').textContent='Decoding proposed frame…';
  await wait(video,'loadeddata',()=>{video.src=url;video.load();});
  if(run!==serial)return;
  const target=Math.min(Math.max(0,source),Math.max(0,video.duration-.005));const seekTo=Number.isFinite(target)?target:Math.max(0,source);
  if(Math.abs(video.currentTime-seekTo)>.0001)await wait(video,'seeked',()=>{video.currentTime=seekTo;});
  if(run!==serial)return;
  // Recheck ticket after asynchronous decode, before using the approved draft.
  const fresh=engine.frame(ticket,t),s=fresh.draft,canvas=el('canvas'),factor=Math.min(1,960/Math.max(1,video.videoWidth),540/Math.max(1,video.videoHeight));
  canvas.width=Math.max(1,Math.round(video.videoWidth*factor));canvas.height=Math.max(1,Math.round(video.videoHeight*factor));
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  if(!root.MangoMotion.paintTransition(ctx,video,s.zoomFrames,s.segments,s.transitions,t,w,h)){
   const z=root.MangoCreativeZoom.draw(ctx,video,s.zoomFrames,t,w,h);
   root.MangoCursorDirectorCoreV074.paint(ctx,s.cursorTrace,s.cursorRegions,s.segments,t,z,w,h);
  }
  root.MangoGraphics.render(ctx,s.layers,t,w,h);el('frame-note').textContent='Rendered proposed frame · '+t.toFixed(2)+'s sequence / '+source.toFixed(2)+'s source · no audio';
 }catch(e){if(run===serial)el('frame-note').textContent='Frame unavailable: '+e.message;}
 finally{if(run===serial){release();el('render').disabled=!ticket;}}
}
function points(){const host=el('points');host.replaceChildren();for(const p of engine.checkpoints()){const row=doc.createElement('div');row.className='sq-point-v076';const label=doc.createElement('span');label.textContent=p.name+' · '+p.duration.toFixed(2)+'s';row.append(label,btn('Review restore',()=>{invalidate();review(engine.restorePreview(p.id));}),btn('Delete',()=>{engine.removeCheckpoint(p.id);points();}));host.append(row);}if(!host.children.length)host.textContent='No checkpoints for this source.';}
el('validate').addEventListener('click',validate);el('render').addEventListener('click',()=>void renderFrame());
el('apply').addEventListener('click',()=>{if(!ticket||reviewText!==el('script').value){invalidate();status('Validate again');return;}
 const id=ticket;ticket=null;try{engine.apply(id);invalidate();el('review').textContent='Applied as one undoable editor transaction.';status('Sequence committed. Close Automation Studio and use Ctrl+Z to undo.');}catch(e){invalidate();el('review').textContent='Rejected: '+e.message;status('Sequence not applied; validate again.');}refreshHistory();points();});
el('script').addEventListener('input',()=>{invalidate();status('Sequence changed; validate again.');});
el('example').addEventListener('click',()=>{invalidate();el('script').value=json(core.example());status('Template loaded, not executed.');});
el('import').addEventListener('click',()=>el('file').click());
el('file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>core.LIMIT)throw Error('Sequence file exceeds 32 KiB');const program=core.syntax(await file.text());if(!dialog.open||panel.hidden)return;invalidate();el('script').value=json(program);status('Sequence loaded, not executed.');}catch(err){status(err.message);}});
el('export').addEventListener('click',()=>{try{const data=json(core.syntax(el('script').value)),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=doc.createElement('a');a.href=url;a.download='MangoShot-Sequence.json';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){status(e.message);}});
el('save').addEventListener('click',()=>{try{engine.saveCheckpoint(el('name').value);el('name').value='';points();status('Checkpoint saved in this session.');}catch(e){status(e.message);}});
for(const tab of dialog.querySelectorAll('[data-au-tab]'))tab.addEventListener('click',()=>{invalidate();if(tab.dataset.auTab==='sequence'){points();refreshHistory();status('Validate a sequence before applying.');}});
dialog.addEventListener('cancel',invalidate);dialog.addEventListener('close',invalidate);root.addEventListener('pagehide',invalidate);
el('script').value=json(core.example());
root.MangoSequenceStudioV076=Object.freeze({inspect:()=>({reviewPending:!!ticket,checkpoints:engine.checkpoints(),history:engine.history()}),syntax:core.syntax});
})(typeof globalThis!=='undefined'?globalThis:this);
