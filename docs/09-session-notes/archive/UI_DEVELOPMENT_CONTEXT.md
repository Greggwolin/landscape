# UI Development Context - Code Patterns

**Last Updated:** October 14, 2025
**Purpose:** Complete reference for building new UI components in the Landscape application

---

## 1. ProjectProvider Context

**File:** `src/app/components/ProjectProvider.tsx`

### Project Interface
```typescript
interface ProjectSummary {
  project_id: number
  project_name: string
  acres_gross: number
  location_lat?: number
  location_lon?: number
  start_date?: string
  jurisdiction_city?: string
  jurisdiction_county?: string
  jurisdiction_state?: string
}
```

### ProjectContext Interface
```typescript
interface ProjectContextValue {
  projects: ProjectSummary[]           // All available projects
  activeProjectId: number | null       // Currently selected project ID
  activeProject: ProjectSummary | null // Currently selected project object
  selectProject: (projectId: number | null) => void  // Change active project
  refreshProjects: () => void          // Refresh projects from API
  isLoading: boolean                   // SWR loading state
  isReady: boolean                     // !isLoading && !error
  error?: Error                        // SWR error state
}
```

### Usage Pattern
```typescript
'use client'

import { useProjectContext } from '@/app/components/ProjectProvider'

export default function MyComponent() {
  const { activeProject, isLoading, error } = useProjectContext()
  const projectId = activeProject?.project_id ?? null

  // Use projectId for API calls
  // Check isLoading before rendering
  // Handle error state
}
```

### How It Works
- **Provider**: Wraps entire app in `src/app/layout.tsx`
- **Data Source**: Fetches from `/api/projects` using SWR
- **Initial State**: Auto-selects first project on mount
- **State Management**: Uses React Context + SWR
- **Refresh**: Call `refreshProjects()` to manually revalidate

---

## 2. Data Fetching Patterns

### A. SWR Pattern (Primary - RECOMMENDED)

**Used in**: `HomeOverview.tsx`, `PlanningWizard.tsx`, `ProjectProvider.tsx`

```typescript
'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'

interface ParcelSummary {
  parcel_id: number  // BIGINT from DB - already converted to number by API
  area_no: number
  acres: number
  units: number
}

export default function MyComponent() {
  const { activeProject } = useProjectContext()
  const projectId = activeProject?.project_id ?? null

  // Fetcher function
  const fetcher = (url: string) => fetchJson<ParcelSummary[]>(url)

  // SWR hook with conditional fetching
  const { data, error, isLoading, mutate } = useSWR<ParcelSummary[]>(
    projectId ? `/api/parcels?project_id=${projectId}` : null,  // null = don't fetch
    fetcher,
    { revalidateOnFocus: false }  // Optional config
  )

  // Always check if data is array before using
  if (!Array.isArray(data)) {
    return <div>Loading...</div>
  }

  // Use data safely
  return (
    <div>
      {data.map(parcel => (
        <div key={parcel.parcel_id}>{parcel.acres} acres</div>
      ))}
    </div>
  )
}
```

**Key Points**:
- ✅ **Automatic caching** - SWR caches responses
- ✅ **Automatic revalidation** - Can revalidate on window focus
- ✅ **Manual refresh** - Call `mutate()` to revalidate
- ✅ **Null key pattern** - Pass `null` as key to prevent fetching
- ⚠️ **Always check if data is array** - Data can be undefined during loading

### B. Fetch Pattern (Alternative - Budget Grid)

**Used in**: `BudgetGridDark.tsx` (when you need more control)

```typescript
'use client'

import { useState, useEffect } from 'react'

export default function MyComponent({ projectId }: { projectId: number }) {
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/budget/items/${projectId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`)
        }

        const data = await response.json()
        setItems(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchItems()
    }
  }, [projectId])  // Re-fetch when projectId changes

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-400">Error: {error}</div>

  return <div>{/* Render items */}</div>
}
```

### C. BIGINT Conversion

**BIGINT fields are already converted to Number by API routes.**

From `/api/multifamily/units/route.ts`:
```typescript
// API routes convert BIGINT to Number before sending
function convertBigIntFields(unit: any) {
  return {
    ...unit,
    unit_id: Number(unit.unit_id),
    project_id: Number(unit.project_id),
  }
}

