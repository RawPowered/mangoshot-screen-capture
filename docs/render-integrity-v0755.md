# v0.7.55 Render Integrity Hotfix — development preview

Overlay on v0.7.54 Native Overlay Studio (dc016bd9c8c35e9dccde19e4b85f5c1701403292). Back up the extension folder and saved v2 projects before replacing files; reload the same unpacked extension.

## What changed
- Preview and export call a shared canvas compositor with the same committed camera, cursor, grading, secondary media and graphics ordering. Selection handles and temporary motion drafts stay preview-only.
- Non-streaming export composes frames using the decoder's source position and pauses the encoder between disjoint source ranges. The existing streaming path also calls the shared compositor. Hidden-tab exports are canceled. Export summaries count composed frames, not independently decoded encoded frames.
- Restore missing clean-master live tracks without clearing existing camera/post regions. Selected region appearance changes commit immediately; timing changes use Update selected. New drafts require Apply. Apply style across retained footage adds a post-effect track without inventing missing pointer samples.
- Bounded trailing clock overhang can be trimmed without shifting timestamps; excessive mismatches remain rejected. Finalization failures no longer prevent preserving the video.
- Thumbnail generation uses a verified duration, an attached decoder, source-scoped caching and progress feedback. CSS restores thumbnail visibility through selected V1 overlays. Focus monitor temporarily hides timeline and media dock.

## Verify your existing recording
Open latest recording (not a bare imported video), inspect committed cursor FX and camera counts. On the Cursor tab inspect frame/source samples. If clean, click Restore captured live tracks to recover missing regions; select a region and change Spotlight/Ring or create a new effect draft and apply it to retained footage. Seek into a blue/green cursor coverage interval. Preview effects should appear without hovering in the editor. Generate thumbnails, use Focus monitor, then render a short edited MP4/WebM while the tab remains visible. Confirm visible effects in the actual exported file, not only the frame count. Test undo, redo, cuts, camera animation, pause, and saving/reloading v2 project. Repeat a short clean-master recording with authorized linked-tab or native tracking. Composite recording may have baked effects.

## Qualification
Pure JavaScript compositor tests with mock canvas operations passed in source review; syntax checks passed. Real-browser decoder, thumbnails, MediaRecorder output pixels, audio/cut timing and Windows hardware remain unqualified. Native host binaries are unchanged and not included. There is no recovery for actual pointer coordinates that were never captured. The exact cause of the user's earlier missing exported effects cannot be established from the screenshot alone. No main merge or stable release.
