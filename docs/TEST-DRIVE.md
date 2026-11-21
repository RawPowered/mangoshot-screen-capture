# MangoShot v0.3.2 test drive — Windows / Wacom

Install v0.3.2 into Chrome, Edge and Firefox as a new unpacked/temporary extension. Retain v0.2.1 ZIP as rollback. Test only on a regular HTTP(S) tab where you control the content; Chrome/Firefox internal pages are protected.

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

## v0.3.2 targeted regression test

1. Begin recording a browser tab in Edge/Firefox. Before, Ctrl+wheel changed only exported framing; now zooming must **visibly enlarge the live preview** and change the percent readout. Test **Zoom +**, **Zoom −**, **Zoom region** with Wacom pen drag, **Reset zoom**, then Ctrl+wheel and Ctrl+drag.
2. While Interaction is ON, verify linked-tab wheel scrolling still works. Zoom region should temporarily override the interaction pointer overlay, without changing source-page scroll unexpectedly.
3. Make a 5-second recording with pen annotations and zoom, stop, save original, and confirm the exported pixels show the same zoom seen live.
4. Open the user's 1:42.21 MP4 in Clip Studio. Above the timeline it should say **Source container: MP4**. With no edits, click **Save MP4 (instant)**: the download should begin immediately without a progress bar, with no audio/video quality loss. **Save original** works regardless of edit decisions.
5. On that MP4 source, **Convert & export WebM** must explicitly show a conversion and the progress bar may run for around the kept timeline duration (rather than instantly). Inspect its actual codec/container afterward.
6. Apply a 2–4-second trim, export MP4: this needs real-time encoding and progress. Undo/reset fully and check whether the untouched matching-format fast copy returns.
7. Verify the unmodified 0.2.1 screenshot workflow (visible/full capture, Wacom ink, PDF/PNG) after updating the extension.

**Remaining constraints:** Browser-reserved Ctrl shortcuts can override the app; clickable Zoom buttons are the fallback. Recording a screen/window does not grant unrestricted remote interaction. Actual pen and captured surface tests remain pending for this build.

## v0.3.2 critical acceptance (do before a long recording)

1. Record a 20-second clip and click **Stop**. Screen-sharing indicator, timer and live draw loop should cease promptly; a native original download should start after encoding completes. Play the downloaded file and confirm audio/video.
2. Start another clip and close the recorder tab while recording. Reopen MangoShot to check the recovery banner; **Recover stored video** may reconstruct flushed fragments, but validate playback: incomplete MP4 metadata may not be usable.
3. Hold **Ctrl** and Wacom-drag **upward** 100px to zoom in smoothly, **downward** to zoom out. The live preview and saved video must match.
4. Click **Zoom region**, draw a rectangle and visually confirm a bright dashed border appears *during* the stroke before framing the selected area.
5. Make 60 marks, then press **Ctrl+Z** at least 50 times; each press should remove one mark. Clear with **Ctrl+E**, then Ctrl+Z to restore.
6. Share a browser **tab** (not the entire screen), click **Enable tab scrolling** to grant browser permission, hold **Ctrl+Alt** while scrolling the preview; the actual captured tab should scroll. On Firefox, check linked-tab consent instead. Release Ctrl+Alt to annotate.
7. Re-run an ordinary visible/full-page screenshot with PNG/PDF and one Clip Studio unedited MP4 export, checking for regressions.

**Known constraints:** MediaRecorder shutdown can still be delayed by browser/platform encoders, although capture resources stop immediately and recovery is exposed. Captured Surface Control supports wheel scrolling rather than remote clicks or typing. Firefox's fallback requires the user to confirm the linked source tab; sharing an entire monitor does not permit remote interaction with arbitrary windows.

## v0.4 Studio acceptance run

1. Make three 15-second recordings in sequence, verify the browser stops sharing immediately after Stop and that each downloaded file independently plays. Repeat one with MP4 if native encoder available and one with microphone denied. If a session is incomplete, use Recovery Library to select it instead of replacing the latest recording.
2. Test Zoom Region repeatedly without reselecting it: it should stay active and the visible marquee should appear. Press Esc to cancel selection, use Reset Camera to return to 100%, and test Wacom Ctrl+drag upward/downward.
3. Hold Ctrl+Alt over a consented linked browser tab and scroll. Confirm releasing the modifier returns to pen/annotation. Actual mouse clicking and typing remain on the source tab.
4. In Clip Studio, generate thumbnails, click on ruler, add a marker, split at the playhead, drag trim handles inward, undo, and export. Check source audio and actual container format. Try optional waveform analysis; failure must be explained rather than silently fabricated.
5. Capture visible and long full pages; annotate in Image Studio. Undo/Redo multiple strokes and a Clear operation. Export PNG and multipage PDF. Inspect the files.
6. Check UI at desktop 1366×768, 1440×900, 1920×1080 and a narrow browser window. No overlapping tools or concealed Stop/Reset Camera buttons are acceptable.

The automated tests can be run with Node 22 using the loop in the v0.4 release-gate document. A browser policy blocks headless local extension navigation in the authoring environment, so the live OS-level acceptance remains manual.

## v0.5 Layered Clip Studio test-drive

