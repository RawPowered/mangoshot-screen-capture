# 🥭 MangoShot — Studio v0.5.0 Layered Clip Studio Preview

Local-first, ad-free screen capture, Wacom annotation and video-editing browser extension for **Firefox, Chrome and Edge**. No account, analytics, video uploads or remote API calls.

**Status:** Engineering test-drive build on `feat/mangoshot-v0.5-layered-editing`. Keep v0.3.2 available as a tested fallback. This is **not** a published browser-store release.

## Load for testing

1. Download the v0.5.0 ZIP and extract it. Do not load the ZIP directly.
2. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, and **Load unpacked** from the extracted folder containing `manifest.json`. In Firefox use `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `manifest.json`.
3. Disable/remove the older unpacked MangoShot version to avoid confusing two toolbar icons. **Do not clear old extension storage before recovering any recordings you need.**
4. Open a regular HTTP(S) webpage. Click the MangoShot extension icon and choose visible screenshot, full page, or Record screen/audio.

## Studio workspaces

**Recorder** has a program monitor, left camera/ink tools, right inspector, visible Reset Camera, and a local Recovery Library. Each recording has an independent encoder/chunk queue, so a late completion from a previous session cannot overwrite the current session. Stop terminates capture tracks immediately while the file finishes asynchronously. Incomplete recovery fragments are labeled accordingly.

**Clip Studio** provides a source/program monitor, project bin and markers, horizontal timeline zoom, ruler scrubbing, playhead, non-destructive split/trim/cut, trim handles, optional on-demand frame thumbnails, optional local waveform analysis, and export controls. Unedited same-format saves copy original bytes instantly. Edited/cross-format exports still re-encode, often at roughly real-time speed.

**Image Studio** supports pressure-aware Wacom drawing, highlighter, eraser, arrows, rectangle, opaque redaction, text, tool rail, inspector, annotation object list and up to 80 undo/redo steps. The captured screenshot remains unchanged until PNG/PDF export.

## Recorder keyboard controls

| Input | Action |
|---|---|
| Ctrl+E | Clear ink (undoable) |
| Ctrl+Z | Undo ink (up to 80 decisions) |
| Ctrl+drag upward/downward | Dolly zoom in/out toward pointer |
| Ctrl+wheel | Zoom toward pointer |
| Zoom Region tool | Persistent region zoom with dashed marquee; Esc cancels |
| Reset Camera / Ctrl+Alt+0 | Reset to 100% framing |
| Hold Ctrl+Alt + scroll | Scroll the explicitly authorized linked/captured browser tab where available |

Buttons provide alternatives where a browser consumes a shortcut. **The recording preview cannot remotely click or type into arbitrary applications.** Make those interactions on the actual source tab/window.

## Recovery and privacy

The recorder stores emitted fragments locally in IndexedDB for recovery if an encoder finishes late or a tab closes. Multiple sessions can be selected in Recovery Library. The **Delete ALL local recovery data** control permanently clears those fragments. Stored chunks can exhaust browser quotas, and incomplete MP4 fragments may not play until the browser writes final container metadata. Always verify downloads in a media player before deleting recovery data.

No hidden/passive capture, external transmission, telemetry or remote storage is used. Capturing a screen still requires explicit browser permission.

## Known limitations and qualification

- Full-page screenshot stitching has existing limits for infinite scroll, sticky headers and very large pages.
- Universal offline MP4 transcoding is **not bundled**. Browser native MediaRecorder codec support governs availability.
- Waveform analysis is on demand and only works where Web Audio can decode the chosen video container; failure is reported.
- Clip exports are not codec-level frame-accurate smart renders; editable split and trims use source timestamps with approximate real-time re-encoding.
- Panels have responsive professional layouts, but are not yet user-resizable/dockable.
- The available automation environment cannot load the extension UI in headless Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`), so actual Firefox/Edge/Chrome screen-sharing, Wacom and audio checks are still required.

**Documentation:** [v0.4 engineering release gates](docs/V0.4-STUDIO-RELEASE-GATES.md), [architecture](docs/ARCHITECTURE.md), [test-drive guide](docs/TEST-DRIVE.md).

**Automated checks (Node 22):**

```sh
for test in static routing editor-protocol timeline-camera recorder-controls stop-safety clip-studio-mock clip-timeline-ui repeat-recording ui-structure media-format pdf; do
  node "tests/$test.cjs"
done
```

Copyright © 2026 RawPowered. All rights reserved until a license is selected.

## v0.5 · Layered editing (Razor / Ripple / Graphics)

MangoShot Clip Studio now supports a **Razor (C)** timeline tool: select it, then click the V1 video track where you want to split. **Select (V)** exits the Razor tool. **Ctrl+K** splits at the playhead. Edits are made in *sequence time*, so after trimming or deleting, the playhead, graphic clips and source media remain aligned.

Set **In / Out** values in sequence time, then choose **Ripple delete** or **Alt+Backspace** to remove that interval and close the gap, shifting downstream graphic clips and markers. You cannot delete the entire video by accident.

Use **+ Text** or **+ Callout** to create time-bound graphic layers on tracks **G2** and **G3** above source video **V1**; **A1** remains the existing audio. Presets: None/Custom, Bold Title, Lower Third, Callout Bubble, Spotlight. Text callouts can be customized without a preset. Select a layer to edit time, track, text, font, weight, position, width, color, background, outline, opacity, shadow, fade, and callout pointer; lock/hide/duplicate, or bring forward/send backward. Drag a selected graphic in the monitor to reposition it.

**Layered export:** Visible graphics are rendered directly onto the output video frames. With no edits and no visible graphics, a matching-container export remains an instant byte-for-byte copy. Any visible graphics require real-time re-encoding with browser-native codecs; MP4 may not be available in Firefox. Text/graphics are shown in the editor at preview time and burned into the exported video.

**Projects:** Save project JSON to preserve non-destructive cut segments, graphic layers and sequence markers. First re-open the original local video, then import its project JSON. The project checks source format, byte size and duration. The JSON contains editing text and timing but **not** the original video bytes. Keep both files.

**Not yet implemented:** arbitrary additional imported video tracks, nested compositions, keyframe-based motion, GPU compositing and universal MP4 transcoding. Razor split and real-time export are timestamp-accurate within the browser playback/encoder limits, not guaranteed frame-accurate lossless cuts.

Development branch: `feat/mangoshot-v0.5-layered-editing` (separate from the v0.4 Studio baseline). Browser device/codec and Wacom hardware certification remain pending even though Chromium WebM overlay export and audio were tested locally.

See `docs/V0.5-LAYERED-EDITING.md`.

## v0.5.1 — recorder interaction and Clip Studio workspaces

The recorder displays the selected capture surface type and explains when captured-tab wheel forwarding is supported. **Go to linked source tab** returns to the page where MangoShot was opened; real clicks/typing are performed there. Entire-screen capture of MangoShot itself produces a recursive preview; this does not mean the video is broken. Clip Studio adds Edit / Graphics / Timeline workspaces and quick title/callout actions. See [UX release notes](docs/UX-ITERATION-V0.5.1.md).
