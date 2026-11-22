# MangoShot — Screen Capture, Recorder & Clip Studio

MangoShot is a local-first, ad-free screen capture and recording extension for **Chrome, Edge and Firefox**, with pressure-aware Wacom annotation and a lightweight layered video editor.

## Download

**Public preview:** [MangoShot v0.5.6-preview.1](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.5.6-preview.1)

- [**Installable browser extension ZIP**](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.6-preview.1/MangoShot-v0.5.6-preview.1-Extension.zip)
- [**Full versioned source and optional tools ZIP**](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.6-preview.1/MangoShot-v0.5.6-preview.1-Source-and-Tools.zip)
- [**SHA-256 checksums**](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.6-preview.1/SHA256SUMS.txt)

**[All versions and future updates](https://github.com/RawPowered/mangoshot-screen-capture/releases)** · [Update instructions](docs/RELEASES.md)

## Installation

Extract the Extension.zip file first.

- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked → extracted directory containing `manifest.json`.
- **Edge:** `edge://extensions` → Developer mode → Load unpacked.
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `manifest.json`. Temporary installation is not persistent across browser restarts.

Before updating, export any recordings you need. When possible, replace files in the **same unpacked extension directory** and reload the extension. Using a different path can produce a different Chromium extension ID and separate local recording storage.

## Features in the current preview

- Full-page and visible screenshot capture, PNG/PDF export, redaction and Wacom pen annotation
- Tab/window/screen recording and optional microphone/shared audio where supported
- Clip Studio Razor, Ripple Delete, AutoCut, titles/callouts, graphic layers and non-destructive timeline editing
- Edited-sequence audio waveform, video thumbnails and Program Monitor transport
- Balanced and High-performance export profiles; optional FFmpeg cuts-only desktop exporter in the full source package

## Release channels

The official public distribution location is **GitHub Releases in this repository**. Each future release will have a version tag, download ZIPs, checksums and release notes. The [preview update catalog](updates/preview.json) is provided for tooling and documentation; **unpacked extensions do not automatically update**.

The repository's current `main` code is an older development baseline. **Install from the tagged release or its extension ZIP, not the default branch source.** The preview source is preserved at `v0.5.6-preview.1`.

## Status and license

v0.5.6-preview.1 is a **public prerelease**, not a Chrome Web Store, Edge Add-ons or signed Mozilla Add-ons publication. Browser/device certification is still ongoing.

Copyright © 2026 RawPowered. All rights reserved until a license is selected; a public repository alone does not grant an open-source license.
