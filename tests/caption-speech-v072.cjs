const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','caption-speech-v072.js'),'utf8');
const seq=fs.readFileSync(path.join(__dirname,'..','sequence-media.js'),'utf8');
function load(fake){
 const ctx={...fake,Number,Math,Date,Error,JSON};ctx.globalThis=ctx;
 vm.runInNewContext(seq,ctx,{filename:'sequence-media.js'});
 vm.runInNewContext(source,ctx,{filename:'caption-speech-v072.js'});
 return ctx.MangoCaptionSpeechV072;
}
const unsupported=load({});
assert.equal(unsupported.supported(),false);
unsupported.availability().then(v=>assert.equal(v,'unsupported'));
class FakeRecognition{
 constructor(){this.processLocally=false}
 static available(){return Promise.resolve('available')}
 static install(){return Promise.resolve(true)}
}
const speech=load({SpeechRecognition:FakeRecognition,AudioContext:class {}});
assert.equal(speech.supported(),true);
const segments=[{start:0,end:2},{start:4,end:8}];
const one=speech.mapSourceInterval(segments,.4,5);
assert.equal(one.start,.4);assert.equal(one.end,3);
const middle=speech.mapSourceInterval(segments,2.2,3.8);
assert.equal(middle,null,'Removed source interval cannot produce a caption');
const second=speech.mapSourceInterval(segments,5,6);
assert.equal(second.start,3);assert.equal(second.end,4);
const utterance=speech.estimateUtterance('A short spoken phrase',5.5,4.1,8,segments);
assert.ok(utterance&&utterance.start>=2&&utterance.end<=6);
assert.equal(utterance.text,'A short spoken phrase');
assert.equal(speech.estimateUtterance('',3,0,8,segments),null);
const html=fs.readFileSync(path.join(__dirname,'..','clip-studio.html'),'utf8');
assert.ok(html.includes('caption-speech-v072.js'));
for(const id of ['cc-transcribe','cc-install-pack','cc-cancel-transcribe','cc-asr-progress','cc-lang'])
 assert.ok(html.includes('id="'+id+'"'),'Speech UI missing '+id);
assert.ok(html.indexOf('caption-speech-v072.js')<html.indexOf('caption-studio-v072.js'));
assert.ok(source.includes('recognition.processLocally=true'),'Local requirement must be explicit');
assert.ok(source.includes('recognition.start(track)'),'Speech input must be audio track, never microphone default');
assert.ok(!/recognition\.start\(\)/.test(source),'Do not call mic-capturing recognition.start()');
assert.ok(!/fetch\(|XMLHttpRequest|remoteTranscription|apiKey/.test(source),
 'Transcription layer must not send audio to a cloud endpoint');
(async()=>{
 assert.equal(await speech.availability('en-US'),'available');
 assert.equal(await speech.install('en-US'),true);
 console.log('PASS: fail-closed local recognition gating, source-to-sequence cue estimate, language install and no-remote policy');
})().catch(e=>{console.error(e);process.exitCode=1});
