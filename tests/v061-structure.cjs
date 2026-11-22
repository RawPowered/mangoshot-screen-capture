const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'clip-studio.html'),'utf8'),
 css=fs.readFileSync(path.join(root,'studio-v061.css'),'utf8'),editor=fs.readFileSync(path.join(root,'clip-studio.js'),'utf8');
for(const id of ['v061-export-menu','v061-export-dialog','v061-zoom-add','v061-zoom-reset','v061-voice-start','v061-voice-stop','v061-voice-download','v061-voice-track','v061-zoom-track'])assert.ok(html.includes('id="'+id+'"'),'Missing control '+id);
for(const js of ['creative-zoom.js','voiceover.js','creative-studio-ui.js','studio-v061.css'])assert.ok(html.includes(js),'Missing dependency '+js);
assert.ok(html.includes('>PROPERTIES <span')&&!html.includes('EXPORT & PROPERTIES'),'Export must be separate from Properties');
assert.ok(html.includes('File</summary>')&&html.includes('Export / Render…'),'File menu must expose Export');
assert.ok(editor.includes('MangoCreativeZoom.draw('),'Camera must render on exported frames');
assert.ok(editor.includes('voiceExport?.sync?.(output,true)'),'Voiceover must mix against sequence output time');
assert.ok(editor.includes('export aborted rather than dropping narration'),'Must fail closed when audio unavailable');
assert.ok(css.includes('--mango-aspect')&&css.includes('object-fit:fill'),'Monitor aspect ratio and graphic overlay must match');
console.log('PASS: File Export modal, Properties inspector, camera and voiceover studio integration');