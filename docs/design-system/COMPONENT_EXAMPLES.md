# Landscape CoreUI Component Examples

**Visual Guide for Phase 1 Wrapper Components**

---

## LandscapeButton Examples

### Primary Actions
```tsx
import { LandscapeButton } from '@/components/ui/landscape';

// Save button
<LandscapeButton color="primary">
  Save
</LandscapeButton>

// Submit with loading state
<LandscapeButton color="primary" loading={isSubmitting}>
  Submit
</LandscapeButton>

// Create new (with icon)
<LandscapeButton
  color="primary"
  icon={<CIcon icon={cilPlus} />}
>
  Create Project
</LandscapeButton>
```

### Secondary Actions
```tsx
// Cancel button
<LandscapeButton color="secondary" variant="outline">
  Cancel
</LandscapeButton>

// Back button
<LandscapeButton
  color="secondary"
  variant="ghost"
  icon={<CIcon icon={cilArrowLeft} />}
>
  Back
</LandscapeButton>
```

### Destructive Actions
```tsx
// Delete button
<LandscapeButton color="danger">
  Delete
</LandscapeButton>

// Delete with confirmation loading
<LandscapeButton color="danger" loading={isDeleting}>
  Deleting...
</LandscapeButton>
```

### Success Actions
```tsx
// Approve button
<LandscapeButton color="success">
  Approve
</LandscapeButton>

// Complete button
<LandscapeButton
  color="success"
  icon={<CIcon icon={cilCheckCircle} />}
>
  Mark Complete
</LandscapeButton>
```

### Button Sizes
```tsx
// Small button
<LandscapeButton color="primary" size="sm">
  Small
</LandscapeButton>

// Default button
<LandscapeButton color="primary">
  Default
</LandscapeButton>

// Large button
<LandscapeButton color="primary" size="lg">
  Large
</LandscapeButton>
```

---

## StatusChip Examples

### Success States
```tsx
import { StatusChip } from '@/components/ui/landscape';

// Complete
<StatusChip status="complete" />
// Output: "Complete" (green badge)

// Approved
<StatusChip status="approved" />
// Output: "Approved" (green badge)

// Active
<StatusChip status="active" />
// Output: "Active" (green badge)
```

### Warning States
```tsx
// Pending
<StatusChip status="pending" />
// Output: "Pending" (yellow badge)

// Partial
<StatusChip status="partial" />
// Output: "Partial" (yellow badge)
```

### Error States
```tsx
// Error
<StatusChip status="error" />
// Output: "Error" (red badge)

// Rejected
<StatusChip status="rejected" />
// Output: "Rejected" (red badge)
```

### Neutral States
```tsx
// Inactive
<StatusChip status="inactive" />
// Output: "Inactive" (gray badge)

// Draft
<StatusChip status="draft" />
// Output: "Draft" (gray badge)

// Info
<StatusChip status="info" />
// Output: "Info" (blue badge)
```

### Custom Labels
```tsx
// Custom label with status color
<StatusChip status="complete" label="Finished" />
// Output: "Finished" (green badge)

<StatusChip status="pending" label="In Review" />
// Output: "In Review" (yellow badge)

<StatusChip status="error" label="Failed Validation" />
// Output: "Failed Validation" (red badge)
```

### Outline Variants
```tsx
// Outline variant (hollow badge)
<StatusChip status="complete" variant="outline" />
<StatusChip status="pending" variant="outline" />
<StatusChip status="error" variant="outline" />
```

---

## DataTable Examples

### Basic Table
```tsx
import { DataTable } from '@/components/ui/landscape';

const projects = [
  { id: 1, name: 'Scottsdale', status: 'active', budget: 5000000 },
  { id: 2, name: 'Phoenix Heights', status: 'pending', budget: 3500000 },
  { id: 3, name: 'Tempe Plaza', status: 'complete', budget: 4200000 },
];

const columns = [
  { label: 'Project Name', key: 'name' },
  { label: 'Status', key: 'status' },
  { label: 'Budget', key: 'budget' },
];

<DataTable data={projects} columns={columns} />
```

