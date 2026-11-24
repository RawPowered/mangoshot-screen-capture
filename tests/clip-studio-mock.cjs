const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),els=new Map();let mimeMp4=false,downloads=[];
class FakeElement{
 constructor(id){this.id=id;this.disabled=false;this.hidden=false;this.value='0';this.textContent='';this.style={setProperty(){}};this.dataset={};this.classList={toggle(){},contains(){return false;}};this.children=[];this.listeners={};this.videoWidth=640;this.videoHeight=360;this.duration=24;this.currentTime=0;this.seekable={length:0};this.readyState=4;}
 setAttribute(){}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);}
 replaceChildren(...children){this.children=children;}
 appendChild(node){this.children.push(node);}
 getContext(){return {clearRect(){},save(){},restore(){},setLineDash(){},fillRect(){},strokeRect(){}};}
 remove(){}
 click(){if(this.id==='a')downloads.push(this.download);}
 pause(){}
 play(){return Promise.resolve();}
 set src(value){this.source=value;setTimeout(()=>{for(const f of this.listeners.loadedmetadata||[])f();},0);}
 get src(){return this.source;}
}
const get=id=>{if(!els.has(id))els.set(id,new FakeElement(id));return els.get(id);};
const doc={getElementById:get,createElement:name=>new FakeElement(name),addEventListener(){},body:{appendChild(){}}};
const ctx={document:doc,window:{addEventListener(){}},Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  MediaRecorder:class {static isTypeSupported(type){return type.includes('webm')||(mimeMp4&&type.includes('mp4'));}},
  URLSearchParams,location:{search:''},setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms||0,30)),clearTimeout,requestAnimationFrame:cb=>setTimeout(cb,1),cancelAnimationFrame:clearTimeout};
