/* Deterministic screen-space callouts, shared by sequence preview and encoder. */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 const kinds={arrow:'Direction arrow',curve:'Curved pointer',ring:'Focus ring',spotlight:'Spotlight',ripple:'Click ripple',label:'Smart label',step:'Step marker',highlight:'Highlight',keycap:'Keyboard shortcut',status:'Status notification',progress:'Progress indicator',bracket:'Focus brackets'};
 const entrances=['none','fade','pop','slide'],loops=['none','pulse','breathe'],exits=['none','fade','shrink'];
 const defaults=()=>({kind:'arrow',color:'#b9f35d',background:'#1d242b',text:'',rotation:0,thickness:4,glow:18,fillOpacity:.85,fontScale:1,enter:'pop',hold:'none',exit:'fade',enterSpan:.15,exitSpan:.15,pulse:1,dim:.65,progress:.75});
 const definitions=[
  ['pointer','Lime pointer',{kind:'arrow'}],['silver','Silver direction',{kind:'arrow',color:'#dce5ef',glow:8,enter:'slide'}],
  ['curve','Curved gold pointer',{kind:'curve',color:'#f2bc53',thickness:5}],['focus','Focus ring',{kind:'ring',hold:'breathe',fillOpacity:.12}],
  ['spot','Soft spotlight',{kind:'spotlight',color:'#e3efff',dim:.66,glow:10,enter:'fade'}],['click','Click ripple',{kind:'ripple',color:'#58baff',hold:'pulse',enter:'fade',fillOpacity:.1}],
  ['note','Carbon label',{kind:'label',text:'Click to continue',enter:'slide'}],['step','Numbered step',{kind:'step',text:'01',enter:'pop'}],
  ['marker','Luminous marker',{kind:'highlight',color:'#f9d95d',fillOpacity:.4,enter:'fade',glow:0}],['keys','Keyboard keys',{kind:'keycap',text:'CTRL + K',color:'#e9eff5',glow:0}],
  ['success','Success toast',{kind:'status',text:'Completed',enter:'slide'}],['warning','Warning toast',{kind:'status',text:'Review required',color:'#ffad52',enter:'slide'}],
  ['progress','Progress bar',{kind:'progress',text:'Progress',enter:'fade',progress:.75}],['brackets','Precision brackets',{kind:'bracket',color:'#72d6ff',hold:'breathe',fillOpacity:0}]
 ];
 const presets=definitions.map(([id,name,p])=>Object.freeze({id,name,value:Object.freeze({...defaults(),...p})}));
 const label=k=>kinds[k]||'Callout';
 function check(v){
  const d=defaults(),ks=Object.keys(d);if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==ks.length||ks.some(k=>!Object.hasOwn(v,k))||!Object.hasOwn(kinds,v.kind)||!entrances.includes(v.enter)||!loops.includes(v.hold)||!exits.includes(v.exit)||typeof v.text!=='string'||v.text.length>120)throw Error('Invalid 2D callout recipe.');
  for(const k of ['color','background'])if(typeof v[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(v[k]))throw Error('Invalid callout color.');
  for(const [k,a,b] of [['rotation',-180,180],['thickness',1,16],['glow',0,40],['fillOpacity',0,1],['fontScale',.5,2],['enterSpan',0,.5],['exitSpan',0,.5],['pulse',.25,4],['dim',0,.95],['progress',0,1]])if(!finite(v[k],a,b))throw Error('Invalid callout '+k+'.');
  if(v.enterSpan+v.exitSpan>.95)throw Error('Entrance and exit must leave an active interval.');
  return {...v,color:v.color.toLowerCase(),background:v.background.toLowerCase()};
 }
 function preset(id){const p=presets.find(p=>p.id===id);if(!p)throw Error('Unknown callout preset.');return {...p.value};}
 const smooth=t=>t*t*(3-2*t);
 function motion(v,u){u=clamp(u,0,1);const a=v.enterSpan?smooth(clamp(u/v.enterSpan,0,1)):1,z=v.exitSpan?smooth(clamp((1-u)/v.exitSpan,0,1)):1;
  let alpha=v.enter==='none'?1:a,scale=v.enter==='pop'?.70+.30*a:1,offset=v.enter==='slide'?-.25*(1-a):0;
  if(v.exit!=='none')alpha*=z;if(v.exit==='shrink')scale*=.7+.3*z;
  const span=1-v.enterSpan-v.exitSpan,active=clamp((u-v.enterSpan)/Math.max(.05,span),0,1),wave=(1-Math.cos(active*Math.PI*2*v.pulse))/2;
  if(u>=v.enterSpan&&u<=1-v.exitSpan){if(v.hold==='pulse')alpha*=1-.35*wave;if(v.hold==='breathe')scale*=1+.10*wave;}
  return {alpha,scale,offset,active};
 }
 function paint(q,v,b,opacity=1,u=.5,frameW=q.canvas.width,frameH=q.canvas.height){
  v=check(v);if(!b||![b.x,b.y,b.width,b.height,opacity,u,frameW,frameH].every(Number.isFinite)||b.width<=0||b.height<=0||frameW<=0||frameH<=0)return false;
  const m=motion(v,u),w=b.width,h=b.height,s=Math.min(w,h),unit=Math.min(frameW,frameH)/540,line=Math.min(s*.2,v.thickness*unit),cx=b.x+w/2+w*m.offset,cy=b.y+h/2,angle=v.rotation*Math.PI/180,alpha=clamp(opacity,0,1)*m.alpha;
  q.save();try{
   q.globalAlpha*=alpha;q.lineWidth=line;q.lineJoin='round';q.lineCap='round';q.strokeStyle=v.color;q.fillStyle=v.color;
   if(v.kind==='spotlight'){
    q.beginPath();q.rect(0,0,frameW,frameH);q.ellipse(cx,cy,Math.max(1,w*.48*m.scale),Math.max(1,h*.48*m.scale),angle,0,Math.PI*2);q.fillStyle='rgba(0,0,0,'+v.dim+')';q.fill('evenodd');
   }
   q.translate(cx,cy);q.rotate(angle);q.scale(m.scale,m.scale);q.shadowColor=v.color;q.shadowBlur=v.glow*unit;
   const path=pts=>{q.beginPath();pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));};
   const round=(x,y,a,z,r)=>{q.beginPath();q.roundRect(x,y,a,z,Math.min(r,a/2,z/2));};
   const box=(x,y,a,z,r)=>{round(x,y,a,z,r);q.save();q.globalAlpha*=v.fillOpacity;q.fillStyle=v.background;q.fill();q.restore();q.stroke();};
   const head=(x,y,sz,theta)=>{q.save();q.translate(x,y);q.rotate(theta);path([[0,0],[-sz,-sz*.55],[-sz,sz*.55]]);q.closePath();q.fill();q.restore();};
   const text=(str,x,y,max,sz,col=v.color)=>{q.save();q.shadowBlur=0;q.fillStyle=col;q.textAlign='center';q.textBaseline='middle';q.font='600 '+Math.max(5,sz*v.fontScale)+'px system-ui, sans-serif';q.fillText(str,x,y,Math.max(1,max));q.restore();};
   if(v.kind==='arrow'||v.kind==='curve'){
    const tip=w*.43,base=-w*.43,size=Math.min(w*.24,h*.55);q.beginPath();q.moveTo(base,0);if(v.kind==='curve')q.bezierCurveTo(-w*.2,-h*.44,w*.08,-h*.44,tip-size*.55,0);else q.lineTo(tip-size*.55,0);q.stroke();head(tip,0,size,v.kind==='curve'?.38:0);
   }else if(v.kind==='ring'||v.kind==='spotlight'){
    q.beginPath();q.ellipse(0,0,w*.46,h*.46,0,0,Math.PI*2);if(v.kind==='ring'&&v.fillOpacity){q.save();q.globalAlpha*=v.fillOpacity*.35;q.fill();q.restore();}q.stroke();
   }else if(v.kind==='ripple'){
    for(let i=0;i<3;i++){const k=(m.active*v.pulse+i/3)%1,r=s*(.10+.34*k);q.save();q.globalAlpha*=1-k;q.beginPath();q.arc(0,0,r,0,Math.PI*2);q.stroke();q.restore();}q.beginPath();q.arc(0,0,s*.075,0,Math.PI*2);q.fill();
   }else if(v.kind==='label'||v.kind==='status'){
    box(-w*.47,-h*.32,w*.94,h*.62,s*.09);if(v.kind==='label'){path([[0,h*.30],[0,h*.44],[w*.22,h*.44]]);q.stroke();q.beginPath();q.arc(w*.22,h*.44,Math.max(line,s*.025),0,Math.PI*2);q.fill();}else{q.beginPath();q.arc(-w*.36,-h*.01,s*.13,0,Math.PI*2);q.fill();text('!',-w*.36,-h*.01,s*.24,s*.17,v.background);}
    text(v.text||'Add a label',v.kind==='status'?w*.08:0,-h*.01,w*(v.kind==='status'?.65:.86),s*.22,'#f2f5f7');
   }else if(v.kind==='step'){
    q.beginPath();q.arc(0,0,s*.42,0,Math.PI*2);q.save();q.globalAlpha*=v.fillOpacity;q.fill();q.restore();q.stroke();text(v.text||'01',0,0,s*.68,s*.40,v.background);
   }else if(v.kind==='highlight'){
    round(-w*.47,-h*.13,w*.94,h*.26,s*.06);q.save();q.globalAlpha*=v.fillOpacity;q.fill();q.restore();q.stroke();
   }else if(v.kind==='keycap'){
    const parts=(v.text||'CTRL + K').split('+').map(x=>x.trim()).filter(Boolean).slice(0,6),gap=w*.025,kw=(w*.94-gap*(parts.length-1))/Math.max(1,parts.length);parts.forEach((p,i)=>{const x=-w*.47+i*(kw+gap);box(x,-h*.3,kw,h*.6,s*.07);text(p,x+kw/2,0,kw*.88,s*.23);});
   }else if(v.kind==='progress'){
    box(-w*.46,-h*.08,w*.92,h*.20,s*.05);if(v.progress){round(-w*.46,-h*.08,w*.92*v.progress,h*.20,s*.05);q.fill();}text((v.text||'Progress')+' · '+Math.round(v.progress*100)+'%',0,-h*.24,w*.92,s*.18,'#f2f5f7');
   }else if(v.kind==='bracket'){
    const x=w*.45,y=h*.43,k=Math.min(w,h)*.24;for(const a of [-1,1])for(const z of [-1,1]){path([[a*(x-k),z*y],[a*x,z*y],[a*x,z*(y-k)]]);q.stroke();}
   }
  }finally{q.restore();}return true;
 }
 const api=Object.freeze({kinds,entrances,loops,exits,defaults,presets,preset,check,label,motion,paint});
 root.MangoCalloutV0735=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
