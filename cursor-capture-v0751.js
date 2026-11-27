/* Local source-coordinate telemetry, camera samples and live-effect history.
 * This metadata does not make effects already embedded in video reversible. */
(function(root){'use strict';
 const SCHEMA='mangoshot.cursor.capture.v1',MAX=60000,MAX_EVENTS=6000,MAX_CLICKS=12000;
 const q=(n,d=10000)=>Math.round(n*d)/d,ok=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
 const scopes=['linked','preview','untracked','off'];
 const validPoint=p=>p&&ok(p.x,0,1)&&ok(p.y,0,1)?p:null;
 function time(t){if(!ok(t,0,86400))throw Error('Invalid cursor capture time');return q(t,1000);}
 function tupleList(raw,max,normalize){if(!Array.isArray(raw)||raw.length>max)throw Error('Invalid cursor capture list');let last=-1;return raw.map(s=>{if(!Array.isArray(s)||!ok(s[0],0,86400)||s[0]<=last)throw Error('Invalid cursor capture order');last=s[0];return normalize(s);});}
 function pointTuple(s,allowGap){if(s.length!==3)throw Error('Invalid cursor point tuple');if(allowGap&&s[1]===null&&s[2]===null)return [s[0],null,null];if(!ok(s[1],0,1)||!ok(s[2],0,1))throw Error('Invalid cursor point');return [...s];}
 function stateTuple(s,config){if(s.length!==4||!scopes.includes(s[1])||!Number.isInteger(s[2])||s[2]<0||s[2]>MAX_EVENTS)throw Error('Invalid cursor state');if(s[1]==='off'){if(s[3]!==null)throw Error('Unexpected disabled cursor settings');return [s[0],s[1],s[2],null];}if(!s[3]||typeof s[3]!=='object'||Array.isArray(s[3]))throw Error('Missing live cursor settings');return [s[0],s[1],s[2],config(s[3])];}
 function cameraTuple(s){if(s.length!==8||!ok(s[1],1,6)||!s.slice(2).every(x=>ok(x,0,1))||s[6]<=0||s[7]<=0||s[4]+s[6]>1.0001||s[5]+s[7]>1.0001)throw Error('Invalid cursor camera frame');return [...s];}
 function check(raw,config){if(!raw||raw.schema!==SCHEMA||typeof raw.truncated!=='boolean')throw Error('Invalid cursor capture metadata');if(raw.master!=null&&!['clean','composite'].includes(raw.master))throw Error('Invalid recording master mode');return {schema:SCHEMA,truncated:raw.truncated,...(raw.master?{master:raw.master}:{}),sourceSamples:tupleList(raw.sourceSamples,MAX,s=>pointTuple(s,true)),sourceClicks:tupleList(raw.sourceClicks,MAX_CLICKS,s=>pointTuple(s,false)),cameraFrames:tupleList(raw.cameraFrames,MAX,cameraTuple),states:tupleList(raw.states,MAX_EVENTS,s=>stateTuple(s,config))};}
 function append(list,s,max,data){if(list.length&&s[0]<=list.at(-1)[0])return false;if(list.length>=max){data.truncated=true;return false;}list.push(s);return true;}
 function sample(list,t,p,max,data){const last=list.at(-1),v=validPoint(p),s=[time(t),v?q(v.x):null,v?q(v.y):null];if(last){const gap=(last[1]===null)!==(s[1]===null),moved=last[1]!==s[1]||last[2]!==s[2];if(!gap&&s[0]-last[0]<(moved?.032:.195)-.000001)return false;}return append(list,s,max,data);}
 function create(config,master=null){if(master!==null&&!['clean','composite'].includes(master))throw Error('Invalid recording master mode');const data={schema:SCHEMA,truncated:false,...(master?{master}:{}),sourceSamples:[],sourceClicks:[],cameraFrames:[],states:[]};let epoch=0,signature=null,forceGap=false;
  function gap(t){if(!ok(t,0,86400))return;const last=data.sourceSamples.at(-1);if(last&&last[1]!==null){if(time(t)<=last[0])forceGap=true;else sample(data.sourceSamples,t,null,MAX,data);}}
  function sourceChanged(t){gap(t);if(epoch<MAX_EVENTS)epoch++;else data.truncated=true;signature=null;}
  function frame(t,p,c,f,settings,scope,retain){if(!ok(t,0,86400))return;const stamp=time(t),kind=retain?(scopes.includes(scope)&&scope!=='off'?scope:'untracked'):'off',active=kind==='linked'?validPoint(p):null;
   if(forceGap){if(stamp>(data.sourceSamples.at(-1)?.[0]??-1)){sample(data.sourceSamples,t,null,MAX,data);forceGap=false;}}else if(retain||data.sourceSamples.length)sample(data.sourceSamples,t,active,MAX,data);
   const state=retain?config(settings):null,sig=JSON.stringify([kind,epoch,state]);if(sig!==signature){if(append(data.states,[stamp,kind,epoch,state],MAX_EVENTS,data))signature=sig;}
   if(!retain)return;
   const camera=cameraTuple([stamp,q(c.zoom),q(c.cx),q(c.cy),q(f.x),q(f.y),q(f.w),q(f.h)]),last=data.cameraFrames.at(-1);
   if(!last||camera.slice(1).some((v,i)=>v!==last[i+1])&&stamp-last[0]>=.032-.000001||stamp-last[0]>=.195-.000001)append(data.cameraFrames,camera,MAX,data);
  }
  function click(t,p){const v=validPoint(p);if(!v||!ok(t,0,86400))return;append(data.sourceClicks,[time(t),q(v.x),q(v.y)],MAX_CLICKS,data);}
  return {frame,click,gap,sourceChanged,truncated:()=>data.truncated,finish:()=>check(data,config)};
 }
 // The source clock may contain cuts/repeated sections. Project only retained intervals.
 function sections(parts){let out=0;return (parts||[]).map(p=>{const s={start:p.start,end:p.end,out};out+=p.end-p.start;return s;});}
 function pathIntervals(samples,duration){const result=[];let first=null,last=null;function finish(boundary=duration){if(first!==null){const end=Math.min(duration,boundary,last+.195);if(end>first)result.push({start:first,end});}first=last=null;}for(const s of samples||[]){if(s[1]===null){finish(s[0]);continue;}if(last!==null&&s[0]-last>.55)finish();if(first===null)first=s[0];last=s[0];}finish();return result;}
 function projectIntervals(intervals,parts){const result=[],rows=sections(parts),ordered=[...intervals].sort((a,b)=>a.start-b.start);for(const r of rows)for(const a of ordered){if(a.start>=r.end)break;const start=Math.max(a.start,r.start),end=Math.min(a.end,r.end);if(end>start)result.push({...a,start:r.out+start-r.start,end:r.out+end-r.start});}return result;}
 function liveIntervals(states,duration){const rows=[];for(let i=0;i<(states||[]).length;i++){const s=states[i],next=states[i+1],v=s[3],end=Math.min(duration,next?.[0]??duration);if(!v||s[0]>=end)continue;for(const kind of ['spotlight','ring','zoomMode'])if(kind==='zoomMode'?v.zoomMode!=='off':v[kind])rows.push({start:s[0],end,kind,scope:s[1],epoch:s[2],settings:v});}return rows;}
 function projectClicks(clicks,parts){const out=[];for(const r of sections(parts))for(const s of clicks||[])if(s[0]>=r.start&&s[0]<r.end)out.push(r.out+s[0]-r.start);return out;}
 const api=Object.freeze({SCHEMA,MAX,MAX_EVENTS,MAX_CLICKS,check,create,pathIntervals,projectIntervals,liveIntervals,projectClicks});root.MangoCursorCaptureV0751=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
