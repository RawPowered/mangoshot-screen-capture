/* Shared 3D path editor. Output camera and inspection camera are independent.
 * The reference bitmap is a local compositing aid, never scene geometry. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730,R=root.MangoSpatialRendererV0730,d=root.document;if(!S||!R||!d)return;
 const el=(t,c,txt)=>{const n=d.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};
 const button=(id,t,fn)=>{const n=el('button','',t);n.id=id;n.type='button';n.onclick=fn;return n;};
 const select=(id,a)=>{const n=el('select');n.id=id;for(const [v,t] of a){const o=el('option','',t);o.value=v;n.append(o);}return n;};
 const field=(label,n)=>{const l=el('label','sa-field-v0730',label);l.append(n);return l;};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrapAngle=a=>((a+180)%360+360)%360-180;
 const axes=[{v:[1,0,0],c:'#ff716e',name:'X'},{v:[0,1,0],c:'#83dc8a',name:'Y'},{v:[0,0,1],c:'#73b6ff',name:'Z'}];
 function editor(host,initial,opts={}){
  let value=S.check(initial),camera=S.copy(value.camera),viewMode='output',selected=0,drag=null,frame=0,error=null;
  const locked=!!opts.locked,prefix=opts.prefix||'sa',wrap=el('section','sa-editor-v0730'),toolbar=el('div','sa-toolbar-v0730'),stage=el('canvas','sa-view-v0730'),controls=el('div','sa-controls-v0730'),status=el('p','sa-status-v0730'),nodeList=select(prefix+'-node',[]),mode=select(prefix+'-mode',[['node','Path point'],['object','Whole arrow']]);
  const reference=opts.reference||null,aspect=opts.aspect||((reference?.width||16)/(reference?.height||9));
  stage.width=Math.max(1,Math.round(Math.min(780,420*aspect)));stage.height=Math.max(1,Math.round(stage.width/aspect));stage.id=prefix+'-viewport';stage.tabIndex=0;stage.setAttribute('aria-label','Interactive 3D path viewport. Drag point or axis; Alt drag to orbit; wheel zooms.');
  const viewButtons=new Map();
  function setView(k){viewMode=k;camera=k==='output'?S.copy(value.camera):{...S.copy(value.camera),projection:'orthographic',azimuth:k==='right'?90:0,elevation:k==='top'?89.5:0};sync();}
  for(const [k,t] of [['output','Output camera'],['front','Front'],['top','Top'],['right','Right']]){const b=button(prefix+'-view-'+k,t,()=>setView(k));toolbar.append(b);viewButtons.set(k,b);}
  const use=button(prefix+'-use-camera','Use view as output',()=>{if(locked)return;value.camera=S.checkCamera(camera);viewMode='output';sync();});
  const bg=el('input');bg.type='checkbox';bg.checked=!!reference;bg.disabled=!reference;bg.id=prefix+'-reference';bg.onchange=schedule;
  toolbar.append(use,field('Frame reference',bg));const geometry=el('div','sa-panel-v0730'),surface=el('div','sa-panel-v0730'),cameraBox=el('div','sa-panel-v0730'),fields=el('div','sa-grid-v0730'),pose=el('div','sa-grid-v0730'),cameraFields=el('div','sa-grid-v0730');
  const add=button(prefix+'-add-node','Insert point',()=>{const i=Math.min(selected,value.points.length-2),p=value.points[i],q=value.points[i+1],v=p.map((x,k)=>(x+q[k])/2);edit(n=>{n.points.splice(i+1,0,v);},i+1);});
  const remove=button(prefix+'-remove-node','Delete point',()=>{if(value.points.length<=2)return;edit(n=>{n.points.splice(selected,1);},Math.max(0,selected-1));});
  const reset=button(prefix+'-reset','Reset path',()=>{edit(n=>{n.points=S.defaults().points;},0);});
  const xyz=[];
  for(let i=0;i<3;i++){const n=el('input');n.id=prefix+'-'+axes[i].name.toLowerCase();n.type='number';n.min=-S.LIMIT;n.max=S.LIMIT;n.step='.025';n.onchange=()=>edit(v=>{v.points[selected][i]=n.valueAsNumber;});xyz.push(n);const l=field(axes[i].name+' world',n);l.style.color=axes[i].c;fields.append(l);}
  const pointRow=el('div','sa-toolbar-v0730');pointRow.append(add,remove,reset);
  geometry.append(el('strong','','PATH / XYZ'),field('Manipulate',mode),field('Selected control point',nodeList),fields,pointRow);
  const rotations=el('div','sa-toolbar-v0730');
  for(let a=0;a<3;a++)for(const dir of [-1,1])rotations.append(button(prefix+'-rotate-'+axes[a].name.toLowerCase()+'-'+(dir<0?'minus':'plus'),axes[a].name+' '+(dir*15)+'°',()=>edit(v=>{v.points=S.rotatePoints(v.points,a,dir*15);})));
  geometry.append(el('small','','Rotate entire path around its center'),rotations);
  const params=new Map();
  for(const [k,label,min,max,step] of [['radius','Tube radius',.025,.25,.005],['headRadius','Head radius',.05,.5,.005],['headLength','Head length',.12,1.2,.02],['light','Light angle',-180,180,1]]){
   const n=el('input');n.id=prefix+'-'+k;n.type='number';n.min=min;n.max=max;n.step=step;n.onchange=()=>edit(v=>{v[k]=n.valueAsNumber;if(k==='radius')v.headRadius=Math.max(v.headRadius,v.radius*1.2);});params.set(k,n);pose.append(field(label,n));
  }
  const color=el('input');color.type='color';color.id=prefix+'-color';color.oninput=()=>edit(v=>{v.color=color.value;});const material=select(prefix+'-material',[['matte','Matte'],['metal','Metallic'],['gloss','Gloss']]);material.onchange=()=>edit(v=>{v.material=material.value;});
  const smooth=el('input');smooth.type='checkbox';smooth.id=prefix+'-smooth';smooth.onchange=()=>edit(v=>{v.smooth=smooth.checked;});
  pose.append(field('Color',color),field('Surface',material),field('Smooth curve',smooth));surface.append(el('strong','','MESH / MATERIAL'),pose);
  const cameraInputs=new Map();
  for(const [k,label,min,max,step] of [['azimuth','Azimuth°',-180,180,1],['elevation','Elevation°',-89.5,89.5,.5],['distance','Camera distance',2,18,.1],['fov','Field of view°',15,90,1]]){
   const n=el('input');n.type='number';n.id=prefix+'-camera-'+k;n.min=min;n.max=max;n.step=step;n.onchange=()=>changeCamera({...camera,[k]:n.valueAsNumber});cameraInputs.set(k,n);cameraFields.append(field(label,n));
  }
  const proj=select(prefix+'-projection',[['perspective','Perspective'],['orthographic','Orthographic']]);proj.onchange=()=>changeCamera({...camera,projection:proj.value});cameraFields.append(field('Projection',proj));cameraBox.append(el('strong','','CAMERA / VIEW'),cameraFields,el('small','','Alt-drag or right-drag to orbit; wheel to dolly. Inspection views do not change the output until applied.'));
  controls.append(geometry,surface,cameraBox);status.id=prefix+'-status';status.setAttribute('role','status');wrap.append(el('strong','','SPATIAL 3D ARROW / REAL XYZ MESH'),toolbar,stage,controls,status);host.append(wrap);
  const allInputs=[...xyz,...params.values(),color,material,smooth,...cameraInputs.values(),proj,mode,add,remove,reset,use,...rotations.querySelectorAll('button')];for(const n of allInputs)n.disabled=locked;
  nodeList.onchange=()=>{selected=Number(nodeList.value);sync();};mode.onchange=schedule;
  function edit(fn,i=selected){if(locked)return;try{const next=S.copy(value);fn(next);value=S.check(next);selected=clamp(i,0,value.points.length-1);error=null;sync();}catch(e){error=e.message;sync();}}
  function changeCamera(c){if(locked)return;try{camera=S.checkCamera(c);if(viewMode==='output')value.camera=S.copy(camera);else viewMode='orbit';error=null;sync();}catch(e){error=e.message;sync();}}
  function sync(){
   const active=d.activeElement;nodeList.replaceChildren();value.points.forEach((p,i)=>{const o=el('option','',(i+1)+' · '+p.map(v=>v.toFixed(2)).join(', '));o.value=i;nodeList.append(o);});nodeList.value=selected;
   xyz.forEach((n,i)=>{if(active!==n)n.value=value.points[selected][i].toFixed(3);});for(const [k,n] of params)if(active!==n)n.value=value[k];color.value=value.color;material.value=value.material;smooth.checked=value.smooth;
   for(const [k,n] of cameraInputs)if(active!==n)n.value=Number(camera[k]).toFixed(k==='distance'?2:1);proj.value=camera.projection;
   add.disabled=locked||value.points.length>=S.MAX_NODES;remove.disabled=locked||value.points.length<=2;use.disabled=locked||viewMode==='output';for(const [k,n] of viewButtons)n.setAttribute('aria-pressed',String(k===viewMode));schedule();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!wrap.isConnected)return;draw();});}
  function draw(){
   const q=stage.getContext('2d'),w=stage.width,h=stage.height;q.clearRect(0,0,w,h);q.fillStyle='#171c22';q.fillRect(0,0,w,h);
   if(viewMode==='output'&&bg.checked&&reference){q.save();q.globalAlpha=.68;q.drawImage(reference,0,0,w,h);q.restore();}
   else{q.strokeStyle='#29333c';q.lineWidth=1;for(let i=0;i<=w;i+=32){q.beginPath();q.moveTo(i,0);q.lineTo(i,h);q.stroke();}for(let i=0;i<=h;i+=32){q.beginPath();q.moveTo(0,i);q.lineTo(w,i);q.stroke();}}
   try{R.paint(q,{...value,camera},{x:0,y:0,width:w,height:h});}catch(e){status.textContent=e.message;return;}
   const pp=p=>S.project(p,camera,w,h),samples=S.centerline(value);q.strokeStyle='#e3e9f1';q.lineWidth=1;q.setLineDash([4,4]);q.beginPath();let begun=false;for(const p of samples){const a=pp(p);if(!a){begun=false;continue;}if(!begun){q.moveTo(a.x,a.y);begun=true;}else q.lineTo(a.x,a.y);}q.stroke();q.setLineDash([]);
   value.points.forEach((p,i)=>{const a=pp(p);if(!a)return;q.beginPath();q.arc(a.x,a.y,i===selected?6:4,0,Math.PI*2);q.fillStyle=i===selected?'#b9f75c':'#e3e9f1';q.fill();q.strokeStyle='#11161b';q.stroke();q.fillStyle='#fff';q.font='11px system-ui';q.fillText(String(i+1),a.x+8,a.y-8);});
   const origin=pp(value.points[selected]);if(origin)for(const ax of axes){const b=pp(S.add(value.points[selected],S.mul(ax.v,.65)));if(!b)continue;q.strokeStyle=ax.c;q.fillStyle=ax.c;q.lineWidth=2;q.beginPath();q.moveTo(origin.x,origin.y);q.lineTo(b.x,b.y);q.stroke();q.fillRect(b.x-4,b.y-4,8,8);q.fillText(ax.name,b.x+6,b.y+3);}
   status.textContent=error||value.points.length+' XYZ points · '+S.mesh(value).triangles+' triangles · '+camera.projection+' · '+(viewMode==='output'?'output camera':'inspection view')+' · WebGL2 depth test';
  }
  function local(e){const r=stage.getBoundingClientRect();return {x:(e.clientX-r.left)*stage.width/r.width,y:(e.clientY-r.top)*stage.height/r.height};}
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  stage.addEventListener('pointerdown',e=>{
   if(locked||drag||![0,2].includes(e.button))return;e.preventDefault();const p=local(e),w=stage.width,h=stage.height,origin=S.project(value.points[selected],camera,w,h);
   let axis=null,kind='orbit',best=16;
   if(e.button===0&&!e.altKey){
    if(origin)for(const a of axes){const b=S.project(S.add(value.points[selected],S.mul(a.v,.65)),camera,w,h);if(!b||Math.hypot(b.x-origin.x,b.y-origin.y)<10)continue;const dist=Math.hypot(p.x-b.x,p.y-b.y);if(dist<best){axis=a.v;best=dist;}}
    if(axis)kind='axis';
    else{let index=-1;value.points.forEach((v,i)=>{const b=S.project(v,camera,w,h);if(!b)return;const a=Math.hypot(p.x-b.x,p.y-b.y);if(a<best){index=i;best=a;}});if(index>=0){selected=index;kind='plane';}else return;}
   }
   drag={id:e.pointerId,kind,axis,start:p,camera:S.copy(camera),original:S.copy(value),selected,whole:mode.value==='object'};stage.setPointerCapture(e.pointerId);sync();
  });
  stage.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;const p=local(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y,w=stage.width,h=stage.height;
   if(drag.kind==='orbit'){changeCamera({...drag.camera,azimuth:wrapAngle(drag.camera.azimuth-dx*.5),elevation:clamp(drag.camera.elevation+dy*.4,-89.5,89.5)});return;}
   const origin=drag.original.points[drag.selected],delta=drag.kind==='axis'?S.axisDelta(origin,drag.camera,w,h,drag.axis,dx,dy):S.viewDelta(origin,drag.camera,w,h,dx,dy);
   if(!delta){error='Switch to a different inspection view to move along this axis.';schedule();return;}
   const next=S.copy(drag.original);next.points=next.points.map((p,i)=>drag.whole||i===drag.selected?S.add(p,delta):p);
   try{value=S.check(next);error=null;sync();}catch(e){error=e.message;schedule();}
  });
  for(const k of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(k,e=>{if(drag?.id===e.pointerId)drag=null;});
  stage.addEventListener('wheel',e=>{if(locked)return;e.preventDefault();changeCamera({...camera,distance:clamp(camera.distance*Math.exp(e.deltaY*.001),2,18)});},{passive:false});
  sync();return {value(){R.requireRenderer();return S.check(value);},view:()=>S.copy(camera),refresh:sync};
 }
 root.MangoSpatialArrowUIV0730=Object.freeze({editor});
})(typeof globalThis!=='undefined'?globalThis:this);
