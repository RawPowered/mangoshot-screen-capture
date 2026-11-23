/* MangoShot v0.6.18 licensed source-distribution and feature-docs contract. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const license=read('LICENSE'),readme=read('README.md'),
 contributing=read('CONTRIBUTING.md'),releases=read('docs/RELEASES.md'),
 notes=read('docs/V0.6.18-COMMUNITY-SOURCE-ALPHA2.md'),
 build=read('tools/package-extension.py'),feed=JSON.parse(read('updates/preview.json'));
const tag='v0.6.18-layers-alpha.2';
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
assert.match(license,/MANGOSHOT COMMUNITY SOURCE-AVAILABLE LICENSE 1\.0/);
assert.match(license,/NO RESALE OR PAID SOFTWARE DISTRIBUTION/);
assert.match(license,/commercial-only, dual-licensed, proprietary, or\s+closed-source/i);
assert.match(license,/does NOT retroactively withdraw/i);
assert.match(license,/rights of compliant downstream recipients/i);
assert.match(readme,/source-available, not OSI-approved open source/i);
assert.match(readme,/resell or charge for access/i);
assert.match(readme,/full scrolling page/i);
assert.match(readme,/Wacom/i);
for(const term of ['Capture','Image Studio','Record Studio','Clip Studio','Resources',
 'Ctrl+C','Alt + drag','Whole Stroke Erase','Layer appearance','AutoCut','timer','LICENSE']){
 assert.ok(readme.toLowerCase().includes(term.toLowerCase()),'README missing feature or term: '+term);
}
for(const policy of ['separate written','contribution','proprietary']){
 assert.ok(contributing.toLowerCase().includes(policy),'Contributor relicensing safeguard missing: '+policy);
}
assert.ok(build.includes("BASE/'LICENSE'"),'Extension archive must include LICENSE');
assert.ok(build.includes("BASE/'README.md'"),'Extension archive must include README');
assert.ok(notes.includes(tag)&&releases.includes(tag)&&readme.includes(tag));
assert.equal(feed.release_tag,tag);
assert.equal(feed.automatic_updates,false);
assert.equal(feed.current_version,'0.6.18');
assert.ok(feed.extension_zip.includes(tag)&&feed.source_zip.includes(tag));
console.log('PASS: matching licensed v0.6.18 alpha.2 source, README feature inventory and release metadata');
