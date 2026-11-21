# 🥭 MangoShot

Ad-free, local-first screenshot, Wacom annotation, and screen-recording extension for **Chrome, Microsoft Edge and Firefox**.

**v0.3.2 · recording-interaction and Clip Studio test-drive candidate.** No analytics, accounts, or video uploads. Keep using the previous v0.2.1 ZIP as your known-working fallback until you finish v0.3 validation.

## Installation

Extract `MangoShot-v0.3.2-test-drive.zip` before loading it. In Chrome/Edge, open extensions, enable Developer mode, choose **Load unpacked** and select the folder containing `manifest.json`. In Firefox, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json`. For clean tests, remove or disable the older unpacked MangoShot first.

## Recording interactions

Launch the recorder using MangoShot from the normal HTTP(S) tab you want to record. Start recording and select that browser tab in the **browser's screen-sharing picker**. The recorder includes live Wacom ink and a virtual zoom camera which becomes part of the recording, not part of the actual webpage.

| Shortcut (while recorder is focused) | Action |
|---|---|
| **Ctrl + E** | Clear live ink |
| **Ctrl + Alt + C** | Toggle interaction vs drawing mode |
| **Hold Ctrl + wheel** | Zoom recorded output around cursor, up to 600% |
| **Hold Ctrl + drag** | Draw an area to zoom into |
| **Ctrl + Alt + 0** | Reset virtual-camera zoom to 100% |

The toolbar has equivalent clickable controls for clearing, interaction, and reset. Shortcut delivery depends on the browser; its reserved shortcuts always win. **These are focused-recorder shortcuts, not global system hotkeys.** In particular, browser-wide extension `commands` cannot register Ctrl+Alt combinations in Chromium because of AltGr restrictions.

### Interacting with a captured browser tab

- **Chrome / Edge:** With Interaction ON, the Captured Surface Control API can forward ordinary wheel scrolling from the recorded browser tab preview to the *actual captured tab*, subject to explicit browser permission. This does **not** synthesize arbitrary clicks, forms, or keyboard input. For those actions, use the actual captured tab.
- **Firefox fallback:** When you launched MangoShot from the **same** HTTP(S) tab you selected in the picker, tick the **linked-tab consent** checkbox. Interaction ON then forwards wheel scrolling to that explicitly linked tab. It can target nested scrolling containers. This is not a general-purpose remote-control mechanism and does not identify a selected tab automatically.
- **Screens and windows:** Virtual-camera zoom works on any screen/window recording, but tab scrolling only applies to supported captured tabs or the explicitly linked source tab.
- **Wacom:** Normal pen movement draws into a separate ink canvas. Hold Ctrl to zoom or select a zoom region instead of drawing. Clear ink at any time with Ctrl+E.

## Post-recording Clip Studio

After pressing **Stop**, choose **Edit in Clip Studio** to keep a local copy of the last recording (IndexedDB) and open the editor. Alternatively, save the original or discard it. You can also open an existing local MP4/WebM from **Open Clip Studio** in MangoShot's popup.

1. Load a video, scrub, and mark In and Out at the current playhead.
2. **Trim to selection** to keep only that section, or **Cut selection** to remove the interior, preserving the rest.
3. Undo or reset edits. Multiple retained segments are listed separately and joined when exported.
4. Preview the retained sequence, then **Export WebM** or **Convert & export MP4** when the browser's native MP4 encoder is available.

Exports are **real-time local re-encodes** (a 60-second selected duration typically takes about 60 seconds to encode). Audio is passed through where the browser supports it. Cut points are approximate to the nearest decoded frame; transitions are hard cuts. The original file is never overwritten. The last recording remains locally stored until you choose **Forget stored recording** or clear extension site data.

### MP4 format limitation

The editor truly re-encodes into **MP4** only if `MediaRecorder.isTypeSupported('video/mp4')` reports an available native encoder. It does **not** simply rename a WebM to MP4. Firefox and other browsers without a usable MP4 encoder will offer WebM editing/export but keep the MP4 button disabled. Universal offline MP4 transcoding would require a packaged FFmpeg/WebAssembly engine; that is a **separate unfinished milestone**, not represented here as complete. You can convert exported WebM to MP4 in an external FFmpeg installation until the internal engine is packaged.

## Screenshot features (preserved)

Visible-area and vertically stitched full-page PNG capture, Wacom-compatible drawing, highlighter, arrows, rectangles, text, opaque redaction, undo/clear, and direct multi-page A4 PDF export. Full-page capture is limited to regular HTTP(S) pages and has normal scroll-stitching limitations (infinite scroll, transformed/sticky content and embedded frames).

## Validation

Run `node tests/static.cjs`, `node tests/routing.cjs`, `node tests/editor-protocol.cjs`, `node tests/timeline-camera.cjs`, `node tests/recorder-controls.cjs`, `node tests/clip-studio-mock.cjs`, and `node tests/pdf.cjs` from the root. These verify code structure and simulated behavior; **not** actual Firefox/Edge/Chrome screen-selection and codec support.

See `docs/TEST-DRIVE.md` and `docs/ARCHITECTURE.md` for risk notes and stepwise manual validation. No browser-store release certification has been performed.

## License

Copyright © 2026 RawPowered. All rights reserved pending a separate license decision.

## v0.3.2 zoom and export fix

- The recorded video composition is now also displayed **live**. Zoom via Ctrl+wheel, Ctrl+drag, the dedicated **Zoom + / Zoom −** buttons, or the **Zoom region** button for Wacom pen selection. Use Reset zoom at any time. This addresses the v0.3 visual feedback defect without changing captured-tab scrolling.
- The Clip Studio determines the **real container** from the first bytes, not the file extension. The format appears above the timeline.
- **Save original (instant)** saves the original video without conversion. If the timeline is unchanged and the requested export matches the source container, **Save MP4 (instant)** or **Save WebM (instant)** skips the full timeline re-encode. The original bytes are copied locally.
- Exporting MP4 footage **as WebM** is still a format conversion, and exporting *edited* footage still requires re-encoding. These actions are labeled **Convert & export** and generally proceed at playback speed. No native FFmpeg/WASM codec was added.
- Verification: static/simulated recorder, timeline, and file-header tests passed. Actual browser screen-share, pen and codec playback remain the user's on-device release gate.

## v0.3.2 — Stop reliability, Wacom dolly and undo

**Recording stop:** Clicking Stop immediately halts the canvas drawing loop, screen/audio tracks and elapsed timer, before waiting for `MediaRecorder` to finish encoding. Completed video is automatically downloaded as the unchanged original. A watchdog makes already-flushed fragments available when the encoder stalls instead of showing an endless "Finalizing" state. A late final encoder event upgrades the result and downloads the complete recording. **Interrupted MP4 fragments may be unplayable** without final container metadata.

**Crash/close protection:** Each emitted recording chunk is independently persisted in IndexedDB under a recovery session. On the next launch, use **Recover stored video** to reconstruct and download available chunks. Browser storage quotas and shutdown timing mean this is best-effort recovery, not a guarantee of a playable file. Do not rely on it as your only copy; confirm the automatic download after Stop.

**Controls:** Hold **Ctrl+Alt** over the recorder preview for browser-tab scroll interaction (only where browser APIs or explicit linked-tab consent permit it); release to return to annotation. **Ctrl+drag upward** zooms in, **downward** zooms out with an anchored focal point. The **Zoom region** button activates a visible bright dashed marquee; select a rectangular area using the pen or mouse. **Ctrl+Z** undoes the last mark or clear action with **80 history steps**. Ctrl+E clears ink and Ctrl+Alt+0 resets zoom.

**Browser limitations:** The captured-surface API cannot remote-click or type into arbitrary windows, and direct tab scrolling requires first clicking **Enable tab scrolling** from the recorder UI on supporting Chromium browsers. Full-monitor sharing cannot be remotely scrolled; the explicitly consented *linked source tab* can be scrolled as a fallback. For real clicks and typing, switch to the source tab and interact there.

Source screenshot capture, PNG/PDF export, Clip Studio and MP4/WebM handling are unchanged in this hotfix.
