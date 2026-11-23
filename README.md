<div align="center">

<img src="assets/branding/mangoshot-banner.svg" width="100%" alt="MangoShot logo — mango capture icon and neon-lime / silver wordmark" />

# MangoShot

### Capture it. Mark it. Cut it. Ship it.

**Local-first screenshot capture, screen recording, Photoshop-inspired image annotation and a browser video editor.**

**Current release:** v0.6.18-layers-alpha.2 · **Free to use** · **Source available** · **Resale prohibited**

[Download latest development release](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.6.18-layers-alpha.2) ·
[Browse source at release tag](https://github.com/RawPowered/mangoshot-screen-capture/tree/v0.6.18-layers-alpha.2) ·
[Features](#features-at-a-glance) ·
[Install](#installation) ·
[License](#license-and-ownership)

</div>

> **Development alpha, not a browser-store release.** Automated regression and package checks are part of the release pipeline, but native Chrome/Edge/Firefox, Wacom, OS codec and accessibility compatibility are not universally certified. The default `main` branch contains older source; use the tagged release source and ZIP when evaluating current features.
>
> **Licensing clarity:** MangoShot is **free and source-available, not OSI-approved open source**. You may use it for free, inspect and modify its code, and share compliant copies for free, but you may not resell or charge for access to the software without a separate written license. See [LICENSE](LICENSE) for exact terms.

## What is MangoShot?

MangoShot is a browser-based, local-first capture and creative workflow for **Google Chrome**, **Microsoft Edge**, and **Mozilla Firefox**. It brings capture, screen recording, still-image annotation, editable layers, tablet/pen controls, video cuts, animated titles, callouts and creative reference links together under one MangoShot-branded interface.

It does **not** require an account, a hosted project service or a cloud backend to perform its core editing operations. Browser capture, microphone, codec and clipboard abilities still depend on the user's browser, operating system and the permissions they approve.

## Get MangoShot

| Package | Best for | Link |
| --- | --- | --- |
| **Full v0.6.18 alpha.2 extension** | New installation, updating from any older version, or receiving the included license/README | [Download Extension ZIP](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.6.18-layers-alpha.2/MangoShot-v0.6.18-layers-alpha.2-Extension.zip) |
| **Source & developer tools** | Reviewing the complete implementation, tests, build scripts and public terms | [Download Source ZIP](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.6.18-layers-alpha.2/MangoShot-v0.6.18-layers-alpha.2-Source.zip) |
| **Checksums** | Verifying downloaded ZIP integrity | [SHA-256 checksums](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.6.18-layers-alpha.2/SHA256SUMS.txt) |
| **Previous v0.6.18 alpha.1 overlay** | Existing v0.6.17 users who only need the previous feature patch, not the new packaged legal/readme documents | [Historical upgrade overlay](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.6.18-layers-alpha.1) |

**v0.6.18 alpha.2 is a documentation, licensing and distribution refresh** built from the already-tested alpha.1 editor runtime. It does not introduce a new capture or editing feature. Existing v0.6.18 alpha.1 installations do not need a runtime upgrade; replace them with the full alpha.2 ZIP only if you want the distributed documentation and license files in your installation folder.

[All releases and release notes](https://github.com/RawPowered/mangoshot-screen-capture/releases) · [Detailed release policy](docs/RELEASES.md)

## Features at a glance

| Workspace | Capabilities |
| --- | --- |
| **Capture** | Visible webpage screenshot; full scrolling page; draggable rectangular selection; quick clipboard copy; open the latest screenshot or an image from the clipboard for editing |
| **Image Studio** | Non-destructive screenshot annotation; mouse and pen tools; editable text; vector shapes; imported image layers; masks; layer copy/paste; stack reordering; layer effects; PNG/PDF output |
| **Record Studio** | Browser-selected tab, window or display recording; microphone and supported tab/system audio; pause/resume; local recordings and recovery; recording overlays and camera zoom/crop controls |
| **Clip Studio** | Local editing timeline; Select/Razor/Range tools; trim/split/ripple delete; AutoCut analysis; waveform and thumbnails; graphics and callouts; voiceover controls; animations and transitions; codec-dependent export |
| **Resources** | Curated, searchable external sites for video, photos, vectors, fonts, audio, textures, icons and more; favorites; opens providers in new tabs rather than embedding their websites |
| **Interface** | MangoShot-brand dark interface; synchronized tool inspectors; configurable keyboard shortcuts; command search; compact File/Edit/Layer/View/Tools/Help menus; no forced cloud sign-in |

## Screenshot capture

- **Capture visible area:** capture the visible webpage content.
- **Capture entire page:** scroll and assemble supported web pages into a tall screenshot.
- **Capture draggable selection:** select a region of a webpage with a visual drag rectangle.
- **Quick Copy:** copy a capture directly to the system clipboard without completing an annotation session.
- **Edit clipboard image:** bring a clipboard image back into Image Studio.
- **Preserve image resolution:** annotations render against native screenshot dimensions while the preview can be zoomed to fit.
- **Copy and export:** Copy Image creates an annotated image; output supports PNG and PDF.

Very tall, inaccessible, browser-internal, protected or unusual scrolling pages may not be captured correctly. Full-page operations depend on browser permissions, active-tab behavior and the page's layout.

## Image Studio: annotation and layer editing

### Drawing, vector tools and text

- Freehand **Pen** and **Highlighter**, arrows and graphical annotation tools.
- **11 editable vector shapes:** rectangle, rounded rectangle, ellipse, line, arrow, triangle, diamond, pentagon, hexagon, star and speech bubble.
- Shape fill, outline color/width, opacity, solid/dashed/dotted stroke style and shape-specific geometry, including arrowheads, rounding and star points.
- Live editable text; fonts, size, color, presets, scaling, resize handles and type effects such as shadows and overlays.
- Drag existing editable objects directly on the canvas. Corner resizing preserves proportions by default; hold Shift for free stretching where supported.
- Imported images as independent layers, with non-destructive image mask erase/restore and a basic local quick-cutout workflow. **Quick Cutout is not equivalent to an AI background-removal service such as remove.bg or Adobe's advanced subject segmentation.**
- Custom screenshot context menu, undo/redo and non-destructive layer edits.

### Layer management (v0.6.18)

- Select, reorder, rename where exposed, hide/show, lock/unlock, duplicate and delete editable layers.
- **Copy/Cut/Paste individual layers** inside the running Image Studio session using Ctrl+C/Ctrl+X/Ctrl+V. This is an *internal structured layer clipboard*; Copy Image separately writes the composited image to the operating-system clipboard.
- **Alt + drag** with Select duplicates a touched, unlocked annotation and moves the clone in one undoable action. Normal drag moves the selected layer.
- Drag-and-drop grips in the Layer Stack for changing z-order; arrow keys move selected layers by one source pixel or ten pixels with Shift.
- Per-layer **Opacity (0–100%)**, editable shadows/glows, effect colors, blur, X/Y offsets and annotation blending.
- **Appearance presets:** None, Shadow, Glow, Floating, Crisp. Copy Style and Paste Style transfer editable appearance between compatible layers.
- Effects are drawn through the same Canvas composition path used for preview and annotated export, rather than preview-only decorations.

The screenshot background is preserved when editing annotation layers. Layer style blending currently occurs among annotation layers, not as a complete Photoshop-equivalent raster compositing engine.

### Erasers, Wacom tablets and redaction

- **Brush Erase:** partially erases the visible annotation composition with variable diameter, hardness, opacity and supported pressure response.
- **Whole Stroke Erase:** removes complete unlocked annotation strokes or objects touched by the eraser; grouped as an undoable drag.
- **Physical pen eraser detection:** can temporarily activate the last selected eraser mode when the browser reports a standard pen-eraser event; manual erasers always remain available.
- **Wacom / Browser Pen Test:** local diagnostic pad for pointer type, observed pressure variation, pen tilt, twist, eraser-tip signals and coalesced samples; optional user-initiated report copying.
- **Redaction annotation tool:** designed for visible covering of image regions. **Do not rely on overlay redaction for irreversible removal of sensitive information**; hiding a mark is not the same as securely destroying the underlying pixels.

Pressure sensitivity and physical eraser detection require actual Pointer Events support from the browser, tablet and driver. A supported Wacom model does not guarantee every signal is exposed by every browser.

## Record Studio

- Choose to record a **browser tab, application window or screen** via the native browser share picker.
- Record microphone and supported tab/system audio where the browser/source allows it.
- Start, pause, resume and stop recording; inspect recording status.
- Recording controls include local source interaction and camera/zoom/crop controls.
- Recovery-oriented local recording storage and controls for opening the latest recording.
- Open recorded material in Clip Studio without a cloud upload.

Recording format and audio sources are supplied by the browser. Native MP4 encoding is not guaranteed; WebM may be the available format. Renaming a WebM file to MP4 does not transcode it.

## Clip Studio: video editing

### Timeline and cuts

- Select, Razor and Range editing modes, with synchronized active-tool visual indicators.
- Split at playhead, mark ranges, trim, ripple delete, undo/redo and snap controls.
- Timeline zoom, sequence positioning, thumbnail generation and waveform analysis.
- Editable video/source sequence and graphics tracks for titles, text and callouts; available audio/voiceover controls.
- Media library and local file import with staged media support.
- Save/load local project state where implemented by the editor, including project JSON workflow.
- AutoCut proposals for silence or low-motion passages, with user review before cuts are applied. **AutoCut does not interpret spoken meaning or intelligently decide what should be removed.**

**Important alpha limitation:** additional imported media may be staged in the Media Library without automatically being composited as a full multi-source timeline. Do not assume professional nonlinear-editor multicam or arbitrary A/V mixing support.

### Typography, animated callouts and transitions

- Basic and premium-styled text, subtitles, lower-thirds and callout presets.
- Glass-like, chrome, metal, gold, holographic, editorial and luminous themes rendered with local Canvas techniques. The label *Premium* refers to the visual-preset collection; it is **not a payment tier**.
- Editable entry/exit animations: fade, slide, pop, bounce, zoom, spin, flip, type-in and letter assembly, depending on preset.
- Numeric effects: count up, count down, timer up and timer down with editable range, precision and prefix/suffix.
- Clip transition treatments: dips, flashes, wipes, iris, slides, zoom and spin variants.
- On-canvas timing and preview/export synchronization built around the edited sequence.

Current transition treatments are **single-decoder cut effects**, not full two-source optical cross-dissolves. Glass and chrome are Canvas-style renderings, not guaranteed photorealistic real-time refraction.

### Video export

- Browser-local sequence rendering with the formats/codecs supported by the current browser.
- MP4 is available only when the browser supports the required encoding; otherwise use an available format such as WebM.
- Composited titles and callouts can make real-time export slower than a simple cuts-only workflow.
- A separate optional developer/desktop cuts-only workflow may support FFmpeg on compatible systems; it is not a substitute for compositing animated overlay effects.

## Keyboard shortcuts and menus

The v0.6.17 Shortcut Manager is shared by Image Studio and Clip Studio. Shortcuts can be searched, filtered, rebound, cleared, reset, and imported/exported as local versioned JSON profiles. Duplicate bindings and known browser-reserved keys are rejected. Tooltips and menu shortcut labels update with remapped keys.

| Image Studio | Default |
| --- | --- |
| Select / Pen / Highlighter / Text | V / P / H / T |
| Brush Erase / Whole Stroke Erase | E / Shift+E |
| Copy / Cut / Paste editable layer | Ctrl+C / Ctrl+X / Ctrl+V |
| Duplicate selected layer | Shift+D |
| Nudge selected layer | Arrow keys, or Shift+Arrow keys for 10 px |
| Undo / Redo | Ctrl+Z / Ctrl+Shift+Z |
| Shortcut manager | ? (Shift+/) |
| Search commands | Ctrl+Alt+K |

Normal text input, IME composition and dialogs are excluded from drawing shortcuts. Clip Studio has its own saved keymap and the standard Select/Razor/Range tool shortcuts V/C/R.

## Creative Resources directory

The Resources tab is a **curated external link directory** for providers of photos, stock video, vectors, fonts, audio, icons and textures. Search, categories and favorites help locate sites. Links open the provider's own website in a new tab. The directory does not iframe, scrape, automatically download or relicense third-party content. Free tiers, attribution requirements and commercial permissions depend on each provider and asset.

## Privacy and permissions

- **Local-first core workflows:** recordings, editing and image composition are designed to stay on the device unless you intentionally export, copy, share or open an external resource link.
- **User-initiated access:** the browser controls capture permission and source selection.
- **No forced cloud account** for core capture and editing.
- The current manifest uses activeTab, scripting and clipboardWrite permissions; these are not permission to silently record arbitrary desktop activity.
- The Wacom diagnostic is local and its clipboard report is copied only when requested.
- Keep private recordings and screenshot data out of public bug reports.

## Installation

### Chrome

1. Download the **full Extension ZIP** from the current tagged release, and extract it to a permanent folder.
2. Open `chrome://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Pin MangoShot and test visible capture on an ordinary supported website.

### Microsoft Edge

1. Extract the full Extension ZIP.
2. Open `edge://extensions` and turn on Developer mode.
3. Choose **Load unpacked**, select the folder containing `manifest.json`, and pin MangoShot.

### Mozilla Firefox

1. Extract the full Extension ZIP.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on…** and select `manifest.json`.

Temporary Firefox debug-installed extensions are removed when Firefox restarts. The project does not currently provide a signed Mozilla Add-ons or browser-store installation.

### Upgrade and recovery

Export important local recordings and unfinished project files first. Back up the *entire existing unpacked extension folder*. For Chrome/Edge, extract the new full Extension ZIP **over the original folder**, keeping the same extension path, and use Reload from the extensions page. A new unpacked path can create a different extension identity and make previously stored recordings seem missing. For Firefox, reload the temporary add-on through debugging.

A release overlay applies **only** to the exact source version named in its title. For older installations, choose the complete Extension ZIP instead. Never clear browser extension storage as a shortcut for upgrading.

## Build and verification

This repository includes unit/regression tests for capture, editor state, video timeline, Wacom Pointer Events, shortcuts, layers and release packaging. Run from the release tag:

```sh
for test in tests/*.cjs; do node "$test"; done
```

Build the complete extension using the bundled Python packaging tool:

```sh
python3 tools/package-extension.py --out dist --version v0.6.18-layers-alpha.2
```

The official GitHub Actions release gate additionally checks syntax, ZIP integrity and SHA-256 digests. A passing automated gate is **not** physical hardware, real browser, accessibility or codec certification.

## Troubleshooting

| Issue | Initial check |
| --- | --- |
| Capture or editor is blank | Reload the unpacked extension; use a normal http(s) page and verify the installation contains `manifest.json`. |
| Full-page capture is incomplete | Keep the captured tab active, avoid extremely tall or unusual scrolling layouts, and retry. |
| Clipboard copy is blocked | Verify the permitted browser clipboard operation and distinguish **Copy Image** from **Copy Layer**. |
| Wacom pressure looks constant | Use the built-in pen test and confirm driver, pen tip and browser Pointer Events. |
| Physical eraser not detected | Use the manual eraser tool or check driver button mapping. |
| Layer shortcuts do not work | Select an editable layer; live text input deliberately keeps normal typing shortcuts. |
| MP4 export unavailable | Check whether this browser exposes native MP4 encoding; WebM may be available. |
| Recording has no audio | Check microphone permission, source audio and actual captured audio streams. |
| Firefox installation disappeared | The temporary add-on must be reloaded after browser restart. |
| Previous recordings seem gone | Restore the previous unpacked extension path; do not clear extension storage. |

For reproducible bugs, open a [GitHub Issue](https://github.com/RawPowered/mangoshot-screen-capture/issues). Include browser/version, OS, release tag, action sequence, expected/actual outcome and relevant Wacom information where appropriate. Avoid sharing private files or sensitive screenshots.

## License and ownership

**Copyright © 2026 RawPowered. Some rights granted under the [MangoShot Community Source-Available License 1.0](LICENSE).**

| Permission | Current policy |
| --- | --- |
| Download and use MangoShot personally | **Free** |
| Use MangoShot for work or to produce paid client screenshots/videos | **Allowed** |
| Read, test and privately modify the source | **Allowed** |
| Redistribute original or modified copies for free, with attribution, license and editable source | **Allowed under license conditions** |
| Resell, sublicense for a fee, charge access, bundle in paid software, or operate a paid hosted MangoShot editor | **Not allowed without written permission** |
| RawPowered releases later paid, proprietary or closed-source versions | **Rights reserved** |

**This is source-available software, not OSI-approved open-source software.** A no-resale restriction prevents classification as open source under the [Open Source Definition](https://opensource.org/osd). This license is not MIT, Apache, GPL or another standard OSI-approved license.

RawPowered reserves the right to develop, license and release **future** MangoShot versions commercially and/or under closed source. That does not erase the rights of users who already received a version under the applicable license and remain compliant. Relicensing external contributions may require separately granted rights.

Logo and brand rights remain reserved. Third-party assets are subject to their own licenses. See [LICENSE](LICENSE) and [CONTRIBUTING.md](CONTRIBUTING.md) for the full project terms. Commercial distribution or resale requires written permission from the relevant copyright owner.

## Project status and development

- **Current channel:** development alpha. No claim of general production, browser-store or tablet certification.
- **Source-of-truth:** the current GitHub release tag and its attached source bundle, not the older default-branch snapshot.
- **Updates:** manual in the unpacked development builds; the [preview feed](updates/preview.json) is informational, not an auto-updater.
- **Roadmap:** cross-browser/Wacom QA, signed distribution, better media composition, editing performance and broader accessibility testing.
- **Community:** bug reports and feature discussions are welcome; accepting external code contributions may require a separate contributor agreement to preserve the owner's future relicensing rights.

---

<div align="center">

**MangoShot · Captured locally. Created your way.**

[Latest release](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.6.18-layers-alpha.2) · [Source license](LICENSE) · [Release history](https://github.com/RawPowered/mangoshot-screen-capture/releases)

</div>
