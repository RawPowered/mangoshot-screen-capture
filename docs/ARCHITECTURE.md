# MangoShot architecture and release gates

## Capture
- Explicit action popup opens an inactive editor tab, leaving the source visible.
- Editor registers an in-memory session; injects content.js into the currently authorized HTTP(S) page.
- Content scrolls viewport-height chunks and requests PNG frames via captureVisibleTab.
- Editor receives images in memory, stitches into a canvas and draws vector-like raster ink on a second canvas.
- The page restores scroll position in a finally block.
- Current full-page capture does not handle horizontally overflowing documents, all sticky/fixed elements, animated content, infinite scroll or canvases exceeding safe memory limits. These are known follow-up gates, not certified feature parity with FireShot.

## Recording
- User gesture opens getDisplayMedia browser picker, optionally microphone getUserMedia.
- Video frames and live ink are composited to an offscreen canvas and encoded with MediaRecorder.
- Audio tracks, when supplied, are mixed via Web Audio. System audio availability is browser and OS dependent.
- Native MP4 when MediaRecorder supports it; otherwise downloadable WebM. No misleading MP4 extension for WebM payloads.
- Wacom pens use Pointer Events pressure; native tablet drivers and their configuration remain OS responsibilities.
- Native desktop overlay for drawing over other apps, full system audio portability, and guaranteed MP4 require a future optional signed desktop companion.

## Privacy
- No remote servers, accounts, analytics, hidden capture or passive surveillance.
- Capture only from user-triggered flows; browser-managed screen-share prompt.
- The full-page mechanism currently excludes restricted pages and dynamic layout edge cases.

## Acceptance before publishing
1. Load unpacked extension in Chrome, Edge and Firefox; confirm manifest compatibility.
2. Visible and full capture on static long webpages, retina/scale variations, pages with fixed headers and lazy images.
3. Verify full-page offsets, screenshots over 15k px, horizontal overflow rejection, and safe failure cleanup.
4. Ink with Wacom mouse/pen pressure, undo, eraser, export and PDF print pagination.
5. Screen recording tab/window/screen; audio availability; MP4 or WebM fallback; pause/stop and early share termination.
6. Permission review, CSP review, no outbound requests, memory/CPU measurements and basic accessibility.
7. Cross-browser verification is **pending**. Do not label this prototype release-ready.

## Next milestones
- Robust full-page fixed/sticky suppression, lazy-load handling, cross-origin iframes, clipping, crop/shape/text/blur tools.
- Multi-page print-quality PDF exporter using a local bundled PDF library.
- Optional local FFmpeg.wasm MP4 transcoder (performance gate) or native helper.
- Native Windows companion for region capture, global hotkeys, desktop-wide real-time ink and system audio capture.
- Automated browser integration tests and reproducible unsigned dev packages.
