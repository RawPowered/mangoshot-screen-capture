# MangoShot v0.6 workspace preview

**Development work only.** The public release remains [v0.5.7-preview.1](https://github.com/RawPowered/mangoshot-screen-capture/releases/tag/v0.5.7-preview.1).

This branch is the first implementation pass of the multi-media editing architecture: a compact Clip Studio workspace with a local media registry and a v2 project schema. The capture/recorder pipeline inherited from v0.5.7 remains untouched.

**Important:** imported secondary images, videos and audio can be previewed in the Media Bin and staged for later compositing, but **they are not yet included in the Program Monitor or exported video.** Existing V1 source editing, G2/G3 text/callouts, Razor, Ripple Delete and AutoCut remain on the current engine.

See [development scope, tests and known limitations](docs/V0.6-A-B-WORKSPACE.md).

For installation, use a separate directory from the published v0.5.7 build and load it as an unpacked extension via your browser's developer mode. Save recordings first; changing extension paths can isolate local recording storage.
