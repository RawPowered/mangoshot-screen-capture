# MangoShot 0.7.59 — Professional workspace consolidation

Development delta over 0.7.58. Existing command handlers and project schemas are retained. This is a UI organization pass, not a new rendering engine.

## Control ownership

| Function | Primary access | Intentional secondary access |
| --- | --- | --- |
| Recording configuration | Recorder / Capture | Existing transport starts the browser picker |
| Live cursor effects | Recorder / Cursor FX | Monitor quick controls |
| Actual pointer tracking | Recorder / Tracking | Status-summary link |
| Ink | Recorder / Ink | Existing annotation shortcuts |
| Sequence editing | Clip Studio / Edit | Timeline toolbar and edit menu |
| Graphic base geometry and timing | Graphics / Transform | Timeline gestures |
| Graphic transform keyframes | Graphics / Motion | Motion ribbon, timeline keyframes, Keyframe menu |
| Graphic styling and typography | Graphics / Design, Appearance, Presets | Effects Studio for ordered effects |
| Camera animation | Camera | Camera timeline and Camera Studio |
| Recorded pointer and post effects | Cursor | Cursor tracks and expanded Cursor Studio |
| Narration | Audio | Narration track |
| Source analysis | Edit / Source analysis | Existing commands |
| Project persistence | Projects | File menu |
| Rendering profile and export | Export | File menu |

Original control nodes are moved rather than replaced with independent state. Some legacy command targets remain hidden as compatibility aliases. Batch compositor and independent Sequence editor remain available; they are not merged into Motion Studio.

Tracking consent is never granted by navigation. Linked-tab authorization is shown only after ready/resume acknowledgement; native authorization is reported only while active. Capture audio choices are locked during source selection and the recording. Existing clean-master rules remain enforced.

## Qualification

Run node tests/professional-workspace-v0759.cjs. The focused check validates navigation, tracking summary states, source ownership and integration references. Manual browser qualification remains required at 1920x1080, 1366x768, 1024x768, 800x600 and 125/150 percent display scaling. Check tab navigation, hidden inspector reopening, focused layer selection, pointer capture, source picker cancel, pause/resume, capture result labels, project save/open, export and input availability. The Windows native binary is unchanged. No visual pixel or real capture certification is claimed by this pass.
