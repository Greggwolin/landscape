# Document Ingestion UI Overhaul - Phase 1 Audit
**Date:** 2026-03-06  
**Status:** AUDIT COMPLETE - Ready for Phase 2 approval  
**Author:** Gern (Subagent)

---

## Executive Summary

✅ **All 8 drop zone components validated**  
✅ **Upload infrastructure mapped (UploadThing + Django)**  
✅ **Implementation architecture proposed**  
⚠️ **3 critical blockers identified**  
❓ **8 questions requiring Gregg's input**

**Key Finding:** The app has **three distinct upload patterns** (UploadStaging, FileDropContext, and direct callbacks), causing inconsistency. The proposed universal drop zone can unify these flows without breaking existing specialized zones.

---

## 1. Current Architecture Validation

### 1.1 Drop Zone Components Analysis

| Component | Location | Upload Backend | Context/Hook | Status |
|-----------|----------|----------------|--------------|--------|
| **Dropzone.tsx** | `src/components/dms/upload/` | UploadThing | `UploadStagingContext` | ✅ Working |
| **NewProjectDropZone.tsx** | `src/components/projects/onboarding/` | Callback-based | None (parent handles) | ✅ Working |
| **DropZoneWrapper.tsx** | `src/components/ui/` | Callback-based | `FileDropContext` | ✅ Working |
| **LandscaperPanel.tsx** | `src/components/landscaper/` | UploadThing | Direct hook usage | ✅ Working |
| **DmsLandscaperPanel.tsx** | `src/components/dms/panels/` | Callback | Parent-provided | ✅ Working |
| **AccordionFilters.tsx** | `src/components/dms/filters/` | UploadThing | `UploadStagingContext` | ✅ Working |
| **DocumentIngestion.tsx** | `src/components/ingestion/` | Django API | Direct fetch | ✅ Working |
| **UploadDropZone.tsx** | `src/components/admin/knowledge-library/` | Django API | Direct fetch | ✅ Working |

### 1.2 Upload Flow Patterns

**Pattern A: UploadStaging (Most Sophisticated)**
- Used by: Dropzone.tsx, AccordionFilters.tsx
- Flow: Drop → Stage in tray → Classify → Hash → Collision check → User confirms → Upload via UploadThing → Create doc record
- Features: File preview, collision detection, classification, confirmation required
- Context: `UploadStagingContext` (requires `projectId` and `workspaceId`)

**Pattern B: FileDropContext (Page-Level Forwarding)**
- Used by: DropZoneWrapper.tsx (entire project pages)
- Flow: Drop → Add to `FileDropContext` → LandscaperPanel consumes → Uploads via UploadThing
- Purpose: Make entire pages drop-capable, forward files to Landscaper
- Limitation: Requires LandscaperPanel to be present

**Pattern C: Direct Upload (Specialized)**
- Used by: NewProjectDropZone.tsx, LandscaperPanel.tsx, DmsLandscaperPanel.tsx, DocumentIngestion.tsx, UploadDropZone.tsx
- Flow: Drop → Immediate upload (no staging)
- Backends: UploadThing (3 components) or Django API (2 components)
- Use case: Specialized workflows where immediate processing is needed

### 1.3 Current Page Coverage

| Page/Area | Drop Zone Component | Coverage |
|-----------|---------------------|----------|
| **Project Layout (all pages)** | DropZoneWrapper | ✅ Entire page |
| **DMS Tab** | Multiple (Dropzone, AccordionFilters, DMSView file input) | ✅ Multiple zones |
| **Landscaper Panel** | LandscaperPanel (line 644) | ✅ Panel-level |
| **DMS Landscaper** | DmsLandscaperPanel (line 387) | ✅ Panel-level |
| **Knowledge Library** | UploadDropZone | ✅ Section-level |
| **New Project Onboarding** | NewProjectDropZone | ✅ Component-level |
| **Document Ingestion** | DocumentIngestion | ✅ Section-level |
| **Other pages (settings, reports, etc.)** | DropZoneWrapper (passive) | ⚠️ Only if on project page |