// In route handler
const units = result.rows.map(convertBigIntFields)
return NextResponse.json({ success: true, data: units })
```

**In your component**, just use the numbers directly:
```typescript
interface Parcel {
  parcel_id: number  // Already converted by API
  project_id: number // Already converted by API
  acres: number
}

// No conversion needed!
const parcelId = parcel.parcel_id  // Just use it
```

### D. Error Handling

**SWR Pattern**:
```typescript
const { data, error, isLoading } = useSWR(url, fetcher)

if (error) {
  return (
    <div className="text-red-400">
      Error loading data: {error.message}
    </div>
  )
}

if (isLoading) {
  return <div className="text-gray-400">Loading...</div>
}
```

**Fetch Pattern**:
```typescript
try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`)
  }
  const data = await response.json()
} catch (err) {
  console.error('API Error:', err)
  setError(err instanceof Error ? err.message : 'Unknown error')
}
```

### E. Loading States

**Skeleton Loading** (not currently implemented, but recommended):
```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      <div className="h-20 bg-gray-800 animate-pulse rounded-lg" />
      <div className="h-20 bg-gray-800 animate-pulse rounded-lg" />
    </div>
  )
}
```

**Simple Loading** (currently used):
```typescript
if (isLoading) {
  return <div className="text-gray-400">Loading...</div>
}
```

---

## 3. Navigation & Routing

### A. View State Management

**File:** `src/app/page.tsx`

```typescript
'use client'

import { useState } from 'react'

const LandscapeAppInner: React.FC = () => {
  const [activeView, setActiveView] = useState('home')

  const renderContent = () => {
    switch (activeView) {
      case 'home':
      case 'dashboard':
        return <HomeOverview />

      case 'planning-inline':
      case 'planning':
        return <PlanningWizard />

      case 'budget-grid-dark':
        return <BudgetGridDarkWrapper projectId={activeProject?.project_id ?? 7} />

      case 'market':
        return <MarketAssumptionsNative projectId={activeProject?.project_id ?? null} />

      // ... more cases

      default:
        return <ComingSoonContent title={activeView} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Navigation activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  )
}
```

### B. Navigation Component

**File:** `src/app/components/Navigation.tsx`

```typescript
interface NavigationProps {
  activeView: string
  setActiveView: (view: string) => void
}

const navSections: NavSection[] = [
  {
    title: 'Home',
    items: [
      { id: 'home', label: 'Home' },
      { id: 'dev-status', label: 'Development Status' },
      { id: 'documentation', label: 'Documentation' }
    ]
  },
  {
    title: 'Planning',
    items: [
      { id: 'planning-inline', label: 'Planning' },
      { id: 'planning-overview', label: 'Overview' }
    ],
    isCollapsible: true
  }
  // ...
]

// Clicking nav item:
<button
  onClick={() => setActiveView('planning-inline')}
  className={`${activeView === 'planning-inline' ? 'bg-gray-700' : ''}`}
>
  Planning
</button>
```

### C. Cross-Component Navigation

**From any component**, trigger navigation:
```typescript
// Dispatch custom event
window.dispatchEvent(new CustomEvent('navigateToView', {
  detail: { view: 'planning-inline' }
}))
```

**In page.tsx**, listener is set up:
```typescript
useEffect(() => {
  const handler = (e: CustomEvent<{ view?: string }>) => {
    const view = e.detail?.view
    if (typeof view === 'string') {
      setActiveView(view)
    }
  }
  window.addEventListener('navigateToView', handler)
  return () => window.removeEventListener('navigateToView', handler)
}, [])
```

### D. View IDs Currently Used

