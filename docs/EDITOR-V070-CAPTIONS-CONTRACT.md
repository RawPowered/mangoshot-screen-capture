# MangoShot v0.7 — Editor Core and Captions Contract

Status: **design contract only**. This document does not claim that transcription, caption rendering, or caption-aware edit transactions are implemented.

## Patch A: Command architecture

- Keep the portable v2 shortcut profile schema and per-editor keymaps.
- `Ctrl+` in portable profiles represents the primary editor modifier (Ctrl on Windows/Linux, Command on macOS).
- Explicit `Meta+` shortcuts remain explicit; conflicting physical combinations must be rejected.
- Tool, menu, button, and palette actions must converge on one edit action with one undo history entry.
- Shortcuts never fire in live text input, editable content, IME composition, or modal dialogs.
- A selected Image Studio layer remains an editing context even if its layer-row control retains focus. Space and Enter must still activate the focused control.
- Preserve browser/system reserved shortcuts and leave unhandled events uncancelled.
- Store profile data locally. Never silently rewrite persisted user keymaps.

## Patch B: UIX and property contract

A tool declares `id`, `label`, `icon`, `category`, `shortcutAction`, and a typed properties descriptor. Inspector, Tool Options Bar, tooltips and command search read from this descriptor rather than creating duplicate state. Multi-selection properties report mixed values, and multi-property gestures commit as one undoable transaction.

Workspace layout state is separated from project data: panel docking, visibility, sizes and workspace presets are user preferences, while media, layers, captions and edit decisions belong to the project.

## Caption document structure (proposed v3)

```json
{
  "schema": "mangoshot.captions.v1",
  "timebase": "sequence-seconds",
  "language": "en",
  "tracks": [{
    "id": "captions-1",
    "kind": "closed-caption",
    "name": "English",
    "visible": true,
    "styleId": "default",
    "cues": [{
      "id": "cue-1",
      "start": 1.2,
      "end": 2.8,
      "text": "Example caption.",
      "words": [
        {"text": "Example", "start": 1.2, "end": 1.82},
        {"text": "caption.", "start": 1.85, "end": 2.8}
      ],
      "speakerId": null,
      "styleOverrides": {}
    }]
  }],
  "styles": {"default": {"fontFamily": "sans", "fontSize": 42, "color": "#ffffff"}}
}
```

### Timing and editing invariants

1. All persisted cue times are **edited sequence seconds**, not original media timestamps. Source ASR word times must be mapped to the edited sequence using `MangoSequenceMedia`.
2. `start < end`, finite non-negative times, and all word times fall within their parent cue. Track order is deterministic. Respect project duration and per-track constraints.
3. Split/ripple/trim operations transform cues and word intervals in the same transaction as graphics and markers. In a removed region, delete wholly removed cues; split or clip partially intersecting cues and preserve only valid words. Seek and export must use the same mapping.
4. Captions, transcript source text, and animated on-screen titles are distinct objects. Converting captions into title graphics must not discard underlying captions.
5. Importing legacy v1/v2 projects cannot change their edit decisions. Migration to a future v3 is explicit and versioned.
6. Text is untrusted media data. Render caption text as text, not HTML, and never treat project imports as executable content.
7. Support local SRT and WebVTT export first. Burned-in rendering comes after preview/export parity; embedded codec tracks are a separate capability.
8. The transcription pipeline is optional, local-first and permission-bound. An external transcription provider requires explicit opt-in, and local model downloads require consent and integrity checking.

## Incremental release gates

- **Patch A**: focus-aware and cross-platform shortcut dispatch, conflict detection, all existing regression tests, live browser keyboard acceptance.
- **Patch B**: synchronized tool descriptors and dockable workspace persistence with visual QA.
- **Patch C**: caption validation, edit transactions, manual transcript/cue editor, SRT and WebVTT, round-trip project tests.
- **Patch D**: optional on-device ASR, word timing refinement, styled titles, preview/export parity, large-recording performance verification.

## Current limitations

Current v0.6.18 media-track v2 supports staged secondary media but does not guarantee full multi-source composition. Caption generation must start from the verified primary audio source; do not represent multi-track mix transcription or embedded captions as available before separately tested.
