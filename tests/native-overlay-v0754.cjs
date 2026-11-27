/* Native overlay capability and consent contracts (no real Windows or browser APIs). */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../native-cursor-protocol-v0753.js');
const monitor={id:'DISPLAY2',left:-1920,top:0,width:1920,height:1080};
const legacy={type:'hello',protocol:1,platform:'windows',overlays:false,global_shortcuts:false,monitors:[monitor]};
const modern={...legacy,overlays:true,overlay_mode:'composite-only',global_shortcuts:true,shortcut_mode:'registered-toggle'};
const caps=P.capabilities(modern);
assert.deepEqual(caps,{overlay:true,shortcuts:true});
assert.deepEqual(P.capabilities(legacy),{overlay:false,shortcuts:false});
assert.throws(()=>P.hello({...modern,overlay_mode:'clean-master'}));
assert.throws(()=>P.hello({...modern,shortcut_mode:'keyboard-hook'}));
assert.throws(()=>P.options(caps,true,false,true),/composite/);
assert.throws(()=>P.options(P.capabilities(legacy),true,false,false));
assert.deepEqual(P.options(caps,false,true,true),{shortcuts:true});
assert.deepEqual(P.options(caps,true,true,false),{desktop_overlay:true,master:'composite',shortcuts:true});
assert.deepEqual(P.options(P.capabilities(legacy),false,false,false),{});
assert.equal(P.confirmed({type:'started'},{}),true);
assert.throws(()=>P.confirmed({type:'started',desktop_overlay:false},{desktop_overlay:true}));
assert.throws(()=>P.confirmed({type:'started',desktop_overlay:'true'},{desktop_overlay:true}));
assert.throws(()=>P.confirmed({type:'started',shortcuts:true},{}));
const style={spotlight:true,ring:true,radius:9,dim:.55,feather:.35,color:'#d0ff87'};
assert.deepEqual(P.effects({...style,unknown:1}),style);
for(const patch of [{radius:26},{dim:Infinity},{color:'red'},{spotlight:1},{feather:-.1}])assert.throws(()=>P.effects({...style,...patch}));
const id='test-session-0123456789';
assert.equal(P.hotkey({type:'hotkey',session:id,action:'ring'},id,true),'ring');
assert.throws(()=>P.hotkey({type:'hotkey',session:id,action:'ring'},id,false));
assert.throws(()=>P.hotkey({type:'hotkey',session:id,action:'delete'},id,true));
assert.throws(()=>P.hotkey({type:'hotkey',session:'wrong',action:'ring'},id,true));

function harness(clean=false){
 const handlers=new Map(),elements=new Map(),sent=[],effects=[],claimed=[];
 const signal=()=>{let f;return {addListener(cb){f=cb},emit(v){f?.(v)}}};
 const onMessage=signal(),onDisconnect=signal();
 const port={onMessage,onDisconnect,postMessage(m){sent.push(m)},disconnect(){onDisconnect.emit()}};
 function element(id){return {id,checked:false,disabled:false,value:'',textContent:'',addEventListener(type,f){handlers.set(id+':'+type,f)},replaceChildren(){this.value=''},append(o){if(!this.value)this.value=o.value}}}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement(){return element('option')}};
 let active=true,width=1920,time=0,spotlight=true,ring=false,release=0;
 const root={document,performance:{now:()=>time},crypto:{randomUUID:()=>id},chrome:{runtime:{connectNative:()=>port}},
 MangoNativeCursorProtocolV0753:P,MangoRecorderCursorHostV073:{active:()=>active,surface:()=> 'monitor',cleanMaster:()=>clean,automationCapture:()=>({identity:'session'}),captureSize:()=>({width,height:1080})},
 MangoRecorderCursorV073:{claimNative(v){claimed.push(v);return true},releaseNative(){release++},state:()=>({settings:{...style,spotlight,ring},effectiveSpotlight:spotlight}),nativeSample(p,click){effects.push([p,click])},nativeToggleEffect(a){if(a==='ring')ring=!ring;else spotlight=!spotlight;return true}},
 setTimeout(){},setInterval(){return 1},clearInterval(){},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('native-cursor-ui-v0753.js','utf8'),root);
 const click=k=>handlers.get(k+':click')?.(),get=k=>document.getElementById(k),receive=m=>onMessage.emit(m);
 return {root,sent,claimed,effects,get,click,receive,release:()=>release,setSize:w=>width=w,setActive:v=>active=v,advance:t=>time+=t};
}
const start=h=>{h.click('native-connect-v0753');h.receive(modern);h.get('native-consent-v0753').checked=true;};
let h=harness(true);start(h);assert.equal(h.get('native-overlay-v0754').disabled,true);
h.get('native-overlay-v0754').checked=true;h.click('native-start-v0753');assert.ok(!h.sent.some(m=>m.type==='start'),'clean mode must reject even a forged checkbox value');
h=harness(false);start(h);h.get('native-overlay-v0754').checked=true;h.get('native-shortcuts-v0754').checked=true;h.click('native-start-v0753');
assert.ok(h.sent.some(m=>m.type==='start'&&m.desktop_overlay&&m.master==='composite'&&m.shortcuts));
h.receive({type:'started',session:id,monitor,desktop_overlay:true,shortcuts:true});
assert.equal(h.root.MangoNativeCursorV0753.desktopOverlay(),true);assert.deepEqual(h.claimed,[true]);
assert.equal(h.sent.filter(m=>m.type==='effects').length,1);
h.receive({type:'sample',session:id,seq:1,elapsed_ms:0,x:.5,y:.5,click:false});
assert.equal(h.sent.filter(m=>m.type==='effects').length,1,'unchanged effects must not flood IPC');
h.receive({type:'hotkey',session:id,action:'ring'});
assert.equal(h.sent.filter(m=>m.type==='effects').at(-1).style.ring,true);
h.setSize(1080);h.advance(20);h.receive({type:'sample',session:id,seq:2,elapsed_ms:20,x:.4,y:.4,click:false});
assert.equal(h.root.MangoNativeCursorV0753.desktopOverlay(),false);assert.equal(h.release(),1);
h=harness(false);start(h);h.click('native-start-v0753');h.receive({type:'started',session:id,monitor,desktop_overlay:true,shortcuts:false});
assert.equal(h.root.MangoNativeCursorV0753.active(),false);assert.deepEqual(h.claimed,[]);
console.log('PASS: overlay capabilities, clean-master rejection, consent negotiation, style updates, hotkey scope, and geometry-loss teardown');
