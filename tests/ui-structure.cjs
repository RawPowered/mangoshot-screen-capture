/* Ensure every professional workspace has unique IDs, valid major controls and assets. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const specs={
 'recorder.html':['start','stop','pause','record-state','screen-wrap','ink','live-composite','zoomRegion','resetZoom','recovery-select','result','enable-scroll','source-surface','source-guidance','source-focus'],
 'clip-studio.html':['video','timeline','timeline-ruler','timeline-playhead','make-thumbnails','split','add-marker','export-webm','export-mp4','save-original','workspace-status','quick-text','quick-callout'],
 'editor.html':['base','ink','workspace','stroke-list','undo','redo','clear','png','pdf','tool','zoom']
};
for(const [file,ids] of Object.entries(specs)){
 const text=fs.readFileSync(path.join(root,file),'utf8');const found=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(found).size,found.length,'Duplicate IDs in '+file);
 for(const id of ids){
  assert.ok(found.includes(id),'Missing #'+id+' in '+file);
 }
 assert.match(text,/studio\.css/,'Workspace missing design system: '+file);
 for(const script of [...text.matchAll(/<script\s+src="([^"]+)"/g)])
  assert.ok(fs.existsSync(path.join(root,script[1])),'Missing referenced script '+script[1]);
}
const style=fs.readFileSync(path.join(root,'studio.css'),'utf8');
assert.match(style,/recovery-banner\[hidden\].*recording-result\[hidden\]/,'Hidden recovery/result cards must remain hidden');
assert.match(style,/@media\(max-width:680px\)/,'Mobile layout breakpoint missing');
console.log('PASS: unique IDs, referenced controls, script assets, hidden panels and responsive Studio CSS');