**Complete list from `page.tsx`**:
```typescript
// Home
'home', 'dashboard'

// Documentation
'documentation'

// Planning
'planning-overview', 'planning-overview-grid', 'planning-overview-hot'
'planning-inline', 'planning'
'land-use', 'documents', 'mapping-gis'

// Assumptions
'market', 'growth-rates'

// Budgets
'project-costs', 'budget-grid-light', 'budget-grid-dark'

// Settings
'settings', 'zoning-glossary'

// Dev
'dev-status', 'prototype-lab'
```

### E. Next.js App Router Pages

Some features use actual Next.js routes instead of view state:

```typescript
// Links to actual pages (not view state)
{ id: 'prototype-lab', label: 'Prototype Lab', href: '/prototypes' }
{ id: 'market-page', label: 'Market', href: '/market' }
{ id: 'dms', label: 'Document Management', href: '/dms' }

// In Navigation component:
if (item.href) {
  return <Link href={item.href}>{item.label}</Link>
} else {
  return <button onClick={() => setActiveView(item.id)}>{item.label}</button>
}
```

**Actual page routes**:
- `/market` → `src/app/market/page.tsx`
- `/dms` → `src/app/dms/page.tsx`
- `/prototypes` → `src/app/prototypes/page.tsx`
- `/lease/[id]` → `src/app/lease/[id]/page.tsx`

---

## 4. Budget Grid Status

### A. Which Grid is Active?

**Primary**: `BudgetGridDark` (Handsontable) - accessed via view ID `'budget-grid-dark'`
**Alternative**: `BudgetGridLight` (MUI DataGrid) - accessed via view ID `'budget-grid-light'`

Both are available in navigation. Dark version appears to be the preferred implementation.

### B. BudgetGridDark - Current Implementation

**File:** `src/app/components/Budget/BudgetGridDark.tsx`

**Props**:
```typescript
interface BudgetGridDarkProps {
  projectId: number
}
```

**Data Source**: **Fetches from API**
```typescript
// Fetches budget items from API
useEffect(() => {
  async function fetchItems() {
    const response = await fetch(`/api/budget/items/${projectId}?version=${budgetVersion}`)
    const data = await response.json()
    setItems(data)
  }
  fetchItems()
}, [projectId, budgetVersion])
```

**Inline Editing**: ❌ **NOT IMPLEMENTED**
```typescript
// TODO: Cell editing handlers exist but don't save to API yet
const handleCellChange = (changes) => {
  // Updates local state only
  // No PATCH/PUT call to API
}
```

**Features**:
- ✅ Fetches from `/api/budget/items/:projectId`
- ✅ Filters by stage, scope, category
- ✅ Budget version selection ('Forecast', etc.)
- ✅ Division filtering (Areas/Phases)
- ❌ Inline editing (UI only, no API save)
- ❌ Create new rows
- ❌ Delete rows

### C. BudgetItem Interface
```typescript
interface BudgetItem {
  fact_id: number
  budget_version: string
  cost_code: string
  scope: string
  category_path: string
  category_id?: number
  description?: string
  uom_code: string
  uom_display: string
  qty: number
  rate: number
  amount: number
  calculated_amount: number
  start_date: string
  end_date: string
  duration_months: number
  escalation_rate: number
  contingency_pct: number
  timing_method: string
  confidence_level: string
  notes: string
  vendor_name: string
  // Variance fields
  original_amount?: number
  variance_amount?: number
  variance_percent?: number
  variance_status?: 'under' | 'over' | 'on_budget'
}
```

---

## 5. Styling System

### A. Dark Mode Implementation

**Approach**: CSS Custom Properties with `.dark` class

**File:** `src/app/globals.css`

