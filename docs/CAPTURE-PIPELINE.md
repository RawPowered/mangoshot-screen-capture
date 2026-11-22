# Screenshot pipeline — v0.5.7 preview

## Why this changed

The previous design opened Image Studio as an inactive tab and relied on extension-wide broadcast messages to forward every PNG frame. When capture initialization, tab selection or frame delivery failed, an uninitialized canvas could remain visible as a small blank placeholder.

## Visible capture

The user clicks the toolbar button. The popup immediately captures the current active `http(s)` tab via `tabs.captureVisibleTab` under the browser's `activeTab` grant. The PNG is checked for a valid image header and natural dimensions; one complete capture record is saved to extension-local IndexedDB. Only then does Image Studio open and consume it.

## Full-page capture

The popup authenticates and initializes a session in the background. A content script scrolls the source tab and requests PNG frames one at a time. The background validates frame indexes, maintains Chromium's two-calls-per-second rate limit, and completes a local IndexedDB bundle. It opens Image Studio only after saving that complete bundle. The source tab is required to remain active during capture.

## Error and security requirements

- No output is displayed as ready without a complete, valid screenshot bundle.
- Failure is shown explicitly in Image Studio or the popup.
- No website or remote upload is used to transfer screenshots. Data is stored under the extension's origin.
- The handoff bundle is deleted after the image has been assembled successfully. Errors do not silently convert an incomplete frame collection into a blank image.
- Backwards compatibility is limited to the current extension code. The older v0.5.6 preview remains a separate tagged release.

## Test matrix

- Toolbar direct capture on a single viewport.
- Full page with two and three frames and bottom overlap.
- Browser returns missing PNG data, invalid frame order, restricted tab, tab switched during scroll.
- Local storage unavailable/quota reached.
- PNG/PDF export and annotation tools after capture.
- Browser versions: Chrome, Edge, Firefox; Windows Wacom interaction.

Runtime browser validation is a release gate and must not be inferred from Node mocks alone.
