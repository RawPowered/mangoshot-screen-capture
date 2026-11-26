/* Local recorder gesture and source geometry contracts. No capture permissions. */
(function(root){'use strict';
 const HOLD=250;
 function spotlight(read,write,changed=()=>{},clock=()=>performance.now()){
  const keys=new Set();let at=0,multiple=false;
  function down(id,repeat=false){if(repeat||keys.has(id))return false;if(!keys.size){at=clock();multiple=false;}else multiple=true;keys.add(id);changed();return true;}
  function up(id){if(!keys.delete(id))return false;if(!keys.size){const tap=!multiple&&clock()-at<HOLD;if(tap)write(!read());multiple=false;}changed();return true;}
  function cancel(){if(keys.size){keys.clear();multiple=false;changed();}}
  return Object.freeze({down,up,cancel,held:()=>keys.size>0,effective:()=>keys.size>0||read()});
 }
 function key(e){if(e.code==='Digit1'||e.code==='Numpad1')return e.code;return e.key==='1'?'Digit1':null;}
 function backtick(e){return e.code==='Backquote'||e.key==='\x60'||e.key==='~';}
 function editable(target){return !!(target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false])')||target?.matches?.('input,textarea,select,[contenteditable]'));}
 function fitFrame(sw,sh,w,h){
  if(![sw,sh,w,h].every(x=>Number.isFinite(x)&&x>0))return {x:0,y:0,w:1,h:1};
  const scale=Math.min(w/sw,h/sh),fw=sw*scale/w,fh=sh*scale/h;
  return {x:(1-fw)/2,y:(1-fh)/2,w:fw,h:fh};
 }
 function inFrame(p,f){if(!p||!f)return null;const x=(p.x-f.x)/f.w,y=(p.y-f.y)/f.h;return x>=0&&x<=1&&y>=0&&y<=1?{x,y}:null;}
 function outFrame(p,f){return p?{x:f.x+p.x*f.w,y:f.y+p.y*f.h}:null;}
 function drawSource(ctx,media,camera,w,h){
  const sw=media.videoWidth||media.displayWidth||w,sh=media.videoHeight||media.displayHeight||h,f=fitFrame(sw,sh,w,h);
  if(media.readyState>=2||media.displayWidth>0&&media.displayHeight>0){const c=root.MangoCamera.crop(camera,sw,sh);ctx.drawImage(media,c.sx,c.sy,c.sw,c.sh,f.x*w,f.y*h,f.w*w,f.h*h);}
  return f;
 }
 const api=Object.freeze({HOLD,spotlight,key,backtick,editable,fitFrame,inFrame,outFrame,drawSource});
 root.MangoRecorderControlV0710=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