```css
:root {
  --background: #ffffff;
  --foreground: #1e293b;
}

.dark {
  --background: #0f172a;
  --foreground: #f1f5f9;
}

body {
  background: var(--background);
  color: var(--foreground);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

**App is always in dark mode** - the `.dark` class is applied by default.

### B. Color Palette

**Tailwind Config** (`tailwind.config.js`):

```javascript
theme: {
  extend: {
    colors: {
      // Semantic colors (use CSS variables)
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      // Use Tailwind defaults for grays, blues, etc.
    }
  }
}
```

**Commonly Used Colors**:
```typescript
// Backgrounds
'bg-gray-950'   // App background (darkest)
'bg-gray-900'   // Slightly lighter sections
'bg-gray-800'   // Cards, panels
'bg-gray-700'   // Hover states, active items

// Borders
'border-gray-700'   // Default borders
'border-gray-600'   // Lighter borders
'border-blue-500'   // Active/accent borders

// Text
'text-white'        // Primary text
'text-gray-300'     // Secondary text
'text-gray-400'     // Tertiary text, labels
'text-gray-500'     // Muted text

// Accents
'text-blue-300'     // Links, highlights
'bg-blue-600'       // Primary buttons
'bg-blue-500'       // Primary button hover
```

### C. Common Utility Classes

**Cards**:
```typescript
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
  {/* Card content */}
</div>
```

**Buttons**:
```typescript
// Primary button
<button className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500">
  Save
</button>

// Secondary button
<button className="px-3 py-2 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600">
  Cancel
</button>
```

**Inputs** (see ParcelTile for inline editing):
```typescript
// Number input
<input
  type="number"
  className="parcel-inline-input"
  // Note: parcel-inline-input has specific styling in globals.css
/>

// Select dropdown
<select className="parcel-inline-select">
  <option value="MDR">MDR</option>
</select>
```

**Grid Layouts**:
```typescript
// Responsive grid
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  <MetricCard />
  <MetricCard />
</div>

// Parcel tile grid (from ProjectCanvas.tsx)
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '4px'
}}>
  <ParcelTile />
  <ParcelTile />
</div>
```

### D. Tailwind Plugins Used

```javascript
plugins: [
  require('@tailwindcss/forms'),      // Form styling
  require('@tailwindcss/typography'), // Prose styling
  require("tailwindcss-animate"),     // Animation utilities
]
```

---

## 6. Component Structure Example

### HomeOverview.tsx - Complete Pattern

**File:** `src/app/components/Home/HomeOverview.tsx`

```typescript
'use client'  // ← Required for all interactive components

// Imports
import React, { useMemo } from 'react'
import useSWR from 'swr'
import { useProjectContext } from '@/app/components/ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'

// Interfaces
interface ParcelSummary {
  parcel_id: number
  area_no: number
  phase_name: string
  acres: number
  units: number
  family_name?: string
}

// Main Component
const HomeOverview: React.FC = () => {
  // 1. Get project context
  const { activeProject, projects, refreshProjects, isLoading: projectsLoading } = useProjectContext()
  const projectId = activeProject?.project_id ?? null

  // 2. Get project config (for dynamic labels)
  const { labels } = useProjectConfig(projectId ?? undefined)

  // 3. Fetch data with SWR
  const fetcher = (url: string) => fetchJson(url)
  const { data: parcelsData } = useSWR<ParcelSummary[]>(
    projectId ? `/api/parcels?project_id=${projectId}` : null,
    fetcher
  )

  // 4. Compute derived data with useMemo
  const metrics = useMemo(() => {
    if (!Array.isArray(parcelsData)) {
      return { areas: 0, phases: 0, parcels: 0, totalUnits: 0 }
    }

    const areaCount = new Set(parcelsData.map(p => p.area_no)).size
    const totalUnits = parcelsData.reduce((sum, p) => sum + Number(p.units || 0), 0)

    return { areas: areaCount, parcels: parcelsData.length, totalUnits }
  }, [parcelsData])

  // 5. Render
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-white">
          {activeProject?.project_name ?? 'Select a project'}
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Areas" value={metrics.areas} />
        <MetricCard label="Parcels" value={metrics.parcels} />
        <MetricCard label="Units" value={metrics.totalUnits} />
      </div>
    </div>
  )
}

