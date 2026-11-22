/* MangoShot v0.6.10 focused UIX and capture protocol source contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const popup=read('popup.js'),background=read('background.js'),premium=read('premium-ui-v069.js');
const graphic=read('clip-graphics-ui.js'),clip=read('clip-studio.js');
const visual=read('visual-inspector-v068.js'),css=read('studio-v0610.css'),keyboard=read('keyboard-shortcuts-v065.js');
for(const [name,content] of [['popup.js',popup],['background.js',background],['premium-ui-v069.js',premium],
 ['clip-graphics-ui.js',graphic],['clip-studio.js',clip],['visual-inspector-v068.js',visual],
 ['keyboard-shortcuts-v065.js',keyboard]])
 assert.doesNotThrow(()=>new vm.Script(content,{filename:name}),name+' syntax');
assert.ok(background.includes("if(message.type==='MANGO_POPUP_INIT'){"),'Startup handler must exist');
assert.ok(background.includes("return false;"),'Startup must not rely on asynchronous response port');
assert.ok(background.includes("existing.id===message.captureId"),'Uncertain startup response must be idempotent');
assert.ok(popup.includes("windowId:tab.windowId"),'Capture must bind the source browser window');
assert.ok(popup.includes("initializeCapture(tab,id,mode,intent)"),'Popup must use retriable startup handshake');
assert.ok(premium.includes("v0610-quick-add"),'Sticky selected preset actions missing');
assert.ok(premium.includes("v0610-card-add"),'Direct add affordance missing');
assert.ok(premium.includes("button.addEventListener('dblclick'"),'Double-click insertion missing');
assert.ok(premium.includes("layer.fontSize=preset.category==='Titles'?164:135"),'Gallery thumbnails still too small');
assert.ok(premium.includes("function insertPremium()"),'Both insert entrypoints must converge');
assert.ok(visual.includes("v0610-delete-selected"),'Collapsed Layer dock must expose delete');
assert.ok(graphic.includes("layer-remove"),'Per-layer delete button missing');
assert.ok(graphic.includes("current()?.deleteLayer?.(layer.id)"),'Focused graphic timeline Delete missing');
assert.ok(graphic.includes("remove.disabled=disabled||layer.locked"),'Locked layers must be protected');
assert.ok(clip.includes("Unlock this graphic layer before deleting it."),'Locking policy missing');
assert.ok(clip.includes("selectedClipIndex=null;rangeSelected=false;refreshed();label('Premium composition inserted"),'Inserted graphics must clear clip selection');
assert.ok(keyboard.includes("Delete selected graphic or clip"),'Delete shortcut label should reflect behavior');
assert.ok(keyboard.includes("if(id==='rippleAlternate'){st.deleteSelection?.();return true;}"),
 'Explicit clip Ripple Delete alternate must remain distinct');
for(const cls of ['.v0610-card-add','.v0610-quick-add','.layer-remove','.v0610-delete-selected'])
 assert.ok(css.includes(cls),cls+' style not registered');
assert.ok(read('clip-studio.html').includes('studio-v0610.css'),'New style not included in Clip Studio');
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.16');
console.log('PASS: premium one-click insertion, delete controls, selection-aware shortcuts, synchronous full-page capture protocol');
