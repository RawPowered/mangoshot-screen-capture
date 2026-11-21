# Architecture, security and acceptance notes

## Screenshot authorization and flow

1. Toolbar popup uses its user-gesture `activeTab` grant and creates an inactive editor tab.
2. Editor registers a short-lived capture token in the event page/service worker and injects `content.js` into the active source HTTP(S) tab.
3. The content script gathers viewport/page dimensions, scrolls viewport intervals and asks the background process to capture each frame.
4. Background checks the authorized source tab, current active state, indexed frame order, time/size limits and Chromium's 2-captures-per-second throttle, then forwards frames to the editor using **distinct `MANGO_EDITOR_*` message types**. The editor ignores `MANGO_SOURCE_*` commands, eliminating the v0.2 duplicate-broadcast bug.
5. The editor stitches frames at actual measured scroll offsets. Source scroll position and modified styles are restored in a `finally` block; failures activate the editor with an explanation.
6. Screenshot frames are held only in memory, then cleared after assembly.

Chrome and Edge use the Manifest V3 service worker. Firefox uses the documented `background.scripts` event page fallback in the same manifest. Extension worker suspension or a tab closing ends the in-progress capture; no persistent background screenshot storage.

## Export and annotation

Base PNG and a separate annotation canvas; undo uses stroke-command history rather than massive full-canvas snapshots. Ink supports pointer pressure, shape commands and opaque masks. Flattening creates local PNG bytes or a dependency-free, multi-page A4 PDF using JPEG strip XObjects, one per page. PDF output is inherently rasterized, not a searchable original webpage PDF.

## Recording

A direct user gesture calls `getDisplayMedia`. Browser returns optional shared audio track(s). Optional microphone uses `getUserMedia` and permission errors do not abort the video. Available audio tracks are mixed through the Web Audio API. The video element and annotation canvas are composited into a canvas stream. MediaRecorder tests supported codec strings and exports MP4 or WebM according to the actual MIME type. It does not transcode mislabeled video. Stop/ended/close paths release tracks and audio context. Video chunks remain in memory until save.

## Trust and release gates

- No hidden page access, accounts, remote telemetry, network calls or cookies storage.
- Permission scope only `activeTab` and `scripting`; no `<all_urls>` at release.
- Manual validation: Chrome, Edge, Firefox, Windows screen/window/tab/audio, Wacom pen and Retina/Windows scaling.
- Recording needs real user selection; audio source availability varies. Browser pages are not equivalent to a native global Windows drawing overlay.
- Dynamic sites, sticky elements, infinite scroll, CSS transforms, cross-origin iframes and heavy pages need adversarial testing.
- No store publication, auto-update release or PR merge until manual acceptance is complete.