// Sub-components
const MetricCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <div className="text-sm uppercase tracking-wide text-gray-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-white">{value.toLocaleString()}</div>
  </div>
)

export default HomeOverview
```

### Key Patterns

1. **`'use client'` directive** - Required for:
   - useState, useEffect, useMemo, useCallback
   - Event handlers (onClick, onChange, etc.)
   - Client-side hooks (useSWR, useContext)

2. **Imports order**:
   - React imports
   - Third-party libraries (useSWR, etc.)
   - Local components
   - Hooks
   - Utils

3. **Component structure**:
   - Interfaces first
   - Main component
   - Sub-components at bottom
   - Export at end

4. **State management**:
   - Use SWR for server data
   - Use useState for UI state
   - Use useMemo for computed values

5. **Always check data is array**:
   ```typescript
   if (!Array.isArray(data)) {
     return <LoadingOrEmpty />
   }
   ```

---

## 7. File Organization

### A. New Pages

**Root pages**:
```
/src/app/[page-name]/page.tsx

Examples:
/src/app/market/page.tsx
/src/app/dms/page.tsx
/src/app/growth-rates/page.tsx
```

**Nested pages** (with dynamic routes):
```
/src/app/[feature]/[id]/page.tsx

Examples:
/src/app/lease/[id]/page.tsx
/src/app/prototypes/[prototypeId]/page.tsx
```

### B. Feature Components

**Pattern**: `/src/app/components/[Feature]/ComponentName.tsx`

```
/src/app/components/Budget/BudgetGridDark.tsx
/src/app/components/Budget/BudgetGridLight.tsx
/src/app/components/Budget/BudgetContent.tsx
/src/app/components/Planning/PlanningContent.tsx
/src/app/components/Market/MarketTile.tsx
/src/app/components/Home/HomeOverview.tsx
```

### C. Shared Components

**Pattern**: `/src/app/components/ComponentName.tsx`

```
/src/app/components/Navigation.tsx
/src/app/components/Header.tsx
/src/app/components/ProjectProvider.tsx
```

### D. API Routes

**Pattern**: `/src/app/api/[resource]/route.ts`

**CRUD endpoints**:
```
/src/app/api/parcels/route.ts           # GET all, POST create
/src/app/api/parcels/[id]/route.ts      # GET/PATCH/DELETE by ID
```

**Nested resources**:
```
/src/app/api/multifamily/units/route.ts
/src/app/api/multifamily/leases/route.ts
/src/app/api/multifamily/reports/occupancy/route.ts
```

### E. Utility Functions

```
/src/lib/fetchJson.ts        # Shared fetch utility
/src/lib/db.ts               # Database connection
/src/hooks/useProjectConfig.ts  # Custom hook
```

---

## 8. Quick Reference

### Common Imports

```typescript
// Always needed for interactive components
'use client'

// React essentials
import React, { useState, useEffect, useMemo, useCallback } from 'react'

// Data fetching
import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'

// Context
import { useProjectContext } from '@/app/components/ProjectProvider'

// Custom hooks
import { useProjectConfig } from '@/hooks/useProjectConfig'

// Routing (if needed)
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
```

### Common Patterns

**useProjectContext() usage**:
```typescript
const { activeProject, isLoading, error } = useProjectContext()
const projectId = activeProject?.project_id ?? null
```

**SWR/fetch pattern**:
```typescript
const fetcher = (url: string) => fetchJson<MyType[]>(url)
const { data, error, isLoading, mutate } = useSWR<MyType[]>(
  projectId ? `/api/resource?project_id=${projectId}` : null,
  fetcher
)

