# Napkin Analysis UI Patterns

This document captures the key formatting patterns used on the Napkin Analysis page (`/projects/[projectId]/napkin`) for consistency when building new components.

---

## Table Styling

### Basic Table Structure
```tsx
<table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8125rem' }}>
  <thead>
    <tr style={{ color: 'var(--cui-secondary-color)' }}>
      <th>Column Name</th>
      <th className="text-end">Right-Aligned</th>
      <th className="text-center">Centered</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row) => (
      <tr key={row.id}>
        <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
          {row.label}
        </td>
        <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>
          {row.value}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Key Table Patterns
| Element | Class/Style |
|---------|-------------|
| Table | `table table-sm align-middle mb-0` |
| Font size | `fontSize: '0.8125rem'` (13px) |
| Header text color | `color: 'var(--cui-secondary-color)'` |
| Body text color | `color: 'var(--cui-body-color)'` |
| Bold cells | Add `fw-semibold` class |
| Right-align numbers | `className="text-end"` |
| Center content | `className="text-center"` |

### Conditional Value Colors
```tsx
// Positive/negative value coloring
<td
  className="text-end fw-semibold"
  style={{ color: value > 0 ? '#57c68a' : '#ef4444' }}
>
  {formatCurrency(value)}
</td>

// Warning for insufficient data
<span className={dataQuality === 'insufficient' ? 'text-warning' : ''}>
  {compCount}
</span>
```

---

## Badge Colors

### Standard Badge Patterns
```tsx
// Info badge (blue) - counts, stats
<span className="badge bg-info">
  {count} comps w/ lot size
</span>

// Success badge (green) - positive status
<span className="badge bg-success">
  {productRows.length} Products
</span>

// Warning badge (yellow) - caution
<span className="badge bg-warning text-dark">
  Insufficient Data
</span>

// Secondary badge (gray) - neutral
<span className="badge bg-secondary">
  Pending
</span>
```

### Badge Placement in Card Header
```tsx
<div className="card-header d-flex justify-content-between align-items-center">
  <h5 className="mb-0">Card Title</h5>
  <div className="d-flex align-items-center gap-2">
    <span className="badge bg-info">{count} items</span>
    <span className="badge bg-success">{status}</span>
  </div>
</div>
```

---

## Input Field Styling

### Compact Input with Label (2-line stacked)
```tsx
<div className="text-center">
  <label className="text-muted small d-block mb-1">
    Label<br/>Line 2
  </label>
  <input
    type="text"
    value={value}
    onChange={handleChange}
    onBlur={handleCommit}
    onKeyDown={handleKeyDown}
    className="form-control form-control-sm text-center"
    style={{ width: 70 }}
  />
</div>
```

### Input Widths by Content Type
| Content | Width |
|---------|-------|
| Small numbers (radius, days) | `70px` |
| Currency values | `90px` |
| Prices with $ | `100px` |

### Input with Suffix Pattern
```tsx
// Display value with suffix (e.g., "3 mi", "2023+", "23%")
<input
  type="text"
  value={`${draftValue} mi`}  // or `${value}+` or `${value}%`
  onChange={(e) => {
    const num = e.target.value.replace(/[^0-9.]/g, '');
    setDraftValue(num);
  }}
  onBlur={commitValue}
  className="form-control form-control-sm text-center"
  style={{ width: 70 }}
/>
```

### Currency Input Pattern
```tsx
<input
  type="text"
  value={`$${value.toLocaleString()}`}
  onChange={(e) => {
    const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) setValue(num);
  }}
  className="form-control form-control-sm text-center"
  style={{ width: 90 }}
/>
```

### Inline Editable Table Cell
```tsx
<input
  type="text"
  value={price !== null ? `$${price.toLocaleString()}` : ''}
  onChange={(e) => handleOverride(e.target.value)}
  placeholder="Enter price"
  className="form-control form-control-sm"
  style={{
    width: '100px',
    textAlign: 'right',
    display: 'inline-block',
    backgroundColor: isOverridden ? 'var(--cui-warning-bg-subtle)' : undefined
  }}
/>
```

### Commit-on-Blur Pattern
```tsx
const [committed, setCommitted] = useState(initialValue);
const [draft, setDraft] = useState(String(initialValue));

const commit = useCallback(() => {
  const value = parseFloat(draft);
  if (Number.isFinite(value) && value >= minValue) {
    setCommitted(value);
  } else {
    setDraft(String(committed)); // Reset to last valid
  }
}, [draft, committed]);