1. Open a short WebM/MP4 recording. Choose **Razor (C)** and click V1 twice to split clips; use Select (V), ruler seeking, and Ctrl+K at the playhead.
2. Set In/Out values and press **Ripple delete** / Alt+Backspace. Confirm the gap closes and the remaining sequence duration decreases. Undo with Ctrl+Z.
3. Add Text on G2 and Callout on G3, adjust In/Out, text content, position, custom color/background/outline, pointer, opacity, fades and presets. Confirm G3 appears above G2. Try visibility, lock, duplicate, bring forward and send backward.
4. Drag a selected graphic within the preview. Confirm the preview and output WebM show the same placement and the exported file contains audio where supported.
5. Save a JSON editing project. Delete one graphic; re-import the JSON with the same source file and confirm restored graphics, cuts and markers. Confirm a mismatched video is rejected.
6. With no edits or visible graphics, save the matching original format instantly. With visible graphics, export is labeled conversion/re-encoding. Verify actual container codec in a media player.
7. Re-test screenshots, Wacom ink, browser-tab recording, and multiple consecutive recordings to guard the working v0.4 baseline.

Known limitations: G2/G3 are *graphics* layers, not separate video imports; frame-accurate sample editing and offline universal MP4 are later work. Browser permissions, native codecs and full-screen remote interaction remain unchanged from v0.4.

## v0.5.1 interaction + workspace field test

1. Start recording from an ordinary HTTP(S) page. Pick a monitor in the browser dialog. The recorder must identify **ENTIRE SCREEN**, explain the mirror effect, and leave remote-click actions disabled/unpromised.
2. Click **Go to linked source tab**. The original page should activate without ending the recording. The linked tab may differ from the surface selected in the capture dialog.
3. If Chrome/Edge captures a browser **tab**, click **Enable captured-tab wheel control** and test wheel motion over the whole preview. Click again to disable it. Wheel forwarding is opt-in and may occur without a modifier while enabled.
4. On Firefox, select the checkbox for the explicit linked-tab fallback and hold Ctrl+Alt while scrolling over the preview; verify the linked source page scrolls (not arbitrary monitor clicks/typing).
5. In Clip Studio, import a source and switch between **Edit / Graphics / Timeline** layouts; test Shift+1/2/3 and layout persistence. Click **+ Title** and **+ Callout** in the timeline toolbar and verify editable G2/G3 layers.
6. Check recorder stop, recovery, Wacom zoom and undo, screenshot PNG/PDF, Razor/ripple, overlays, native MP4/WebM export, and 3 consecutive recordings.

These changes are not a desktop-wide remote-control system. Supported captured-tab wheel forwarding is experimental and not universal across browser versions.

## v0.5.2 targeted regression steps

1. Record session A and session B. Stop B, choose **Edit in Clip Studio**. Confirm the opened duration/frames match B, not A. Keep a prior Clip Studio tab open to test concurrent sessions.
2. Import the supplied 4:04 MP4. Move the playhead by dragging the ruler and the gold playhead handle, then wheel over the ruler to seek. Zoom to 3x and drag near either viewport edge to auto-pan.
3. Set In=00:00:40 and Out=00:00:50, click Ripple Delete. Expected: duration shortens 10 seconds; V1 fragments shift; undo restores it. Repeat after generating thumbnails.
4. Add Razor cuts, generate thumbnails, then split/ripple again. All edit buttons remain responsive; thumbnail generation must not block them.
5. Click Analyze waveform on this MP4: it contains **no audio stream**, so a useful unavailable-audio message should appear, not a fake waveform. Test a different file with genuine audio.
6. Record a browser tab: native captured-tab scroll may prompt for permission when Enable captured-tab wheel control is clicked. Entire-screen/window recording does not have that permission flow; use the actual source window or consented linked-tab fallback.
7. Confirm screenshot PNG/PDF, Wacom tools, recorder Stop, clip export and project JSON still work.

## v0.5.3 graphical layer timeline gestures

- Load a source video and add a Text layer. Drag its blue G2 clip to 00:15, then grab the left/right light-colored trim handles to extend or shorten the visible interval. Inspector In/Out and Duration must update after release.
- Drag it vertically to G3: the target lane is highlighted, and the text moves to the new track. Add another overlapping layer and confirm G3 draws above G2.
- Drag the ⠿ handle in the Graphics / Layers panel to place a layer above another; alternatively use Bring Forward/Send Back. Both changes must be undoable and preserved in a saved JSON project.
- Drag text over the Program Monitor with mouse or Wacom pen. Drag its lower-right square to resize width and font size. The selection outline must be absent in the exported video.
- Enable Snap and move near another layer edge or playhead; hold Alt during drag to bypass. Test Arrow Left/Right nudging with a focused clip.
- Confirm recorded MP4/WebM source is not overwritten; when video is unchanged except graphics, use a normal encode rather than claiming an instant original save.

## v0.5.5 AutoCut quick test

1. Import an audible video containing two deliberate 2–3 second pauses. Click ⚡ AutoCut → Silence, adjust min 1.2 s / padding 0.18 s / threshold -38 dB, click Analyze. Confirm red marks cover quiet intervals, not spoken words.
2. Uncheck one suggestion. Ripple-delete the others. Confirm V1 closes without gaps, G2/G3 graphics and markers ripple, one Ctrl+Z restores all cuts, and redo re-applies them.
3. Repeat after manually cutting the source with Razor. AutoCut suggestions must map into retained sequence time, not removed source time.
4. For no-audio footage, choose Still screen, min duration 3 s. Review suggested idle periods; this mode must not silently delete a stationary but meaningful webpage.
5. Test Apply with selected graphic protection on/off, change settings after analysis (old suggestions must disappear), cancel analysis, and import another file (stale candidates must disappear).
6. Export edited WebM or MP4 where native encoders support it, then verify duration, audio playback and last frame. No universal offline MP4 transcoder is bundled.
