# MangoShot v0.3.0 test drive — Windows / Wacom

Install v0.3.0 into Chrome, Edge and Firefox as a new unpacked/temporary extension. Retain v0.2.1 ZIP as rollback. Test only on a regular HTTP(S) tab where you control the content; Chrome/Firefox internal pages are protected.

## 1. Regression baseline

1. Capture a visible webpage; expect **one frame**, a fully rendered image and enabled PNG/PDF buttons.
2. Capture a tall page; expect correct stitch order, restored scroll position, and nonblank exports.
3. Draw, use Wacom pressure, clear, undo, save PNG and multi-page PDF. Inspect outputs.
4. If the editor shows `Frame 2 / 1`, `Missing screenshot frames`, or blank canvas, stop: screenshot regression.

## 2. Recording, zoom and interaction

1. Navigate to a safe website with a long page and launch **Record screen/audio** from that tab.
2. Select the **same browser tab** from the system screen-picker; record with microphone unchecked first.
3. Use Wacom ink on the preview. Press **Ctrl+E** while recorder is focused and verify it clears.
4. Hold **Ctrl** and wheel over the preview to zoom; this should visibly zoom the recording preview's captured content, with a `%` readout.
5. Hold Ctrl and drag a rectangle to zoom into a subsection. Press **Ctrl+Alt+0** or Reset zoom; expect 100% framing.
6. Press **Ctrl+Alt+C** or click Interaction. On Chrome/Edge, scroll over the preview and confirm the selected captured browser tab scrolls. If browser blocks the shortcut, use the toolbar toggle.
7. For Firefox, check **I selected the tab I launched from** to explicitly allow scrolling the linked tab; toggle Interaction ON and wheel over the preview. If permission is unavailable, return to the source tab and scroll directly.
8. Stop recording and choose **Save original**. Confirm video plays, ink and camera zoom are burned into pixels, audio if selected, and file extension matches actual MIME type.
9. Try microphone enabled and denied; video must still complete.

**Expected boundary:** Browser preview cannot reliably deliver trusted click or text events into remote windows/apps. Shortcut key presses require recorder focus; global desktop input needs a native companion. Interaction ON is scrolling, not remote full control.

## 3. Clip Studio

1. Click **Edit in Clip Studio** after recording; confirm recorded video loads locally. Also test **Open video file** with an existing MP4/WebM.
2. Choose In=2s and Out=4s; press **Cut selection**. Expect two retained segments and shortened total duration.
3. Undo, trim to 2–4s, reset, and preview the edited sequence. Check that source file remains unchanged.
4. Export WebM, inspect playback and audio continuity. Cuts have hard boundaries and can be approximate by a frame.
5. In a browser with native MP4 recording support, press **Convert & export MP4**. Verify the downloaded file is genuine MP4 by opening it in a media player. In browsers without native MP4 support, the button should be disabled, not generate mislabeled files.
6. Choose **Forget stored recording** and verify the local last-clip transfer no longer loads.

## 4. Known release blockers

- No real-browser cross-platform validation was available within the authoring container; check each device/browser.
- Native MP4 encoding is not cross-browser; browser-independent WASM conversion remains future work.
- Long recordings and exports consume memory and IndexedDB quota. Test short clips first.
- Audio from browser/system capture depends on the browser, operating system, and source choice.
- MP4 re-encode timing/codec and WebM indefinite-duration metadata require practical media-file validation.
- Pressing Ctrl+E / Ctrl+Alt combinations may be intercepted by some browser shortcuts; visible buttons are fallback.
- No global desktop-wide remote interaction; no OS-wide Wacom overlay.

If a feature fails, capture the browser and version, source type (tab/window/screen), exact action, MangoShot status text, and browser console error. Do not report an interaction as certified from static tests alone.
