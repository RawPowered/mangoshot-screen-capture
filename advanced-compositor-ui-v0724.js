/* Compositing Studio: one revision-checked draft for groups and source adjustments. */
(function(root){'use strict';
 const d=root.document,H=root.MangoAdvancedImageV0724,C=root.MangoAdvancedCompositorV0724,F=root.MangoCompositorV0714;
 if(!d?.body.classList.contains('studio-image')||!H||!C||!F)return;
 const el=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const button=(id,title,fn)=>{const b=el('button','ci-action-v0720',title);if(id)b.id=id;b.type='button';b.addEventListener('click',fn);return b;};
 const input=(type,id)=>{const e=el('input');e.type=type;e.id=id;return e;};
 const select=(id,items)=>{const e=el('select');e.id=id;for(const [value,title] of items){const o=el('option','',title);o.value=value;e.append(o);}return e;};
 const field=(title,node)=>{const l=el('label','ac-field-v0724');l.append(el('span','',title),node);return l;};
 const modal=el('dialog','ac-dialog-v0724');modal.id='ac-dialog-v0724';modal.setAttribute('aria-labelledby','ac-title-v0724');
 const header=el('header'),head=el('div'),title=el('strong','','COMPOSITING STUDIO');title.id='ac-title-v0724';head.append(title,el('small','','Isolated groups · ordered source adjustments · one undoable edit'));header.append(head,button('ac-close-v0724','Close ×',()=>modal.close()));
 const body=el('div','ac-body-v0724'),preview=el('div','ac-previews-v0724');
 function image(label,id){const f=el('figure'),c=el('canvas');c.width=480;c.height=270;c.id=id;c.setAttribute('aria-label',label);f.append(el('figcaption','',label),c);preview.append(f);return c;}
 const before=image('Current composition','ac-before-v0724'),after=image('Draft composition','ac-after-v0724');
 const grid=el('div','ac-grid-v0724'),left=el('section','ac-section-v0724'),right=el('section','ac-section-v0724');
 const groupList=select('ac-group-list-v0724',[]),groupName=input('text','ac-group-name-v0724'),opacity=input('range','ac-group-opacity-v0724');opacity.min='0';opacity.max='100';opacity.step='1';
 const opacityRead=el('output','','100%');const blend=select('ac-group-blend-v0724',C.blends.map(v=>[v,v==='source-over'?'Normal':v[0].toUpperCase()+v.slice(1)])),visible=input('checkbox','ac-group-visible-v0724');
 groupName.maxLength=80;
 const addGroup=button('ac-group-add-v0724','Group selected layers',()=>mutate(()=>{
  const ids=session.selection;if(ids.length<2)throw Error('Select at least two adjacent layers before opening Compositing Studio.');
  const g={id:crypto.randomUUID(),name:'Isolated group '+(draft.groups.length+1),members:ids.slice(),opacity:1,blend:'source-over',visible:true};
  draft.groups.push(g);groupId=g.id;
 }));
 const groupInfo=el('p','ac-muted-v0724');
 const groupButtons=el('div','ac-buttons-v0724'),groupMove=(id,caption,delta)=>button(id,caption,()=>mutate(()=>{order=C.move(draft,ordered(),groupId,delta);}));
 groupButtons.append(groupMove('ac-group-front-v0724','Forward',1),groupMove('ac-group-back-v0724','Backward',-1),button('ac-group-remove-v0724','Ungroup',()=>mutate(()=>{draft.groups=draft.groups.filter(g=>g.id!==groupId);groupId=null;})));
 left.append(el('h3','','ISOLATED GROUPS'),addGroup,field('Group',groupList),groupInfo,field('Name',groupName),field('Opacity',opacity),opacityRead,field('Blend',blend),field('Visible',visible),groupButtons,el('p','ac-muted-v0724','Group opacity and blend apply once to the isolated child composition. Select a contiguous range; existing nested groups may be enclosed. Folders are unchanged.'));
 const adjustmentList=select('ac-adjust-list-v0724',[]),adjustName=input('text','ac-adjust-name-v0724'),kind=select('ac-adjust-kind-v0724',C.kinds.map(k=>[k,F.specs[k].label])),value=input('number','ac-adjust-value-v0724'),enabled=input('checkbox','ac-adjust-enabled-v0724');
 adjustName.maxLength=80;
 const addAdj=button('ac-adjust-add-v0724','Add adjustment',()=>mutate(()=>{const a={id:crypto.randomUUID(),name:'Exposure '+(draft.adjustments.length+1),kind:'exposure',value:.35,enabled:true};draft.adjustments.push(a);adjId=a.id;}));
 const adjBtns=el('div','ac-buttons-v0724');function moveAdj(delta){mutate(()=>{const i=draft.adjustments.findIndex(a=>a.id===adjId),j=i+delta;if(i>=0&&j>=0&&j<draft.adjustments.length)[draft.adjustments[i],draft.adjustments[j]]=[draft.adjustments[j],draft.adjustments[i]];});}
 adjBtns.append(button('ac-adjust-up-v0724','Earlier',()=>moveAdj(-1)),button('ac-adjust-down-v0724','Later',()=>moveAdj(1)),button('ac-adjust-remove-v0724','Remove',()=>mutate(()=>{draft.adjustments=draft.adjustments.filter(a=>a.id!==adjId);adjId=null;})));
 right.append(el('h3','','SOURCE ADJUSTMENTS'),addAdj,field('Adjustment order',adjustmentList),field('Name',adjustName),field('Effect',kind),field('Value',value),field('Enabled',enabled),adjBtns,el('p','ac-muted-v0724','Adjustments process the original source beneath all annotation layers. This is not a filter on the full flattened image; redaction pixels and annotations are not graded.'));
 grid.append(left,right);body.append(preview,grid);
 const footer=el('footer'),status=el('span','ac-status-v0724');status.id='ac-status-v0724';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const apply=button('ac-apply-v0724','Apply',()=>{if(!session||apply.disabled)return;try{H.apply(draft,order,session.stamp);modal.close();}catch(e){status.textContent=e.message;apply.disabled=true;}});apply.classList.add('primary');apply.disabled=true;
 footer.append(status,apply);modal.append(header,body,footer);d.body.append(modal);
 let session=null,draft=null,order=[],groupId=null,adjId=null,frame=0,focus=null;
 const group=()=>draft?.groups.find(g=>g.id===groupId),adj=()=>draft?.adjustments.find(a=>a.id===adjId);
 const ordered=()=>order.map(id=>session.layers.find(l=>l.id===id));
 function options(node,items,id,label){node.replaceChildren();const placeholder=el('option','',label);placeholder.value='';node.append(placeholder);for(const a of items){const o=el('option','',a.name);o.value=a.id;node.append(o);}node.value=id||'';}
 function sync(){
  if(!session)return;const g=group(),a=adj();options(groupList,draft.groups,groupId,'Select group');options(adjustmentList,draft.adjustments,adjId,'Select adjustment');
  for(const e of [groupName,opacity,blend,visible,...groupButtons.querySelectorAll('button')])e.disabled=!g;
  for(const e of [adjustName,kind,value,enabled,...adjBtns.querySelectorAll('button')])e.disabled=!a;
  addGroup.disabled=session.selection.length<2||draft.groups.length>=C.MAX_GROUPS;addAdj.disabled=draft.adjustments.length>=C.MAX_ADJUSTMENTS;
  groupName.value=g?.name||'';opacity.value=String(Math.round((g?.opacity??1)*100));opacityRead.textContent=opacity.value+'%';blend.value=g?.blend||'source-over';visible.checked=g?.visible??true;
  groupInfo.textContent=g?g.members.length+' member layers · nested depth determined by range':'Select an existing group or create one from the current selection.';
  adjustName.value=a?.name||'';kind.value=a?.kind||'exposure';const spec=F.specs[kind.value];value.min=spec.min;value.max=spec.max;value.step=spec.step;value.value=String(a?.value??spec.initial);enabled.checked=a?.enabled??true;
 }
 function mutate(fn){
  if(!session)return;const old=C.copy(draft),oldOrder=order.slice(),oldG=groupId,oldA=adjId;
  try{fn();H.validate(draft,order,session.stamp);sync();schedule();}
  catch(e){draft=old;order=oldOrder;groupId=oldG;adjId=oldA;sync();if(frame){cancelAnimationFrame(frame);frame=0;}status.textContent=e.message;apply.disabled=true;}
 }
 function schedule(){
  apply.disabled=true;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!modal.open||!session)return;try{H.preview(after,draft,order,session.stamp);const changed=JSON.stringify(draft)!==JSON.stringify(session.composition)||order.some((id,i)=>id!==session.order[i]);apply.disabled=!changed;status.textContent=changed?'Draft ready · Apply commits once.':'No draft changes.';}catch(e){status.textContent=e.message;apply.disabled=true;}});
 }
 groupList.addEventListener('change',()=>{groupId=groupList.value;sync();});adjustmentList.addEventListener('change',()=>{adjId=adjustmentList.value;sync();});
 for(const [node,key,read] of [[groupName,'name',()=>groupName.value.trim()],[opacity,'opacity',()=>Number(opacity.value)/100],[blend,'blend',()=>blend.value],[visible,'visible',()=>visible.checked]])node.addEventListener(node===opacity?'input':'change',()=>mutate(()=>{if(group())group()[key]=read();}));
 for(const [node,key,read] of [[adjustName,'name',()=>adjustName.value.trim()],[kind,'kind',()=>kind.value],[value,'value',()=>value.valueAsNumber],[enabled,'enabled',()=>enabled.checked]])node.addEventListener('change',()=>mutate(()=>{const a=adj();if(!a)return;a[key]=read();if(key==='kind')a.value=F.specs[a.kind].initial;}));
 function open(){const s=H.state();if(!s.ready||d.querySelector('dialog[open]'))return false;session=s;draft=C.copy(s.composition);order=s.order.slice();groupId=draft.groups[0]?.id||null;adjId=draft.adjustments[0]?.id||null;focus=d.activeElement;modal.showModal();sync();try{H.preview(before,draft,order,s.stamp);schedule();}catch(e){status.textContent=e.message;}return true;}
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();modal.close();}},true);
 modal.addEventListener('close',()=>{if(frame)cancelAnimationFrame(frame);frame=0;session=null;draft=null;apply.disabled=true;focus?.focus?.();focus=null;});
 const launch=button('ac-open-v0724','Composite…',open),studios=d.querySelector('.ci-studios-v0720');if(studios)studios.append(launch);else d.querySelector('.v070-quick-actions')?.append(launch);
 let queued=false;function refresh(){
  const s=H.state();launch.disabled=!s.ready;const groups=s.composition.groups,rows=d.querySelectorAll('#stroke-list .image-layer-row[data-layer-id]');
  for(const row of rows){const member=groups.filter(g=>g.members.includes(row.dataset.layerId)).sort((a,b)=>b.members.length-a.members.length),old=row.querySelector('.ac-membership-v0724');
   if(!member.length){old?.remove();continue;}const text=member.map(g=>g.name+(g.visible?'':' (hidden)')).join(' / ');if(old){if(old.textContent!==text)old.textContent=text;}else{const badge=el('small','ac-membership-v0724',text);badge.title='Isolated render group membership';row.append(badge);}}
 }
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
 for(const e of ['click','input','change','pointerup'])d.addEventListener(e,queue,true);
 const list=d.getElementById('stroke-list'),statusNode=d.getElementById('status');if(list)new MutationObserver(queue).observe(list,{childList:true});if(statusNode)new MutationObserver(queue).observe(statusNode,{childList:true});
 root.MangoAdvancedCompositingUIV0724=Object.freeze({open,refresh});refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