### Table with Custom Rendering
```tsx
import { DataTable, StatusChip } from '@/components/ui/landscape';

const columns = [
  {
    label: 'Project Name',
    key: 'name',
    width: '40%',
  },
  {
    label: 'Status',
    key: 'status',
    width: '20%',
    render: (row) => <StatusChip status={row.status} />
  },
  {
    label: 'Budget',
    key: 'budget',
    width: '40%',
    align: 'right' as const,
    render: (row, value) => (
      <span className="tnum">
        ${value.toLocaleString()}
      </span>
    )
  },
];

<DataTable data={projects} columns={columns} />
```

### Table with Loading State
```tsx
const { data: projects, isLoading } = useProjects();

<DataTable
  data={projects || []}
  columns={columns}
  loading={isLoading}
/>
```

### Table with Empty State
```tsx
<DataTable
  data={[]}
  columns={columns}
  emptyMessage="No projects found. Create your first project to get started."
/>
```

### Table with Row Click Handler
```tsx
import { useRouter } from 'next/navigation';

function ProjectsTable() {
  const router = useRouter();

  return (
    <DataTable
      data={projects}
      columns={columns}
      onRowClick={(project) => router.push(`/projects/${project.id}`)}
    />
  );
}
```

### Table with Nested Data
```tsx
const columns = [
  { label: 'Project Name', key: 'name' },
  { label: 'Owner', key: 'owner.name' }, // Nested property
  { label: 'City', key: 'location.city' }, // Nested property
];

const projects = [
  {
    name: 'Scottsdale',
    owner: { name: 'John Smith' },
    location: { city: 'Scottsdale', state: 'AZ' }
  },
];

<DataTable data={projects} columns={columns} />
```

---

## Real-World Usage Examples

### Form with Buttons
```tsx
function ProjectForm() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProject();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form>
      <CFormInput label="Project Name" />
      <CFormInput label="Budget" type="number" />

      <div className="d-flex gap-2 mt-3">
        <LandscapeButton
          color="secondary"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </LandscapeButton>

        <LandscapeButton
          color="primary"
          loading={isSaving}
          onClick={handleSave}
        >
          Save Project
        </LandscapeButton>
      </div>
    </form>
  );
}
```

### Card with Status
```tsx
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import { StatusChip } from '@/components/ui/landscape';

function ProjectCard({ project }) {
  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5>{project.name}</h5>
        <StatusChip status={project.status} />
      </CCardHeader>
      <CCardBody>
        <p>Budget: ${project.budget.toLocaleString()}</p>
        <p>Location: {project.location}</p>
      </CCardBody>
    </CCard>
  );
}
```

### Modal with Actions
```tsx
import { CModal, CModalHeader, CModalBody, CModalFooter } from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';

function DeleteConfirmModal({ visible, onClose, onConfirm, isDeleting }) {
  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader>Confirm Delete</CModalHeader>
      <CModalBody>
        Are you sure you want to delete this project? This action cannot be undone.
      </CModalBody>
      <CModalFooter>
        <LandscapeButton
          color="secondary"
          variant="outline"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </LandscapeButton>

        <LandscapeButton
          color="danger"
          loading={isDeleting}
          onClick={onConfirm}
        >
          Delete Project
        </LandscapeButton>
      </CModalFooter>
    </CModal>
  );
}
```

