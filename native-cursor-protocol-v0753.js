/* Pure native cursor protocol validation; no browser or OS access. */
(function(root){'use strict';
 const HOST='com.rawpowered.mangoshot_cursor',VERSION=1;
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),bounded=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max,int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const session=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{16,80}$/.test(v);
 function monitor(m){if(!object(m)||typeof m.id!=='string'||!m.id.length||m.id.length>64||/[\u0000-\u001f]/.test(m.id)||!int(m.left,-131072,131072)||!int(m.top,-131072,131072)||!int(m.width,1,32768)||!int(m.height,1,32768))throw Error('Invalid monitor geometry');return {id:m.id,left:m.left,top:m.top,width:m.width,height:m.height};}
 function hello(m){if(!object(m)||m.type!=='hello'||m.protocol!==VERSION||m.platform!=='windows'||m.overlays!==false||m.global_shortcuts!==false||!Array.isArray(m.monitors)||!m.monitors.length||m.monitors.length>32)throw Error('Unsupported native cursor host');const monitors=m.monitors.map(monitor);if(new Set(monitors.map(m=>m.id)).size!==monitors.length)throw Error('Duplicate monitor ID');return monitors;}
 function same(a,b){return ['id','left','top','width','height'].every(k=>a?.[k]===b?.[k]);}
 function matches(m,size){return !!size&&bounded(size.width,1,32768)&&bounded(size.height,1,32768)&&Math.abs((size.width/size.height)/(m.width/m.height)-1)<.015;}
 function sample(m,id,last){if(!object(m)||m.type!=='sample'||!session(id)||m.session!==id||!int(m.seq,1,3000000)||m.seq<=last.seq||!int(m.elapsed_ms,0,43200000)||m.elapsed_ms<last.elapsed_ms||typeof m.click!=='boolean')throw Error('Invalid or stale native sample');const gap=m.x===null&&m.y===null;if(gap&&m.click||!gap&&(!bounded(m.x,0,1)||!bounded(m.y,0,1)))throw Error('Invalid native coordinates');return {seq:m.seq,elapsed_ms:m.elapsed_ms,point:gap?null:{x:m.x,y:m.y},click:m.click};}
 const api=Object.freeze({HOST,VERSION,session,monitor,hello,same,matches,sample});root.MangoNativeCursorProtocolV0753=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
