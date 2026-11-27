# Native Overlay Studio — v0.7.54 experimental preview

## Scope

Windows 10/11 Chrome/Edge entire-screen recordings with the optional native Rust host. The browser remains the owner of capture permission and the video encoder. Native messaging is local and session-scoped. The native host cannot start screen recording or inject input.

The overlay uses a top-level Win32 layered window with per-pixel premultiplied alpha, click-through and non-activation styles. Spotlight radius, dimming, feather and ring color use the existing Record Studio controls. Click pulses use sampled primary-button edges. Native pointer telemetry targets 60 Hz; overlay redraw is capped at approximately 30 Hz and limited to 8,294,400 physical pixels (4K UHD). No trails, glow, arbitrary global key bindings, native video encoder or window-level native tracking are included.

## Choose the right mode

- **Clean master:** desktop overlay is blocked. Use existing preview effects and editable camera/FX tracks. Native pointer telemetry and optional registered toggle shortcuts remain available.
- **Composite recording:** explicitly opt into Experimental desktop effects. The native host requires a composite declaration and a Windows consent prompt. The effects are visible on the selected monitor; the capture backend may include them in the source pixels. The second browser effect pass is suppressed to avoid double-dimming. If the browser omits the native window, the composite may omit the effects too. The trace is conservatively marked baked. This is not a reversible live-effects guarantee.

The companion does not call SetWindowDisplayAffinity or claim capture exclusion. Do not enable desktop overlays in a clean-master session until exclusion is separately proven against the actual selected capture backend. Browser capture identity still relies on matching the monitor explicitly; geometry matching is an additional check, not identity proof.

## Setup

Build and register the host using [the companion README](../native/cursor-host/README.md). Start a composite entire-screen recording, open Cursor Focus / Tracking & permissions, connect native host, choose and confirm the exact monitor, optionally select desktop effects and global shortcuts, then approve the native consent prompt. Change Spotlight/Ring from the existing controls; camera zoom stays in the program preview. Disconnect before switching sources. If possible, place Record Studio on a different display to avoid recursive screen capture.

The optional global shortcuts are Ctrl+Alt+1 (spotlight toggle), Ctrl+Alt+2 (ring toggle), Ctrl+Alt+F8 (disconnect native tracking/overlay, not stop video recording). Plain 1 and numpad 1 retain their local tap/hold behavior. RegisterHotKey with MOD_NOREPEAT is used, without keyboard hooks. A registration collision aborts the native connection; reconnect without shortcuts to continue. Native actions return to the existing browser command/settings model. No guarantee of background-browser response latency.

## Qualification gates (not yet certified)

| Gate | Required evidence |
|---|---|
| Build | Rust unit tests, Windows MSVC release compile, JS regressions, unsigned development artifact |
| Overlay | Correct premultiplied alpha, radius/feather/ring matching, no click interception or focus stealing |
| Timing | Measure native samples, display redraw, video frame delay and effect synchronization |
| Scope | Negative-origin monitor, mixed DPI, rotation, boundary exit, resize/hotplug, same-sized monitors |
| Lifetime | Pause, stop, source switch, native disconnect, browser close, expired lease, blocked IPC, rendering failure, shortcut conflicts |
| Capture | Record Chrome and Edge display captures; determine actual inclusion, check no duplicate effects and no unexpected raw-video modifications |
| Clean master | Native overlay option rejected by both browser contract and companion declaration; existing clean-master preview/edit/export verified |
| Exclusion (future) | Prove an overlay-free source under each supported capture backend before enabling live desktop overlays for clean masters; test screen recordings, window recordings, multi-monitor and capture fallback paths |

Microsoft references: [Layered windows](https://learn.microsoft.com/windows/win32/winmsg/window-features), [UpdateLayeredWindow](https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-updatelayeredwindow), [RegisterHotKey](https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-registerhotkey), [SetWindowDisplayAffinity caveats](https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity).

This preview must not be distributed as a stable Windows companion before a successful build and actual-hardware qualification.
