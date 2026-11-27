# Clean Master Compositor (0.7.52 preview)

This is a development preview on the 0.7.51 cursor-integrity baseline. It does not replace the published stable extension.

## Use

1. Open Record Studio. Enable **Editable cursor & camera recording (clean master)** under Capture before pressing Record. Existing composite recording remains the default.
2. Select the source through the browser picker. For actual browser-tab pointer data, explicitly connect the same authorized linked tab. For window/display capture, pointer tracking remains limited to interactions in the recorder preview.
3. Use manual camera controls, spotlight, ring, or smart zoom. The preview renders effects while a separate fitted, neutral canvas feeds the encoder. Ink is disabled in clean mode. Captured native cursor pixels are not removed.
4. Stop and open the result in Clip Studio. Compatible telemetry reconstructs captured camera events and a separate LIVE FX lane. CUR PATH and LIVE HISTORY retain reference data. POST FX remains independent.
5. Select a live FX region to edit its timing, appearance or enable state; edit reconstructed camera events in Zoom Studio. Use Save v2 project for all metadata. Export an edited MP4/WebM to render effects; Download original in Record Studio produces clean footage. The original video remains unchanged.
6. The Restore captured live tracks button can restore imported events when camera/live FX tracks are empty (full source required for restoring camera motion). Existing post effects remain intact.

## Known limitations

- Camera reconstruction is sampled/approximate, not frame-exact. It is bounded to 240 camera events and 120 regions on each cursor-effect track. Zoomed letterboxed source geometry, gaps and truncated/over-budget paths are not automatically reconstructed.
- The actual operating-system cursor may be embedded by the browser's capture API. No system-wide mouse hook or monitor overlay is implemented here. Effects are visible in Record Studio's preview only.
- Ink is deliberately unavailable in clean mode until it has its own editable track. Original composite mode still supports ink.
- Clean source/camera/effect core and overlap tests are available at `node tests/clean-master-v0752.cjs`. Real Chrome/Edge/Firefox capture, pause, source switching, persistence, export, transition and performance qualification must precede release.

## Manual qualification

Record at least 30 seconds of an authorized linked tab. Use zoom, spotlight, clicks, hold/release, pause/resume. Verify that the raw video contains no MangoShot effects, Clip Studio restores the path and live controls, disabling Live FX leaves POST FX intact, camera events can be modified, and edited preview/export match within the measured sampling tolerance. Repeat with monitor/window selection, source changes (same and different aspect ratios), project v2 save/reload, completed recovery, composite mode, and the browser's fallback encoder path. Do not mark a missing pointer feed as a successful desktop tracking test.
