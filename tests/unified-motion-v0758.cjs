const assert=require('node:assert/strict'),fs=require('node:fs');
for(const p of ['compositor-core-v0714','motion-core-v0750','motion-core-v067','clip-graphics','creative-zoom','clip-edit-ops','sequence-media','sequence-operations','clip-project','auto-cut'])require('../'+p+'.js');
const C=globalThis.MangoCompositorV0714,M=globalThis.MangoMotionCoreV0750,G=globalThis.MangoGraphics,Z=globalThis.MangoCreativeZoom,fields=['x','y','scale','rotation','opacity'];
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,m+': '+a+' vs '+b);
for(const ease of C.easing){const keys=[{...C.neutral(),t:0,ease},{...C.neutral(),t:.55,x:.45,y:-.2,scale:2.1,rotation:135,opacity:.8,ease},{...C.neutral(),t:1,x:.8,scale:3,opacity:.5,rotation:180}],layer={...G.create('text','none',0),start:0,end:10,keyframes:keys};
 const tx=G.ripple([layer],3,6)[0],trim=G.trim([tx],1,6)[0];for(let t=0;t<5;t+=.029){const old=t+1<3?t+1:t+4;for(const k of fields)near(C.at(trim,t)[k],C.at(layer,old)[k],'trim/ripple '+ease+' '+k);}
 const key=M.upsert(keys,.3);for(let t=0;t<=1;t+=.013)for(const k of fields)near(C.pose(key,t)[k],C.pose(keys,t)[k],'insert '+ease+' '+k);
 const source={size:100,format:'webm',duration:10},packed=globalThis.MangoProject.pack(source,[{start:0,end:5}],[trim],[]),restored=globalThis.MangoProject.check(JSON.parse(JSON.stringify(packed)),source).layers[0];ok(JSON.stringify(restored.keyframes)===JSON.stringify(trim.keyframes),'project roundtrip');
 const moved=G.retimeTiming(layer,3,13);ok(JSON.stringify(moved.keyframes)===JSON.stringify(keys),'whole layer move');
}
for(const ease of ['smooth','linear']){const z=[{id:'a',start:1,duration:5,scale:3,x:.9,y:.2,ease},{id:'b',start:7,duration:2,scale:1,x:.5,y:.5,ease}];let ret=Z.retime(z,[{start:0,end:2},{start:5,end:7}],10);ret=Z.retime(ret,[{start:1,end:2.1}],6);ret=Z.check(JSON.parse(JSON.stringify(ret)));for(let t=0;t<4.9;t+=.019){const middle=t<1?t:t+1.1,old=middle<3?middle+2:middle+4,a=Z.at(ret,t),b=Z.at(z,old);near(a.scale,b.scale,'camera scale');if(b.scale>1.00001){near(a.x,b.x,'camera x');near(a.y,b.y,'camera y');}}}
const held=Z.retime([{id:'held',start:1,duration:1,scale:2,x:.8,y:.2}],[{start:0,end:4}],8);ok(held[0].boundary===true&&held[0].duration===0,'boundary pose');near(Z.at(held,0).scale,2,'retained pose');
let rejected=false;try{Z.nonOverlap([{id:'a',start:0,duration:2,scale:2,x:.5,y:.5},{id:'b',start:1,duration:2,scale:3,x:.5,y:.5}]);}catch{rejected=true}ok(rejected,'overlap');
let commits=0,activates=0,stamp='a',messages=[],committed=null;const callbacks={};
function node(){return {style:{},dataset:{motionId:'m'},listeners:{},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)},setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){},focus(){},emit(k,o={}){for(const fn of this.listeners[k]||[])fn({type:k,pointerId:1,clientX:0,button:0,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...o})}}}
const button=node(),lane={getBoundingClientRect:()=>({width:1000}),querySelectorAll:()=>[]},view={automationCapture:()=>({ready:true,stamp}),sequencePosition:()=>0,message:t=>messages.push(t)},root={addEventListener:(k,fn)=>callbacks[k]=fn,document:{activeElement:button}};
new Function('globalThis',fs.readFileSync('timeline-motion-gesture-v0758.js','utf8'))(root);
root.MangoTimelineMotionGestureV0758.bind(button,{view,lane,initial:2,total:10,limits:()=>[0,8],activate:()=>activates++,commit:(v,s)=>{if(s!==stamp)throw Error('stale');commits++;committed=v;return true;}});
button.emit('pointerdown',{clientX:100});button.emit('pointermove',{clientX:200,altKey:true});button.emit('pointercancel');ok(commits===0,'cancel is non-mutating');near(parseFloat(button.style.left),20,'cancel resets draft');
button.emit('pointerdown',{clientX:100});button.emit('pointermove',{clientX:200,altKey:true});button.emit('pointerup');button.emit('click');ok(commits===1&&activates===0,'one gesture one commit');near(committed,3,'timeline movement');
button.emit('pointerdown',{clientX:100});button.emit('pointermove',{clientX:200,altKey:true});stamp='b';button.emit('pointerup');ok(commits===1&&messages.at(-1)==='stale','stale gesture rejected');
button.emit('keydown',{key:'ArrowRight'});ok(commits===2,'keyboard movement');near(committed,2+1/30,'one-frame nudge');
button.emit('pointerdown',{clientX:100});button.emit('pointerup');button.emit('click');ok(activates===1,'simple click activates');
const host=fs.readFileSync('clip-studio.js','utf8'),html=fs.readFileSync('clip-studio.html','utf8'),cursor=fs.readFileSync('cursor-director-ui-v074.js','utf8');
ok(host.includes('MangoCreativeZoom.retime(zoomEvents,cameraRanges,oldLength)')&&host.includes('previewGraphicTransform('),'shared commit anchors');ok(html.indexOf('timeline-motion-gesture-v0758.js')<html.indexOf('creative-studio-ui.js'),'script load order');ok(cursor.includes('section.outputEnd-(p.end-p.start)'),'source scope');
console.log('PASS: '+checks+' focused assertions for retained motion, serialized keys and timeline gestures');
