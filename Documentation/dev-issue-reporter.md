# Dev Issue Reporter Overlay

**Status:** ✅ Enabled across Landscape Next.js pages  
**Last Updated:** October 8, 2025

This document explains the lightweight issue tracker overlay that now ships with every Landscape screen, including prototype routes.

## Key Pieces

- `src/components/IssueReporter/` — Floating action button, modal form, and context provider.
- `src/app/layout.tsx` — Registers the provider once so every page inherits the reporter.
- `src/app/api/dev-status/issues/route.ts` — Captures submissions and stores them in `public.dev_issue_log`.
- `db/migrations/20251008_03_dev_issue_log.sql` — Database table definition.

## How It Works

1. Users tap the “Report Issue / Idea” button (or press `Shift` + `⌘/Ctrl` + `K`).
2. The dialog captures the current route, optional component reference, and user-provided details.
3. The request POSTs to `/api/dev-status/issues`, inserting into `public.dev_issue_log`.
4. Dev Status dashboards can query this table (or the API) to surface per-page issue counts.

## Extending the Flow

- Add additional fields (severity, screenshots) in `IssueReporterDialog`.
- Pipe the API output into `Documentation/App-Development-Status.md` scripts or dashboards.
- Expose analytics with the `GET` handler at `/api/dev-status/issues?pagePath=/current/path`.