---

## 2. Open Questions - ANSWERS

### 2.1 DMS Templates

**API Endpoint:**
```
GET /api/dms/templates?workspace_id={id}
POST /api/dms/templates
```

**Data Structure:**
```typescript
interface DMSTemplate {
  template_id: number;
  template_name: string;
  description: string;
  doc_type_options: string[]; // Array of doc types
  is_default: boolean;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}
```

**Valuation Template:**
- **Not found in codebase** - This appears to be a business requirement not yet implemented
- Current database likely has templates, but no "Valuation" vs "Underwriting" distinction in code
- No hardcoded "Valuation DMS Template" ID exists

**❓ QUESTION FOR GREGG:**
1. Does the "Valuation DMS Template" already exist in the database? If so, what is its `template_id` or `template_name`?
2. Should we create it as part of Phase 2, or does it need to be seeded beforehand?

### 2.2 Current Project Context

**How Tracked:**
- `ProjectProvider` (context) wraps the app (likely in root layout)
- `useProjectContext()` hook provides:
  - `projects: ProjectSummary[]` (all user's projects)
  - `activeProject: ProjectSummary | null` (current project)
  - `isLoading: boolean`

**How Accessed:**
```typescript
import { useProjectContext } from '@/app/components/ProjectProvider';

const { activeProject } = useProjectContext();
const currentProjectId = activeProject?.project_id;
```

**URL-Based Project Context:**
- Project pages use route params: `/projects/[projectId]/*`
- `ProjectLayoutClient` extracts `projectId` from params
- Combination of URL params + `ProjectProvider` state

**✅ RESOLVED:** Project context is available via hook. Global drop zone can use `useProjectContext()` to route files to the current project.

### 2.3 UploadThing Config

**File:** `src/lib/dms/uploadthing.ts`

**File Type/Size Restrictions:**
```typescript
{
  "application/pdf": { maxFileSize: "32MB" },
  "application/msword": { maxFileSize: "16MB" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB" },
  "application/vnd.ms-excel": { maxFileSize: "16MB" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "16MB" },
  "image/jpeg": { maxFileSize: "8MB" },
  "image/png": { maxFileSize: "8MB" },
  "image/gif": { maxFileSize: "8MB" },
  "text/plain": { maxFileSize: "4MB" },
  "text/csv": { maxFileSize: "8MB" }
}
```

**Metadata Headers:**
- `x-project-id`: Required
- `x-workspace-id`: Required
- `x-doc-type`: Optional (default: "general")
- `x-discipline`, `x-phase-id`, `x-parcel-id`: Optional

**✅ RESOLVED:** File restrictions documented. Universal drop zone should use same restrictions.

### 2.4 Knowledge Library Upload

**Django Endpoint:**
```
POST {djangoApiUrl}/api/knowledge/library/upload/
```

**Request:** `multipart/form-data` with `files` field (supports multiple files)

**Response:**
```typescript
{
  uploads: Array<{
    doc_id?: number;
    name: string;
    error?: string;
    ai_classification?: {
      doc_type: string;
      doc_type_confidence: number;
      property_type: string | null;
      property_type_confidence: number;
      geo_tags: { level: string; value: string }[];
      text_extracted: boolean;
      text_length: number;
    };
  }>;
}
```

**✅ RESOLVED:** Endpoint documented. Third tile in FileDestinationModal will use this endpoint.

### 2.5 Modal Management

**Current System:** **Ad-hoc (no central modal manager)**

**Modal Locations:**
- DMS modals: `src/components/dms/modals/`
- Specialized modals: Co-located with features
- State management: Component-level `useState` for visibility

**Example Pattern:**
```typescript
const [showModal, setShowModal] = useState(false);

return (
  <>
    <button onClick={() => setShowModal(true)}>Open</button>
    {showModal && (
      <SomeModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    )}
  </>
);
```

**✅ RESOLVED:** FileDestinationModal will follow existing ad-hoc pattern (component-level state). No need to build a modal system for Phase 2.

---

## 3. Proposed Implementation Architecture

### 3.1 Universal Drop Zone Strategy

**Option A: Extend DropZoneWrapper (RECOMMENDED)**

**Why:**
- Already wraps entire project layout (`ProjectLayoutClient.tsx:403`)
- Already uses `FileDropContext` to forward files to Landscaper
- Minimal disruption to existing components

**Changes:**
1. Intercept files in `DropZoneWrapper` **before** forwarding to `FileDropContext`
2. If on a project page AND no specialized zone is active → Show `FileDestinationModal`
3. User selects destination → Route accordingly
4. If no selection (modal closed) → Discard files

**Option B: New GlobalFileDropProvider (ALTERNATIVE)**

**Why:**
- Cleaner separation of concerns
- Wraps entire app (above ProjectProvider)
- More flexible for non-project pages

**Tradeoffs:**
- More invasive (requires root layout change)
- Potential conflicts with existing `DropZoneWrapper`
- More complex z-index/event bubbling management

**🎯 RECOMMENDATION:** **Option A (Extend DropZoneWrapper)** for Phase 2. Lower risk, faster implementation.

### 3.2 FileDestinationModal Component

**File:** `src/components/modals/FileDestinationModal.tsx`

**Component Structure:**
```typescript
interface FileDestinationModalProps {
  files: File[];
  visible: boolean;
  onClose: () => void;
  onSelectDestination: (destination: 'new-project' | 'current-project' | 'knowledge') => void;
}

export function FileDestinationModal({ ... }: FileDestinationModalProps) {
  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>Where should these files go?</CModalHeader>
      <CModalBody>
        <div className="destination-tiles">
          {/* 3 tiles with icons, labels, descriptions */}
          <DestinationTile
            icon={<FileText />}
            title="New Project"
            description="Create a new project from these documents"
            onClick={() => onSelectDestination('new-project')}
          />
          <DestinationTile
            icon={<FolderOpen />}
            title="Current Project"
            description="Add to {activeProject.name}"
            onClick={() => onSelectDestination('current-project')}
            disabled={!activeProject}
          />
          <DestinationTile
            icon={<Database />}
            title="Platform Knowledge"
            description="Upload to knowledge library for AI reference"
            onClick={() => onSelectDestination('knowledge')}
          />
        </div>
      </CModalBody>
    </CModal>
  );
}
```

**Tile Actions:**

1. **New Project:**
   - Call `onSelectDestination('new-project')`
   - Parent opens `NewProjectDropZone` modal with files pre-loaded
   - User interacts with Landscaper to create project

2. **Current Project:**
   - Call `onSelectDestination('current-project')`
   - Forward files to `UploadStagingContext` (uses existing upload flow)
   - Staging tray opens automatically for user confirmation

3. **Platform Knowledge:**
   - Call `onSelectDestination('knowledge')`
   - Upload directly to Django `/api/knowledge/library/upload/`
   - Show toast notification on completion

### 3.3 NewProjectDropZone DMS Template Fix

**Current Issue:** DMS template dropdown always visible (per Gregg's description)

**Required Behavior:**

**Step 1: Add Project Purpose Selection**
```typescript
// In NewProject form/modal
const [projectPurpose, setProjectPurpose] = useState<'valuation' | 'underwriting' | null>(null);

<div>
  <label>Project Purpose</label>
  <CFormCheck
    type="radio"
    label="Valuation"
    checked={projectPurpose === 'valuation'}
    onChange={() => setProjectPurpose('valuation')}
  />
  <CFormCheck
    type="radio"
    label="Underwriting"
    checked={projectPurpose === 'underwriting'}
    onChange={() => setProjectPurpose('underwriting')}
  />
</div>
```

**Step 2: Conditional DMS Template Dropdown**
```typescript
{projectPurpose === 'valuation' ? (
  // Hidden input with hardcoded Valuation template ID
  <input type="hidden" name="dmsTemplateId" value={VALUATION_TEMPLATE_ID} />
) : projectPurpose === 'underwriting' ? (
  // Dropdown populated from GET /api/dms/templates
  <CFormSelect
    label="DMS Template"
    value={selectedTemplateId}
    onChange={(e) => setSelectedTemplateId(e.target.value)}
  >
    {templates.map(t => (
      <option key={t.template_id} value={t.template_id}>
        {t.template_name}
      </option>
    ))}
  </CFormSelect>
) : null}
```

**❓ QUESTIONS FOR GREGG:**
3. Where is the "Project Purpose" field stored in the database? Is it `projects.project_purpose` or a related table?
4. Is "Valuation" vs "Underwriting" the only two project purposes, or are there more?

### 3.4 File Change List (Phase 2)

**New Files:**
1. `src/components/modals/FileDestinationModal.tsx` - 3-tile destination picker
2. `src/components/modals/DestinationTile.tsx` - Reusable tile component (optional, can be inline)

**Modified Files:**
1. `src/components/ui/DropZoneWrapper.tsx` - Add modal trigger logic
2. `src/components/projects/onboarding/NewProjectDropZone.tsx` - Support pre-loaded files from global drop
3. `src/components/projects/onboarding/NewProjectChat.tsx` (or wherever project form lives) - Add Project Purpose field + conditional template dropdown
4. `src/contexts/FileDropContext.tsx` - Possibly add `stageFiles()` method to defer file processing

**No Files Deleted:** All existing drop zones remain functional.

---

## 4. Risks & Blockers

### 🔴 CRITICAL BLOCKER 1: Valuation Template Not Found

**Issue:** Gregg specified that if Project Purpose = "Valuation", use a hardcoded "Valuation DMS Template" - but no such template is referenced in the codebase or database schema docs.

**Impact:** Cannot implement NewProjectDropZone fix without knowing the template ID or name.

**Resolution Required:**
- Gregg provides existing template ID/name, OR
- We create a database migration to seed the Valuation template, OR
- We adjust requirements (maybe Valuation doesn't need DMS template?)

**❓ QUESTION FOR GREGG:**
5. Does the Valuation template exist in the database today? If yes, what's its identifier?
6. If not, should Phase 2 include creating it? What should the `doc_type_options` be for Valuation projects?

### 🟠 RISK 2: Drop Zone Conflict (Z-Index Battle)

**Issue:** Universal drop zone (via DropZoneWrapper) wraps entire page. Specialized drop zones (like DMS folder sidebar's AccordionFilters) also accept drops. Both zones will fire when user drops on the specialized area.

**Example Scenario:**
- User is on DMS tab
- Drops file on AccordionFilters (folder sidebar)
- **Both** DropZoneWrapper AND AccordionFilters `onDrop` handlers fire
- Result: File goes to both staging tray AND triggers FileDestinationModal

**Mitigation Options:**

**Option 1: Event Stopping (RECOMMENDED)**
- Specialized zones call `event.stopPropagation()` in their `onDrop` handler
- Prevents bubble-up to DropZoneWrapper
- Requires adding `stopPropagation()` to 5-6 existing components

**Option 2: Zone Priority Detection**
- DropZoneWrapper checks `event.target` before showing modal
- If target is inside a specialized drop zone (check classNames or data attributes), ignore
- More complex, but no changes to existing components

**Option 3: Disable DropZoneWrapper on Specific Pages**
- Pass `disabled={true}` to DropZoneWrapper when on DMS tab, Landscaper panel, etc.
- Safest, but defeats universal drop zone purpose

**🎯 RECOMMENDATION:** Option 1 (event stopping). Clean, explicit, low risk.

**❓ QUESTION FOR GREGG:**
7. Are you okay with modifying 5-6 existing drop zone components to add `event.stopPropagation()`? (Very low risk, one-line change each)

### 🟡 RISK 3: "Current Project" Without Active Project

**Issue:** User drops files while not on a project page (e.g., on Dashboard, Knowledge Library admin page, Settings).

**Current Behavior:**
- `useProjectContext()` returns `activeProject: null`
- FileDestinationModal shows "Current Project" tile **disabled**

**User Experience Question:**
- Should the modal even appear if user isn't on a project page?
- Alternative: Show toast notification "Drop files here to create a new project or upload to Knowledge Library"

**❓ QUESTION FOR GREGG:**
8. What should happen when user drops files on a non-project page (Dashboard, Settings, etc.)?
   - A) Show FileDestinationModal with "Current Project" tile disabled
   - B) Show toast: "Go to a project to upload files, or create a new project"
   - C) Only show "New Project" and "Platform Knowledge" tiles (hide "Current Project" tile)
   - D) Don't show modal at all, ignore the drop

