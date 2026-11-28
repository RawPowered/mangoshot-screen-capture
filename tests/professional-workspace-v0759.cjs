const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const {nextTab,captureSummary}=require('../workspace-ui-v0759.js');
const keys=['capture','cursor','tracking','ink'];
let count=0;
function equal(a,b){assert.equal(a,b);count++;}
for(const [key,expected] of [['ArrowRight','cursor'],['ArrowDown','cursor'],['ArrowLeft','ink'],['ArrowUp','ink'],['Home','capture'],['End','ink'],['Tab',null]])equal(nextTab(keys,'capture',key),expected);
for(const [state,expected] of [[{},'Not recording'],[{phase:'selecting'},'Not recording'],[{phase:'recording',mode:'preview'},'Preview pointer only'],[{phase:'recording',mode:'linked'},'Linked tab · awaiting acknowledgement'],[{phase:'recording',mode:'linked',linkedReady:true},'Authorized linked tab'],[{phase:'paused',mode:'linked',linkedReady:true},'Tracking paused'],[{phase:'recording',mode:'native',native:'active'},'Authorized monitor'],[{phase:'recording',mode:'native',native:'resuming'},'Native transition']])equal(captureSummary(state).tracking,expected);
equal(captureSummary({phase:'recording',surface:'browser'}).canConnect,false);
equal(captureSummary({phase:'recording',surface:'browser',linkedAvailable:true}).canConnect,true);
equal(captureSummary({phase:'recording',surface:'monitor'}).canConnect,true);
equal(captureSummary({phase:'paused',surface:'monitor'}).canConnect,false);
equal(captureSummary({phase:'recording',surface:'window'}).canConnect,false);
equal(captureSummary({clean:true,retain:false}).retention,'Retain path');
for(const [name,marker] of [['clip-studio.js','else globalThis.MangoLayerUI?.syncProperties?.()'],['visual-inspector-v068.js','motionView.append(transformMotion)'],['cursor-recorder-v073.js',"linkedReady:mode==='linked'&&linkReady&&!linkPaused&&!linkAwait"],['workspace-ui-v0759.js','tabs.panels.tracking.append(trackingHead,tracking,interaction)'],['clip-graphics-ui.js','function syncProperties(values=true)']]){const s=read(name);new Function(s);equal(s.includes(marker),true);}
for(const name of ['clip-studio.html','recorder.html']){const s=read(name);const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);equal(new Set(ids).size,ids.length);equal(s.includes('professional-workspace-v0759.css'),true);equal(s.includes('workspace-ui-v0759.js'),true);}
console.log('Professional workspace:',count,'checks passed');
