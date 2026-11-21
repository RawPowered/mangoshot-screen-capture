const api=globalThis.chrome??globalThis.browser;
const status=document.querySelector("#status"), base=document.querySelector("#base"),ink=document.querySelector("#ink");
const ctx=base.getContext("2d"),pen=ink.getContext("2d");
const params=new URLSearchParams(location.search),source=Number(params.get("source")),mode=params.get("mode")==="full"?"full":"visible";
const call=(fn,...args)=>new Promise((resolve,reject)=>{try{fn(...args,result=>{const e=globalThis.chrome?.runtime?.lastError;if(e)reject(new Error(e.message));else resolve(result);});}catch(e){reject(e)}});
const captureId=crypto.randomUUID();
let meta=null,frames=[],ready=false,history=[],drawing=false,last=null;
const label=t=>status.textContent=t;
function snapshot(){if(history.length>=30)history.shift();history.push(pen.getImageData(0,0,ink.width,ink.height));}
function initCanvas(w,h){base.width=ink.width=w;base.height=ink.height=h;base.style.width=ink.style.width=w+"px";base.style.height=ink.style.height=h+"px";}
function image(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("Image decode failed"));i.src=url;});}
async function finish(){
  // Capture geometry is expressed in CSS pixels; per-frame bitmap size depends on device scaling.
  const first=await image(frames[0].dataUrl);
  const scale=first.naturalWidth/meta.width;
  const w=Math.round(meta.width*scale),h=Math.round(meta.pageHeight*scale);
  const maxDimension=32767,maxPixels=150000000;
  if(w>maxDimension||h>maxDimension||w*h>maxPixels)throw new Error("Screenshot exceeds canvas memory limit.");
  initCanvas(w,h);
  for(const frame of frames.sort((a,b)=>a.index-b.index)){
    const bitmap=await image(frame.dataUrl);
    const viewportH=Math.round(meta.height*scale);
    const actualH=Math.min(bitmap.height,viewportH);
    // Destination is exact captured scroll position; overlap replaces previous pixels.
    ctx.drawImage(bitmap,0,0,bitmap.width,actualH,0,Math.round((meta.full?frame.scrollY:0)*scale),w,actualH);
  }
  ready=true;document.querySelector("#png").disabled=false;document.querySelector("#pdf").disabled=false;
  label("Ready · "+w+" × "+h+" pixels");
  const editorTab=await call(api.tabs.getCurrent.bind(api.tabs));
  if(editorTab?.id)await call(api.tabs.update.bind(api.tabs),editorTab.id,{active:true});
}
api.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.captureId!==captureId)return;
  if(m.type==="MANGO_START"){meta=m.meta;label("Capturing "+meta.frames+" frame(s)…");reply({ok:true});return;}
  if(m.type==="MANGO_FRAME"){frames.push({index:m.index,scrollY:m.scrollY,dataUrl:m.dataUrl});label("Frame "+frames.length+" / "+meta.frames);reply({ok:true});return;}
  if(m.type==="MANGO_DONE"){reply({ok:true});finish().catch(e=>label(e.message));return;}
  if(m.type==="MANGO_ERROR"){label("Capture failed: "+m.error);reply({ok:true});return;}
});
async function start(){
  try{
    if(!Number.isInteger(source)||source<1)throw new Error("Missing source tab");
    const initiated=await call(api.runtime.sendMessage.bind(api.runtime),{type:"MANGO_INIT",captureId,source,mode});\n    if(!initiated?.ok)throw new Error(initiated?.error||"Capture initialization failed");
    await call(api.scripting.executeScript.bind(api.scripting),{target:{tabId:source},files:["content.js"]});
  }catch(e){label("Cannot start: "+e.message);}
}
const point=e=>{const r=ink.getBoundingClientRect();return {x:(e.clientX-r.left)*ink.width/r.width,y:(e.clientY-r.top)*ink.height/r.height,p:e.pointerType==="pen"?Math.max(.2,e.pressure||.5):1};};
ink.addEventListener("pointerdown",e=>{if(!ready)return;ink.setPointerCapture(e.pointerId);snapshot();drawing=true;last=point(e);e.preventDefault();});
ink.addEventListener("pointermove",e=>{if(!drawing)return;const q=point(e),tool=document.querySelector("#tool").value,size=Number(document.querySelector("#size").value);
 pen.save();pen.lineCap="round";pen.lineJoin="round";pen.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";pen.globalAlpha=tool==="highlighter"?.28:1;pen.strokeStyle=tool==="eraser"?"#000":document.querySelector("#color").value;pen.lineWidth=size*(tool==="highlighter"?4:tool==="eraser"?5:1)*q.p*(ink.width/(ink.getBoundingClientRect().width||ink.width));pen.beginPath();pen.moveTo(last.x,last.y);pen.lineTo(q.x,q.y);pen.stroke();pen.restore();last=q;e.preventDefault();});
for(const event of ["pointerup","pointercancel","lostpointercapture"])ink.addEventListener(event,()=>drawing=false);
document.querySelector("#undo").addEventListener("click",()=>{const s=history.pop();if(s)pen.putImageData(s,0,0);});
document.querySelector("#clear").addEventListener("click",()=>{if(!ready)return;snapshot();pen.clearRect(0,0,ink.width,ink.height);});
function exportCanvas(){const c=document.createElement("canvas");c.width=base.width;c.height=base.height;const x=c.getContext("2d");x.drawImage(base,0,0);x.drawImage(ink,0,0);return c;}
document.querySelector("#png").addEventListener("click",()=>{if(!ready)return;const a=document.createElement("a");a.href=exportCanvas().toDataURL("image/png");a.download="MangoShot-"+Date.now()+".png";a.click();});
document.querySelector("#pdf").addEventListener("click",()=>{if(!ready)return;const url=exportCanvas().toDataURL("image/png");const w=window.open("","_blank");if(!w){label("Allow popups to print or save PDF");return;}const doc=w.document;doc.title="MangoShot print";const img=doc.createElement("img");img.src=url;img.style.cssText="width:100%;height:auto";doc.body.style.margin="0";doc.body.appendChild(img);img.onload=()=>w.print();});
start();
