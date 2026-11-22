# MangoShot — Screen Capture & Clip Studio

MangoShot is a local-first screen recorder, full-page screenshot and annotation tool with a lightweight layered video editor for **Chrome, Edge and Firefox**. It supports Wacom pen input and local PNG/PDF/video workflows.

**Current public preview:** **v0.5.6-preview.1** (extension manifest: 0.5.6).

**[Download the latest GitHub Releases](https://github.com/RawPowered/mangoshot-screen-capture/releases)** · [Versioning and upgrade instructions](docs/RELEASES.md) · [Release notes](docs/releases/v0.5.6-preview.1.md)

## What works

- Visible and scrolling full-page screenshot capture, PNG/PDF export, Wacom annotations, arrows, text, and redaction
- Screen/tab/window recording with optional microphone/shared audio where the selected browser supports it
- Virtual camera zoom, live ink and local recorder recovery
- Layered Clip Studio: Razor, ripple deletion, text/callout layers, title presets, draggable clips, timing and stacking controls
- AutoCut silence/low-motion analysis with user-reviewed ripple deletions
- Synchronized sequence thumbnails, waveform projection, edited Program Monitor transport, undo/redo
- Optional local FFmpeg cuts-only renderer in full source/tools package; no cloud media processing

## Install the preview

Download the **Extension.zip** asset from the latest preview release; extract it. Open `chrome://extensions` or `edge://extensions` and select **Load unpacked** in Developer mode. For Firefox use `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `manifest.json`.

To upgrade, export any recordings you need, replace files in the **same extension directory**, and reload. A new folder can generate a new Chromium extension ID and isolate old local recordings. Unpacked installations **do not auto-update**.

## Release status

This is a public **preview**, not a browser-store-certified stable version. Browser capture/audio limitations and editor real-time export constraints are documented in the [release notes](docs/releases/v0.5.6-preview.1.md). The current v0.5.6 source passed 25 local regression suites; complete Windows/Wacom and Firefox/Edge/Chrome qualification is still pending.

## Licensing

Copyright (c) 2026 RawPowered. All rights reserved until the owner selects a license. A public GitHub repository alone does not grant an open-source license.
