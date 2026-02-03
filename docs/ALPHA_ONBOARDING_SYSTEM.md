# Alpha Onboarding & Feedback System

## 1. System Overview

- **Purpose:** The onboarding system introduces new Alpha testers to their personal Landscaper helper. It captures their role, AI comfort level, tone preference, underwriting tools, and working markets so that the chat assistant can be configured with personalized instructions, insights, and a document management pipeline.
- **User Flow:** After authentication, a non-admin user is prompted to accept the Terms of Service (TOS) if they haven't already. They then walk through a five-question survey (`OnboardingSurvey.tsx`) followed by a conversational onboarding chat (`OnboardingChat.tsx`) that invites document uploads. When complete, profile compilation generates a `compiled_instructions` system prompt, and the “Enter Landscape” button redirects to `/dashboard`.
- **Admin vs. Tester Routing:** Admins bypass the onboarding and land directly on the dashboard (`LoginForm.tsx` now checks `role==='admin'` and redirects). Alpha testers still go through the TOS/survey/chat unless a completed profile already exists. TOS acceptance is persisted via `tbl_user_landscaper_profile.tos_accepted_at` and is cached locally to hide the checkbox on subsequent logins.

## 2. Database Schema

### `tbl_user_landscaper_profile`

| Column | Type | Description |
| --- | --- | --- |
| `profile_id` | `SERIAL PRIMARY KEY` | Unique profile ID. |
| `user_id` | `INTEGER` FK → `auth_user(id)` | Links each profile to the authenticated user. |
| `survey_completed_at` | `TIMESTAMPTZ` | When the onboarding survey finished. |
| `role_primary` | `VARCHAR(50)` | Primary role (appraiser, land developer, CRE investor). |
| `role_property_type` | `VARCHAR(50)` | Role-specific subcategory (e.g., multifamily, entitlements). |
| `ai_proficiency` | `VARCHAR(50)` | AI experience level (expert → new). |
| `communication_tone` | `VARCHAR(50)` | Preferred tone (casual/formal). |
| `primary_tool` | `VARCHAR(50)` | Underwriting tool (ARGUS, Excel, both, other, none). |
| `markets_text` | `TEXT` | User-entered markets. |
| `compiled_instructions` | `TEXT` | Landscaper system prompt generated from survey/chat/document insights. |
| `onboarding_chat_history` | `JSONB` | Array storing chat messages from the onboarding conversation. |
| `interaction_insights` | `JSONB` | Derived metrics (message count, last user message, etc.). |
| `document_insights` | `JSONB` | Document summaries captured from uploads. |
| `tos_accepted_at` | `TIMESTAMPTZ` | Timestamp of TOS acceptance. |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | Audit timestamps. |

### `tester_feedback` (extended)

Fields added for the feedback pipeline:
- `internal_id` (`UUID`): Cross-reference ID for deduplication.
- `category` (`VARCHAR(50)`): `bug`, `feature_request`, `ux_confusion`, or `question`.
- `affected_module` (`VARCHAR(100)`): The page/component referenced.
- `landscaper_summary` (`TEXT`): Digest from the Landscaper assistant.
- `landscaper_raw_chat` (`JSONB`): Full chat that led to the ticket.
- `browser_context` (`JSONB`): Captured browser metadata (user agent, screen size, URL, console errors, timestamp).
- `duplicate_of_id` (`INTEGER` FK → `tester_feedback.id`): Points to original feedback when duplicates are detected.
- `report_count` (`INTEGER`): Number of reports aggregated into this issue.
- `admin_response` (`TEXT`) & `admin_responded_at` (`TIMESTAMPTZ`): Admin reply tracking.
- `status` (`VARCHAR(20)` DEFAULT `submitted`): Workflow states (`submitted`, `under_review`, `addressed`).

Indexes: `idx_feedback_internal_id`, `idx_feedback_status`, `idx_feedback_category` support fast lookup.

### `tbl_changelog`

| Column | Type | Description |
| --- | --- | --- |
| `changelog_id` | `SERIAL PRIMARY KEY` | Entry identifier. |
| `version` | `VARCHAR(20)` NOT NULL | Semantic version string (e.g., `v0.1.24`). |
| `deployed_at` | `TIMESTAMPTZ` DEFAULT `NOW()` | Deploy timestamp for this release. |
| `auto_generated_notes` | `TEXT` | Raw notes (from git or automation). |
| `published_notes` | `TEXT` | Edited version shown in UI. |
| `is_published` | `BOOLEAN` DEFAULT `FALSE` | Controls visibility to testers. |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | Timestamps for auditing. |

Indexes: `idx_changelog_version`, `idx_changelog_deployed`.

## 3. Backend Architecture

### Models

