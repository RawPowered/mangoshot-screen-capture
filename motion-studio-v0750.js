/* Docked, non-destructive Motion Studio; no parallel renderer or project format. */
(function motionUI(root){
 'use strict';
 const d=root.document,C=root.MangoCompositorV0714,M=root.MangoMotionCoreV0750,V=root.MangoClipView,host=d.getElementById('ms50-panel');
 if(!host||!C||!M||!V)return;
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const controls=el('div','ms50-body'),head=el('div','ms50-heading'),time=el('output','ms50-time'),summary=el('summary','','Motion Studio'),notice=el('p','ms50-note'),rail=el('div','ms50-rail'),grid=el('div','ms50-grid'),actions=el('div','ms50-actions'),status=el('p','ms50-status');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');time.setAttribute('aria-label','Motion playhead');
 host.append(summary,controls);head.append(el('strong','','TRANSFORM KEYFRAMES'),time);controls.append(head,notice,rail,grid,actions,status);
 let clipboard=null,signature='',lastState=null,focused=null,buttons=[],inputs={};
 const specs=[['x','Position X (%)'],['y','Position Y (%)'],['scale','Scale (%)'],['rotation','Rotation (°)'],['opacity','Opacity (%)']];
 function state(seconds){
  const layer=V.layers().find(l=>l.id===V.selectedLayer()),at=Number.isFinite(seconds)?seconds:V.motionPosition(),t=M.snap(layer,at);
  return {layer,at,t,keys:layer?.keyframes||[],index:layer&&t!==null?M.nearest(layer.keyframes||[],t):-1,ready:!!layer&&!layer.locked&&!V.exporting()&&!V.isPlaying()&&!V.multitrackBusy()&&t!==null};
 }
 function report(message,error=false){status.textContent=message;status.dataset.error=String(error);}
 function ready(){const s=state(),capture=V.automationCapture();if(!s.ready||!capture.ready)throw Error('Pause playback and place the playhead inside an unlocked graphic layer.');return {...s,capture};}
 function commit(s,keys,message){V.commitGraphicMotion(s.layer.id,keys,s.capture);refresh();report(message);}
 function safe(fn){try{return fn();}catch(e){report(e.message,true);return false;}}
 function button(label,title,fn){const b=el('button','',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',()=>safe(fn));return b;}
 const prev=button('◀','Previous transform keyframe',()=>jump(-1)),add=button('◆ Add key','Add keyframe at playhead',()=>addKey()),next=button('▶','Next transform keyframe',()=>jump(1)),remove=button('Remove','Remove keyframe at playhead',()=>{const s=ready();commit(s,M.remove(s.keys,s.t),'Keyframe removed. Ctrl+Z to undo.');return true;});
 const copy=button('Copy pose','Copy transform pose at playhead',()=>{const s=ready();clipboard=M.posePatch(C.pose(s.keys,s.t));refresh();report('Motion pose copied locally.');return true;});
 const paste=button('Paste pose','Paste transform pose at playhead',()=>{if(!clipboard)return false;const s=ready();commit(s,M.upsert(s.keys,s.t,clipboard),'Pose pasted. Ctrl+Z to undo.');return true;});
 buttons=[prev,add,next,remove,copy,paste];actions.append(...buttons);
 function bindField(name,node){node.addEventListener('focus',()=>{try{focused={name,...ready()};}catch{focused=null;}});node.addEventListener('blur',()=>{focused=null;refresh();});node.addEventListener('change',()=>safe(()=>{
  const s=ready(),origin=focused?.name===name?focused:null;if(origin&&(origin.layer.id!==s.layer.id||origin.capture.stamp!==s.capture.stamp||Math.abs(origin.at-s.at)>.01))throw Error('Layer or playhead changed. Edit the current value again.');
  const value=name==='ease'?node.value:node.valueAsNumber/M.fields[name].factor;
  commit(s,M.upsert(s.keys,s.t,{[name]:value}),'Motion keyframe updated. Ctrl+Z to undo.');focused=null;refresh();return true;
 }));}
 for(const [name,labelText] of specs){const label=el('label','',labelText),n=el('input');n.type='number';const f=M.fields[name];n.min=String(f.min*f.factor);n.max=String(f.max*f.factor);n.step=name==='rotation'?'0.1':'0.5';n.id='ms50-'+name;label.append(n);grid.append(label);inputs[name]=n;bindField(name,n);}
 const ease=el('select');ease.id='ms50-ease';for(const [value,label] of [['linear','Linear'],['easeIn','Ease in'],['easeOut','Ease out'],['easeInOut','Easy Ease'],['hold','Hold']]){const o=el('option','',label);o.value=value;ease.append(o);}const easing=el('label','','Outgoing easing');easing.append(ease);grid.append(easing);inputs.ease=ease;bindField('ease',ease);
 function addKey(){const s=ready();commit(s,M.upsert(s.keys,s.t),s.keys.length?'Pose key at playhead.':'First pose key set. Move the playhead and change a value or drag the layer.');return true;}
 function seekKey(layer,key){V.seekOutput(layer.start+(layer.end-layer.start)*key.t);refresh(layer.start+(layer.end-layer.start)*key.t);}
 function jump(direction){const s=state();if(!s.layer||!s.keys.length)return false;const t=s.t??(s.at<s.layer.start?-1:2),key=M.adjacent(s.keys,t,direction);if(!key)return false;seekKey(s.layer,key);return true;}
 function refresh(seconds){if(!host.open)return;const s=state(seconds);lastState=s;const l=s.layer;
  time.textContent=Number.isFinite(s.at)?s.at.toFixed(3)+' s':'—';notice.textContent=!l?'Select a graphic layer.':l.locked?'Layer locked.':s.t===null?'Move the playhead inside '+l.name+'.':V.isPlaying()?'Pause playback to edit keyframes.':s.keys.length?'Animated pose · drag the layer at the playhead to auto-key position.':'Set the first key, then move the playhead to animate.';
  const sig=JSON.stringify([l?.id,s.keys]);if(sig!==signature){signature=sig;rail.replaceChildren();if(!s.keys.length)rail.append(el('span','ms50-empty','No transform keys'));for(const [i,k] of s.keys.entries()){const b=button('◆ '+(l.start+(l.end-l.start)*k.t).toFixed(2)+'s','Go to transform keyframe '+(i+1),()=>{seekKey(l,k);return true;});b.dataset.index=String(i);rail.append(b);}}
  for(const b of rail.querySelectorAll('button'))b.setAttribute('aria-current',String(Number(b.dataset.index)===s.index));
  if(l&&s.t!==null){const pose=C.pose(s.keys,s.t);for(const [name,n] of Object.entries(inputs)){if(d.activeElement===n&&focused?.name===name)continue;n.value=name==='ease'?pose.ease:String(Math.round(pose[name]*M.fields[name].factor*100)/100);}}else for(const n of Object.values(inputs))if(n!==d.activeElement)n.value='';
  for(const n of Object.values(inputs))n.disabled=!s.ready;
  add.disabled=!s.ready||(s.keys.length>=C.MAX_KEYS&&s.index<0);remove.disabled=!s.ready||s.index<0;copy.disabled=!s.ready;paste.disabled=!s.ready||!clipboard;
  prev.disabled=!l||!M.adjacent(s.keys,s.t??(s.at<l?.start?-1:2),-1);next.disabled=!l||!M.adjacent(s.keys,s.t??(s.at<l?.start?-1:2),1);
 }
 function open(){const l=V.layers().find(l=>l.id===V.selectedLayer());if(!l){V.message('Select a graphic layer to open Motion Studio.');return false;}V.selectLayer(l.id);root.MangoWorkspaceV062?.activate?.('graphics');host.open=true;refresh();host.scrollIntoView?.({block:'nearest'});return true;}
 function openAtKeyframe(id,t){const l=V.layers().find(x=>x.id===id);if(!l||!Number.isFinite(t))return false;V.selectLayer(id);root.MangoWorkspaceV062?.activate?.('graphics');host.open=true;V.seekOutput(l.start+(l.end-l.start)*t);refresh(l.start+(l.end-l.start)*t);host.scrollIntoView?.({block:'nearest'});return true;}
 host.addEventListener('toggle',()=>refresh());root.MangoMotionStudioV0750=Object.freeze({open,openAtKeyframe,refresh,addKey:()=>safe(()=>{if(!open())return false;return addKey();}),previous:()=>safe(()=>jump(-1)),next:()=>safe(()=>jump(1))});refresh();
})(globalThis);
