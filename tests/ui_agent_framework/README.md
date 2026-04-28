# UI E2E Test Framework

Playwright-driven browser tests for the unified UI (`/w/*` surface). Complements the API-level `tests/agent_framework/` suite — different concerns, different tools.

## Run

```bash
# From repo root
npx playwright test --config=playwright.ui.config.ts
```

A separate Playwright config (`playwright.ui.config.ts`) is used so this suite doesn't interfere with the existing `playwright.config.ts` (which targets `tests/e2e/`).

## What it tests (P0 scenarios, 2026-04-28)

| ID | Coverage | Findings caught |
|----|----------|-----------------|
| S-UI-1 | Auth flow (login, expired token, logout) | #13 |
| S-UI-2 | `/w/chat` baseline rendering | #7, #8, #14 |
| S-UI-3 | First-message thread creation + auto-naming | #11 |
| S-UI-5 | Report request — artifact-first, modal-as-fallback | #4, #10 |
| S-UI-8 | Console hygiene wrapper (fixture, not a separate spec) | #7 |

P1 (S-UI-4, 6, 7) and P2 (S-UI-9, 10) scenarios are deferred to a follow-up session.

## Expected-failure markers

Several tests are marked `test.fail()` because the underlying findings are not yet fixed. These are not real failures — they're acknowledgments. When a fix lands, remove the `.fail()` annotation and update `manifests/expected_results.json`.

The full inventory of expected vs. actual outcomes lives in `manifests/expected_results.json`.

## Prerequisites

- Dev servers running:
  - Next.js on `http://localhost:3000`
  - Django on `http://localhost:8000`
- Test user `admin` / `admin123` exists in the auth system (per CLAUDE.md convention)
- For S-UI-5: project_id=17 (Chadron Terrace) exists with populated DB data; Tier 2 + Tier 3 are skipped pending dedicated fixtures

## Console hygiene gate (S-UI-8)

`helpers/fixtures.ts` exports a custom `test` that wraps every page with console + network capture. After each test, if any *critical* console error fired, the test fails with the captured output. Critical patterns are defined in `helpers/console-capture.ts`:

- `Cannot update a component while rendering` (finding #7 shape)
- Unhandled promise rejections
- React key warnings + missing-deps hook warnings
- Page errors (uncaught exceptions)

Plus `getAuthErrors()` exposes 401 / 5xx network responses for explicit assertion in scenarios where they matter (S-UI-1).

## Selectors

The codebase doesn't use `data-testid` — selectors are class names, ids, and roles. They live in `helpers/selectors.ts`. When a class name changes in the unified-UI components, update one place.

## Folder layout

```
tests/ui_agent_framework/
├── README.md                 # this file
├── config.ts                 # base URL, credentials, timeouts
├── helpers/
│   ├── auth.ts               # login, logout, expireToken
│   ├── chat.ts               # sendMessage, watchdogs, auto-naming poll
│   ├── console-capture.ts    # console + 4xx/5xx capture, critical filter
│   ├── fixtures.ts           # custom Playwright test() with auth + capture
│   ├── navigation.ts         # gotoChat, gotoProject, waitForThreadUrl
│   └── selectors.ts          # all class/id/role selectors in one place
├── manifests/
│   └── expected_results.json # expected pass/fail per scenario (regression baseline)
└── scenarios/
    ├── s_ui_1_auth_flow.spec.ts
    ├── s_ui_2_wchat_baseline.spec.ts
    ├── s_ui_3_first_message_and_naming.spec.ts
    └── s_ui_5_report_request_artifact_first.spec.ts
```
