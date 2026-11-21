# 🥭 MangoShot

Ad-free, local-first screenshot, Wacom annotation, and screen-recording extension for **Chrome, Microsoft Edge and Firefox**.

**v0.3.1 · recording-interaction and Clip Studio test-drive candidate.** No analytics, accounts, or video uploads. Keep using the previous v0.2.1 ZIP as your known-working fallback until you finish v0.3 validation.

## Installation

Extract `MangoShot-v0.3.1-test-drive.zip` before loading it. In Chrome/Edge, open extensions, enable Developer mode, choose **Load unpacked** and select the folder containing `manifest.json`. In Firefox, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json`. For clean tests, remove or disable the older unpacked MangoShot first.

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

## v0.3.1 — Visible zoom and lossless fast export

- The recorder now uses one visible/recorded composite canvas, so zoom changes appear **during** recording rather than only in the exported video. Available controls: Ctrl+wheel, Ctrl+drag, Zoom +, Zoom −, Zoom region (Wacom-friendly), Reset zoom.
- Clip Studio identifies MP4/WebM from the file signature and displays the source container. With no edits, same-format exports download the **unchanged bytes instantly** without encoding; Save original (instant) works even after edits. Cross-format and edited exports still need real-time re-encoding and clearly say **Convert & export**.
- The earlier source-tab interaction/scrolling and Wacom annotation workflows remain unchanged. MP4 encoding support is browser-specific.
- JavaScript, screenshot protocol, timeline, recorder mock, file-header, no-edit copy, and ZIP integrity tests passed. Real Windows browser zoom/recording remains the installation acceptance gate.
