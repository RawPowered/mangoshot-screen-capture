const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const ctx={JSON,Math,Date,Float32Array,Uint8Array,Number,Set,Map};ctx.globalThis=ctx;
for(const name of ['sequence-media.js','caption-core-v072.js','caption-whisper-v073.js'])
 vm.runInNewContext(source(name),ctx,{filename:name});
const cc=ctx.MangoCaptionsV072,asr=ctx.MangoWhisperV073;
const parts=[{start:0,end:4},{start:7,end:12}];
const raw=[
 {start:1,end:1.32,text:'Hello'},{start:1.35,end:1.63,text:'from'},
 {start:1.65,end:2,text:'MangoShot.'},
 {start:7.1,end:7.38,text:'Captions'},{start:7.4,end:7.7,text:'are'},
 {start:7.72,end:8.1,text:'automatic.'},
 {start:5,end:6,text:'Removed gap'} // never used
];
const mapped=asr.inSequence(raw,parts);
assert.equal(mapped.length,6,'ASR must omit deleted source audio');
assert.ok(mapped.find(w=>w.text==='Captions').start<4.5,'Timeline mapping closes deleted source gap');
const cues=asr.toCues(raw,parts,{maxWords:4,maxSeconds:2.5});
assert.equal(cues.length,2);
assert.equal(cues[0].words.length,3);
assert.equal(cues[1].words.length,3);
assert.equal(cues[1].text,'Captions are automatic.');
assert.equal(cues[1].start,4.1);
const valid=cc.check(cues,ctx.MangoSequenceMedia.duration(parts));
assert.equal(valid[0].words[0].text,'Hello','Cue validator preserves ASR word timing');
const span=cc.ripple(cues,0.5,1.5);
assert.ok(span.every(c=>c.words.every(w=>w.start>=c.start-.005&&w.end<=c.end+.005)),
 'Ripple must keep word timestamps inside shifted cues');
const sliced=cc.trim(cues,1,6);
assert.ok(sliced.every(c=>!c.words||c.words.every(w=>w.end<=c.end+.005)),
 'Trim must retain only bounded word timestamps');
const edited=cc.update(cues,cues[0].id,{text:'Manually corrected'},9);
assert.equal(edited[0].words,undefined,'Manual caption edits must invalidate stale word timing');
let rendered=[];
const fake={
 save(){},restore(){},
 measureText:t=>({width:String(t).length*12}),
 fillRect(){},strokeText(text){rendered.push(['stroke',text])},
 fillText(text){rendered.push(['fill',text,this.fillStyle])}
};
cc.draw(fake,[cues[0]],1.5,1280,720,cc.style({preset:'classic',highlightColor:'#ffee00',wordHighlight:true}));
assert.ok(rendered.some(x=>x[0]==='fill'&&x[2]==='#ffee00'),
 'Current word receives the active highlight color');
const html=source('clip-studio.html');
const left=html.indexOf('id="v073-caption-dock"'),timeline=html.indexOf('id="edit-target"');
assert.ok(left>0&&left<timeline,'Caption controls must be in the LEFT dock, not timeline');
assert.ok(html.indexOf('id="caption-studio-panel"')<timeline);
assert.ok(html.includes('id="v073-caption-toggle"'));
for(const id of ['cc-transcribe','cc-model-consent','cc-engine','cc-word-highlight','cc-highlight-color','cc-asr-stage'])
 assert.ok(html.includes('id="'+id+'"'),'Missing automatic speech UI '+id);
const dock=source('caption-dock-v073.js');
for(const tab of ["['auto','Transcribe']","['edit','Cues']","['style','Style']","['files','Files']"])
 assert.ok(dock.includes(tab),'Missing left-dock tab '+tab);
assert.ok(!html.slice(timeline,html.indexOf('id="timeline-scroll"')).includes('caption-studio-panel'),
 'Timeline must never contain the lengthy caption editing UI');
const worker=source('asr-worker-v073.js');
assert.ok(worker.includes("return_timestamps:'word'"),'Whisper must request real per-word timing');
assert.ok(worker.includes("model=english?MODEL_EN:MODEL_MULTI"));
assert.ok(worker.includes("import {pipeline,env} from './asr-runtime/transformers.web.min.js'"),'Runtime code must load locally');
assert.ok(!worker.includes('https://cdn'),'No remote executable scripts');
const main=source('caption-whisper-v073.js');
assert.ok(main.includes('if(!options.consent)'),'Model download must require opt-in');
assert.ok(main.includes("new root.Worker('asr-worker-v073.js',{type:'module'})"),'Native module worker not remote JS');
assert.ok(!main.includes('fetch('),'The media audio is NEVER posted to a server');
console.log('PASS: left-rail caption tabs, real Whisper word timing, visual emphasis, ripple and no audio upload');