**🎯 RECOMMENDATION:** Option C (show modal, but only 2 tiles). Most flexible UX.

### 🟢 LOW RISK: Multiple File Handling

**Issue:** User drops 10 files. Which destination should handle them?

**Current Behavior:**
- NewProjectDropZone: Supports multi-file (recent update, accepts up to 20 files for OM packages)
- UploadStagingContext: Supports multi-file (batch staging)
- Knowledge Library Django endpoint: Supports multi-file

**Resolution:** All destinations already support multi-file. **No blocker.**

---

## 5. Edge Cases & Design Decisions

### 5.1 File Type Mismatches

**Scenario:** User drops a `.mp4` video file (not supported by UploadThing config).

**Current Behavior:**
- react-dropzone's `isDragReject` fires
- Dropzone shows red border: "File type not supported"

**Question:** Should FileDestinationModal even appear for rejected files?

**🎯 RECOMMENDATION:** No. Let react-dropzone's `accept` prop filter files **before** showing modal. Only show modal for accepted files.

### 5.2 Tile Colors & Styling

**Not specified in requirements.** Suggested design:

| Tile | Icon | Color | Description |
|------|------|-------|-------------|
| New Project | 📄 FileText | Blue `--cui-primary` | "Create a new project from these documents" |
| Current Project | 📁 FolderOpen | Green `--cui-success` | "Add to {Project Name}" |
| Platform Knowledge | 🗄️ Database | Purple `--cui-info` | "Upload to knowledge library for AI reference" |

