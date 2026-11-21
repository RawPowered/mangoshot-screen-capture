# MangoShot v0.3 architecture and compatibility

## Unchanged screenshot protocol

`popup.js` launches `editor.html`; `editor.js` creates a session and injects `content.js` into the explicitly active source tab. `content.js` requests ordered frames; `background.js` captures PNG frames in a permission-scoped session and sends editor-only messages (avoiding the formerly duplicated `MANGO_FRAME` broadcast). Editor stitches bounded frames and outputs PNG/PDF. 0.2.1 screenshot routing and APIs are unchanged in v0.3.

## Recording workflow

`popup.js` launches `recorder.html` with `source=<tabId>` only for user-selected HTTP(S) pages. The browser always presents its own `getDisplayMedia()` picker under user activation. `recorder.js` mixes optional microphone/shared audio into a canvas-derived `MediaStream`; Wacom pen ink is rendered onto a separate canvas. `camera.js` computes virtual pan/zoom crop applied to each recorded video frame before compositing ink. No injection is performed into unrelated windows/apps.

**Interaction ON:** On browsers with `CaptureController.forwardWheel(videoElement)` and `displaySurface:browser`, scroll directly within the chosen capture surface under browser permission. The method is called from the interaction toggle user gesture. Otherwise, if the user explicitly consents and the original source tab still has `activeTab` permission, `linked-tab.js` (injected into that page) forwards scrolling into the corresponding scrollable DOM ancestor. The fallback cannot verify the capture picker's chosen tab identity; user must confirm that the originally linked tab is the one being shared.

**Controls:** Ctrl+E clears ink, Ctrl+Alt+C toggles interaction, Ctrl+wheel zooms and anchors focal point, Ctrl+drag frames a zoom region, Ctrl+Alt+0 resets framing. All are local to a focused recorder tab; browser-reserved shortcuts may override them. This is not a system-wide/global hotkey implementation.

## Clip Studio

`recorder.js` offers Save original or Edit in Clip Studio when recording ends. `clip-store.js` persists the latest Blob via origin-local IndexedDB and may fail if quota is insufficient, in which case the user can still save the original. `clip-studio.html/js` can also open a user-selected local file. `clip-timeline.js` keeps an immutable decision list of ordered [start, end) second ranges; trimming or cutting creates a new list. The preview renders the source video; export seeks and plays retained segments through a canvas capture stream, optionally connects audio through `AudioContext`, and encodes via `MediaRecorder`.

**Conversion:** The MP4 button is available only if `MediaRecorder.isTypeSupported(video/mp4...)` succeeds. This performs real local re-encoding of WebM or MP4 source when supported, not file extension substitution. No FFmpeg/WebAssembly binaries are bundled. Firefox or other browsers without native MP4 must export WebM and convert with an external tool, until a codec distribution milestone is implemented. Re-encoding runs at approximately real time, preserves original Blob, and has frame-level cut precision rather than frame-accurate editing.

## Security and privacy

Local capture/recording only; no external network endpoints, analytics, or telemetry. Browser screen selection is always consented, and `linked-tab.js` can only scroll the tab for which the user granted temporary `activeTab` access. No synthetic clicks/input, unrestricted tab control, or persistent background recording. Shared video remains in local IndexedDB until user deletes it or clears extension data; avoid exporting or storing sensitive material without review.

## Test gates

Static syntax, extension manifest, original screenshot regression, camera geometry, timeline algebra, recorder-hotkey simulation, and clip editor decision-list simulation run in Node without remote dependencies. Mandatory manual gates: Chrome/Edge and Firefox screen-picker/scroll behavior, Wacom pressure and shortcuts, audio capture, real video WebM and MP4 playback, IndexedDB quota, and long-clip performance. Draft status until gates pass.
