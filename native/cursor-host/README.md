# MangoShot native cursor host (v0.7.53 development preview)

## Contract
Windows 10/11, Chrome or Edge, entire-screen capture only. Browser still owns capture permission, audio, encoding, source switching, local clip storage and export. This companion emits normalized monitor-local cursor positions and sampled primary-button down edges during a user-confirmed recording. It does not capture keystrokes, inject input, read windows or documents, take screenshots, listen on sockets, or store telemetry on disk.

Physical cursor coordinates are mapped against a per-monitor DPI-aware physical rectangle. The user must match the exact monitor chosen in the browser picker: aspect-ratio matching alone cannot disambiguate same-sized monitors. Monitor geometry is revalidated before each sample. Mixed DPI, rotation, and display hot-plug require hardware qualification.

Native messaging uses bounded length-prefixed JSON over stdio. The host is launched by the browser only after explicit Connect. Hello enumerates displays without sampling the pointer. Start requires a session ID, a selected monitor and an affirmative Windows confirmation dialog. The selected monitor is the only coordinate scope; outside it the host emits a null position. Mouse button state is queried only inside the selected rectangle. Sampling targets 60 Hz (16 ms), not a guaranteed rate or lossless click event stream. The existing video-frame pipeline retains path samples around 30 Hz and uses receipt-time recording timestamps. Pause, source switch, stop, page close, IPC loss, stale delivery or 15-second heartbeat expiration terminate native tracking. A new connection and confirmation are required after pause or switch.

## Build and register (Windows)
Install stable Rust and the Visual Studio C++ build tools appropriate for the MSVC target. From the repository root:

```powershell
cargo test --manifest-path native/cursor-host/Cargo.toml
cargo build --release --manifest-path native/cursor-host/Cargo.toml
```

Load the unpacked extension from this branch in Chrome or Edge. Copy its actual 32-character extension ID from the browser's extensions management page. Do not substitute an ID from another installation.

```powershell
.\native\cursor-host\install.ps1 -Browser Chrome -ExtensionId YOUR_EXTENSION_ID -ExePath .\native\cursor-host\target\release\mangoshot-cursor-host.exe -WhatIf
# Inspect the intended registration, then rerun without -WhatIf.
```

Use `-Browser Edge` for Edge. Keep the compiled executable at the registered path. The script writes only a user-local manifest and one native messaging registry key; it refuses to overwrite an unrelated existing host registration. To unregister:

```powershell
.\native\cursor-host\install.ps1 -Browser Chrome -Uninstall
```

No elevated installer, startup service, Firefox registration, signed binary or public release is supplied in this preview. Verify the build before registering. Registration is not permission to begin recording.

## Record Studio
1. Optionally enable clean-master recording, then start an entire-screen capture with the browser picker.
2. Open Cursor Focus → Tracking & permissions → Windows native cursor. Connect native host.
3. Choose the exact captured monitor. Confirm the match and enable native tracking. Approve the native consent dialog. The dialog can appear in the recording because it is not capture-excluded.
4. Interact with applications on that monitor. Spotlight/rings/smart zoom can use native coordinates in Record Studio's preview. Existing local capture saves native provenance, movement and clicks. Open in Clip Studio to edit clean-master camera/live effects.
5. Disconnect or stop. If switching or pausing, reconnect and reconfirm the new source after resuming.

## Release gates
Run the native Rust tests and JS contract tests in CI, then install and exercise on actual Windows hardware: single display; negative-origin second display; mixed 100/150/200% DPI; rotated monitor; move across monitor boundary; unplug/resize; swapped mouse buttons; very short clicks; monitor mismatch; declined consent; pause/resume; source switch; stop; browser close; host missing; corrupt/stale protocol; hidden preview; CPU/IPC load. Compare cursor position and timing against the captured footage. Confirm the host is idle before approval and terminates on lease loss. Check clean and composite modes, recovery, saved v2 projects and preview/export.

Actual-monitor overlays, native video capture, cursor-pixel exclusion, global shortcut registration and exact timestamp synchronization are deliberately outside this patch. Do not label this preview as complete desktop effects or frame-accurate native capture. The next overlay prototype must demonstrate exclusion from each selected capture API before enabling clean-master overlays; no automatic enabling.
