const assert=require('node:assert/strict');require('../compositor-core-v0714.js');const M=require('../multitrack-core-v0716.js');
const assets=[{id:'img',kind:'image',name:'logo.png',mime:'image/png',size:100},{id:'vid',kind:'video',name:'clip.webm',mime:'video/webm',size:100,duration:5},{id:'aud',kind:'audio',name:'track.wav',mime:'audio/wav',size:100,duration:8}];
const m=M.defaults(),i={...M.make(assets[0],1,8),id:'img1'},v={...M.make(assets[1],2,8,'V3'),id:'vid1'},a={...M.make(assets[2],0,8),id:'aud1'};m.clips=[v,a,i];let checked=M.check(m,assets,8);
assert.deepEqual(checked.clips.map(c=>c.track),['V2','V3','A2']);assert.equal(M.active(checked,2.5).length,3);assert.equal(M.active(checked,0).length,1);assert.ok(M.hasAudio(checked));checked.tracks.A2.muted=true;assert.equal(M.hasAudio(checked),false);assert.equal(M.active(checked,2.5).length,2);
assert.throws(()=>M.check({...m,clips:[i,{...i,id:'overlap',start:1.5,end:4.5}]},assets,8),/overlap/);assert.throws(()=>M.check({...m,clips:[{...v,track:'A2'}]},assets,8),/Audio uses/);assert.throws(()=>M.check({...m,clips:[{...a,end:9,sourceOut:9}]},assets,8),/timing/);
const d=M.dimensions(1920,1080,150);assert.ok(d.w*d.h*4*150<=M.MAX_RASTER);assert.deepEqual(M.fitRect(200,100,100,100,'contain'),{x:0,y:25,w:100,h:50});
console.log('Multitrack track order, overlap, mute, timing, fit and raster validation passed');
