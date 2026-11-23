const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'clip-studio.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate IDs make Studio tools unpredictable');
for(const id of ['v06-media-input','v06-asset-list','v06-media-note','v06-asset-preview','v06-stage-asset',
  'v06-save-project','v06-open-project','v06-restore-project','v06-staged-list','v06-relink-asset','v06-relink-input'])
 assert.ok(ids.includes(id),'Missing real media-bin UI #'+id);
for(const name of ['media-assets.js','project-v2.js','clip-media-bin.js','clip-workspace-ui.js','studio-v06.css'])
 assert.ok(html.includes(name),'Missing v0.6 script/style '+name);
assert.ok(html.indexOf('media-assets.js')<html.indexOf('clip-media-bin.js'));
assert.ok(html.indexOf('project-v2.js')<html.indexOf('clip-media-bin.js'));
assert.ok(html.indexOf('clip-studio.js')<html.indexOf('clip-media-bin.js'));
for(const id of ['timeline','video','file','add-text','add-callout','ripple-delete','autocut-toggle','export-webm','export-mp4'])
 assert.ok(ids.includes(id),'Legacy editor control lost: '+id);
for(const selector of ['v06-menu-bar','v06-rail','v06-asset','v06-preview-media','v06-divider'])
 assert.ok(fs.readFileSync(path.join(root,'studio-v06.css'),'utf8').includes(selector),'Missing workspace design '+selector);
assert.ok(html.includes('Secondary assets are staged'),'UI must not promise secondary media is rendered');
console.log('PASS: v0.6 workspace controls, script order, legacy tool preservation and staging transparency');
