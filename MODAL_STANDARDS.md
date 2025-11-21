# Modal Standards and Guidelines

## Overview
All modals in the Landscape application must follow these standards for consistent UX.

## Required Features

### 1. Close Button (X)
All modals must have a close button in the upper right corner.

```tsx
<CModal visible={true} onClose={handleClose} size="lg">
  <CModalHeader closeButton>  {/* closeButton prop adds X */}
    <CModalTitle>Modal Title</CModalTitle>
  </CModalHeader>
  {/* ... */}
</CModal>
```

### 2. ESC Key Support
ESC key automatically works via the `onClose` prop on CModal.

```tsx
<CModal visible={true} onClose={handleClose}>
```

### 3. Unsaved Changes Protection
For modals with forms, use the `useUnsavedChanges` hook to detect changes and prompt before closing.

```tsx
import { useUnsavedChanges, useKeyboardShortcuts } from '@/hooks/useUnsavedChanges';

// Track initial data
const initialData = useMemo(() => ({ /* initial form values */ }), []);
const [formData, setFormData] = useState(initialData);

// Detect changes
const hasChanges = useMemo(() => {
  return JSON.stringify(formData) !== JSON.stringify(initialData);
}, [formData, initialData]);

// Handle close with confirmation
const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);

// Add keyboard shortcuts
useKeyboardShortcuts(handleCloseWithConfirmation);

// Use in modal
<CModal visible={true} onClose={handleCloseWithConfirmation}>
  <CModalHeader closeButton>
    {/* ... */}
  </CModalHeader>
  {/* ... */}
  <CModalFooter>
    <Button onClick={handleCloseWithConfirmation}>Cancel</Button>
    {/* ... */}
  </CModalFooter>
</CModal>
```

## Available Hooks

### useUnsavedChanges
Located at `/src/hooks/useUnsavedChanges.ts`

**Purpose**: Provides confirmation dialog when attempting to close a modal with unsaved changes.

**Usage**:
```tsx
const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);
```

**Parameters**:
- `hasChanges: boolean` - Whether form has unsaved changes
- `onClose: () => void` - Callback to execute when close is confirmed

**Returns**: `() => void` - Function that checks for changes before closing

### useKeyboardShortcuts
Located at `/src/hooks/useUnsavedChanges.ts`

**Purpose**: Adds keyboard shortcuts for modal actions.

**Shortcuts**:
- `ESC` - Close modal (with unsaved changes check)
- `Cmd/Ctrl + Enter` - Submit form (optional)

**Usage**:
```tsx
useKeyboardShortcuts(handleClose, handleSubmit);
```

**Parameters**:
- `handleClose: () => void` - Function to call when ESC is pressed
- `handleSubmit?: () => void` - Optional function to call when Cmd/Ctrl+Enter is pressed

## Implementation Checklist

When creating or updating a modal:

- [ ] Add `closeButton` prop to `<CModalHeader>`
- [ ] Pass `onClose` handler to `<CModal>`
- [ ] For forms: Implement unsaved changes detection
- [ ] For forms: Use `useUnsavedChanges` hook
- [ ] For forms: Use `useKeyboardShortcuts` hook
- [ ] Update Cancel button to use confirmation handler
- [ ] Test ESC key behavior
- [ ] Test close button (X) behavior
- [ ] Test unsaved changes confirmation

## Examples

### Simple Modal (No Form)
```tsx
export default function SimpleModal({ isOpen, onClose }: Props) {
  return (
    <CModal visible={isOpen} onClose={onClose}>
      <CModalHeader closeButton>
        <CModalTitle>Simple Modal</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Content */}
      </CModalBody>
      <CModalFooter>
        <LandscapeButton onClick={onClose}>Close</LandscapeButton>
      </CModalFooter>
    </CModal>
  );
}
```

### Form Modal (With Unsaved Changes)
```tsx
import { useUnsavedChanges, useKeyboardShortcuts } from '@/hooks/useUnsavedChanges';

export default function FormModal({ isOpen, onClose, initialData }: Props) {
  const [formData, setFormData] = useState(initialData);

  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);
  useKeyboardShortcuts(handleCloseWithConfirmation, handleSubmit);

  const handleSubmit = async () => {
    // Save logic
    onClose();
  };

  return (
    <CModal visible={isOpen} onClose={handleCloseWithConfirmation}>
      <CModalHeader closeButton>
        <CModalTitle>Edit Form</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {/* Form fields */}
        </CModalBody>
        <CModalFooter>
          <LandscapeButton
            variant="secondary"
            onClick={handleCloseWithConfirmation}
          >
            Cancel
          </LandscapeButton>
          <LandscapeButton
            variant="primary"
            type="submit"
          >
            Save
          </LandscapeButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
```

## Modals Updated

### Phase 7 - Report Functionality
- ✅ **ReportTemplateEditorModal** - Full implementation with unsaved changes detection

### Budget Modals
- ✅ **BudgetItemModal** - Full implementation with unsaved changes detection

### Capitalization Modals
- ✅ **DebtFacilityModal** - Full implementation with unsaved changes detection

### Needs Review
The following modals should be audited and updated to follow these standards:

#### Admin Modals
- AdminModal (already has closeButton, no form)
- ReportConfiguratorPanel (review needed)
- BenchmarksPanel (review needed)
- CostLibraryPanel (review needed)
- DMSAdminPanel (review needed)
- PreferencesPanel (review needed)

#### Budget Modals
- ~~BudgetItemModal~~ ✅
- BudgetItemModalV2
- QuickAddCategoryModal
- ReconciliationModal
- TemplateEditorModal
- VarianceAlertModal
- CreateTemplateModal
- CategoryTemplateManager

#### Sales Modals
- SaleCalculationModal
- SaveBenchmarkModal
- CreateSalePhaseModal

#### Project Modals
- NewProjectModal
- ProjectProfileEditModal
- AddContactModal

#### Other Modals
- ComparableModal
- SalesComparableModal
- ~~DebtFacilityModal~~ ✅
- LandscaperChatModal
- CorrectionModal
- StagingModal
- UnitCostTemplateModal
- AddBenchmarkModal
- ConfigureColumnsModal

## Testing

Test each modal for:
1. Click X button → Should close (with confirmation if changes)
2. Press ESC → Should close (with confirmation if changes)
3. Click backdrop (if not static) → Should close (with confirmation if changes)
4. Make changes and try to close → Should show confirmation dialog
5. Confirm in dialog → Should close without saving
6. Cancel in dialog → Should stay open
7. Press Cmd/Ctrl+Enter → Should submit form (if implemented)

## Notes

- Use `backdrop="static"` to prevent closing by clicking outside the modal
- Always use `useMemo` for initial data to prevent unnecessary re-renders
- Compare form data using `JSON.stringify` for deep equality checks
- The confirmation message is standardized: "You have unsaved changes. Are you sure you want to close without saving?"