- `backend/apps/users/models.py`: `UserLandscaperProfile` stores user survey answers, compiled instructions, chat/document insights, and metadata. Its `OneToOneField` links to `settings.AUTH_USER_MODEL`.
- `backend/apps/feedback/models.py`: (Extended) adds the fields listed above plus the changelog entry model in the same module or dedicated app file.

### Serializers

- `backend/apps/users/serializers.py`: `UserLandscaperProfileSerializer` exposes survey fields, profile metadata, and compiled instructions while protecting admin-only fields.
- `backend/apps/feedback/serializers.py` (in progress): serializes feedback payloads for testers and admins, ensuring `admin_response` and `status` are only writable via admin endpoints.

### Views/Endpoints

| Endpoint | Method | Purpose | Auth Required |
| --- | --- | --- | --- |
| `/api/users/landscaper-profile/` | `GET` | Fetch current user's profile | Yes |
| `/api/users/landscaper-profile/` | `POST` | Create/update profile metadata | Yes |
| `/api/users/landscaper-profile/` | `PATCH` | Partially update answers/chat history | Yes |
| `/api/users/landscaper-profile/compile/` | `POST` | Rebuild `compiled_instructions` | Yes |
| `/api/users/landscaper-profile/document/` | `POST` | Upload document, analyze confidentiality, queue DMS | Yes |
| `/api/feedback/` | `POST` | Submit a new feedback item (tester) | Yes |
| `/api/feedback/my/` | `GET` | List tester's submissions | Yes |
| `/api/admin/feedback/` | `GET` | Admin queue list with filters | Admin only |
| `/api/admin/feedback/{id}/` | `PATCH` | Update status/reply | Admin only |
| `/api/admin/feedback/export/` | `GET` | Export feedback to markdown | Admin only |
| `/api/changelog/` | `GET` | Published changelog entries | Public |
| `/api/changelog/current-version/` | `GET` | Current version badge text | Public |
| `/api/admin/changelog/` | `POST` | Create entry | Admin only |
| `/api/admin/changelog/{id}/` | `PATCH` | Edit/publish entry | Admin only |

Authentication: Standard JWT tokens from `UserLoginView` provide user metadata (`role`, `email`, etc.).

### Services

- `backend/apps/users/services.py`:  
  - `compile_landscaper_instructions(profile)` synthesizes a system prompt from survey data, insights, and document summaries.  
- `feedback` service (new file) handles:  
  - Category classification (keyword-based heuristics).  
  - Summary generation (short prescription).  
  - Deduplication via text similarity (Jaccard/phrase overlap) plus `affected_module` matching, incrementing `report_count` and linking via `duplicate_of_id`.  
  - Profiler context capture (browser metadata).  

## 4. Frontend Architecture

### Components

- `src/app/login/LoginForm.tsx`: TOS checkbox now conditionally rendered; admin bypass checks `user.role`; TOS acceptance tracked via `tosAcceptedByUser` in `localStorage`.
- `src/app/onboarding/page.tsx`: Loads `landscaper-profile`, renders `OnboardingSurvey` or `OnboardingChat` depending on `survey_completed_at`, shows loading/errors, triggers profile refresh after chat/upload.
- `src/components/Onboarding/OnboardingSurvey.tsx`: Wizard with five questions (role, AI experience, tone, primary tool, markets), progress bar, responsive answer cards with CoreUI colors.
- `src/components/Onboarding/OnboardingChat.tsx`: Landscaper chat with initial message built from survey data, drag-drop document upload, modal for confidentiality, `Enter Landscape` compiles instructions and navigates.
- `src/components/Onboarding/DocumentUploadModal.tsx`: Confirms storage, shows detected confidentiality markers, wires to backend upload/confirm/cancel endpoints.
- `src/components/alpha/AlphaAssistantFlyout.tsx`: `/components/AlphaAssistant/` refactored from tabs to two accordion sections, embedding `AlphaLandscaperChat` under “Help / Feedback Agent” and a `FeedbackLog` section.
- `src/components/alpha/HelpFeedbackAgent.tsx`: Wraps `AlphaLandscaperChat` with instructions text and passes page context to the landscaper.
- `src/components/alpha/FeedbackLog.tsx`: Displays tester’s feedback submissions with status badges and admin responses.
- `src/components/changelog/VersionBadge.tsx`: Shows the current version in the nav (reads `/api/changelog/current-version/`).
- `src/components/changelog/ChangelogModal.tsx`: Fetches `/api/changelog/`, lists recent entries, shows published notes, and links to the admin editor.

### Services

