/* Piecewise-linear instantaneous speed versus normalized OUTPUT time.
 * Exact integral maps timeline to source. No optical flow or reverse playback. */
(function(root){'use strict';
 const MIN=.25,MAX=4,MAX_KEYS=8,EPS=1e-9,copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const defaults=()=>[{at:0,rate:1},{at:1,rate:1}];
 const presets=[
  ['normal','Normal 1×',defaults()],
  ['slow','Slow 0.5×',[{at:0,rate:.5},{at:1,rate:.5}]],
  ['fast','Fast 2×',[{at:0,rate:2},{at:1,rate:2}]],
  ['rise','Slow to fast',[{at:0,rate:.5},{at:.25,rate:.5},{at:.75,rate:2},{at:1,rate:2}]],
  ['fall','Fast to slow',[{at:0,rate:2},{at:.25,rate:2},{at:.75,rate:.5},{at:1,rate:.5}]],
  ['pulse','Speed burst',[{at:0,rate:.5},{at:.2,rate:.5},{at:.5,rate:3},{at:.8,rate:.5},{at:1,rate:.5}]]
 ];
 function check(a){
  if(!Array.isArray(a)||a.length<2||a.length>MAX_KEYS)throw Error('Use 2–8 speed points.');
  const v=a.map((p,i)=>{if(!p||Object.keys(p).length!==2||!Object.hasOwn(p,'at')||!Object.hasOwn(p,'rate')||typeof p.at!=='number'||!Number.isFinite(p.at)||p.at<0||p.at>1||typeof p.rate!=='number'||!Number.isFinite(p.rate)||p.rate<MIN||p.rate>MAX||i&&p.at-a[i-1].at<.009999999)throw Error('Speed points must be 1% apart and between 0.25× and 4×.');return {at:p.at,rate:p.rate};});
  if(v[0].at!==0||v.at(-1).at!==1)throw Error('Speed endpoints must be at 0% and 100%.');return v;
 }
 function integral(a,u=1){
  u=clamp(u,0,1);let sum=0;
  for(let i=1;i<a.length;i++){const p=a[i-1],q=a[i],d=q.at-p.at,t=clamp(u-p.at,0,d);sum+=p.rate*t+(q.rate-p.rate)*t*t/(2*d);if(u<=q.at)break;}
  return sum;
 }
 function rate(a,u){u=clamp(u,0,1);for(let i=1;i<a.length;i++){const p=a[i-1],q=a[i];if(u<=q.at+EPS)return p.rate+(q.rate-p.rate)*clamp((u-p.at)/(q.at-p.at),0,1);}return a.at(-1).rate;}
 function fraction(c,t){return clamp((t-c.start)/(c.end-c.start),0,1);}
 function source(c,t){const span=c.end-c.start;return clamp(c.sourceIn+span*integral(c.speedRamp,fraction(c,t)),c.sourceIn,c.sourceOut);}
 function sourceOut(c){return c.sourceIn+(c.end-c.start)*(c.speedRamp?integral(c.speedRamp):1);}
 const api=Object.freeze({MIN,MAX,MAX_KEYS,copy,defaults,presets,check,integral,rate,fraction,source,sourceOut});
 root.MangoSpeedRampV0729=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
