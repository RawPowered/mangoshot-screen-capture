/* Isolated render groups and ordered source adjustments.
 * Folder paths remain independent. The ordinary flat stroke list is authoritative for z-order. */
(function(root){'use strict';
 const MAX_GROUPS=32,MAX_DEPTH=3,MAX_ADJUSTMENTS=8,MAX_PIXELS=16000000,MAX_SCRATCH_PIXELS=32000000;
 const blends=Object.freeze(['source-over','multiply','screen','overlay','darken','lighten']);
 const kinds=Object.freeze(['exposure','contrast','saturation','temperature','hue','monochrome','invert']);
 const protectedTypes=new Set(['redact','erase-brush','eraser','erase-stroke']);
 const copy=o=>JSON.parse(JSON.stringify(o)),empty=()=>({groups:[],adjustments:[]}),active=c=>!!(c?.groups?.length||c?.adjustments?.length);
 const id=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\u0000-\u001f\u007f]/.test(s);
 const name=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=80&&!/[\u0000-\u001f\u007f]/.test(s);
 const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
 const subset=(a,b)=>a.every(x=>b.includes(x));
 const eligible=l=>!!l&&!protectedTypes.has(l.type);
 function reconcile(c,layers){
  if(!active(c))return empty();
  const ids=new Set(layers.map(l=>l.id)),groups=[],seen=new Set();
  for(const g of [...c.groups].sort((a,b)=>b.members.length-a.members.length)){
   const members=layers.filter(l=>ids.has(l.id)&&g.members.includes(l.id)).map(l=>l.id),key=JSON.stringify(members);
   if(members.length<2||seen.has(key))continue;seen.add(key);groups.push({...g,members});
  }
  return {groups,adjustments:c.adjustments.slice()};
 }
 function tree(groups,layers){
  const pos=new Map(layers.map((l,i)=>[l.id,i])),spans=groups.map(g=>({...g,start:Math.min(...g.members.map(id=>pos.get(id))),end:Math.max(...g.members.map(id=>pos.get(id)))}));
  function build(start,end,parents){
   const children=[];for(let i=start;i<=end;){
    const g=parents.filter(x=>x.start===i&&x.end<=end).sort((a,b)=>b.end-a.end)[0];
    if(g){children.push({group:g,children:build(g.start,g.end,parents.filter(x=>x!==g&&x.start>=g.start&&x.end<=g.end))});i=g.end+1;}
    else{children.push({layer:layers[i]});i++;}
   }return children;
  }
  return build(0,layers.length-1,spans);
 }
 const depth=nodes=>nodes.reduce((n,x)=>Math.max(n,x.group?1+depth(x.children):0),0);
 const order=nodes=>nodes.flatMap(n=>n.group?order(n.children):[n.layer.id]);
 function check(c,layers,w,h,C){
  if(!exact(c,['groups','adjustments'])||!Array.isArray(c.groups)||c.groups.length>MAX_GROUPS||!Array.isArray(c.adjustments)||c.adjustments.length>MAX_ADJUSTMENTS)throw Error('Invalid composition or too many groups/adjustments.');
  const by=new Map(layers.map((l,i)=>[l.id,{l,i}])),ids=new Set(),groups=[];
  for(const g of c.groups){
   if(!exact(g,['id','name','members','opacity','blend','visible'])||!id(g.id)||ids.has(g.id)||by.has(g.id)||!name(g.name)||!Array.isArray(g.members)||g.members.length<2||g.members.length>500||new Set(g.members).size!==g.members.length||typeof g.opacity!=='number'||!Number.isFinite(g.opacity)||g.opacity<0||g.opacity>1||!blends.includes(g.blend)||typeof g.visible!=='boolean')throw Error('Invalid isolated group.');
   ids.add(g.id);if(g.members.some(m=>!by.has(m)||!eligible(by.get(m).l)))throw Error('Group contains an unknown, redaction or eraser layer.');
   const indices=g.members.map(m=>by.get(m).i).sort((a,b)=>a-b);
   if(indices.at(-1)-indices[0]+1!==indices.length)throw Error('Group members must occupy a contiguous stack range. Move the complete group or ungroup first.');
   groups.push({...g,members:indices.map(i=>layers[i].id)});
  }
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
   const a=groups[i].members,b=groups[j].members;if(a.some(x=>b.includes(x))&&((!subset(a,b)&&!subset(b,a))||(a.length===b.length)))throw Error('Groups must be disjoint or strictly nested.');
  }
  const adjustments=c.adjustments.map(a=>{
   if(!exact(a,['id','name','kind','value','enabled'])||!id(a.id)||ids.has(a.id)||by.has(a.id)||!name(a.name)||!kinds.includes(a.kind)||typeof a.enabled!=='boolean')throw Error('Invalid source adjustment.');
   ids.add(a.id);const item=C.checkStack([{kind:a.kind,value:a.value,enabled:a.enabled}])[0];C.requireSupport([item]);return {...a,value:item.value};
  });
  const d=depth(tree(groups,layers)),p=w*h;if(d>MAX_DEPTH)throw Error('Use at most three isolated group levels.');
  if(active({groups,adjustments})&&(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||p>MAX_PIXELS||p*(d+(adjustments.length?1:0))>MAX_SCRATCH_PIXELS))throw Error('Composition exceeds the isolated canvas budget. Reduce dimensions or nesting.');
  return {groups,adjustments};
 }
 function canOrder(c,layers){
  if(!c.groups.length)return true;const pos=new Map(layers.map((l,i)=>[l.id,i]));
  return reconcile(c,layers).groups.every(g=>{const a=g.members.map(x=>pos.get(x));return Math.max(...a)-Math.min(...a)+1===a.length;});
 }
 function afterGroup(c,layers,index){
  if(index<0)return layers.length;const id=layers[index]?.id,all=c.groups.filter(g=>g.members.includes(id)).flatMap(g=>g.members),members=new Set(all);
  return Math.max(index,...layers.map((l,i)=>members.has(l.id)?i:-1))+1;
 }
 function visible(c,l){return l.visible!==false&&!c.groups.some(g=>!g.visible&&g.members.includes(l.id));}
 function move(c,layers,id,delta){
  if(![-1,1].includes(delta))throw Error('Invalid group move.');const nodes=tree(c.groups,layers);let found=false;
  function visit(list){const i=list.findIndex(n=>n.group?.id===id);if(i>=0){found=true;const j=i+delta;if(j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];return;}for(const n of list)if(n.group&&!found)visit(n.children);}
  visit(nodes);if(!found)throw Error('Unknown group.');return order(nodes);
 }
 const buffers=new WeakMap();
 function paintLayers(ctx,layers,c,paint){
  const comp=reconcile(c,layers);if(!comp.groups.length){for(const l of layers)if(l?.visible!==false)paint(ctx,l);return;}
  const nodes=tree(comp.groups,layers),w=ctx.canvas.width,h=ctx.canvas.height,cache=buffers.get(ctx)||[];buffers.set(ctx,cache);
  function visit(target,items,d){
   for(const n of items){
    if(n.layer){if(n.layer.visible!==false)paint(target,n.layer);continue;}
    const g=n.group;if(!g.visible||g.opacity===0)continue;
    let b=cache[d];if(!b){b=root.document.createElement('canvas');cache[d]=b;}if(b.width!==w)b.width=w;if(b.height!==h)b.height=h;
    const q=b.getContext('2d');q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.filter='none';q.clearRect(0,0,w,h);
    q.setTransform(target.getTransform());visit(q,n.children,d+1);
    target.save();try{target.setTransform(1,0,0,1,0,0);target.globalAlpha=g.opacity;target.globalCompositeOperation=g.blend;target.filter='none';target.drawImage(b,0,0);}finally{target.restore();}
   }
  }
  visit(ctx,nodes,0);
 }
 function clearBuffers(ctx){const cache=buffers.get(ctx);if(cache){for(const b of cache){b.width=1;b.height=1;}buffers.delete(ctx);}}
 function sourceFilter(c,C){return c.adjustments.filter(a=>a.enabled).map(a=>C.filter([{kind:a.kind,value:a.value,enabled:true}])).filter(x=>x!=='none').join(' ')||'none';}
 function paintSource(ctx,source,c,C){
  ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.filter=sourceFilter(c,C);ctx.drawImage(source,0,0,ctx.canvas.width,ctx.canvas.height);}finally{ctx.restore();}
 }
 const api=Object.freeze({MAX_GROUPS,MAX_DEPTH,MAX_ADJUSTMENTS,MAX_PIXELS,MAX_SCRATCH_PIXELS,blends,kinds,empty,active,copy,eligible,reconcile,tree,depth,check,canOrder,afterGroup,visible,move,paintLayers,clearBuffers,sourceFilter,paintSource});
 root.MangoAdvancedCompositorV0724=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
