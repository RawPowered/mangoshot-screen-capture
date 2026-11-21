/* Professional graphics workspace: G2/G3 layer selection, editable properties,
   preset-free styles, callouts and monitor positioning. No DOM-injected user HTML. */
(() => {
 const el=id=>document.getElementById(id);
 const current=()=>globalThis.MangoClipView;
 let move=null;
 const fields={
  'graphic-text':['text',String],
  'graphic-track':['track',Number],
  'graphic-x':['x',v=>Number(v)/100],
  'graphic-y':['y',v=>Number(v)/100],
  'graphic-width':['width',v=>Number(v)/100],
  'graphic-font':['font',String],
  'graphic-weight':['weight',String],
  'graphic-size':['fontSize',Number],
  'graphic-align':['align',String],
  'graphic-color':['color',String],
  'graphic-bg':['background',String],
  'graphic-fade-in':['fadeIn',Number],
  'graphic-fade-out':['fadeOut',Number],
  'graphic-opacity':['opacity',v=>Number(v)/100],
  'graphic-outline':['outline',String],
  'graphic-outline-width':['outlineWidth',Number],
  'graphic-shadow':['shadow',Number],
  'graphic-tail-x':['tailX',v=>Number(v)/100],
  'graphic-tail-length':['tailLength',Number],
  'graphic-in':['start',Number],
  'graphic-out':['end',Number]
 };
 function activeLayer(){const st=current(),id=st?.selectedLayer?.();return st?.layers?.().find(l=>l.id===id)||null;}
 function makeButton(text,title,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;b.addEventListener('click',action);return b;}
 function render(){const st=current();if(!st)return;
  const loaded=st.outputDuration()>0,disabled=!loaded||st.exporting();
  el('add-text').disabled=disabled;el('add-callout').disabled=disabled;el('ripple-delete').disabled=disabled;
  const rows=el('layer-list');rows.replaceChildren();
  for(const layer of st.layers().slice().sort((a,b)=>b.track-a.track)){
   const row=document.createElement('div');row.className='layer-entry'+(st.selectedLayer()===layer.id?' selected':'');
   const button=makeButton((layer.kind==='callout'?'◆ ':'T ')+layer.name,'Select layer',()=>st.selectLayer(layer.id));
   button.className='layer-entry-select';row.appendChild(button);
   row.appendChild(makeButton(layer.visible?'◉':'○',layer.visible?'Hide layer':'Show layer',()=>st.setLayerHidden(layer.id,layer.visible)));
   row.appendChild(makeButton(layer.locked?'🔒':'▢',layer.locked?'Unlock layer':'Lock layer',()=>st.setLayerLocked(layer.id,!layer.locked)));
   rows.appendChild(row);
  }
  if(!st.layers().length)rows.textContent='No graphics yet. Add Text or Callout.';
  const layer=activeLayer();const properties=el('graphic-inspector');properties.hidden=!layer;
  if(layer){
   for(const [id,[field]] of Object.entries(fields)){
    const input=el(id);if(!input)continue;
    const value=layer[field];input.value=['x','y','width','opacity','tailX'].includes(field)?Math.round(value*100):value;
    input.disabled=layer.locked||st.exporting();
   }
   el('graphic-preset').value=layer.preset;
   el('graphic-preset').disabled=layer.locked||st.exporting();
   el('graphic-duplicate').disabled=st.exporting();el('graphic-delete').disabled=st.exporting();
  }
  for(const track of [2,3])el('graphic-track-'+track).replaceChildren();
  const duration=st.outputDuration();
  if(duration){
   for(const layer of st.layers()){
    const chip=makeButton((layer.kind==='callout'?'◆ ':'T ')+layer.name,'Select '+layer.name+' · '+layer.start.toFixed(2)+'–'+layer.end.toFixed(2)+' s',()=>{
     st.selectLayer(layer.id);st.seekOutput(layer.start);
    });
    chip.className='graphic-timeline-clip'+(!layer.visible?' is-hidden':'')+(layer.locked?' is-locked':'')+(st.selectedLayer()===layer.id?' is-selected':'');
    chip.style.left=100*layer.start/duration+'%';chip.style.width=Math.max(.6,100*(layer.end-layer.start)/duration)+'%';
    el('graphic-track-'+layer.track).appendChild(chip);
   }
  }
 }
 function selectionOutline(ctx,seconds,w,h){const selected=activeLayer();
  if(!selected||selected.locked||!selected.visible||seconds===null||seconds<selected.start||seconds>=selected.end)return;
  const r=MangoGraphics.bounds(selected,w,h);ctx.save();ctx.globalAlpha=1;ctx.setLineDash([9,5]);
  ctx.lineWidth=Math.max(2,h/450);ctx.strokeStyle='#aee3fa';ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.setLineDash([]);ctx.fillStyle='#aee3fa';ctx.fillRect(r.x+r.w-9,r.y+r.h-9,16,16);ctx.restore();
 }
 function propertyChange(event){const layer=activeLayer(),st=current();if(!layer||!st||layer.locked)return;
  const id=event.currentTarget.id,[field,coerce]=fields[id],value=coerce(event.currentTarget.value);
  if(typeof value==='number'&&!Number.isFinite(value))return st.message('Invalid graphic property.');
  if(field==='background'&&!(/^transparent$/i.test(value)||/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)))return st.message('Background must be transparent or #RRGGBB / #RRGGBBAA.');
  if(field==='start'&&(value<0||value>=layer.end-.04))return st.message('Layer In must be before Out.');
  if(field==='end'&&(value<=layer.start+.04||value>st.outputDuration()+.001))return st.message('Layer Out must remain within the sequence.');
  if(['x','y','width','opacity','tailX'].includes(field)){if(value<0||value>1)return;}
  if(field==='outline'&&!/^#[0-9a-f]{6}$/i.test(value))return;
  if(field==='outlineWidth'&&(value<0||value>12))return;
  if(field==='shadow'&&(value<0||value>40))return;
  if(field==='tailLength'&&(value<0||value>200))return;
  if(field==='track'&&![2,3].includes(value))return;
  if(field==='fontSize'&&(value<12||value>220))return;
  st.updateLayer(layer.id,{[field]:value,preset:'none'});
 }
 for(const id of Object.keys(fields))el(id).addEventListener('change',propertyChange);
 el('graphic-preset').addEventListener('change',()=>{const l=activeLayer();if(l)current().styleLayer(l.id,el('graphic-preset').value);});
 el('add-text').addEventListener('click',()=>current()?.addLayer('text',el('create-preset').value));
 el('add-callout').addEventListener('click',()=>current()?.addLayer('callout',el('create-preset').value));
 el('graphic-delete').addEventListener('click',()=>{const l=activeLayer();if(l)current().deleteLayer(l.id);});
 el('graphic-duplicate').addEventListener('click',()=>{const l=activeLayer();if(l)current().duplicateLayer(l.id);});
 for(const [id,delta] of [['graphic-front',1],['graphic-back',-1]])el(id).addEventListener('click',()=>{const l=activeLayer();if(l)current().reorderLayer(l.id,delta);});
 const canvas=el('graphics-preview');
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;
  const l=activeLayer();if(!l||l.locked||!l.visible)return;
  const st=current(),now=st.outputAt(st.video().currentTime);
  if(now===null||now<l.start||now>=l.end)return;
  const rect=canvas.getBoundingClientRect();const p={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  const x2=l.x+l.width,y2=l.y+Math.max(.07,l.fontSize/800);
  if(p.x<l.x-.02||p.x>x2+.02||p.y<l.y-.02||p.y>y2+.07)return;
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  move={id:l.id,startX:p.x,startY:p.y,x:l.x,y:l.y};st.beginLayerMove(l.id);
 });
 canvas.addEventListener('pointermove',event=>{if(!move)return;
  const rect=canvas.getBoundingClientRect();const dx=event.movementX/Math.max(1,rect.width);
  const p={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  const st=current();const layer=st.layers().find(l=>l.id===move.id);if(!layer)return;
  st.moveLayer(move.id,Math.max(0,Math.min(1-layer.width,move.x+p.x-move.startX)),Math.max(0,Math.min(.94,move.y+p.y-move.startY)));
 });
 const stopMove=()=>{if(move){current()?.endLayerMove();move=null;}};
 for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,stopMove);
 globalThis.MangoLayerUI={render,selectionOutline};render();
})();
