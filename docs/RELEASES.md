# MangoShot versioning and updates

## Official distribution

Source repository and update catalog: https://github.com/RawPowered/mangoshot-screen-capture

User download page: https://github.com/RawPowered/mangoshot-screen-capture/releases

MangoShot uses the existing **public GitHub repository** as its source and release repository. A second forked codebase is unnecessary. Each version gets a tag, release notes, checksums and downloadable ZIPs.

## Channels

- **Preview**: `vX.Y.Z-preview.N` — public engineering/test-drive release; identified as a GitHub prerelease.
- **Stable**: `vX.Y.Z` — only after Windows Chrome, Edge and Firefox release gates pass. No stable release has been certified yet.

The current manifest version remains `0.5.6`; the preview suffix is the GitHub packaging/release identifier.

## Releasing future previews

1. Develop on an isolated feature branch and keep the previous release intact.
2. Run the full Node regression suite, test an actual extension install, and verify video/audio output.
3. Create a branch named `release/vX.Y.Z-preview.N` from the exact approved commit; update `manifest.json` for core version changes.
4. Add versioned notes in `docs/releases`, update the release workflow's notes path/title for the new version, and push the release branch.
5. GitHub Actions runs regressions, builds the extension ZIP and full-source ZIP, produces SHA256 checksums, and publishes a GitHub prerelease.
6. Verify the published release assets, URLs, download hashes, and version before distributing links. Never overwrite published versioned binaries.
7. Update the preview channel feed at `updates/preview.json` only after the new release is confirmed.

**Workflow prerequisites:** Repository Actions must be enabled; the release job needs `contents: write`. If GitHub blocks automated publication, a maintainer can create the release manually using the matching tag and upload the verified artifacts. Do not claim publication on branch creation alone.

## Installing/updating unpacked extensions

- Chrome: `chrome://extensions` → Developer mode → Load unpacked, or Reload for existing install.
- Edge: `edge://extensions` → Developer mode → Load unpacked, or Reload.
- Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on. A signed Firefox add-on is needed for persistent store-style installation.

**Preserve your local recordings.** First export any video in Recovery Library or Clip Studio. For Chromium unpacked builds, replace files in the same original path and reload rather than loading a new copy from an unrelated folder: a new extension ID can isolate stored recordings.

Unpacked extensions do not silently self-update from GitHub. This catalog is for human-guided version checks, not a claim of Chrome Web Store or Mozilla Add-ons publication.

## Integrity and release gating

Every published version must have: a passing regression report; unpacked ZIP with `manifest.json`; matching SHA256SUMS; public release/tag; installation instructions; and release notes. A preview is not a substitute for manual browser certification.
