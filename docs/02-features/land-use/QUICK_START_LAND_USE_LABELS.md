# Quick Start: Land Use Label Configuration

**For**: Developers integrating land use labels into UI components
**Time**: 5 minutes

---

## For Users: How to Change Labels

1. Navigate to your project: `/projects/{projectId}/settings`
2. Scroll to "Land Use Taxonomy Labels" section
3. Edit the labels (e.g., change "Family" to "Category")
4. Click "Save Labels"
5. Labels will appear throughout the project immediately

---

## For Developers: How to Use Dynamic Labels

### Option 1: Using the Hook (Recommended)

```tsx
import { useLandUseLabels } from '@/hooks/useLandUseLabels'

function MyComponent({ projectId }: { projectId: number }) {
  const { labels, isLoading } = useLandUseLabels(projectId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2>Select {labels.level1Label}</h2>
      <p>Choose from {labels.level1LabelPlural}</p>

      <select>
        <option>-- Select {labels.level2Label} --</option>
        {/* Your options */}
      </select>

      <button>Add {labels.level3Label}</button>
    </div>
  )
}
```

### Option 2: Direct API Call

```tsx
const response = await fetch(`/api/projects/${projectId}/config`)
const { config } = await response.json()

const labels = {
  level1: config.land_use_level1_label || 'Family',
  level2: config.land_use_level2_label || 'Type',
  level3: config.land_use_level3_label || 'Product'
}
```

---

## Label Structure

Each level has **singular** and **plural** forms:

| Level | Singular | Plural | Example Context |
|-------|----------|--------|----------------|
| 1 | `level1Label` | `level1LabelPlural` | "Select Family" / "Available Families" |
| 2 | `level2Label` | `level2LabelPlural` | "Choose Type" / "All Types" |
| 3 | `level3Label` | `level3LabelPlural` | "Add Product" / "Product List" |

---

## Where to Use These Labels

### ✅ DO use dynamic labels for:
- Form field labels ("Select a {label}")
- Section headers ("{labelPlural} Overview")
- Help text ("Choose a {label} from the list")
- Button text ("Add {label}")
- Breadcrumbs ("{label} > ...")

### ❌ DON'T use dynamic labels for:
- Database column names (use `family_id`, `type_id`, `product_id`)
- API endpoint paths (keep `/api/land-use/families`)
- Internal variable names in code

---

## Common Patterns

### Dropdown Label
```tsx
<label>Select {labels.level1Label}</label>
<select>
  {families.map(f => <option key={f.id}>{f.name}</option>)}
</select>
```

### Section Header
```tsx
<h3>{labels.level2LabelPlural} by {labels.level1Label}</h3>
```

### Help Text
```tsx
<p className="text-sm text-gray-500">
  Choose a {labels.level3Label.toLowerCase()} to auto-populate lot dimensions.
</p>
```

### Button
```tsx
<button>
  <Plus className="w-4 h-4" />
  Add {labels.level1Label}
</button>
```

---

## Testing Your Integration

1. Change labels to something distinctive (e.g., "Banana", "Apple", "Orange")
2. Reload your component
3. Verify the new labels appear in all the right places
4. Change back to normal labels

---

## Default Values

If no custom labels are set, defaults are:
- Level 1: **Family** / Families
- Level 2: **Type** / Types
- Level 3: **Product** / Products

The hook automatically falls back to these if:
- Project config doesn't exist yet
- API call fails
- Labels are NULL in database

---

## Example: Before & After

### Before (Hardcoded)
```tsx
<div>
  <h3>Product Types</h3>
  <p>Select a product family:</p>
  <button>Add Product</button>
</div>
```

### After (Dynamic)
```tsx
const { labels } = useLandUseLabels(projectId)

<div>
  <h3>{labels.level3Label} {labels.level2LabelPlural}</h3>
  <p>Select a {labels.level3Label.toLowerCase()} {labels.level1Label.toLowerCase()}:</p>
  <button>Add {labels.level3Label}</button>
</div>
```

**Result when labels = "Category / Use / Series":**
```
Series Uses
Select a series category:
[Add Series]
```

---

## Need Help?

- Full docs: `/docs/LAND_USE_LABELS_IMPLEMENTATION.md`
- Hook source: `/src/hooks/useLandUseLabels.ts`
- Example component: `/src/components/project/ProjectLandUseLabels.tsx`

---

**Pro Tip:** Use `.toLowerCase()` when labels appear mid-sentence for better readability.

```tsx
// Good
<p>Select a {labels.level1Label.toLowerCase()} from the dropdown.</p>
// Output: "Select a family from the dropdown."

// Less natural
<p>Select a {labels.level1Label} from the dropdown.</p>
// Output: "Select a Family from the dropdown."
```