**❓ IMPLIED QUESTION:** Gregg hasn't specified colors/icons. Proceed with above, or wait for design input?

### 5.3 Error Handling

**Scenario 1:** User selects "Current Project", but upload fails (network error, UploadThing service down).

**Current Behavior:** UploadStagingContext shows error state in staging tray.

**Proposed:** Same behavior. Staging tray already handles upload errors gracefully.

---

**Scenario 2:** User selects "Platform Knowledge", but Django API returns 500 error.

**Proposed:** Show toast notification with error message:
```typescript
toast({
  title: "Upload Failed",
  description: "Could not upload to Knowledge Library. Please try again.",
  variant: "destructive"
});
```

### 5.4 Modal Dismissal Behavior

**Question:** User opens FileDestinationModal, then closes it without selecting a tile. What happens to the files?

**🎯 RECOMMENDATION:** **Discard files** (do nothing). User can drop again if they change their mind.

**Alternative:** Keep files in a temporary buffer and show a snackbar: "Files ready. Drop again to choose destination." (More complex, unclear UX benefit)

---

## 6. Technical Debt & Cleanup Opportunities

### 6.1 Three Upload Contexts

**Current State:**
- `UploadStagingContext` (sophisticated, DMS-specific)
- `FileDropContext` (simple forwarding buffer)
- Direct uploads (no context)

