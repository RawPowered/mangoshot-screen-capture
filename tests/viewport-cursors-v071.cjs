/* MangoShot v0.7.1 Patch B.1 — viewport, compact tool grouping, cursor regression. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');
const ctx={};vm.runInNewContext(read('precision-cursors-v071.js'),{globalThis:ctx,document:undefined});
const cursors=ctx.MangoPrecisionCursorsV071;
assert.ok(cursors,'Precision cursor core is exposed');
const tools=['select','pen','highlighter','erase-brush','erase-stroke','rectangle','rounded-rectangle',
 'ellipse','line','arrow','triangle','diamond','pentagon','hexagon','star','speech-bubble',
 'redact','text','mask-erase','mask-restore','razor','range'];
for(const tool of tools){
 const a=cursors.cursorSVG(tool,10),b=cursors.forTool(tool,10);
 assert.match(a.svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
 assert.match(a.svg,/width="32" height="32"/);
 assert.ok(a.x>=0&&a.x<32&&a.y>=0&&a.y<32,'Cursor hotspot out of bounds: '+tool);
 assert.ok(!/<script|javascript:|<image|https?:/i.test(a.svg.replace('http://www.w3.org/2000/svg','')));
 assert.ok(b.includes('data:image/svg+xml,'),'SVG data cursor missing: '+tool);
 assert.ok(b.endsWith(a.fallback),'Cursor fallback missing: '+tool);
}
assert.equal(cursors.cursorSVG('select').x,3);
assert.equal(cursors.cursorSVG('select').y,2);
assert.equal(cursors.cursorSVG('pen').x,5);
assert.equal(cursors.cursorSVG('pen').y,27);
assert.equal(cursors.cursorSVG('erase-brush',0).x,16);
assert.equal(cursors.cursorSVG('erase-brush',0).y,16);
assert.ok(cursors.cursorSVG('erase-brush',300).svg.includes('r="13"'),'Large erasers must cap visible circle');
assert.ok(cursors.forTool('mask-restore').includes('%3Csvg'));
const css=read('studio-viewport-v071.css');
for(const marker of ['height:100dvh','overflow:hidden!important','overscroll-behavior:none',
 'body.studio-image .image-layout .workspace','body.studio-image .image-inspector-page',
 'body.studio-image .v071-tool-flyout','body.studio-image #ink','body.studio-clip #timeline',
 '.v070-fields::-webkit-scrollbar']){
 assert.ok(css.includes(marker),'No-scroll/precision stylesheet lacks '+marker);
}
assert.ok(/\.image-layout \.workspace\{[\s\S]*?overflow:hidden!important/.test(css));
assert.ok(/\.image-inspector-page\{[^}]*overflow-y:auto/.test(css));
const groups=read('image-tool-groups-v071.js');
for(const id of ['select','pen','highlighter','erase-brush','erase-stroke','rectangle','rounded-rectangle',
 'ellipse','line','star','mask-erase','mask-restore','text','redact']){
 assert.ok(groups.includes("'"+id+"'"),'Tool missing from compact flyout registry: '+id);
}
assert.match(groups,/existing\.click\(\)/,'Original tool handlers must remain authoritative');
assert.match(groups,/event\.key==='Escape'/,'Flyouts must support Escape');
assert.match(groups,/event\.key==='ArrowDown'/,'Flyouts must support keyboard navigation');
const navigation=read('image-canvas-viewport-v071.js');
for(const marker of ['pointerdown','pointermove','pointerup','pointercancel','setPointerCapture',
 'stopImmediatePropagation','event.button===1','space&&event.button===0','Alt + wheel']){
 assert.ok(navigation.includes(marker),'Canvas navigation missing '+marker);
}
assert.ok(/availableHeight\/base\.height/.test(read('editor.js')),'Fit must account for image height');
for(const html of ['editor.html','clip-studio.html']){
 const page=read(html);
 assert.ok(page.includes('studio-viewport-v071.css'),'Viewport CSS not loaded: '+html);
 assert.ok(page.includes('precision-cursors-v071.js'),'Precision cursors not loaded: '+html);
 assert.ok(page.indexOf('studio-viewport-v071.css')>page.indexOf('studio-professional-v070.css'));
}
const imageHtml=read('editor.html');
assert.ok(imageHtml.includes('image-tool-groups-v071.js'));
assert.ok(imageHtml.includes('image-canvas-viewport-v071.js'));
for(const file of ['studio-viewport-v071.css','precision-cursors-v071.js',
 'image-tool-groups-v071.js','image-canvas-viewport-v071.js'])
 assert.ok(fs.existsSync(path.join(root,file)),'Missing B.1 asset '+file);
console.log('PASS: local cursor hotspots, grouped tools, no-scroll viewport contracts, pan/zoom wiring');
