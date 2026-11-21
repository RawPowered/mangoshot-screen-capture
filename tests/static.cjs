const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,'0.5.0');
assert.deepEqual(manifest.permissions,['activeTab','scripting']);
assert.equal(manifest.background.service_worker,'background.js');
assert.deepEqual(manifest.background.scripts,['background.js']);
for(const file of ['background.js','content.js','popup.js','editor.js','pdf-export.js','recording-safety.js','recorder.js','linked-tab.js','camera.js','clip-timeline.js','clip-store.js','media-format.js','clip-studio.js','clip-timeline-ui.js','clip-edit-ops.js','clip-graphics.js','clip-graphics-ui.js','clip-project.js']){
 new vm.Script(read(file),{filename:file});console.log('Syntax OK:',file);
}
for(const html of ['editor.html','popup.html','recorder.html','clip-studio.html']){
 if(html!=='popup.html')assert.match(read(html),/studio.css/,'Missing professional workspace stylesheet');
 const htmlText=read(html);
 for(const script of [...htmlText.matchAll(/<script\s+src="([^"]+)"/g)])
  assert.ok(fs.existsSync(path.join(root,script[1])),'Missing '+script[1]);
}
for(const icon of Object.values(manifest.icons))assert.ok(fs.statSync(path.join(root,icon)).size>0);
console.log('PASS: manifest, scripts, icon references');
