/* Procedural extruded polygon mesh, orthographic projection, flat face lighting.
 * Geometry remains editable; Canvas2D is the portable final rasterizer. */
(function(root){'use strict';
 const shapes=['arrow','chevron','pointer','panel'],materials=['matte','metal','gloss'];
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const defaults=()=>({shape:'arrow',color:'#f1b640',material:'metal',curve:-.34,thickness:.12,head:.25,depth:.12,pitch:24,yaw:-25,roll:0,light:-55});
 const copy=x=>JSON.parse(JSON.stringify(x));
 function check(v){
  const d=defaults();
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==Object.keys(d).length||Object.keys(d).some(k=>!Object.hasOwn(v,k))||!shapes.includes(v.shape)||!materials.includes(v.material)||typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw Error('Invalid dimensional callout.');
  for(const [k,a,b] of [['curve',-.55,.55],['thickness',.035,.24],['head',.16,.42],['depth',.005,.35],['pitch',-80,80],['yaw',-80,80],['roll',-180,180],['light',-180,180]])if(!finite(v[k],a,b))throw Error('Invalid callout '+k+'.');
  return {...v,color:v.color.toLowerCase()};
 }
 const presets=[
  ['curved','Curved gold arrow',{}],['straight','Straight silver arrow',{curve:0,color:'#c3d1e2',pitch:18,yaw:-24}],
  ['neon','Electric blue arrow',{color:'#45aaff',material:'gloss',curve:.36,depth:.17,pitch:28,yaw:25}],
  ['chevron','Steel chevron',{shape:'chevron',color:'#aab9c7',depth:.18,curve:0}],
  ['pointer','Red pointer',{shape:'pointer',color:'#ed4b4a',material:'gloss',depth:.13}],
  ['panel','Carbon plaque',{shape:'panel',color:'#545e6c',depth:.14,pitch:28,yaw:-20}]
 ].map(([id,name,p])=>({id,name,value:{...defaults(),...p}}));
 function outline(p){
  if(p.shape==='chevron')return [[-.48,-.35],[-.12,-.35],[.48,0],[-.12,.35],[-.48,.35],[.13,0]];
  if(p.shape==='pointer')return [[-.28,-.43],[.48,0],[-.28,.43],[-.13,0]];
  if(p.shape==='panel')return [[-.5,-.28],[.5,-.28],[.5,.28],[-.5,.28]];
  const end=1-p.head,half=p.thickness/2,upper=[],lower=[];
  // Parabolic bend has monotone x and bounded slope. Head follows the tip tangent.
  const center=t=>({x:t-.5,y:4*p.curve*t*(1-t),slope:4*p.curve*(1-2*t)});
  function offset(t,r){const c=center(t),n=Math.hypot(1,c.slope);return [c.x-c.slope*r/n,c.y+r/n];}
  for(let i=0;i<=24;i++){const t=end*i/24;upper.push(offset(t,-half));lower.push(offset(t,half));}
  const wing=Math.max(.095,half*2.45);
  return [...upper,offset(end,-wing),[.5,0],offset(end,wing),...lower.reverse()];
 }
 const rad=x=>x*Math.PI/180;
 function rotate(v,p){
  let [x,y,z]=v,c=Math.cos(rad(p.yaw)),s=Math.sin(rad(p.yaw));[x,z]=[x*c+z*s,-x*s+z*c];
  c=Math.cos(rad(p.pitch));s=Math.sin(rad(p.pitch));[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(rad(p.roll));s=Math.sin(rad(p.roll));return [x*c-y*s,x*s+y*c,z];
 }
 function normal(a,b,c){const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],m=Math.hypot(...n)||1;return n.map(x=>x/m);}
 function mesh(value){
  const p=check(value),poly=outline(p),n=poly.length,d=p.depth/2,front=poly.map(([x,y])=>rotate([x,y,d],p)),back=poly.map(([x,y])=>rotate([x,y,-d],p)),faces=[];
  const add=(vertices,n,kind)=>{if(n[2]<=.000001)return;faces.push({vertices,normal:n,kind,z:vertices.reduce((a,v)=>a+v[2],0)/vertices.length});};
  add(front,rotate([0,0,1],p),'front');add([...back].reverse(),rotate([0,0,-1],p),'back');
  for(let i=0;i<n;i++){const j=(i+1)%n,vs=[front[j],front[i],back[i],back[j]],a=poly[i],b=poly[j],dx=b[0]-a[0],dy=b[1]-a[1],m=Math.hypot(dx,dy)||1;add(vs,rotate([dy/m,-dx/m,0],p),'side');}
  const all=[...front,...back],xs=all.map(v=>v[0]),ys=all.map(v=>v[1]);
  return {faces:faces.sort((a,b)=>a.z-b.z),bounds:{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}};
 }
 const tint=(hex,k)=>'#'+[1,3,5].map(i=>{const n=parseInt(hex.slice(i,i+2),16),v=k>=0?n+(255-n)*k:n*(1+k);return Math.round(clamp(v,0,255)).toString(16).padStart(2,'0');}).join('');
 function paint(q,value,b,opacity=1){
  const p=check(value),m=mesh(p);if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return false;
  const s=Math.min(b.width/Math.max(.001,m.bounds.w),b.height/Math.max(.001,m.bounds.h)),cx=b.x+(b.width-m.bounds.w*s)/2-m.bounds.x*s,cy=b.y+(b.height-m.bounds.h*s)/2-m.bounds.y*s;
  const l=[Math.cos(rad(p.light))*.62,Math.sin(rad(p.light))*.62,.78],project=v=>[cx+v[0]*s,cy+v[1]*s];
  q.save();try{
   q.globalAlpha*=clamp(opacity,0,1);
   for(const f of m.faces){
    const points=f.vertices.map(project),light=clamp(f.normal.reduce((a,v,i)=>a+v*l[i],0),-1,1),shade=clamp(light*.5-(f.kind==='side'?.28:.03),-.7,.5);
    q.beginPath();points.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();
    if(p.material!=='matte'&&f.kind==='front'){
     const ys=points.map(v=>v[1]),a=Math.min(...ys),z=Math.max(...ys),g=q.createLinearGradient(0,a,0,Math.max(a+.1,z)),base=tint(p.color,shade);
     if(p.material==='metal'){g.addColorStop(0,tint(base,-.25));g.addColorStop(.27,tint(base,.42));g.addColorStop(.46,tint(base,.63));g.addColorStop(.52,tint(base,-.22));g.addColorStop(.76,tint(base,.19));g.addColorStop(1,tint(base,-.23));}
     else{g.addColorStop(0,tint(base,.7));g.addColorStop(.40,tint(base,.24));g.addColorStop(.44,tint(base,-.1));g.addColorStop(1,tint(base,-.3));}q.fillStyle=g;
    }else q.fillStyle=tint(p.color,shade);
    q.fill();
   }
  }finally{q.restore();}return true;
 }
 const api=Object.freeze({shapes,materials,defaults,copy,check,presets,outline,mesh,paint});
 root.MangoDimensionalV0729=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