ctx.globalThis=ctx;const run=filename=>vm.runInNewContext(fs.readFileSync(path.join(root,filename),'utf8'),ctx);
run('clip-timeline.js');run('sequence-media.js');run('sequence-preview.js');run('clip-edit-ops.js');run('motion-core-v067.js');run('clip-graphics.js');run('creative-zoom.js');run('sequence-operations.js');run('auto-cut.js');run('layer-timeline-ops.js');run('media-format.js');ctx.MangoClips={load:async()=>null,clear:async()=>null};
let markerCache=[];ctx.MangoClipTimeline={markers:()=>markerCache.map(x=>({...x})),loadMarkers:next=>{markerCache=next.map(x=>({...x}));},render(){},reset(){markerCache=[];}};
run('cursor-effects-v073.js');run('cursor-director-core-v074.js');run('clip-studio.js');run('automation-core-v075.js');run('automation-adapters-v075.js');run('clip-project.js');run('sequence-engine-v076.js');
(async()=>{
 await get('file').listeners.change[0]({target:{files:[new Blob([Uint8Array.from([0x1a,0x45,0xdf,0xa3,0,0,0,0])],{type:'video/webm'})]}});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(get('duration').textContent,/0:24/);
 assert.equal(get('ripple-delete').disabled,false,'Ripple Delete enabled after video load');
 assert.equal(get('export-webm').textContent,'Save WebM (instant)');
 get('export-webm').onclick();assert.equal(downloads.length,1,'Unedited WebM must copy immediately');
 assert.equal(get('export-mp4').disabled,true,'MP4 must not be presented when encoder absent');
 get('in').value='5';get('out').value='10';get('cut').onclick();
 assert.equal(get('segments').children.length,2,'Middle cut should keep two clips');
 get('undo').onclick();assert.equal(get('segments').children.length,1);
 get('trim').onclick();assert.equal(get('segments').children.length,1);
 assert.match(get('duration').textContent,/0:05/);
 mimeMp4=true;get('reset').onclick();assert.equal(get('export-mp4').disabled,false);
 await get('file').listeners.change[0]({target:{files:[new Blob([Uint8Array.from([0,0,0,24,102,116,121,112,109,112,52,50])],{type:'video/webm'})]}});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(get('source-format').textContent.includes('MP4'),true,'Source header overrides misleading MIME');
 assert.equal(get('export-mp4').textContent,'Save MP4 (instant)');
 get('export-mp4').onclick();assert.equal(downloads.length,2,'Unedited MP4 should immediately copy bytes');
 assert.match(downloads.at(-1),/\.mp4$/);
 assert.match(get('export-webm').textContent,/Convert/,'MP4 to WebM must be labeled as a conversion');
 // Timeline gestures must persist through the actual Clip Studio state/history, not just pure math.
 ctx.MangoGraphics.render=()=>{};
 const st=ctx.MangoClipView;
 const A=ctx.MangoAutomationCoreV075,engine=A.createEngine('clip',ctx.MangoAutomationAdaptersV075.adapter('clip'));
 const recipe=(command,args)=>({schema:A.SCHEMA,command,args});
 const add=engine.preview(recipe('clip.graphics.add',{kind:'text',text:'Tutorial title',start:1,duration:2,preset:'title'}));
 assert.equal(st.layers().length,0);engine.apply(add.ticket);assert.equal(st.layers().length,1);assert.equal(st.layers()[0].text,'Tutorial title');
 get('undo').onclick();assert.equal(st.layers().length,0);
 const zoom=engine.preview(recipe('clip.camera.zoomRange',{start:2,scale:2,x:.5,y:.5}));engine.apply(zoom.ticket);assert.equal(st.zoomFrames().length,2);
 get('undo').onclick();assert.equal(st.zoomFrames().length,0);
 const cut=engine.preview(recipe('clip.timeline.rippleDelete',{start:2,end:3}));engine.apply(cut.ticket);assert.equal(st.outputDuration(),23);
 get('undo').onclick();assert.equal(st.outputDuration(),24);
 const stale=engine.preview(recipe('clip.graphics.add',{kind:'text',text:'Stale',start:0,duration:2}));st.addLayer('text','none');assert.throws(()=>engine.apply(stale.ticket),/changed/);get('undo').onclick();
 // Atomic sequences use the real editor commit path and preserve the existing history.
 const SQ=ctx.MangoSequenceEngineV076,controller=SQ.controller({capture:()=>st.automationCapture(),draft:()=>st.sequenceDraft(),commit:(d,e)=>st.commitSequenceAutomation(d,e)});
 const checkpoint=controller.saveCheckpoint('Before batch');
 let batch=controller.preview(SQ.example());assert.equal(st.layers().length,0);assert.equal(st.zoomFrames().length,0);
 controller.apply(batch.ticket);assert.equal(st.layers().length,1);assert.equal(st.layers()[0].opacity,.9);assert.equal(st.zoomFrames().length,2);
 get('undo').onclick();assert.equal(st.layers().length,0);assert.equal(st.zoomFrames().length,0);
 get('redo').onclick();assert.equal(st.layers().length,1);assert.equal(st.zoomFrames().length,2);
 const restored=controller.restorePreview(checkpoint);controller.apply(restored.ticket);assert.equal(st.layers().length,0);assert.equal(st.zoomFrames().length,0);
 get('undo').onclick();assert.equal(st.layers().length,1);assert.equal(st.zoomFrames().length,2);get('redo').onclick();assert.equal(st.layers().length,0);
 batch=controller.preview(SQ.example());st.addLayer('text','none');assert.throws(()=>controller.apply(batch.ticket),/changed/);get('undo').onclick();
 const invalid={schema:SQ.SCHEMA,steps:[{command:'clip.graphics.add',args:{kind:'text',text:'Draft only',start:0,duration:2}},{command:'clip.timeline.rippleDelete',args:{start:0,end:24}}]};
 assert.throws(()=>controller.preview(invalid));assert.equal(st.layers().length,0);assert.equal(st.outputDuration(),24);
 // Inject a one-time render error after mutation to verify rollback of model and undo stacks.
 batch=controller.preview(SQ.example());const before=JSON.stringify(st.sequenceDraft());const oldRender=ctx.MangoGraphics.render;let failOnce=true;
 ctx.MangoGraphics.render=(...args)=>{if(failOnce){failOnce=false;throw Error('injected renderer error');}return oldRender(...args);};
 assert.throws(()=>controller.apply(batch.ticket),/rolled back/);ctx.MangoGraphics.render=oldRender;
 assert.equal(JSON.stringify(st.sequenceDraft()),before,'Failed commit must restore exact edit decisions');
 st.addLayer('text','none');st.addLayer('text','none');
 assert.equal(st.layers().length,2);
 const a=st.layers()[0].id,b=st.layers()[1].id;
 assert.equal(st.reorderLayer(a,1),true,'Bring forward must be an implemented action');
 assert.equal(st.layers()[1].id,a,'Bring forward changes actual compositor ordering');
 get('undo').onclick();assert.equal(st.layers()[0].id,a,'Undo restores layer stack');
 const old=st.layers()[0];
 const draft=ctx.MangoLayerOps.transform(old,'move',2,st.outputDuration(),3);
 assert.equal(st.commitLayerTimeline(a,draft),true);
 assert.equal(st.layers()[0].track,3);assert.equal(st.layers()[0].start,old.start+2);
 get('undo').onclick();assert.equal(st.layers()[0].track,2,'Undo restores original G2/G3 track');
 assert.equal(st.layers()[0].start,old.start,'Undo restores original In point');
 assert.equal(st.placeLayerAbove(a,b),true,'Layer-list drag action places layer above another');
 assert.equal(st.layers()[1].id,a);
 // Cut V1 into three clips, choose a middle clip, ripple delete and undo/redo.
 get('reset').onclick();
 st.commit(ctx.MangoEditOps.split(st.segments(),8),'Razor #1');
 st.commit(ctx.MangoEditOps.split(st.segments(),16),'Razor #2');
 assert.equal(st.segments().length,3);
 st.addLayer('text','none');
 const layerId=st.layers()[0].id;
 st.updateLayer(layerId,{start:18,end:22});
 markerCache=[{time:4,label:'before'},{time:12,label:'deleted'},{time:20,label:'after'}];
 st.selectClip(1);
 assert.equal(st.selectedClip(),1,'Selected V1 clip index must be retained');
 assert.equal(st.deleteSelection(),true,'Ripple Delete on selected clip must work without numeric In/Out');
 assert.equal(st.outputDuration(),16);
 assert.equal(st.segments().length,2);
 assert.equal(st.layers()[0].start,10,'Graphic layer must shift left with deleted time');
 assert.equal(markerCache.length,2);assert.equal(markerCache[1].time,12);
 assert.equal(st.range().active,false,'Ripple should clear consumed selection');
 get('undo').onclick();
 assert.equal(st.outputDuration(),24);assert.equal(st.segments().length,3);
 assert.equal(st.layers()[0].start,18,'Undo restores layer timing');
 assert.equal(markerCache.length,3,'Undo restores deleted marker');
 get('redo').onclick();
 assert.equal(st.outputDuration(),16);assert.equal(markerCache.length,2,'Redo repeats same marker deletion');
 st.setRange(3,5);
 assert.equal(st.range().active,true,'Explicit range selection is active');
 assert.equal(st.deleteSelection(),true);assert.equal(st.outputDuration(),14);
 get('undo').onclick();assert.equal(st.outputDuration(),16);
 // AutoCut batch is a single undoable transaction, even when multiple gaps close.
 get('reset').onclick();markerCache=[{time:4,label:'before'},{time:12,label:'after'}];
 const before=st.outputDuration();
 assert.equal(st.commitAutoCut([{start:2,end:3},{start:7,end:8}]),true);
 assert.equal(st.outputDuration(),before-2,'Two AutoCut intervals remove two seconds with no gaps');
 assert.equal(markerCache[1].time,10,'Markers ripple across both AutoCut removals');
 get('undo').onclick();assert.equal(st.outputDuration(),before,'One Undo restores both cuts');
 assert.equal(markerCache[1].time,12);
 get('redo').onclick();assert.equal(st.outputDuration(),before-2,'Redo restores both cuts');
 // Deleting a graphic must never accidentally ripple-delete a selected V1 clip.
 const count=st.layers().length,clipCount=st.segments().length;
 st.selectClip(0);st.addLayer('text','none');
 const added=st.layers().at(-1).id;
 assert.equal(st.selectedClip(),null,'Adding a graphic clears stale V1 clip selection');
 st.selectClip(0);st.selectLayer(added);
 assert.equal(st.selectedClip(),null,'Selecting a layer must override clip selection');
 assert.equal(st.deleteSelected(),true,'Delete selected graphics through the same shortcut action');
 assert.equal(st.layers().length,count,'Graphic Delete removes one layer');
 assert.equal(st.segments().length,clipCount,'Graphic Delete does not ripple-delete V1 video');
 get('undo').onclick();
 assert.equal(st.layers().length,count+1,'Ctrl+Z restores deleted graphics');
 st.setLayerLocked(added,true);
 assert.equal(st.deleteLayer(added),false,'Locked graphics may not be deleted');
 st.setLayerLocked(added,false);
 assert.equal(st.deleteLayer(added),true,'Unlocked graphics can be removed directly');
 assert.equal(st.layers().length,count);
 console.log('PASS: no-edit export, Razor/ripple, direct locked-aware layer deletion, one-step AutoCut and Undo/Redo');
})().catch(e=>{console.error(e);process.exitCode=1;});
