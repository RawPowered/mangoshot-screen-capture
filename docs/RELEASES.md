# MangoShot Releases and Updates

## Public distributions

MangoShot publishes preview and future stable releases from the existing [official GitHub repository](https://github.com/RawPowered/mangoshot-screen-capture) under [GitHub Releases](https://github.com/RawPowered/mangoshot-screen-capture/releases). Each version has a tag, browser-extension ZIP, source/tools ZIP, SHA-256 checksums and release notes.

## Version channels

- **Preview:** `vX.Y.Z-preview.N` — local-first engineering preview. Cross-browser behavior and Wacom/codec integration are still under test.
- **Stable:** `vX.Y.Z` — only after manual Chrome/Edge/Firefox release gates pass. No store-certified stable release has yet been published.

The manifest version is the core `X.Y.Z`, without the GitHub prerelease suffix.

## Publishing future previews

1. Make changes in a new feature branch, preserving the last published tag.
2. Run all `tests/*.cjs`; complete real-browser screenshots and recordings with native hardware and check playable outputs.
3. Create a `release/vX.Y.Z-preview.N` branch from the tested source and update `manifest.json` and `docs/releases/vX.Y.Z-preview.N.md`.
4. Commit to the release branch. The `Publish MangoShot Preview` GitHub Actions workflow runs all tests, builds the extension ZIP and source ZIP, verifies them, creates checksums, and publishes a prerelease.
5. Read back release metadata, file sizes and checksums. Never rewrite a published tag or overwrite versioned assets.
6. Only after the release exists and the files are verified, update the README and `updates/preview.json` on `main`.

A passing CI workflow is not a substitute for full Windows, Wacom and browser-device qualification.

## Updating unpacked extensions

1. Export videos and current projects. Preserve Recovery Library data before removing or replacing your installation.
2. Download the new **Extension.zip** asset, extract it, and back up the prior extension directory.
3. **Chrome/Edge:** replace files in the *same original unpacked directory* and click Reload in `chrome://extensions` or `edge://extensions`. Changing folder identity can isolate the extension's prior IndexedDB data.
4. **Firefox:** load `manifest.json` again using `about:debugging#/runtime/this-firefox`. Temporary add-ons do not persist through a browser restart.
5. Verify visible-page screenshot, full-page screenshot, recorder, and Clip Studio behavior before deleting backups.

The preview update catalog at `updates/preview.json` is informational; **there is no automatic install/update from GitHub** in unpacked development versions.

## Release integrity

Published assets include `SHA256SUMS.txt`. To check on a Unix-like system, run `sha256sum -c SHA256SUMS.txt` in the directory with the two ZIPs. On Windows, `Get-FileHash <filename> -Algorithm SHA256` in PowerShell can calculate each digest for comparison. Keep ZIPs and checksums from the same version.

## Known current limits

A preview does not imply signed browser-store distribution, universal audio capture, native cross-browser MP4 transcoding or frame-exact video editing. An interrupted MP4 stream may be unrecoverable; do not treat temporary fragments as a verified final download.
