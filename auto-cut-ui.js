/* AutoCut controls. All proposed removals are reviewed before one undoable edit. */
(function(root){
 'use strict';
 const el=id=>document.getElementById(id);
 const st=()=>root.MangoClipView;
 let suggestions=[],controller=null,busy=false,sourceRef=null,signature='',method='';
 const seconds=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+String(Math.floor((t%1)*100)).padStart(2,'0');
 const sig=()=>{const v=st();if(!v?.original())return '';return JSON.stringify({segments:v.segments(),layers:v.layers().map(x=>[x.id,x.start,x.end,x.visible])});};
 function status(text){el('autocut-status').textContent=text;}
 function controls(){const loaded=!!st()?.original();
  el('autocut-analyze').disabled=!loaded||busy||st().exporting();
  el('autocut-cancel').hidden=!busy;
  el('autocut-apply').disabled=!loaded||busy||st().exporting()||!suggestions.some(s=>s.enabled);
  el('autocut-clear').disabled=!suggestions.length||busy;
  el('autocut-progress').hidden=!busy;
  el('autocut-apply').textContent='Ripple delete '+suggestions.filter(s=>s.enabled).length+' cuts';
 }
 function invalidate(message){if(controller)controller.abort();controller=null;busy=false;suggestions=[];method='';
  el('autocut-progress').hidden=true;el('autocut-list').replaceChildren();el('autocut-overlay').replaceChildren();
  status(message||'Choose a detection mode, then Analyze. Review cuts before applying.');controls();}
 function updateReview(){const node=el('autocut-list');node.replaceChildren();
  const duration=st()?.outputDuration()||0,selected=suggestions.filter(s=>s.enabled),saved=selected.reduce((n,x)=>n+x.end-x.start,0);
  for(const [index,r] of suggestions.entries()){
   const row=document.createElement('div');row.className='autocut-candidate';
   const check=document.createElement('input');check.type='checkbox';check.checked=r.enabled;check.setAttribute('aria-label','Include proposed cut '+(index+1));
   check.onchange=()=>{r.enabled=check.checked;updateReview();};
   const label=document.createElement('span');label.textContent=seconds(r.start)+' – '+seconds(r.end)+' · '+(r.end-r.start).toFixed(2)+'s · '+r.reason;
   const jump=document.createElement('button');jump.textContent='Preview';jump.title='Seek to the start of this proposed removal';
   jump.onclick=()=>{st().seekOutput(Math.max(0,r.start-.1));};
   row.append(check,label,jump);node.append(row);
  }
  const overlay=el('autocut-overlay');overlay.replaceChildren();
  for(const r of suggestions){if(!r.enabled)continue;const block=document.createElement('span');block.className='autocut-cut-mark';
   block.style.left=(100*r.start/Math.max(.01,duration))+'%';block.style.width=(100*(r.end-r.start)/Math.max(.01,duration))+'%';
   block.title=seconds(r.start)+' to '+seconds(r.end);overlay.append(block);}
  el('autocut-count').textContent=selected.length+' proposed cuts · '+seconds(saved)+' to remove · '+seconds(Math.max(0,duration-saved))+' remaining';
  controls();
 }
 function options(){const mode=el('autocut-mode').value;
  return {mode,minDuration:Math.max(.4,Math.min(30,Number(el('autocut-min').value)||1.2)),
   padding:Math.max(0,Math.min(1,Number(el('autocut-padding').value)||0)),
   thresholdDb:Math.min(-15,Math.max(-70,Number(el('autocut-db').value)||-38)),
   motionThreshold:Math.max(.001,Math.min(.07,Number(el('autocut-motion').value)||.009)),
   protectOverlays:el('autocut-protect').checked};
 }
 function selectedMode(){const visual=el('autocut-mode').value==='still';
  el('autocut-db-group').hidden=visual;el('autocut-motion-group').hidden=!visual;
  if(visual){el('autocut-min').value='3';el('autocut-padding').value='.25';
   el('autocut-warning').textContent='Still-screen detection is approximate. Reading, paused slides and intentional holds can be marked. Review every cut.';
  }else{el('autocut-min').value='1.2';el('autocut-padding').value='.18';
   el('autocut-warning').textContent='Silence detection works only when this browser can decode the audio. For silent screen recordings use Still screen.';}
 }
 async function analyze(){const view=st();if(!view?.original()||busy||view.exporting())return;
  invalidate();busy=true;controller=new AbortController();sourceRef=view.original();signature=sig();
  const signal=controller.signal,opts=options();
  el('autocut-progress').value=0;status('Preparing local analysis…');controls();
  const progress=(p,msg)=>{if(signal.aborted)return;el('autocut-progress').value=Math.round(100*p);status(msg+' '+Math.round(100*p)+'%');};
  try{
   const analysis=opts.mode==='audio'?
    await root.MangoAutoCutAnalysis.audio(view.original(),view.url(),opts,signal,progress):
    await root.MangoAutoCutAnalysis.still(view.url(),view.duration(),opts,signal,progress);
   if(signal.aborted||sourceRef!==view.original()||signature!==sig())throw new DOMException('Video or timeline changed during analysis.','AbortError');
   method=analysis.method;
   suggestions=root.MangoAutoCut.proposals(analysis.ranges,view.segments(),view.layers(),{protectOverlays:opts.protectOverlays,maxFraction:.7});
   updateReview();
   status(suggestions.length?('Detected '+suggestions.length+' local '+method+' interval(s). Review the red timeline marks, then ripple delete.'):
    'No removable sections found under these thresholds. Try a smaller minimum duration or another mode.');
  }catch(error){if(error.name==='AbortError')status('AutoCut analysis cancelled.');else status(error.message);}
  finally{busy=false;controller=null;el('autocut-progress').hidden=true;controls();}
 }
 function apply(){const view=st();if(!view?.original()||busy||view.exporting())return;
  if(view.original()!==sourceRef||sig()!==signature){invalidate('Video changed. Analyze again before applying AutoCut.');return;}
  const picked=suggestions.filter(s=>s.enabled);
  if(!picked.length){status('Select at least one proposed cut.');return;}
  const removed=picked.reduce((s,r)=>s+r.end-r.start,0);
  if(removed>view.outputDuration()*.70+.005){status('Cut selection exceeds 70% of footage. Lower thresholds and analyze again.');return;}
  const result=view.commitAutoCut(picked);
  if(result)invalidate('Applied '+picked.length+' AutoCut removals ('+seconds(removed)+'). One Ctrl+Z restores the entire sequence.');
 }
 // Do not leave stale source-time suggestions after another manual edit, undo,
 // import, project load, or a recording handoff. UI re-renders alone are safe.
 function onEditorChange(){const view=st();if(!view)return;
  if(view.original()!==sourceRef||sig()!==signature){
   if(suggestions.length||busy)invalidate('Sequence changed. Analyze again for updated cut suggestions.');
   sourceRef=view.original();signature=sig();
  }
  controls();
 }
 el('autocut-mode').addEventListener('change',()=>{invalidate();selectedMode();});
 for(const id of ['autocut-min','autocut-padding','autocut-db','autocut-motion','autocut-protect']){
  el(id).addEventListener('change',()=>invalidate('Detection settings changed. Analyze again to refresh suggestions.'));
 }
 el('autocut-analyze').onclick=()=>{void analyze();};
 el('autocut-cancel').onclick=()=>{controller?.abort();};
 el('autocut-clear').onclick=()=>invalidate('Proposed cuts cleared; source and edits unchanged.');
 el('autocut-apply').onclick=apply;
 el('autocut-toggle').onclick=()=>{const panel=el('autocut-panel');panel.open=true;panel.scrollIntoView?.({block:'nearest',behavior:'smooth'});};
 root.MangoAutoCutUI={onEditorChange,analyze,invalidate,review:()=>suggestions.map(x=>({...x}))};
 selectedMode();sourceRef=st()?.original()||null;signature=sig();controls();
})(typeof globalThis!=='undefined'?globalThis:this);
