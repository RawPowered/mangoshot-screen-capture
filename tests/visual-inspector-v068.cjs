/* Visual inspector regression: verifies true controls, focus and compact layout contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('clip-studio.html'),js=read('visual-inspector-v068.js'),css=read('studio-v068.css'),motion=read('motion-ui-v067.js');
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.18');
assert.ok(html.includes('studio-v068.css'),'New stylesheet missing');
assert.ok(html.indexOf('motion-ui-v067.js')>=0&&html.indexOf('motion-ui-v067.js')<html.indexOf('visual-inspector-v068.js'),
 'Compact controls must initialize AFTER native motion event bindings');
assert.ok(motion.includes('inspector.after(clipPanel)'),'Transition section must use reparented inspector parent');
new vm.Script(js,{filename:'visual-inspector-v068.js'});
const required=[
 ['v062-graphics-panel','Core Callouts owner'],['v062-clip-panel','Core Clip owner'],
 ['v063-design-bench','Visual style gallery'],['v063-graphic-form','Real text fields'],
 ['v063-drawers','Original advanced controls'],
 ['MangoMotionUI.sync','Existing motion sync'],
 ['v067-enter-type','Entry select'],['v067-exit-type','Exit select'],
 ['v067-number-type','Numeric select'],['v067-transition-type','Clip transition select'],
 ['v067-number-duration','Exact timer control'],
 ['v067-transition-duration','Exact transition duration'],
 ['MangoWorkspaceV062','Tab activation'],['program-play','Program Monitor playback']
];
for(const [needle,message] of required)assert.ok(js.includes(needle),message+' is missing');
assert.ok(js.includes("new Event('change'"),'Visual controls must dispatch to existing model writers');
assert.ok(js.includes('role'+"'"+",'tablist'")||js.includes("setAttribute('role','tablist')"),'Missing tab semantics');
assert.ok(js.includes("ArrowRight")&&js.includes("ArrowLeft"),'Keyboard tab switching required');
assert.ok(js.includes('transitionAdvanced.hidden=!selectedTransition()'),'Advanced clip controls must obey selection');
assert.ok(js.includes('scroll.scrollTop=0'),'Navigation must not trap users at old scroll position');
assert.ok(js.includes('motionAdvanced.append(entryField)')&&js.includes('numberAdvanced.append(numericField)'),'Do not clone original input controls');
assert.ok(js.includes('view()?.updateLayer(l.id,{motion})'),'Quick number presets must commit to live editor history');
for(const cssRule of ['.v068-main-tabs','.v068-subnav','.v068-effects-grid','.v068-precision','.v068-range',
 'prefers-reduced-motion','.v068-subpanel[hidden]'])assert.ok(css.includes(cssRule),'CSS missing '+cssRule);
assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'Main categories must be a single compact row');
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Effect choices must be compact visual tiles');
console.log('PASS: visual-first inspector, original bound inputs, tab accessibility, compact settings, advanced paths and source wiring');
