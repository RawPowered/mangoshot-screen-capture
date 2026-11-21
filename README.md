# 🥭 MangoShot

An ad-free, local-first screenshot, annotation and screen-recording extension for **Chrome, Microsoft Edge and Firefox**.

**Version:** 0.2.0 test-drive candidate. Not yet browser-store-certified. No account, analytics or cloud upload.

## Try it

Download the `MangoShot-v0.2.0-test-drive.zip` provided with this build (or the `feat/mangoshot-mvp` branch source), extract it, then:

| Browser | Development installation |
| --- | --- |
| Chrome | `chrome://extensions` → Developer mode → **Load unpacked** → select the extracted folder containing `manifest.json` |
| Edge | `edge://extensions` → Developer mode → **Load unpacked** → select the extracted folder containing `manifest.json` |
| Firefox | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → choose `manifest.json`. This is a temporary session; Firefox permanent installs need a signed add-on. |

Pin **MangoShot** to your browser toolbar. Open a regular HTTP(S) webpage and try **Capture visible area** or **Capture entire page**. After capture, use ink, highlighter, eraser, arrows, rectangles, solid redaction and text. Export PNG or a locally generated multipage A4 PDF. Click **Record screen / audio** for the separate video studio.

See [the guided test drive](docs/TEST-DRIVE.md) for suggested checks and expected limitations.

## Capabilities

- **Visible and vertical full-page screenshots:** user-triggered capture and scroll stitching, max 40 frames / 48 megapixels; scroll restoration and basic duplicate sticky/fixed-element suppression
- **Image studio:** pointer pressure for Wacom-compatible pens, pen, highlighter, eraser, arrows, rectangles, opaque redaction, text, undo, clear, zoom
- **Exports:** full-resolution PNG, standalone A4 multipage PDF without server or third-party runtime package
- **Video studio:** explicit native screen/window/tab picker, live ink composited into recording, optional microphone and shared audio, pause/resume, elapsed timer, local download
- **Recording format:** native MP4 when the browser supports a suitable recording codec; otherwise correctly labeled WebM
- **Privacy:** no external network requests or background recording; in-memory screenshot frames and browser-consent screen sharing

## Supported workflow and limitations

- Screenshot capture operates on normal HTTP(S) tabs. Browser-internal pages and protected content are excluded.
- Full-page capture is viewport stitching, not a page renderer. Infinite-scroll pages, CSS transforms, lazy-loaded content, iframes, canvas-heavy pages, sticky components and horizontal scrolling may need another pass.
- Solid redaction is permanently flattened in exported images/PDFs; it is not a semantic privacy audit of every metadata/copy pathway. Do not use in place of a sensitive-data review.
- Recording audio depends on the selected screen/window/tab and browser/OS support; requesting audio does not guarantee an audio track.
- Wacom input operates inside the MangoShot image editor and video preview. Drawing **over other desktop apps while recording** requires a future optional native Windows companion.
- Long recordings are retained in memory until saved; please test shorter sessions first.
- No store or physical-device certification has been completed. Install temporarily for testing, not production deployment.

## Engineering checks

Run `node tests/static.cjs` for JS syntax, manifest, asset references and mocked session routing. Run `node tests/pdf.cjs` for the PDF binary writer using included JPEG fixtures, then open the generated `tests/sample.pdf` with a PDF reader.

**Evidence:** syntax checks, mocked capture protocol test and 3-page PDF parse/render test passed in development. Automated end-to-end extension execution in the available headless Chromium environment was blocked by its extension-launch configuration. This build remains a test candidate until Chrome/Edge/Firefox and Wacom/recording checks are completed on a supported desktop.

## Licensing

Copyright © 2026 RawPowered. All rights reserved until an explicit open-source license is selected.