const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    commit();
    (e.target as HTMLInputElement).blur();
  }
}, [commit]);
```

---

## Settings Row Layout

### Horizontal Input Group with Right-Aligned Button
```tsx
<div className="d-flex flex-wrap gap-3 align-items-end mb-3 justify-content-between">
  {/* Left side: inputs */}
  <div className="d-flex flex-wrap gap-3 align-items-end">
    <div className="text-center">
      <label className="text-muted small d-block mb-1">Search<br/>Radius</label>
      <input ... style={{ width: 70 }} />
    </div>

    <div className="text-center">
      <label className="text-muted small d-block mb-1">Year<br/>Built</label>
      <input ... style={{ width: 70 }} />
    </div>

    {/* More inputs... */}
  </div>

  {/* Right side: action button */}
  <button
    type="button"
    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
    onClick={() => setShowMap(!showMap)}
  >
    <Map size={14} />
    <span>{showMap ? 'Hide Comps Map' : 'View Comps Map'}</span>
  </button>
</div>
```

---

## Inline Card Flyout

### Flyout Sliding Out from Card
```tsx
// Parent card needs position-relative and overflow: visible
<div className="card h-100 position-relative" style={{ overflow: 'visible' }}>
  <div className="card-header">...</div>
  <div className="card-body">
    {/* Main content */}

    {/* Toggle button in settings row */}
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
      onClick={() => setShowFlyout(!showFlyout)}
    >
      <Map size={14} />
      <span>{showFlyout ? 'Hide Panel' : 'Show Panel'}</span>
    </button>
  </div>

  {/* Flyout - slides out from right edge of card */}
  {showFlyout && (
    <div
      className="position-absolute top-0 h-100 d-flex flex-column"
      style={{
        left: '100%',
        width: 'calc(50vw - 2rem)',
        maxWidth: '600px',
        minWidth: '400px',
        backgroundColor: 'var(--cui-body-bg)',
        borderLeft: '1px solid var(--cui-border-color)',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
        animation: 'slideInFromCard 0.2s ease-out'
      }}
    >
      {/* Flyout Header - matches accordion header height */}
      <div className="card-header d-flex justify-content-between align-items-center py-2">
        <h5 className="mb-0" style={{ fontSize: '1.09375rem' }}>
          Panel Title
          <span className="ms-2 small fw-normal" style={{ color: 'var(--cui-secondary-color)' }}>
            Subtitle text
          </span>
        </h5>
        <button
          type="button"
          className="btn btn-sm btn-link p-1"
          onClick={() => setShowFlyout(false)}
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Flyout Content */}
      <div className="flex-grow-1 p-3" style={{ overflow: 'hidden' }}>
        {/* Content here */}
      </div>
    </div>
  )}

  {/* Animation keyframes */}
  <style jsx global>{`
    @keyframes slideInFromCard {
      from {
        transform: translateX(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `}</style>
</div>
```

### ESC Key Handler for Flyout
```tsx
// Close flyout on ESC key press
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showFlyout) {
      setShowFlyout(false);
    }
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [showFlyout]);
```

---

## Accordion Patterns

### Collapsible Card Header
```tsx
<div
  className="card-header d-flex justify-content-between align-items-center"
  style={{ cursor: 'pointer' }}
  onClick={() => setIsExpanded(!isExpanded)}
>
  <h5 className="mb-0">Section Title</h5>
  <div className="d-flex align-items-center gap-2">
    <span className="badge bg-info">{count} items</span>
    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </div>
</div>

