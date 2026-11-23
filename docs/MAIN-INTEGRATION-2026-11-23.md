# MangoShot main integration — 2026-11-23

This merge deliberately joins independent Git histories without a force push.

- First parent: preexisting `main` (branding, licensing, documentation)
- Second parent: `feature/v0.7.1-viewport-precision-tools`, descended from immutable `v0.6.18-layers-alpha.2` release source and including Patch A + B + B.1
- Preserve verbatim the existing `main` binary `assets/branding/mangoshot-wordmark.webp`.
- Preserve the source-available/no-resale `LICENSE` without changing any terms.
- Update the README and release notes to distinguish unreleased development source from the last official prerelease.
- No Allstate Solar, New Era or email subdomain assets are brought into this repository.
- No release tag, updater feed, browser-store listing or deployment is changed.

**Post-merge gates:** GitHub regression CI, package integrity, physical Chrome/Edge/Firefox and Wacom acceptance, and real export workflows must pass before promoting a v0.7 release. Caption tracks, speech recognition, and full multi-source media composition remain separate future work.
