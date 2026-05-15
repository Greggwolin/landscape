# Landscape Project Instructions — Version History

This file holds the full version history for `PROJECT_INSTRUCTIONS.md`. The canonical file keeps only the latest two entries to reduce token overhead in agent sessions; everything older lives here.

---

**v4.6 (2026-05-07)** — Three changes. (1) Tightened §5.7 to a hard rule with a single-fact carve-out — closes the recurring slippage of technical jargon and code/SQL bleeding into chat replies. Long chat threads stay navigable as a side effect; Gregg keeps track of which CC sessions tie to which threads. (2) Added §22.6 (Pre-branch/worktree commit discipline) — every new branch starts on a clean foundation, every commit list shown to Gregg gets a plain-English description, never a bare hash. (3) Back-ported §21 (Feedback Lifecycle Tracking, including §21.9 resolution-language detection) from Cowork-side v4.2/v4.3/v4.4 — closes the v4.1→v4.5 drift the v4.5 changelog flagged. Full version history moved to this file.

**v4.5 (2026-05-06)** — Added §22 (Working-Tree Hygiene) — session-start triage in Cowork plus a daily-brief audit section that surfaces aged uncommitted files. Closes the recurring "stale items pile up across sessions" failure mode that Gregg flagged after FB-292 landed (admin feedback page edit + reference PDFs sat uncommitted across multiple chats without ever getting confronted). Added matching anti-pattern in §6 and two success metrics in §20. *Note on drift at the time of release:* the Cowork-side and Claude-side project knowledge was at v4.4 (with §21 Feedback Lifecycle Tracking and §21.9 resolution-language detection) but the repo file was on v4.1. v4.5 skipped straight from v4.1; the v4.2/v4.3/v4.4 §21 content was back-ported in v4.6.

**v4.4 (2026-05-05)** — *(Cowork / Claude project knowledge only at the time of release.)* Session-credit / context-budget pass. Extracted long-form templates (CC prompt header, handoff doc format, formal correspondence rules, downstream-impact example block) to a new reference file `docs/PROJECT_INSTRUCTIONS_REFERENCE.md`. Behavioral rules unchanged; only literal template bodies moved.

**v4.3 (2026-05-05)** — *(Cowork / Claude project knowledge only at the time of release.)* Added §21.9 (Resolution-language detection) for LSCMD-FBLOG-0505-kp Phase 5. HIGH-confidence threshold + ASK-first fallback + auto-action set (mark addressed, append [resolved], draft commit prompt). New `mark_feedback_addressed` Django management command.

**v4.2 (2026-05-05)** — *(Cowork / Claude project knowledge only at the time of release.)* Added §21 (Feedback Lifecycle Tracking) for the silent `working_summary` append behavior introduced in LSCMD-FBLOG-0505-kp Phase 3. Inflection-point taxonomy (start / decision / edit / blocker / user-input / artifact / prompt / resolved / closed / note). New `append_feedback_line` Django management command.

**v4.1 (2026-05-01)** — Added §17.7 (schema audit before architectural proposals) after a direct loss event in chat hx where F-12 server-derivation was built across two sessions before discovering the existing `statement_discriminator` scenario taxonomy. Added §17.8 with the new high-risk zone (operating-expense discriminator + active_opex_discriminator). Updated §6 anti-patterns with the matching skip-the-schema-audit failure mode.

**v4.0 (2026-04-30)** — Full rewrite. Tightened structure, removed redundant section overlap (consolidated former §16 + §20 + §21 into single §15 awareness-context section), absorbed §12 ID strings into §5.10, added §10.6 HTML-first rule, §13.3 content provenance tags, §13.4 inline liner notes, §14.4 no fragment commits, §15.6 no autonomous value inference, §4.6 session ID + echo-back. Reframed header — three intended homes (master file, Cowork project instructions, Claude project instructions), no longer references nonexistent personal-pref layer.

**v3.1 (2026-04-30)** — Added explicit Plain-English Chat Replies rule at §5.7 with single carve-out. Added matching anti-pattern entry in §6.

**v3.0 (2026-04-25)** — Unified prior Cowork v1.2 + Claude.ai v2.4 into single canonical document. Saved to repo at `/landscape/docs/PROJECT_INSTRUCTIONS.md`. Added §0 multi-system applicability tags + sync discipline. Added §1.2 capability matrix. Added §7.6 canonical table pattern. Removed hard-coded Landscaper tool count (deferred to CLAUDE.md).
