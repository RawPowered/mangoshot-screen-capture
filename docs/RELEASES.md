# MangoShot Releases, Licensing and Updates

## Current release

**Latest development prerelease:** [v0.6.18-layers-alpha.2](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.6.18-layers-alpha.2).

The manifest stays at version **0.6.18**. Alpha.1 delivered layer clipboard, Alt-drag clone, live layer appearance and selection-aware shortcuts. Alpha.2 is a **documentation, license and distribution refresh** based on the same editor runtime; it adds a complete README, custom MangoShot Community Source-Available License, contributor policy and license-bearing release ZIP.

This remains an alpha, not a signed or independently certified stable browser extension.

### Official artifacts

- Complete Extension ZIP, including the browser runtime and the LICENSE/README.
- Source ZIP containing the full tagged source, tests, tools and legal documents.
- SHA256SUMS.txt for both ZIPs.
- Tagged GitHub release notes covering features, license, limitations, installation and rollback.

Older alpha releases may offer **version-specific** in-place upgrade overlays. Use only an overlay whose baseline tag matches your unpacked installation exactly. For older versions or new installations, use the full Extension ZIP.

## License

MangoShot is **free to use, source-available and not for resale**. The [MangoShot Community Source-Available License 1.0](../LICENSE) is **not OSI-approved open source**, because it restricts paid redistribution. Private modification and compliant free sharing are permitted; resale, paid software bundles and hosted paid access require written permission.

RawPowered reserves the right to release **future** versions commercially or as closed-source software. That does not retroactively cancel permissions granted to compliant recipients of older copies licensed under these terms. Relicensing third-party code or contributions may require separately obtained rights. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Versions published before the license file was included are not automatically retroactively relicensed; inspect the notices and legal terms applicable to each release tag.

## Branch and release policy

The default `main` branch remains an older source baseline. For the current working runtime, use the current **tagged source archive**, not `Code → Download ZIP` on main. Published tags and assets are immutable: do not rewrite them. If a documentation or policy correction is needed, issue a new alpha suffix with separate checksums and clear notes.

Before publishing a preview:
1. Branch from the latest tested source and verify README, licensing, attribution and release notes.
2. Run all repository tests, JavaScript syntax checks and packaging checks.
3. Build the complete extension and tagged source ZIP from the same commit; include LICENSE.
4. Validate ZIP integrity, manifest version, required runtime files and SHA-256 checksums.
5. Publish an immutable prerelease; read back the tag, asset names, commit and checksum results.
6. Only then update main README and the informational update feed.
7. Promote to stable only after real Chrome/Edge/Firefox, Wacom, codec and accessibility testing passes.

Automated CI does not establish physical hardware/browser acceptance.

## Installation and upgrade

1. Export any important videos/projects. Back up the current unpacked extension folder and preserve browser-local recording storage.
2. Download the **full Extension ZIP** from the desired tag and extract it over the **same directory that contains manifest.json**.
3. Reload from `chrome://extensions` or `edge://extensions`. On Firefox use `about:debugging#/runtime/this-firefox` to load the temporary add-on again; Firefox temporary installations do not persist through restart.
4. Verify visible/full/area capture, annotations, recording/audio, Undo, Wacom and Clip Studio before deleting any backup.

Changing the unpacked extension folder can change Chromium extension identity and isolate historical recordings. **Do not uninstall or wipe extension storage** to update.

The [preview feed](../updates/preview.json) is informational; unpacked development extensions do not automatically install from it.

## Integrity

Download the release's ZIPs and SHA256SUMS.txt into one directory. Verify with:

```sh
sha256sum -c SHA256SUMS.txt
```

On Windows, calculate a ZIP hash using PowerShell `Get-FileHash -Algorithm SHA256` and compare it with the matching checksum file. Do not mix files from different tags.

## Alpha limitations

- No browser-store signing or universal browser/OS certification.
- Microphone/system audio, MP4 encoding and Wacom pressure/eraser-tip behavior are hardware/browser-dependent.
- Media Library staging is not full arbitrary multi-source composition.
- Transitions are single-source treatments, not true two-source cross dissolves.
- Local Quick Cutout is not remove.bg-style AI segmentation.
- Overlay erasers and redact annotations do not irreversibly destroy underlying screenshot pixels.
- Browser video recomposition may be close to real time.

Read [README](../README.md) and the specific release notes for detailed feature scope and limitations.
