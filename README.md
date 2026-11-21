# 🥭 MangoShot

Local-first screenshot, annotation and screen-recording browser extension for Chrome, Edge and Firefox.

**Status:** v0.1.0 engineering prototype, not browser-certified or store-ready.

## Features in this branch

- User-triggered visible-tab PNG capture
- Scrolling, stitched PNG capture of vertically scrolling HTTP(S) pages (with known limitations)
- Browser-based ink editor, Wacom/Pointer Events pressure, pen/highlighter/eraser, undo and clear
- PNG download, browser Print / Save to PDF
- Screen/window/tab recording with ink drawn into the exported video
- Microphone and browser-provided shared audio mixing
- Native MP4 where supported, with honest WebM fallback
- No accounts, analytics, remote APIs or cloud uploads

## Run locally

### Chrome or Edge

1. Download the `feat/mangoshot-mvp` branch as a ZIP and extract it.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable Developer mode, choose **Load unpacked**, and select the extracted directory containing `manifest.json`.
4. Open an ordinary HTTP(S) webpage and click the MangoShot toolbar icon.

### Firefox

1. Download/extract this branch.
2. Open `about:debugging#/runtime/this-firefox` and choose **Load Temporary Add-on**.
3. Select `manifest.json` in the extracted folder. This is a temporary development installation.

No build tool or npm install is needed for this prototype.

## Limitations

Current full-page capture is a viewport-scroll stitcher, not a browser-internal print renderer. Fixed/sticky elements may repeat; infinite scrolling, cross-origin frames, horizontally overflowing pages, highly dynamic layouts, and large screenshots need further engineering. Browser print-to-PDF is not yet a dedicated paginated PDF export pipeline.

**MP4 cannot be guaranteed across browsers using MediaRecorder alone.** The recorder exports WebM when MP4 is unsupported. System audio is provided only where the selected browser/OS screen-share implementation allows it. Wacom pen input works in the editor and recorder preview; drawing directly over other desktop apps requires an optional native desktop companion.

Full compatibility and reliability tests are pending. See [architecture and release gates](docs/ARCHITECTURE.md).

## Privacy & security

MangoShot operates entirely in-browser; it performs no remote uploads. Screen selection relies on the browser's user-consent picker. Screenshot capture is initiated via the extension UI on regular pages, not passively.

## Licensing

Copyright © 2026 RawPowered. All rights reserved pending a separate licensing decision. A public GitHub repository does not by itself grant an open-source license.