**Opportunity:** Merge `FileDropContext` into `UploadStagingContext` as a "quick mode" flag?

**🎯 RECOMMENDATION:** **Defer to post-alpha cleanup.** Don't refactor during critical launch.

### 6.2 UploadThing Duplication

**Issue:** `uploadthing.ts` and `dms/uploadthing.ts` both exist. Only `dms/uploadthing.ts` is the real config.

**Opportunity:** Delete or clarify `src/lib/uploadthing.ts` (currently just re-exports helpers).

**🎯 RECOMMENDATION:** Note for later. Not a blocker.

### 6.3 React Dropzone Boilerplate

**Issue:** All 8 components repeat the same `accept` object and `maxSize` config.

**Opportunity:** Extract to shared constant:
```typescript
// src/lib/constants/upload.ts
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  // ... (full list)
};
export const MAX_FILE_SIZE = 32 * 1024 * 1024;
```

**🎯 RECOMMENDATION:** Nice-to-have for Phase 2, but not required for launch.

---

## 7. Questions for Gregg (Consolidated)

1. **DMS Templates:** Does the "Valuation DMS Template" already exist in the database? If so, what is its `template_id` or `template_name`?

2. **DMS Templates:** Should we create the Valuation template as part of Phase 2, or does it need to be seeded beforehand?

