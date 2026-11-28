# v0.7.56 Core Integrity Pass 1 — development preview

Apply only over v0.7.55 (source commit 52200e606a60aff21d9dddd03b412575c7c9a3bc). Back up the complete unpacked extension, export important originals and projects, and reload the same extension folder after replacement. Native companion binaries are unchanged.

Changes: transition cursor rendering now follows the active source drawing; non-transition composition checks expected cursor region IDs per submitted sample; camera edge trims consume the transaction's removed ranges; audio initialization fails closed; encoded dimensions and duration are checked before download; one Save Project route preserves v2 metadata and bounded embedded narration (8 MiB audio / 16 MiB total metadata). Existing separate relink/restore flow remains. Duration-changing edits with session narration are blocked to prevent silent misalignment. Resume explicitly reports the need to reconnect source tracking.

Limits: transition masks can obscure effects; callback checks do not independently verify encoded pixels or missing output frames. Metadata duration tolerance is 0.25–0.75 seconds; audio track inspection is browser-dependent. Native pause/resume continuity, telemetry journaling, independent audio-track ripple, complete tool inventory, and workspace consolidation remain pending. Legacy v1 import is retained. Successful v2 restore clears prior undo history. No stable release or Windows hardware qualification.

Manual qualification: record an authorized source; pause/resume/reconnect; switch monitors; edit cursor effects and camera; trim clip edges; save/reopen narration; generate thumbnails; render short MP4 and WebM; independently inspect decoded effects and audio.
