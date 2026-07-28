-- ============================================================================
-- Migration: 20260728_thread_last_destination.up.sql
-- Purpose:   Give every chat thread a memory of WHERE it was last productive,
--            so reopening a thread can put the user back on the artifact or
--            screen the conversation was working against.
--
--            Today the restoration of visual state happens only live, inside
--            CenterChatPanel.handleToolResult, at the moment a tool result
--            streams in. Reopening a thread replays the transcript and nothing
--            else, so the user lands on a blank stage. See:
--            "Landscape app/Reopening-a-Chat-Where-It-Left-Off-2026-07-28.html"
--
--            Adds:
--              - landscaper_chat_thread.last_destination (JSONB NULL)
--
--            Shape (written by src/lib/landscaper/threadDestination.ts):
--              {
--                "kind":        "artifact" | "screen",
--                "artifactId":  123,                       -- kind=artifact
--                "route":       "/w/projects/9/map",       -- kind=screen
--                "screen":      "map",                     -- kind=screen, label
--                "folder":      "budget",                  -- optional, studio nav
--                "tab":         "grid",                    -- optional, studio nav
--                "tool":        "control_map_overlay",     -- what produced it
--                "label":       "Site Plan",               -- optional, display
--                "at":          "2026-07-28T18:04:11.000Z"
--              }
--
-- WHY JSONB AND NOT COLUMNS
--   The destination is a tagged union with per-kind fields, and the set of
--   kinds is expected to grow (a document destination is the obvious next one).
--   A JSONB blob keeps the shape in one versioned place in TypeScript rather
--   than spread across nullable columns that only make sense in combination.
--   It is never queried by field — only read whole, by thread id — so there is
--   no index-ability argument for splitting it out.
--
-- WHY NOT REUSE page_context
--   page_context already exists on this table and is populated on 565 of 565
--   threads. It cannot serve this purpose: it records where the user was
--   STANDING WHEN THEY STARTED TYPING, not where the work landed. Measured
--   2026-07-28 against production: 504 of 565 threads (89%) carry 'home',
--   'general', 'projects' or 'dashboard' — values that name no screen. The
--   dominance of 'home' (176) comes from CenterChatPanel.handleStartChat
--   hardcoding page_context:'home' for every chat begun from the project
--   homepage. last_destination is written on tool OUTPUT instead, and
--   overwrites itself, so the last productive moment wins.
--
-- NULL SEMANTICS
--   NULL = this thread never produced anything restorable. That is the common
--   case: only 57 of 565 threads have ever created an artifact. A NULL
--   destination means "open the transcript and leave the user's screen alone",
--   which is the intended behaviour, not a gap.
--
-- Refs:      chat TA (LSCMD-THREADDEST-0728-TA)
--            Decisions 1a / 2a / 3a / 4a, settled 2026-07-28.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- Reversible: see 20260728_thread_last_destination.down.sql
-- ============================================================================

SET search_path TO landscape, public;

ALTER TABLE landscape.landscaper_chat_thread
  ADD COLUMN IF NOT EXISTS last_destination JSONB NULL;

COMMENT ON COLUMN landscape.landscaper_chat_thread.last_destination IS
  'Where this thread was last productive — {kind, artifactId|route, screen, tool, label, at}. Written on tool output (last-wins), read once on thread reopen to restore the artifact or screen. NULL = produced nothing restorable; reopen leaves the screen alone. Distinct from page_context, which records where the chat STARTED and is 89% uninformative. See chat TA, 2026-07-28.';
