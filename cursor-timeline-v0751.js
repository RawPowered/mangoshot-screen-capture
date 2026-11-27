/* Local, read-only capture telemetry lanes. Existing Cursor FX remains editable. */
(function(root){'use strict';
 const d=root.document,C=root.MangoCursorCaptureV0751,core=root.MangoCursorCoreV073,V=root.MangoClipView;if(!d||!C||!core||!V)return;
 const path=d.getElementById('cursor-path-v0751'),live=d.getElementById('cursor-live-v0751'),detail=d.getElementById('cursor-detail-v0751');if(!path||!live||!detail)return;
 const W=2048,H=44;let lastTrace=null,lastSig='',lastProjection=null;
 const make=(host,label)=>{const n=d.createElement('canvas');n.width=W;n.height=H;n.setAttribute('aria-label',label);n.setAttribute('role','img');host.append(n);return n;};
 const pc=make(path,'Recorded cursor coverage and click markers'),lc=make(live,'Recorded spotlight, ring and zoom settings');const colors={spotlight:'#a5ce69',ring:'#5bbec5',zoomMode:'#d8ab67'};
 function paint(canvas,rows,length,clicks=[]){const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);if(!length)return;const x=t=>W*t/length;
  for(const r of rows){const y=r.row*14+3;ctx.fillStyle=r.color;ctx.fillRect(x(r.start),y,Math.max(1,x(r.end)-x(r.start)),10);}
  ctx.strokeStyle='#e8f4d2';ctx.lineWidth=1.5;ctx.beginPath();for(const t of clicks){const p=x(t);ctx.moveTo(p,1);ctx.lineTo(p,H-1);}ctx.stroke();
 }
 function before(list,t){let a=0,b=list?.length||0;while(a<b){const m=(a+b)>>1;if(list[m][0]<=t)a=m+1;else b=m;}return a?list[a-1]:null;}
 function inspect(at){const t=V.cursorTrace?.(),map=root.MangoSequenceMedia?.atOutput(V.segments(),at);if(!t||!map)return;const meta=t.capture,source=map.source,raw=meta?core.sampleAt({samples:meta.sourceSamples},source):null,output=core.sampleAt(t,source),state=meta&&before(meta.states,source),camera=meta&&before(meta.cameraFrames,source);
  const point=p=>p?Math.round(p.x*1000)/10+'%, '+Math.round(p.y*1000)/10+'%':'not tracked';
  const settings=state?.[3],enabled=settings?[settings.spotlight?'Spotlight':null,settings.ring?'Click ring':null,settings.zoomMode!=='off'?'Zoom '+settings.zoomMode:null].filter(Boolean).join(', ')||'None':'Unavailable';
  detail.textContent='Sequence '+at.toFixed(2)+'s · Source '+source.toFixed(2)+'s | Source pointer '+point(raw)+' | Recorded-frame pointer '+point(output)+' | Live settings '+enabled+(camera&&state?.[1]!=='off'?' · Camera '+camera[1].toFixed(2)+'×':'')+(t.baked?' · Existing recording contains baked changes.':'');
 }
 function seek(e,host){const total=V.outputDuration();if(!total||V.exporting())return;const r=host.getBoundingClientRect(),at=Math.max(0,Math.min(total-.001,(e.clientX-r.left)/Math.max(1,r.width)*total));V.seekOutput(at);root.MangoWorkspaceV062?.activate?.('cursor');inspect(at);}
 for(const host of [path,live]){host.addEventListener('click',e=>seek(e,host));host.addEventListener('keydown',e=>{if(!['Enter','ArrowLeft','ArrowRight'].includes(e.key)||V.exporting())return;const total=V.outputDuration();if(!total)return;e.preventDefault();e.stopPropagation();const at=Math.max(0,Math.min(total-.001,(V.sequencePosition()||0)+(e.key==='Enter'?0:e.key==='ArrowLeft'?-.033333:.033333)));V.seekOutput(at);root.MangoWorkspaceV062?.activate?.('cursor');inspect(at);});}
 function refresh(){const trace=V.cursorTrace(),parts=V.segments(),length=V.outputDuration(),meta=trace?.capture,sig=JSON.stringify(parts);path.hidden=!trace||!length;live.hidden=!meta||!length;
  if(!trace||!length){lastTrace=null;lastSig='';detail.textContent='No cursor telemetry attached.';return;}
  if(trace===lastTrace&&sig===lastSig)return;lastTrace=trace;lastSig=sig;
  const duration=V.duration(),rows=C.projectIntervals(C.pathIntervals(trace.samples,duration),parts).map(r=>({...r,row:0,color:'#719aa7'}));
  if(meta)rows.push(...C.projectIntervals(C.pathIntervals(meta.sourceSamples,duration),parts).map(r=>({...r,row:1,color:'#a8ce73'})));
  const clicks=C.projectClicks(trace.clicks,parts);paint(pc,rows,length,clicks);
  const fx=C.projectIntervals(C.liveIntervals(meta?.states,duration),parts).map(r=>({...r,row:['spotlight','ring','zoomMode'].indexOf(r.kind),color:colors[r.kind]}));paint(lc,fx,length);
  const count=trace.samples.filter(s=>s[1]!==null).length,actual=meta?.sourceSamples.filter(s=>s[1]!==null).length||0;
  detail.textContent=count+' recorded-frame samples · '+actual+' authorized source samples'+(actual?'':' (preview-only or legacy)')+' · '+(trace.clicks?.length||0)+' recorded-frame clicks'+(trace.truncated||meta?.truncated?' · TELEMETRY TRUNCATED':'')+(trace.baked?' · Live settings are reference history; effects already embedded in footage cannot be removed.':meta?.master==='clean'?' · Clean master: reconstructed live FX are editable on the LIVE FX track.':'')+'. Click a lane to inspect the playhead.';
  path.title='CUR PATH: blue = recorded-frame positions; green = authorized source positions; pale ticks = clicks.';
  live.title='LIVE SETTINGS: spotlight / ring / smart zoom. History only; recorded pixels are unchanged.';
 }
 root.MangoCursorTimelineV0751=Object.freeze({refresh,inspect});refresh();
})(globalThis);
