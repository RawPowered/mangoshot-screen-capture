const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const theme=read('theme-carbon-v078.css'),defs=new Set([...theme.matchAll(/(--carbon-[\w-]+)\s*:/g)].map(m=>m[1]));
assert.match(theme,/--carbon-accent:#b7ff3c/);assert.match(theme,/--carbon-panel:#1c2126/);
for(const page of ['editor.html','clip-studio.html','recorder.html','popup.html','capture-result.html','resources.html']){
 const links=[...read(page).matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map(m=>m[1]);
 assert.equal(links.at(-1),'theme-carbon-v078.css',page+' must load Carbon last');
 for(const link of links){for(const m of read(link).matchAll(/var\((--carbon-[\w-]+)/g))assert.ok(defs.has(m[1]),link+' undefined '+m[1]);}
}
const declarations=theme.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!/(?:^|[;{])\s*(?:z-index|position|display|overflow|pointer-events|filter|mix-blend-mode)\s*:/.test(declarations),'Carbon must not change overlay/layout/media behavior');
const manifest=JSON.parse(read('manifest.json'));assert.equal(manifest.version_name,'0.7.9 Creative Foundation preview');assert.deepEqual(manifest.permissions,['activeTab','scripting','clipboardWrite','nativeMessaging']);
assert.ok(!manifest.host_permissions&&!manifest.externally_connectable);
assert.match(read('image-studio-v0613.css'),/data-fx-preset=neon[^{}]*\{[^{}]*#adfb6c/,'Preserve content-facing neon style example');
console.log('Carbon token resolution, stylesheet order, unchanged permission surface, overlay contract and preset retention passed');