3. **Project Purpose:** Where is the "Project Purpose" field stored in the database? Is it `projects.project_purpose` or a related table?

4. **Project Purpose:** Is "Valuation" vs "Underwriting" the only two project purposes, or are there more?

5. **Valuation Template (duplicate of Q1 for emphasis):** Does the Valuation template exist in the database today? If yes, what's its identifier?

6. **Valuation Template Doc Types:** If we need to create the Valuation template, what should the `doc_type_options` array contain? (e.g., `["Appraisal", "Rent Roll", "T-12", "OM"]`)

7. **Drop Zone Conflicts:** Are you okay with modifying 5-6 existing drop zone components to add `event.stopPropagation()` to prevent conflicts with the universal drop zone? (One-line change per component)

8. **Non-Project Page Drops:** What should happen when user drops files on a non-project page (Dashboard, Settings, etc.)?
   - **A)** Show FileDestinationModal with "Current Project" tile disabled
   - **B)** Show toast: "Go to a project to upload files, or create a new project"
   - **C)** Only show "New Project" and "Platform Knowledge" tiles
   - **D)** Don't show modal at all, ignore the drop

9. **Design (Implied):** Are the proposed tile colors/icons okay (Blue=New Project, Green=Current Project, Purple=Knowledge Library), or do you have specific branding preferences?

10. **Multiple Files:** If user drops multiple files and selects "New Project", should we:
    - **A)** Create ONE project with ALL files uploaded (current NewProjectDropZone behavior)
    - **B)** Create separate projects for each file
    - **C)** Show a second modal asking "Create one project or multiple projects?"

---

## 8. Phase 2 Readiness Checklist

### ✅ Ready to Implement (Green Light)

- [x] Universal drop zone architecture defined (extend DropZoneWrapper)
- [x] FileDestinationModal component structure designed
- [x] All 8 existing drop zones validated and working
- [x] Upload backends (UploadThing + Django) endpoints documented
- [x] Project context hook identified (`useProjectContext`)
- [x] File type restrictions documented
- [x] Multi-file support confirmed across all destinations
- [x] Modal state management pattern identified (ad-hoc, component-level)

### ⚠️ Needs Gregg's Input Before Phase 2

- [ ] **Q1-Q2:** Valuation DMS Template existence/ID
- [ ] **Q3-Q4:** Project Purpose field location/values
- [ ] **Q5-Q6:** Valuation template doc types (if creating)
- [ ] **Q7:** Approval for `stopPropagation()` changes
- [ ] **Q8:** Non-project page drop behavior
- [ ] **Q9:** Tile design/colors (optional)
- [ ] **Q10:** Multiple-file project creation behavior

### 🔧 Implementation Estimate (Post-Approval)

**Assuming all questions answered:**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create FileDestinationModal component | 2-3 hours | None |
| Modify DropZoneWrapper to show modal | 1 hour | FileDestinationModal complete |
| Wire "Current Project" tile to UploadStagingContext | 30 min | None |
| Wire "Knowledge Library" tile to Django endpoint | 1 hour | None |
| Wire "New Project" tile to NewProjectDropZone modal | 1-2 hours | NewProjectDropZone pre-load support |
| Add pre-load support to NewProjectDropZone | 1 hour | None |
| Add Project Purpose field to project form | 1 hour | Q3-Q4 answered |
| Add conditional DMS template dropdown | 1-2 hours | Q1-Q2 answered |
| Add `stopPropagation()` to 6 specialized zones | 30 min | Q7 approved |
| Testing (happy path + edge cases) | 2-3 hours | All above complete |
| **TOTAL** | **12-15 hours** | All questions answered |

