# MangoShot v0.5.1 — interaction reality and workspaces

## Field findings
- The sample MP4 is a valid 76.34 s H.264/AAC recording. It captures the recorder itself on the selected display, causing recursive mirror images. This is not evidence of an encoding failure.
- The capture preview is video. Captured Surface Control can forward **wheel** events only for a browser tab where supported; it cannot remote-click or type into a captured monitor, window, or application.
- Firefox does not support `CaptureController.forwardWheel` in the same way as supported Chromium versions; the explicit source-tab fallback is retained.

## Recorder improvements
- Source mode badge: BROWSER TAB, APPLICATION WINDOW or ENTIRE SCREEN.
- Contextual guidance states what will and will not work for the chosen source.
- A button returns the user to the **linked page which launched MangoShot**, without ending the current recording. Important: this tab is not guaranteed to be the same surface selected in the browser picker.
- Chromium `forwardWheel` is registered on the whole preview container rather than the obscured source video element to accept mouse wheel events over layers. This feature remains permission-based and may forward wheel events without Ctrl+Alt after enablement.
- Hold Ctrl+Alt + wheel with linked fallback authorization remains available where the original source page is permitted.

## Clip Studio workspace switcher
- Edit, Graphics and Timeline layouts, keyboard Shift+1/2/3 outside form inputs, locally stored preference.
- Quick Add Title and Quick Add Callout controls near timeline tools. They use the established graphics edit actions.
- Compact shortcut disclosure and responsive panel improvements.

## Release testing
1. Record an entire monitor containing the recorder. Expect the mirror and a source-type warning. Click **Go to linked source tab** and make an edit in the actual tab while capture continues. That tab must be the page used to launch MangoShot.
2. Record a browser **tab** in supported Chrome/Edge, enable captured-tab wheel forwarding, then scroll over the monitor. Verify the browser forwards wheel events when permitted. Do not expect click or typing forwarding.
3. Firefox: explicitly authorize linked-tab fallback and hold Ctrl+Alt+wheel over preview, then check actual linked tab scrolls.
4. Import a recording and switch Edit/Graphics/Timeline; add Title and Callout from quick actions. Confirm the underlying G2/G3 layer operations and exports are unaffected.
5. Test Ctrl+drag Wacom zoom, screenshot PNG/PDF, video stop, recovery, MP4/WebM, and 3 consecutive recording sessions.

## Not implemented in v0.5.1
Desktop-wide remote control, arbitrary monitor clicks/typing, a signed native host, universal MP4 conversion, multi-video-track import, and keyframe animation remain outside this patch.
