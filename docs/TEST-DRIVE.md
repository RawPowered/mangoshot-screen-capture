# MangoShot v0.2.1 — guided first test drive

Use test/demo pages, not customer systems or sensitive data, until capture, audio and export behavior has been checked.

## 1. Installation and permissions

- Extract the ZIP and load unpacked / temporary extension as described in the README.
- Verify the toolbar icon appears as a dark square with an orange mango.
- Verify the extension requests `activeTab` and `scripting` rather than broad all-sites access.
- Open a regular HTTP(S) site and pin/open the popup.

## 2. Visible screenshot

- Click **Capture visible area**, leave the source tab active until capture finishes, then inspect the editor.
- Draw a pen stroke and a rectangle; click Undo. Add an arrow and text.
- Use Redact to cover a test-only region, and export PNG. Open the exported PNG and verify those pixels are covered.
- Export PDF, open it, and verify no blank pages.

## 3. Full-page screenshot

- Select a long, static webpage (approximately 2–4 screens).
- Click **Capture entire page**. Keep the captured tab active while MangoShot scrolls it.
- Confirm the editor eventually activates, scroll position returns, and the entire page is present.
- Inspect seams, sticky headers, cut-off content, blank strips and lazy images. Report the URL and screenshots if a seam fails.
- Try a long page; the app should refuse unsafe dimensions rather than freeze.
- Try a horizontally overflowing page; it currently reports an explicit limitation.

## 4. Pen / Wacom

- Connect the Wacom tablet and make sure its Windows driver is running.
- Test pen strokes and pressure changes on the screenshot canvas.
- Try arrow, highlighter, text, eraser, redaction and undo; confirm the exported PNG and PDF match.
- Test a high-DPI monitor at 100%, 125% and 150% Windows scale if available.

## 5. Video recording

- Open **Record screen / audio**. Confirm an idle instruction appears instead of an unexplained blank screen. Leave mic unchecked for first video.
- Click Start and select a browser tab or window from the browser-owned sharing picker.
- Draw on the *preview* during recording; the ink should be embedded in the resulting video.
- Pause, resume, then Stop & save; check file extension, actual playback and duration.
- Repeat with microphone enabled; verify it is audible in the file. If mic permission is denied, video should continue and status should explain audio is unavailable.
- Repeat with shared audio; some Firefox / OS combinations will not provide a track, even when requested.
- Stop sharing using the browser UI and confirm the recording finalizes.

## When a capture fails

- The editor should display an explicit failure, not `Frame 2 / 1` or a blank white capture.
- If capture is unsuccessful, reopen the source page and click the extension icon again so the `activeTab` grant renews. Reopening the editor URL itself is not a valid way to initiate a capture.
- If recording is blocked, **click Start recording**, check whether the native browser share picker opens, and note the precise status text if it does not.
- Do not expect a live preview before clicking Start and choosing the browser's capture source.

## What to report

Browser and version, Windows build, monitor scale, Wacom model/driver, target URL (only if safe to share), selected recording source, what failed, and any errors shown in MangoShot's status area.

## Known limits in 0.2.0

No desktop-wide annotation overlay, no guaranteed MP4 transcode, no scrolling capture of horizontal overflow or virtualized/infinite pages, no region-selection capture, no browser-store signing yet. This is a local test-drive build, not a finished FireShot replacement.
