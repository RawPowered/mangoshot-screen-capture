/* Local cursor effects and declarative script contracts. No network or eval. */
(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const defaults=Object.freeze({spotlight:false,ring:false,zoomMode:'off',scale:1.75,radius:9,dim:.55,feather:.35,smooth:220,hold:1.8,color:'#d0ff87'});
 const presets=Object.freeze({
  off:{},spotlight:{spotlight:true},ring:{ring:true,color:'#ffe38a'},
  tutorial:{spotlight:true,ring:true,zoomMode:'click',scale:1.75},
  follow:{spotlight:true,ring:true,zoomMode:'follow',scale:2,smooth:300},
  detail:{ring:true,zoomMode:'click',scale:2.5,hold:2.4,smooth:180}
 });
 for(const p of Object.values(presets))Object.freeze(p);
 const configKeys=Object.keys(defaults),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const number=(v,min,max,key)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+key);return v;};
 function config(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!configKeys.includes(k)))throw Error('Unknown cursor setting');
  const s={...defaults,...value};
  for(const k of ['spotlight','ring'])if(typeof s[k]!=='boolean')throw Error('Invalid '+k);
  if(!['off','follow','click'].includes(s.zoomMode))throw Error('Invalid zoom mode');
  number(s.scale,1,4,'scale');number(s.radius,3,25,'radius');number(s.dim,0,.85,'dim');
  number(s.feather,0,.9,'feather');number(s.smooth,60,1200,'smoothing');number(s.hold,.3,8,'hold');
  if(typeof s.color!=='string'||!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('Invalid ring color');
  return s;
 }
 function preset(id){if(!own(presets,id))throw Error('Unknown cursor preset');return config(presets[id]);}
 function point(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1?{x:p.x,y:p.y}:null;}
 function camera(z,x,y){const zoom=clamp(z,1,6),half=.5/zoom;return {zoom,cx:clamp(x,half,1-half),cy:clamp(y,half,1-half)};}
 function sourcePoint(p,c){if(!point(p))return null;return point({x:clamp(c.cx+(p.x-.5)/c.zoom,0,1),y:clamp(c.cy+(p.y-.5)/c.zoom,0,1)});}
 function outputPoint(p,c){if(!point(p))return null;return point({x:.5+(p.x-c.cx)*c.zoom,y:.5+(p.y-c.cy)*c.zoom});}
 function advance(previous,base,p,settings,dt,clickAge=Infinity,clickPoint=null){
  const follow=!!p&&settings.zoomMode==='follow';
  const clicked=!!p&&!!clickPoint&&settings.zoomMode==='click'&&clickAge<settings.hold*1000;
  const target=follow||clicked?camera(Math.max(base.zoom,settings.scale),(clicked?clickPoint:p).x,(clicked?clickPoint:p).y):base;
  if(settings.zoomMode==='off')return {...base};
  const a=1-Math.exp(-clamp(dt,0,250)/settings.smooth);
  const old=previous||base;
  return camera(old.zoom+(target.zoom-old.zoom)*a,old.cx+(target.cx-old.cx)*a,old.cy+(target.cy-old.cy)*a);
 }
 function draw(ctx,p,settings,w,h,clickAge=Infinity){
  if(!p||!settings.spotlight&&!settings.ring)return;
  const x=p.x*w,y=p.y*h,r=Math.min(w,h)*settings.radius/100;
  ctx.save();
  if(settings.spotlight&&settings.dim>0){
   const inner=Math.max(0,r*(1-settings.feather)),outer=Math.max(inner+.01,r);
   const g=ctx.createRadialGradient(x,y,inner,x,y,outer);
   g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+settings.dim+')');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  if(settings.ring){
   const stroke=Math.max(2,Math.min(w,h)*.003);
   ctx.strokeStyle=settings.color;ctx.lineWidth=stroke;
   ctx.beginPath();ctx.arc(x,y,Math.max(stroke*2,r*.32),0,Math.PI*2);ctx.stroke();
   if(clickAge>=0&&clickAge<450){
    ctx.globalAlpha=1-clickAge/450;ctx.beginPath();ctx.arc(x,y,r*(.32+.55*clickAge/450),0,Math.PI*2);ctx.stroke();
   }
  }
  ctx.restore();
 }
 const MAX=18000,MAX_CLICKS=6000,SCHEMA='mangoshot.cursor.trace.v1';
 function trace(raw){
  if(!raw||raw.schema!==SCHEMA||raw.space!=='recorded-frame-normalized'||!Array.isArray(raw.samples)||raw.samples.length>MAX||
     typeof raw.truncated!=='boolean'||typeof raw.baked!=='boolean')throw Error('Invalid cursor trace');
  let prev=-1;
  const samples=raw.samples.map(s=>{
   if(!Array.isArray(s)||s.length!==3||typeof s[0]!=='number'||!Number.isFinite(s[0])||s[0]<0||s[0]>86400||s[0]<=prev)throw Error('Invalid cursor time');
   prev=s[0];
   if(s[1]===null&&s[2]===null)return [s[0],null,null];
   const p=point({x:s[1],y:s[2]});if(!p)throw Error('Invalid cursor position');
   return [s[0],p.x,p.y];
  });
  const result={schema:SCHEMA,space:'recorded-frame-normalized',samples,truncated:raw.truncated,baked:raw.baked};
  if(raw.clicks!=null){
   if(!Array.isArray(raw.clicks)||raw.clicks.length>MAX_CLICKS)throw Error('Invalid cursor clicks');
   let last=-1;result.clicks=raw.clicks.map(s=>{
    if(!Array.isArray(s)||s.length!==3||!Number.isFinite(s[0])||s[0]<0||s[0]>86400||s[0]<=last||!point({x:s[1],y:s[2]}))throw Error('Invalid cursor click');
    last=s[0];return [s[0],s[1],s[2]];
   });
  }
  return result;
 }
 function sampleAt(raw,t){
  if(!raw?.samples?.length||!Number.isFinite(t)||t<0)return null;
  const a=raw.samples;let lo=0,hi=a.length;
  while(lo<hi){const m=(lo+hi)>>1;if(a[m][0]<=t)lo=m+1;else hi=m;}
  const s=a[lo-1],n=a[lo];
  if(!s||s[1]===null||t-s[0]>.55)return null;
  if(n&&n[1]!==null&&n[0]-s[0]<=.55){const k=clamp((t-s[0])/(n[0]-s[0]),0,1);return {x:s[1]+(n[1]-s[1])*k,y:s[2]+(n[2]-s[2])*k};}
  return {x:s[1],y:s[2]};
 }
 function createTrace(){let data={schema:SCHEMA,space:'recorded-frame-normalized',samples:[],clicks:[],truncated:false,baked:false};
  return {add(t,p,baked=false){
   if(!Number.isFinite(t)||t<0||t>86400)return;
   if(baked)data.baked=true;
   const a=data.samples,last=a.at(-1),valid=point(p);
   if(last&&(t-last[0]<.195&&((last[1]===null)===!valid)||t<=last[0]))return;
   if(a.length>=MAX){data.truncated=true;return;}
   a.push([Math.round(t*1000)/1000,valid?Math.round(valid.x*10000)/10000:null,valid?Math.round(valid.y*10000)/10000:null]);
   if(a.length>1&&a.at(-1)[0]<=a.at(-2)[0])a.pop();
  },click(t,p){
   const valid=point(p),a=data.clicks,stamp=Math.round(t*1000)/1000;
   if(!valid||!Number.isFinite(t)||t<0||t>86400||stamp<=(a.at(-1)?.[0]??-1))return;
   if(a.length>=MAX_CLICKS){data.truncated=true;return;}
   a.push([stamp,Math.round(valid.x*10000)/10000,Math.round(valid.y*10000)/10000]);
  },finish(){return trace(data);}};
 }
 const RECIPE='mangoshot.cursor.recipe.v1';
 function recipe(raw){
  if(!raw||raw.schema!==RECIPE||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid cursor recipe schema');
  if(raw.action==='recorder.cursor.configure'){
   if(Object.keys(raw).some(k=>!['schema','action','preset','settings'].includes(k)))throw Error('Unknown recipe field');
   if(raw.settings!=null&&(typeof raw.settings!=='object'||Array.isArray(raw.settings)))throw Error('Invalid cursor settings');
   return {schema:RECIPE,action:raw.action,settings:config({...preset(raw.preset??'off'),...(raw.settings??{})})};
  }
  if(raw.action==='clip.cursor.zoom'){
   if(Object.keys(raw).some(k=>!['schema','action','at','scale','transition','hold'].includes(k)))throw Error('Unknown recipe field');
   const out={schema:RECIPE,action:raw.action,scale:number(raw.scale??1.75,1.1,4,'scale'),
     transition:number(raw.transition??.4,.1,2,'transition'),hold:number(raw.hold??1.8,.3,8,'hold')};
   if(raw.at!=null)out.at=number(raw.at,0,86400,'sequence time');return out;
  }
  throw Error('Unsupported cursor action');
 }
 const api=Object.freeze({presets,defaults,config,preset,point,camera,sourcePoint,outputPoint,advance,draw,trace,sampleAt,createTrace,recipe,MAX,RECIPE});
 root.MangoCursorCoreV073=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