**For alpha ship today (2026-03-06):** If Gregg answers questions within next 1-2 hours, Phase 2 can complete before end of day.

---

## 9. Recommendations for Immediate Next Steps

### If Gregg Wants to Ship Alpha TODAY:

**Minimum Viable Implementation (4-6 hours):**

1. **Skip NewProjectDropZone DMS template fix** (requires Q1-Q6 answers, adds 2-3 hours)
2. Implement FileDestinationModal with 2 tiles only:
   - "Current Project" → UploadStagingContext (works today)
   - "Platform Knowledge" → Django endpoint (works today)
3. Hide "New Project" tile (or show as "Coming Soon")
4. Modify DropZoneWrapper to show modal
5. Add `stopPropagation()` to existing specialized zones
6. Test on 2-3 pages (Dashboard, DMS tab, Settings)

**Rationale:** Gets 80% of value (universal drop + destination choice) without blocked dependencies.

### If Gregg Can Wait 24 Hours:

**Full Implementation (12-15 hours):**

1. Gregg answers Q1-Q10 by end of day (30 min)
2. Tomorrow: Implement full Phase 2 per architecture above
3. Ship complete feature with all 3 tiles + DMS template fix

**Rationale:** More polish, fewer "coming soon" placeholders, better UX.

---

## 10. Conclusion

**Phase 1 audit is complete.** The architecture is sound, upload infrastructure is well-understood, and a clear implementation path exists for Phase 2.

**3 critical blockers identified:**
1. Valuation DMS template not found in codebase
2. Risk of drop zone conflicts (mitigated with `stopPropagation()`)
3. UX decision needed for non-project page drops

**8 questions require Gregg's input** before Phase 2 can proceed without assumptions.

**Estimated Phase 2 effort:** 12-15 hours (full implementation) or 4-6 hours (MVP without NewProjectDropZone fix).

**Recommendation:** If alpha must ship today, implement MVP (2-tile modal, skip DMS template fix). Otherwise, answer questions today and implement full solution tomorrow.

---

**Next Step:** Gregg reviews this audit, answers questions, approves architecture → Phase 2 begins.

---

## Appendix A: Code Snippets for Quick Reference

### A.1 useProjectContext Usage
```typescript
import { useProjectContext } from '@/app/components/ProjectProvider';

const { activeProject, projects, isLoading } = useProjectContext();
const currentProjectId = activeProject?.project_id;
const currentProjectName = activeProject?.project_name;
```

### A.2 UploadStagingContext Usage
```typescript
import { useUploadStaging } from '@/contexts/UploadStagingContext';

const { stageFiles } = useUploadStaging();

// Trigger staging tray
stageFiles(files, { suggestedDocType: 'General' });
```

### A.3 FileDropContext Usage
```typescript
import { useFileDrop } from '@/contexts/FileDropContext';

const { addFiles, pendingFiles, consumeFiles } = useFileDrop();

// Add files to buffer
addFiles(files);

// Consume files (clears buffer)
const filesToProcess = consumeFiles();
```

### A.4 Knowledge Library Upload
```typescript
const formData = new FormData();
files.forEach(file => formData.append('files', file));

const response = await fetch(`${djangoApiUrl}/api/knowledge/library/upload/`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
// data.uploads: Array<{ doc_id, name, ai_classification, error? }>
```

### A.5 DMS Template Fetch
```typescript
const response = await fetch(`/api/dms/templates?workspace_id=${workspaceId}`);
const data = await response.json();
const templates = data.templates; // Array<DMSTemplate>
```

---

**End of Phase 1 Audit**
