const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,'0.6.6');
assert.deepEqual(manifest.permissions,['activeTab','scripting']);
assert.equal(manifest.background.service_worker,'background.js');
assert.deepEqual(manifest.background.scripts,['capture-store.js','background.js']);
for(const file of ['capture-store.js','background.js','content.js','popup.js','editor.js','pdf-export.js','recording-safety.js','recorder.js','linked-tab.js','camera.js','clip-timeline.js','clip-store.js','media-format.js','clip-studio.js','sequence-media.js','sequence-preview.js','clip-timeline-ui.js','clip-edit-ops.js','clip-graphics.js','sequence-operations.js','auto-cut.js','auto-cut-analysis.js','auto-cut-ui.js','clip-graphics-ui.js','layer-timeline-ops.js','clip-project.js','studio-workspaces.js','media-assets.js','project-v2.js','clip-media-bin.js','clip-workspace-ui.js','creative-zoom.js','voiceover.js','creative-studio-ui.js','clip-workspace-v062.js','zoom-hud-v063.js','type-hud-v063.js','visual-controls-v064.js','media-dock-v065.js','tool-icons-v065.js','keyboard-shortcuts-v065.js','workspace-resize-v066.js','preset-pack-v066.js','polish-icons-v066.js']){
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
