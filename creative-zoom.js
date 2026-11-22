/* MangoShot timeline zoom: one model for playback and canvas export. */
(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function check(items){if(!Array.isArray(items)||items.length>240)throw Error('Invalid zoom timeline');
  return items.map(x=>({id:x.id,start:Number(x.start),duration:Number(x.duration),scale:Number(x.scale),x:Number(x.x),y:Number(x.y)}))
   .filter(x=>{if(typeof x.id!=='string'||!/^[-\w]{1,90}$/.test(x.id)||!Number.isFinite(x.start)||x.start<0||!Number.isFinite(x.duration)||x.duration<.05||x.duration>5||!Number.isFinite(x.scale)||x.scale<1||x.scale>5||!Number.isFinite(x.x)||x.x<0||x.x>1||!Number.isFinite(x.y)||x.y<0||x.y>1)throw Error('Invalid zoom event');return true;})
   .sort((a,b)=>a.start-b.start);}
 const neutral=()=>({scale:1,x:.5,y:.5}),smooth=t=>t*t*(3-2*t);
 function at(items,time){let before=neutral();for(const e of check(items)){if(time<e.start)return before;
   const next={scale:e.scale,x:e.x,y:e.y};if(time<e.start+e.duration){const f=smooth(clamp((time-e.start)/e.duration,0,1));
    return {scale:before.scale+(next.scale-before.scale)*f,x:before.x+(next.x-before.x)*f,y:before.y+(next.y-before.y)*f};}before=next;}return before;}
 function add(items,start,scale,x=.5,y=.5,duration=.4){return check([...items,{id:'zoom-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),start,duration,scale,x,y}]);}
 function remove(items,id){return check(items.filter(e=>e.id!==id));}
 function ripple(items,start,end){const d=end-start;if(d<=0)return check(items);return check(items.flatMap(e=>e.start>=start&&e.start<end?[]:[{...e,start:e.start>=end?e.start-d:e.start}]));}
 function draw(ctx,media,items,time,w,h){const z=at(items,time),x=z.x*w,y=z.y*h;ctx.save();ctx.translate(x,y);ctx.scale(z.scale,z.scale);ctx.translate(-x,-y);ctx.drawImage(media,0,0,w,h);ctx.restore();return z;}
 function preview(video,items,time){const z=at(items,time);if(video?.style){video.style.transformOrigin=(z.x*100)+'% '+(z.y*100)+'%';video.style.transform='scale('+z.scale+')';}return z;}
 root.MangoCreativeZoom={check,at,add,remove,ripple,draw,preview};
})(typeof globalThis!=='undefined'?globalThis:this);