if (!Array.isArray(data)) return <div>Loading...</div>
```

**Error handling**:
```typescript
if (error) {
  return <div className="text-red-400">Error: {error.message}</div>
}
```

**Loading states**:
```typescript
if (isLoading) {
  return <div className="text-gray-400">Loading...</div>
}
```

**Cross-component navigation**:
```typescript
window.dispatchEvent(new CustomEvent('navigateToView', {
  detail: { view: 'planning-inline' }
}))
```

### View IDs Currently Used

```typescript
// Complete list for setActiveView()
'home', 'dashboard'                         // Home
'documentation', 'dev-status'               // Dev tools
'planning-inline', 'planning'               // Planning
'planning-overview', 'planning-overview-grid', 'planning-overview-hot'
'land-use', 'documents', 'mapping-gis'      // Planning related
'market', 'growth-rates'                    // Assumptions
'project-costs'                             // Budgets
'budget-grid-light', 'budget-grid-dark'     // Budget grids
'settings', 'zoning-glossary'               // Settings
'prototype-lab'                             // Dev

// Admin pages (Next.js routes with href, not view state)
'/admin/dms/attributes'                     // DMS Attributes admin
'/admin/dms/templates'                      // DMS Templates admin
```

### Styling Classes

**Container**:
```typescript
<div className="space-y-6">  // Vertical spacing between children
```

**Card**:
```typescript
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
```

**Grid**:
```typescript
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
```

**Button (Primary)**:
```typescript
<button className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500">
```

**Button (Secondary)**:
```typescript
<button className="px-3 py-2 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600">
```

**Text Styles**:
```typescript
<h1 className="text-2xl font-semibold text-white">     // Large header
<h2 className="text-lg font-semibold text-white">      // Section header
<p className="text-sm text-gray-400">                  // Body text
<div className="text-xs uppercase tracking-wide text-gray-400">  // Label
```

---

## 9. Verification Checklist

✅ **Can I create a new component that fetches data the same way others do?**
- Yes, use SWR pattern from section 2A or fetch pattern from section 2B

✅ **Can I add a new navigation item and view?**
- Yes, add to `navSections` in Navigation.tsx and add case in `page.tsx` renderContent()

✅ **Can I style components consistently with the rest of the app?**
- Yes, use color palette and utility classes from section 5

✅ **Can I use the ProjectProvider context correctly?**
- Yes, see section 1 for complete interface and usage

✅ **Do I know where to place new files?**
- Yes, see section 7 for complete file organization rules

---

## 10. Gotchas & Notes

### Important Gotchas

⚠️ **Always add `'use client'` directive**
- Required for any component using hooks or event handlers
- Must be first line in file

⚠️ **Always check if data is array before using**
```typescript
if (!Array.isArray(data)) return <div>Loading...</div>
// SWR data can be undefined during loading!
```

⚠️ **BIGINT fields are already converted**
- API routes convert BIGINT to Number before sending
- Don't try to convert again in component

⚠️ **Use `projectId ?? null` pattern**
```typescript
const projectId = activeProject?.project_id ?? null
// This prevents passing `undefined` to APIs
```

⚠️ **SWR null key prevents fetching**
```typescript
useSWR(
  projectId ? `/api/resource?project_id=${projectId}` : null,
  fetcher
)
// null key = don't fetch (useful when projectId not loaded yet)
```

⚠️ **Navigation has two modes**
- View state: `setActiveView('planning-inline')` for same-page views
- Next.js routing: `<Link href="/market">` for actual page routes
- Check Navigation.tsx to see which mode each nav item uses

### Helpful Tips

💡 **Use useMemo for expensive calculations**
```typescript
const metrics = useMemo(() => {
  // Expensive computation
  return computed
}, [dependencies])
```

💡 **Use useCallback for event handlers passed to children**
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies])
```

💡 **Use project config for dynamic labels**
```typescript
const { labels } = useProjectConfig(projectId ?? undefined)
// labels.level1Label = "Area" or custom label
// labels.level2Label = "Phase" or custom label
```

💡 **Refresh SWR data manually**
```typescript
const { data, mutate } = useSWR(key, fetcher)

// Later, trigger refresh:
mutate()  // Revalidates and refetches
```

---

**End of UI Development Context**

For more information, see:
- [App-Development-Status.md](Documentation/App-Development-Status.md) - Complete technical reference
- [README.md](README.md) - Project overview
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Feature status