- `src/services/landscaperProfile.ts`: API helper for profile CRUD, compilation, document handling, and storing tokens.
- `src/services/feedback.ts`: (Planned) posts feedback, fetches logs, and interacts with duplicate detection APIs.
- `src/utils/browserContext.ts`: Collects user agent, OS, screen size, URL, console errors, and timestamp for backend context storage.

## 5. User Flows

- **New Alpha Tester:**  
  1. Login → accept TOS (if `tos_accepted_at` null).  
  2. Answer five survey questions (role + detailed focus, AI proficiency, tone, primary tool, markets).  
  3. Enter onboarding chat; optionally drag-drop docs and confirm confidentiality modal.  
  4. System compiles instructions (stored in `compiled_instructions`), enabling “Enter Landscape” to move to `/dashboard`.

- **Returning Tester:**  
  - TOS checkbox hidden once `tos_accepted_at` exists.  
  - If profile exists with `survey_completed_at`, go directly to `/dashboard`.  
  - Otherwise show survey/chat again.

- **Admin Flow:**  
  - Upon login `user.role==='admin'` bypasses onboarding entirely and goes to `/dashboard`.  
  - Admins can still have `tbl_user_landscaper_profile` records but they never drive routing.

- **Feedback Submission Flow:**  
  1. Tester messages “Feedback: …” or converses organically.  
  2. Backend classifies category/affected module, deduplicates via `internal_id` or summary similarity, increments `report_count`, and attaches browser context and raw chat.  
  3. Land­scaper confirms logging, and entry appears in tester’s Feedback Log accordion.

## 6. Landscaper Profile Compilation

- Survey/responses → `compile_landscaper_instructions` builds a multi-section prompt: user role, markets, tools, tone, AI proficiency, followed by `interaction_insights` (message count/last input) and `document_insights` (summaries).  
- Document uploads append entries into `document_insights.documents`.  
- `compiled_instructions` stored in profile is re-used by the main Landscaper chat for personalization and is refreshed after each significant onboarding interaction or document upload.

## 7. Admin Interfaces

- **Feedback Queue (`/admin/feedback`):** Based on existing page, extended with filters for status/category/module/user, table rows showing user, summary, status badge, report count, and actions to view details or reply. Admin responses update `admin_response` and `status`, which in turn surface in the tester’s `Feedback Log`.
- **Changelog Editor (`/admin/changelog`):** Provides CRUD for `tbl_changelog` entries, allowing admins to paste auto-generated notes, refine `published_notes`, and flip `is_published`. Only published entries show up in the public changelog modal.

## 8. Configuration & Environment

- `NEXT_PUBLIC_DJANGO_API_URL`: Base URL for backend API calls (used by services).  
- `NEXT_PUBLIC_APP_VERSION` (or latest published changelog entry) populates version badge.  
- Feature flags: none yet—controllers rely on `role` and `profile` states.

## 9. File Manifest

```
backend/
└── apps/
    ├── users/
    │   ├── models.py (extended with UserLandscaperProfile)
    │   ├── serializers.py (adds UserLandscaperProfileSerializer)
    │   ├── views.py (landscaper profile endpoints)
    │   ├── urls.py (routes for profile/compile/document)
    │   └── migrations/0002_userlandscaperprofile.py (new table)
    ├── feedback/
    │   ├── models.py (extended tester_feedback, changelog model)
    │   ├── serializers.py (tester/admin feedback contracts)
    │   ├── views.py (feedback CRUD and changelog endpoints)
    │   ├── urls.py (feedback admin routes)
    │   └── admin.py (optional admin display helpers)
```

```
src/
├── app/
│   ├── login/LoginForm.tsx (TOS persistence, admin bypass)
│   ├── onboarding/page.tsx (survey vs. chat routing)
│   ├── onboarding/ (survey/chat components)
│   └── admin/
│       ├── feedback/page.tsx (admin queue enhancements)
│       └── changelog/page.tsx (entry editor)
├── components/
│   ├── Onboarding/ (survey, chat, document modal)
│   ├── AlphaAssistant/ (flyout, HelpFeedbackAgent, FeedbackLog)
│   ├── Changelog/ (version badge + modal)
│   └── ui/ (semantic tokens + badges)
├── services/
│   ├── landscaperProfile.ts (profile API helpers)
│   └── feedback.ts (feedback/changelog requests)
└── utils/
    └── browserContext.ts (collects browser metadata)
```

## 10. Known Limitations / Future Improvements

- Feedback classification is currently rule-based; future versions can plug in ML/NLP for better accuracy.  
- Deduplication uses simple similarity heuristics—scaling may require vector search or manual tagging.  
- Document ingestion presently relies on keyword tagging; enhancements should surface richer extraction metadata.  
- Changelog auto-generation from git remains a manual paste; eventual automation could read commit history.  
- Browser context capture is basic; for production, consider securely storing console logs or session replay data.