### Table with Mixed Content
```tsx
function ProjectsTable({ projects, onDelete }) {
  const columns = [
    {
      label: 'Name',
      key: 'name',
      width: '30%',
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      align: 'center' as const,
      render: (row) => <StatusChip status={row.status} />
    },
    {
      label: 'Budget',
      key: 'budget',
      width: '25%',
      align: 'right' as const,
      render: (row, value) => `$${value.toLocaleString()}`
    },
    {
      label: 'Actions',
      key: 'id',
      width: '30%',
      align: 'right' as const,
      render: (row) => (
        <div className="d-flex gap-2 justify-content-end">
          <LandscapeButton
            color="primary"
            size="sm"
            onClick={() => window.location.href = `/projects/${row.id}`}
          >
            View
          </LandscapeButton>

          <LandscapeButton
            color="danger"
            size="sm"
            variant="outline"
            onClick={() => onDelete(row.id)}
          >
            Delete
          </LandscapeButton>
        </div>
      )
    },
  ];

  return <DataTable data={projects} columns={columns} />;
}
```

---

## Migration Examples

### Before/After: Button Migration

**Before** (hand-rolled Tailwind):
```tsx
<button
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
  onClick={handleSave}
  disabled={isSaving}
>
  {isSaving ? 'Saving...' : 'Save'}
</button>
```

**After** (CoreUI wrapper):
```tsx
<LandscapeButton
  color="primary"
  onClick={handleSave}
  loading={isSaving}
>
  Save
</LandscapeButton>
```

**Benefits**:
- ✅ 75% less code
- ✅ Automatic loading state handling
- ✅ Consistent styling
- ✅ Built-in focus indicators
- ✅ Dark mode support

---

### Before/After: Status Chip Migration

**Before** (inconsistent):
```tsx
// Developer 1
<span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">
  Complete
</span>

// Developer 2
<span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
  Complete
</span>

// Developer 3
<span className="px-2 py-1 bg-green-600 text-white rounded text-xs">
  Complete
</span>
```

**After** (semantic):
```tsx
<StatusChip status="complete" />
```

**Benefits**:
- ✅ 90% less code
- ✅ Consistent colors across entire app
- ✅ Semantic meaning (not just visual)
- ✅ Automatic dark mode handling
- ✅ Type-safe (TypeScript prevents typos)

---

### Before/After: Table Migration

**Before** (custom table):
```tsx
<table className="w-full border-collapse">
  <thead className="bg-gray-100 dark:bg-gray-800">
    <tr>
      <th className="px-4 py-2 text-left">Name</th>
      <th className="px-4 py-2 text-left">Status</th>
    </tr>
  </thead>
  <tbody>
    {projects.map((project) => (
      <tr key={project.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
        <td className="px-4 py-2">{project.name}</td>
        <td className="px-4 py-2">
          <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">
            {project.status}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>

{projects.length === 0 && (
  <div className="text-center p-5 text-gray-500">
    No projects found
  </div>
)}
```

**After** (CoreUI wrapper):
```tsx
<DataTable
  data={projects}
  columns={[
    { label: 'Name', key: 'name' },
    {
      label: 'Status',
      key: 'status',
      render: (row) => <StatusChip status={row.status} />
    },
  ]}
  emptyMessage="No projects found"
/>
```

**Benefits**:
- ✅ 80% less code
- ✅ Automatic empty state
- ✅ Consistent styling
- ✅ Built-in hover states
- ✅ Dark mode support
- ✅ Type-safe column definitions

---

## Quick Reference

### Import Statement
```tsx
import {
  LandscapeButton,
  StatusChip,
  DataTable
} from '@/components/ui/landscape';
```

### Common Button Colors
- `color="primary"` - Blue (save, submit, confirm)
- `color="secondary"` - Gray (cancel, back)
- `color="success"` - Green (approve, complete)
- `color="danger"` - Red (delete, remove)
- `color="warning"` - Yellow (archive, suspend)

### Common Status Types
- `status="complete"` - Green success
- `status="pending"` - Yellow warning
- `status="error"` - Red danger
- `status="inactive"` - Gray secondary
- `status="info"` - Blue info

### Common DataTable Props
- `data` - Array of objects
- `columns` - Column definitions
- `loading` - Show spinner
- `emptyMessage` - Custom empty text
- `onRowClick` - Row click handler

---

**Last Updated**: 2025-01-14
**Version**: 1.0.0
**Phase**: 1 Complete
