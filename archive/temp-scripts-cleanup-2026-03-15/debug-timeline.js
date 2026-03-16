// Debug script to test timeline calculation logic
const items = [
  { budget_item_id: 100, description: 'Mass Grading', start_period: 0, periods_to_complete: 4, timing_method: 'ABSOLUTE', timing_locked: false },
  { budget_item_id: 101, description: 'Utilities', start_period: null, periods_to_complete: 3, timing_method: 'DEPENDENT', timing_locked: false },
  { budget_item_id: 102, description: 'Roads', start_period: null, periods_to_complete: 4, timing_method: 'DEPENDENT', timing_locked: false },
  { budget_item_id: 103, description: 'Landscaping', start_period: null, periods_to_complete: 2, timing_method: 'DEPENDENT', timing_locked: false }
];

const dependencies = [
  { dependency_id: 2, dependent_item_id: 101, trigger_item_id: 100, trigger_event: 'COMPLETE', offset_periods: 1 },
  { dependency_id: 3, dependent_item_id: 102, trigger_item_id: 100, trigger_event: 'COMPLETE', offset_periods: 0 },
  { dependency_id: 4, dependent_item_id: 103, trigger_item_id: 102, trigger_event: 'COMPLETE', offset_periods: 1 }
];

// Build maps
const itemMap = new Map();
for (const item of items) {
  itemMap.set(item.budget_item_id, item);
}

const depMap = new Map();
for (const dep of dependencies) {
  const existing = depMap.get(dep.dependent_item_id) || [];
  existing.push(dep);
  depMap.set(dep.dependent_item_id, existing);
}

// Resolve
const resolved = new Map();
const resolving = new Set();
const errors = [];

function resolveStartPeriod(itemId, path = []) {
  console.log(`\nResolving item ${itemId}, path: [${path.join(' → ')}]`);

  // Check for circular dependency
  if (resolving.has(itemId)) {
    errors.push(`Circular dependency detected: ${[...path, itemId].join(' → ')}`);
    return 0;
  }

  // Already resolved
  if (resolved.has(itemId)) {
    const val = resolved.get(itemId);
    console.log(`  Already resolved: ${val}`);
    return val;
  }

  const item = itemMap.get(itemId);
  if (!item) {
    errors.push(`Item ${itemId} not found`);
    return 0;
  }

  // If timing is locked, use current start_period
  if (item.timing_locked) {
    const startPeriod = item.start_period || 0;
    resolved.set(itemId, startPeriod);
    console.log(`  Timing locked, using: ${startPeriod}`);
    return startPeriod;
  }

  // Get dependencies for this item
  const deps = depMap.get(itemId);

  // If no dependencies, use current start_period
  if (!deps || deps.length === 0) {
    const startPeriod = item.start_period || 0;
    resolved.set(itemId, startPeriod);
    console.log(`  No dependencies, using: ${startPeriod}`);
    return startPeriod;
  }

  // Mark as resolving
  resolving.add(itemId);
  console.log(`  Has ${deps.length} dependencies`);

  let calculatedStartPeriod = 0;

  // Resolve all dependencies
  for (const dep of deps) {
    console.log(`  Processing dependency ${dep.dependency_id}: trigger=${dep.trigger_item_id}, event=${dep.trigger_event}, offset=${dep.offset_periods}`);

    if (dep.trigger_event === 'ABSOLUTE') {
      calculatedStartPeriod = Math.max(calculatedStartPeriod, dep.offset_periods || 0);
      console.log(`    ABSOLUTE: using offset ${dep.offset_periods}, calc=${calculatedStartPeriod}`);
      continue;
    }

    // Dependency on another item
    const triggerId = dep.trigger_item_id;
    if (triggerId === null) {
      errors.push(`Dependency ${dep.dependency_id} has no trigger item`);
      continue;
    }

    // Recursively resolve trigger item
    const triggerStartPeriod = resolveStartPeriod(triggerId, [...path, itemId]);

    const triggerItem = itemMap.get(triggerId);
    if (!triggerItem) {
      errors.push(`Trigger item ${triggerId} not found`);
      continue;
    }

    let triggerPeriod = 0;

    // Calculate based on trigger event type
    if (dep.trigger_event === 'START') {
      triggerPeriod = triggerStartPeriod;
      console.log(`    START: trigger starts at ${triggerStartPeriod}`);
    } else if (dep.trigger_event === 'COMPLETE') {
      triggerPeriod = triggerStartPeriod + (triggerItem.periods_to_complete || 0);
      console.log(`    COMPLETE: trigger starts at ${triggerStartPeriod}, duration ${triggerItem.periods_to_complete}, completes at ${triggerPeriod}`);
    } else if (dep.trigger_event === 'PCT_COMPLETE') {
      const pct = (dep.trigger_value || 50) / 100;
      triggerPeriod = triggerStartPeriod + Math.floor((triggerItem.periods_to_complete || 0) * pct);
      console.log(`    PCT_COMPLETE: ${pct}% of ${triggerItem.periods_to_complete} = ${triggerPeriod}`);
    }

    // Apply offset
    const finalPeriod = triggerPeriod + (dep.offset_periods || 0);
    console.log(`    Final period after offset: ${triggerPeriod} + ${dep.offset_periods} = ${finalPeriod}`);

    // Take the maximum (most restrictive)
    calculatedStartPeriod = Math.max(calculatedStartPeriod, finalPeriod);
    console.log(`    Updated calc period: ${calculatedStartPeriod}`);
  }

  // Done resolving
  resolving.delete(itemId);
  resolved.set(itemId, calculatedStartPeriod);
  console.log(`  RESOLVED ${itemId} = ${calculatedStartPeriod}\n`);

  return calculatedStartPeriod;
}

// Resolve all items with DEPENDENT timing
for (const item of items) {
  if (item.timing_method === 'DEPENDENT' && !item.timing_locked) {
    resolveStartPeriod(item.budget_item_id);
  }
}

console.log('\n=== FINAL RESULTS ===');
for (const [itemId, period] of resolved.entries()) {
  const item = itemMap.get(itemId);
  console.log(`Item ${itemId} (${item.description}): ${period}`);
}

if (errors.length > 0) {
  console.log('\n=== ERRORS ===');
  errors.forEach(err => console.log(err));
}