{isExpanded && (
  <div className="card-body">
    {/* Content */}
  </div>
)}
```

### Inline Accordion (Show/Hide)
```tsx
<div className="mt-3">
  <button
    type="button"
    className="btn btn-link p-0 d-flex align-items-center gap-1 text-decoration-none"
    onClick={() => setShowSection(!showSection)}
    style={{ color: 'var(--cui-secondary-color)' }}
  >
    {showSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    <span className="small">{showSection ? 'Hide' : 'Show'} Section Name</span>
  </button>

  {showSection && (
    <div className="mt-2">
      {/* Accordion content */}
    </div>
  )}
</div>
```

---

## Card Structure

### Standard Card
```tsx
<div className="card h-100">
  <div className="card-header d-flex justify-content-between align-items-center">
    <h5 className="mb-0">Card Title</h5>
    <div className="d-flex align-items-center gap-2">
      {/* Badges */}
    </div>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
</div>
```

### Card Footer with Legend
```tsx
<div
  className="mt-3 pt-2 d-flex justify-content-between align-items-center"
  style={{ borderTop: '1px solid var(--cui-border-color)' }}
>
  <div className="d-flex gap-3">
    {Object.entries(SOURCE_INDICATORS).map(([key, value]) => (
      <span key={key} className="small" style={{ color: 'var(--cui-secondary-color)' }}>
        {value.icon} {value.label}
      </span>
    ))}
  </div>
  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
    {totalCount} total • {filteredCount} filtered
  </span>
</div>
```

---

## Source Indicators

### Emoji-based Source Legend
```tsx
const SOURCE_INDICATORS: Record<string, { icon: string; label: string }> = {
  redfin: { icon: '🔵', label: 'Redfin' },
  benchmark: { icon: '🟡', label: 'Benchmark' },
  user: { icon: '⚪', label: 'User Override' }
};

// Usage in table cell
<td className="text-center">
  <span title={SOURCE_INDICATORS[source].label}>
    {SOURCE_INDICATORS[source].icon}
  </span>
</td>
```

---

## Loading States

### Inline Loading with Spinner
```tsx
<div className="d-flex align-items-center gap-3 py-3">
  <div className="spinner-border text-primary" role="status" aria-hidden />
  <div>
    <div className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
      Loading data…
    </div>
    <div className="text-muted small">
      Fetching recent sales data.
    </div>
  </div>
</div>
```

### Error State with Retry
```tsx
<div className="py-3">
  <div className="fw-semibold mb-1" style={{ color: 'var(--cui-body-color)' }}>
    Unable to load data right now.
  </div>
  <div className="text-muted small mb-2">
    {error?.message || 'Please try again later.'}
  </div>
  <button
    type="button"
    className="btn btn-link p-0"
    onClick={() => refetch()}
    style={{ color: 'var(--cui-primary)' }}
  >
    Retry
  </button>
</div>
```

### Empty State
```tsx
<div className="py-2">
  <div className="text-muted">
    No data found.
  </div>
  <div className="text-muted small">
    Try adjusting your search parameters.
  </div>
</div>
```

---

## Map Container

### Map with Overlay Badge and External Legend
```tsx
<div>
  {/* Map Container */}
  <div className="position-relative">
    <div
      ref={mapContainer}
      className="rounded overflow-hidden"
      style={{
        height: 350,
        border: '1px solid var(--cui-border-color)'
      }}
    />

    {/* Info badge - top left (overlay) */}
    <div
      className="position-absolute top-0 start-0 m-2 px-2 py-1 rounded shadow-sm"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid var(--cui-border-color)',
        zIndex: 1,
        fontSize: '11px'
      }}
    >
      <strong>{count}</strong> items
    </div>
  </div>

  {/* Legend - below map, horizontal layout */}
  <div
    className="d-flex flex-wrap align-items-center gap-3 mt-2 pt-2"
    style={{
      fontSize: '10px',
      color: 'var(--cui-secondary-color)',
      borderTop: '1px solid var(--cui-border-color)'
    }}
  >
    <div className="d-flex align-items-center gap-1">
      <div style={{ width: '10px', height: '10px', backgroundColor: '#0d6efd', borderRadius: '50%' }}></div>
      <span>Subject</span>
    </div>
    <span className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Lot Size:</span>
    <div className="d-flex align-items-center gap-1">
      <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
      <span>&lt;5k</span>
    </div>
    {/* ... more legend items ... */}
  </div>
</div>
```

---

## Color Tokens

### CSS Variable References
```tsx
// Text colors
'var(--cui-body-color)'        // Primary text
'var(--cui-secondary-color)'   // Secondary/muted text
'var(--cui-tertiary-color)'    // Even more muted

// Backgrounds
'var(--cui-secondary-bg)'      // Secondary background
'var(--cui-tertiary-bg)'       // Tertiary background
'var(--cui-warning-bg-subtle)' // Subtle warning highlight

// Borders
'var(--cui-border-color)'      // Standard border

// Semantic colors
'var(--cui-primary)'           // Primary action color
'var(--cui-danger)'            // Error/danger color
```

### Hardcoded Colors (use sparingly)
```tsx
'#57c68a'  // Positive values (green)
'#ef4444'  // Negative values (red)
'#0d6efd'  // Map: subject property marker (blue)

// Map marker colors by lot size
'#22c55e'  // Small lots (< 5,000 SF) - green
'#eab308'  // Medium lots (5,000 - 7,500 SF) - yellow
'#f97316'  // Larger lots (7,500 - 10,000 SF) - orange
'#ef4444'  // Large lots (> 10,000 SF) - red
'#9ca3af'  // No lot data - gray
```

---

## Currency Formatting

### Format Function
```tsx
function formatCurrencyCompact(
  value: number | null | undefined,
  fractionDigits = 0
): string {
  if (value === null || value === undefined) return '—';
  return formatMoney(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}
```

### Usage
```tsx
// Whole dollars
{formatCurrencyCompact(123456)}  // "$123,456"

// With decimals
{formatCurrencyCompact(123.45, 2)}  // "$123.45"

// Null handling
{formatCurrencyCompact(null)}  // "—"
```
