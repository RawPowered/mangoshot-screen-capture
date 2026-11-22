<div align="center">

<img src="assets/branding/mangoshot-banner.svg" width="100%" alt="MangoShot: orange mango with center record button and white focus frame, chrome gunmetal Mango wordmark, neon lime Shot wordmark" />

### Capture it. Mark it. Cut it. Ship it.

**Screen capture · Screen recording · Pen annotation · AutoCut video editing**

![Release](https://img.shields.io/badge/preview-v0.5.7--preview.1-B6FF17?style=flat-square&labelColor=20272A&color=B6FF17) ![Browsers](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox-development%20build-91A5AA?style=flat-square&labelColor=20272A) ![Privacy](https://img.shields.io/badge/media-local%20on%20device-FF851C?style=flat-square&labelColor=20272A)

[**⬇ Download MangoShot**](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.5.7-preview.1) · [Install guide](#installation-guide) · [How to use](#first-capture-and-recording) · [Updates](#upgrading-and-recovery) · [Troubleshooting](#troubleshooting)

</div>

---

## What is MangoShot?

MangoShot is a **local-first capture and editing workspace** for Chrome, Microsoft Edge, and Firefox. Capture a visible tab or a scrolling webpage, annotate it with a mouse or Wacom tablet, record a tab/window/monitor, and trim the result with **Clip Studio**—without uploading the recording to an external service.

> **Release status:** `v0.5.7-preview.1` is a **public development preview**, not a signed browser-store extension. The screenshot-capture handoff has been repaired and regression-tested; full Windows, Wacom, and cross-browser certification is still in progress.

### Inside the studio

| 📷 Image Studio | 🔴 Record Studio | ✂️ Clip Studio |
| :--- | :--- | :--- |
| Visible and full-page capture | Tab, window, or monitor capture | Razor, trim, and Ripple Delete |
| Export **PNG / PDF** | Microphone / tab audio *where supported* | AutoCut silence / stillness detection |
| Wacom pen, arrows, text, redaction | Live ink, zoom and recording recovery | Layered titles and callouts (G2/G3) |
| Non-destructive annotation history | Source/tab interaction controls | Waveforms, frame thumbnails, project JSON |

**All editing is local.** MangoShot may need browser capture and microphone permissions for actions you explicitly initiate. Device, browser and codec support determine which audio and video formats are available.

## Downloads

| Package | Choose this when… |
| :--- | :--- |
| **[MangoShot Extension ZIP](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.7-preview.1/MangoShot-v0.5.7-preview.1-Extension.zip)** | You want to **install MangoShot** in a browser. |
| **[Full Source & Tools](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.7-preview.1/MangoShot-v0.5.7-preview.1-Source-and-Tools.zip)** | You want the source, tests, or optional Node/FFmpeg cuts-only renderer. |
| **[SHA-256 checksums](https://github.com/RawPowered/mangoshot-screen-capture/releases/download/v0.5.7-preview.1/SHA256SUMS.txt)** | You want to verify file integrity. |

**[Browse all releases and future updates](https://github.com/RawPowered/mangoshot-screen-capture/releases)**

## Installation guide

### 1 — Download and extract

1. Open the **[current release](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.5.7-preview.1)**.
2. Under **Assets**, download `MangoShot-v0.5.7-preview.1-Extension.zip`.
3. On Windows, right-click the ZIP → **Extract All**. Choose a permanent folder such as `Documents\MangoShot`.
4. Open the extracted folder and confirm you see **`manifest.json`**, `popup.html`, and folders such as `icons/`. **Do not load the ZIP itself.**

### 2 — Add MangoShot to your browser

<details open><summary><strong>Google Chrome</strong></summary>

1. Open `chrome://extensions` in the address bar.
2. Enable **Developer mode** (upper right).
3. Select **Load unpacked**.
4. Select the **extracted folder containing `manifest.json`**.
5. Pin MangoShot from the Extensions (puzzle piece) menu.

</details>

<details><summary><strong>Microsoft Edge</strong></summary>

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted MangoShot folder.
4. Pin MangoShot from the Extensions menu.

</details>

<details><summary><strong>Mozilla Firefox</strong></summary>

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…**.
3. Browse to the extracted MangoShot folder and select **`manifest.json`**.
4. Start using the extension from the toolbar.

**Firefox temporary add-ons are removed when Firefox restarts.** A signed distributable is planned; this preview is not yet published in Mozilla Add-ons.

</details>

### 3 — Confirm your installation

Open an ordinary `https://` webpage and click MangoShot. Try **Capture visible area** first. Image Studio should show the screenshot at its natural dimensions and enable PNG/PDF export. Next, try **Capture entire page** on a scrolling webpage, keeping the source tab selected until Image Studio opens. This checks the repaired screenshot pipeline.

## First capture and recording

| Goal | Procedure |
| :--- | :--- |
| Capture visible area | Open a webpage → MangoShot → **Capture visible area** → annotate → **Export PNG/PDF**. |
| Capture a full page | Open a scrolling webpage → MangoShot → **Capture entire page** → keep source tab active until Image Studio opens. |
| Record a video | MangoShot → **Record screen / audio** → select tab/window/display in the browser share picker → **Stop** → download original or **Edit in Clip Studio**. |
| Mark up with a Wacom pen | Choose a pen/highlighter or shape tool in Image Studio or Record Studio. Use **Ctrl+Z** for annotation undo. |
| Remove pauses | Import/record a video → Clip Studio → **AutoCut** → **Analyze locally** → review suggested removals → **Ripple delete** approved cuts. |
| Add a title/callout | Clip Studio → **+ Text** / **+ Callout** → drag and time it on G2/G3 → export the edited sequence. |

### What makes AutoCut different?

AutoCut identifies **silent audio passages** or (when chosen) **low-motion screen passages**, places proposed cuts on the timeline and allows them to be ripple-deleted as one undoable operation. It **does not** understand the meaning of spoken words, and static screens may still contain important information. Always review proposals before applying them.

### Video format and performance

The browser export depends on codecs supplied by the browser. WebM or MP4 availability varies; **renaming a WebM file does not convert it to MP4**. Browser recompositing is generally real-time, even on powerful computers. The full source ZIP includes an **optional local Node + FFmpeg cuts-only exporter**, which can run faster than real time on supported hardware but deliberately rejects projects with visible titles/callouts.

## Upgrading and recovery

**Important: export any valuable recordings before updating.** MangoShot uses browser-local storage for recording recovery, project handoff, and temporary capture data.

1. Download the newer Extension ZIP from [Releases](https://github.com/RawPowered/mangoshot-screen-capture/releases).
2. Export/save unfinished videos and any projects you need to retain.
3. Back up your existing extracted extension folder.
4. Extract the update into the **same folder path** used by your existing unpacked Chrome/Edge installation, replacing its files. Do not delete the extension first unless necessary.
5. Return to your browser extension settings and select **Reload**.
6. For Firefox, repeat the temporary add-on loading steps as needed.
7. Verify capture, recording, and Clip Studio before deleting the backup folder.

**Why keep the folder path?** Changing the path or loading a second unpacked copy can create a different Chromium extension identity, isolating the recordings in its previous local storage. Updates are **manual** in the development build; the JSON [preview feed](updates/preview.json) does not auto-install releases.

See [complete release and update policy](docs/RELEASES.md).

## Troubleshooting

| Problem | Check first |
| :--- | :--- |
| **Image Studio is blank or only shows a small empty area** | Verify the release is **v0.5.7-preview.1 or newer**, reload the extension, and open a normal `http(s)` tab. The new capture flow validates the PNG and displays a specific error instead of accepting incomplete frames. |
| **Full-page capture fails** | Keep the target webpage active throughout scrolling capture. Very tall, horizontally scrolling, browser-internal or access-restricted pages may not be supported. |
| **Recording has no audio / waveform** | Make sure the recording actually contains an audio stream. Microphone permission and tab/system audio support differ by browser and selected source. |
| **Editor loads an older video** | Use **Edit in Clip Studio** immediately after saving the intended recording, or import its downloaded file manually. |
| **MP4 button unavailable** | Your browser may not expose native MP4 encoding. Use WebM or the optional desktop cuts-only workflow. |
| **Firefox extension disappears** | Temporary debug-installed add-ons do not persist after browser restart. Reinstall from `about:debugging`. |
| **I need to recover a recording** | Check the recorder's Recovery Library before clearing browser data. Not all interrupted MP4 chunks can be finalized into playable media. |

For issues and reproducible browser steps, use **[GitHub Issues](https://github.com/RawPowered/mangoshot-screen-capture/issues)**. Include MangoShot version, browser/version, Windows version, capture type, whether audio was requested, and any visible error text. **Do not upload private recordings without removing sensitive information.**

## Privacy, release status and roadmap

- **Local-first:** screenshots, recording frames, audio, and edit decisions stay on your device by default.
- **Permission-scoped:** capture runs after your toolbar action and the browser share picker; not a hidden remote recorder.
- **Public preview:** this release is **not** a Chrome Web Store, Edge Add-ons, or signed Firefox Add-ons publication.
- **Future work:** device-level browser qualification, signed distribution, optional update notifications, accelerated composition with graphics, and more precise editing.

Current release notes: [v0.5.7-preview.1](docs/releases/v0.5.7-preview.1.md) · [Update channel](updates/preview.json) · [Repository discussions and issues](https://github.com/RawPowered/mangoshot-screen-capture/issues)

---

<div align="center">
<img src="assets/branding/mangoshot-banner.svg" width="520" alt="MangoShot logo and tagline" />

**MangoShot · Captured locally. Created your way.**

Copyright © 2026 RawPowered. All rights reserved until the repository owner chooses a license. Public source access does not automatically grant reuse rights.
</div>
