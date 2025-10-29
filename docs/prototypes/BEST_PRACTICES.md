# Prototype Documentation Best Practices

## Why Document Prototypes?

With dozens of prototypes across different features, proper documentation ensures:
- **Continuity**: Future iterations build on past learnings
- **AI Context**: Claude/Codex can reference previous decisions
- **Pattern Recognition**: Identify what works across prototypes
- **Avoid Repetition**: Don't solve the same problem twice
- **Knowledge Transfer**: New team members understand design evolution

## The System

### 1. **Inline Notes (Real-Time)**
Every prototype page has a notes field. Use it to capture immediate thoughts:

**Good examples:**
- "Floor plan matrix is very scannable - keep this pattern"
- "Need bidirectional data flow - units should aggregate to floor plans"
- "AI indicator arrows (↑↓) are too subtle, needs better visibility"
- "Comparables map should be 80% larger - done and it's perfect now"

**Bad examples:**
- "Good" (too vague)
- "Fix this" (what needs fixing?)
- "Maybe later" (what specifically?)

**When to add notes:**
- Immediately after using the prototype
- When you notice something that works well
- When you encounter a pain point
- When you have an idea for improvement
- When you make a decision about the design

### 2. **Structured Documentation (Periodic)**
After major iterations, create/update markdown documentation:

**Files:**
- `prototype-{n}.md` - Version-specific detailed docs
- `iterations.md` - Timeline of changes across versions
- `decisions.md` - Why certain approaches were chosen
- `feedback.md` - Auto-generated from inline notes

**When to update:**
- After completing a new prototype version
- Before showing to stakeholders
- When transitioning to production
- When archiving a prototype

### 3. **Automated Export (Daily/Weekly)**
Run the export script to keep markdown in sync:

```bash
node scripts/export-prototype-notes.js
```

This creates/updates `feedback.md` files with all inline notes.

**Recommended schedule:**
- Daily: If actively prototyping
- Weekly: For maintenance mode
- Before meetings: To review feedback
- Before new iterations: To inform decisions

## Workflow Example

### Scenario: Creating Rent Roll Prototype v2

#### 1. Review Previous Version
```bash
# Read the documentation
cat docs/prototypes/multifam/rent-roll-inputs/prototype-1.md

# Check user feedback
cat docs/prototypes/multifam/rent-roll-inputs/feedback.md

# Look at decision log
cat docs/prototypes/multifam/rent-roll-inputs/decisions.md
```

#### 2. Identify What to Keep/Change
From prototype-1 feedback:
- ✅ Keep: Floor plan matrix layout (scannable)
- ✅ Keep: Large comparables map
- ✅ Keep: AI analysis box
- 🔄 Change: Add bidirectional data flow
- 🔄 Change: Make AI indicators more prominent
- ➕ Add: Batch editing capabilities

#### 3. Build Prototype v2
Create new version with improvements.

#### 4. Document as You Go
Add inline notes while building:
- "Added bidirectional arrows showing data flow direction"
- "Enhanced AI indicators with color coding - much better visibility"
- "Batch edit modal for selecting multiple units - feels natural"

#### 5. Create Version Documentation
Copy template and fill in:
```bash
cp docs/prototypes/_template.md \
   docs/prototypes/multifam/rent-roll-inputs/prototype-2.md
```

Update with:
- What changed from v1
- Why changes were made
- New features added
- Outstanding issues

#### 6. Update Iteration Log
Add entry to `iterations.md`:
```markdown
## Prototype 2 - 2025-10-24

**Changes:**
- Added bidirectional data flow indicators
- Enhanced AI rent indicators with color coding
- Implemented batch editing for units
- Added scenario modeling calculator

**Rationale:**
User feedback from v1 emphasized need for flexible data entry
(both top-down and bottom-up). Color-coded AI indicators address
visibility concerns raised in testing.

**Results:**
Testing shows 40% faster data entry with bidirectional flow.
Users immediately understood data source with visual indicators.
```

## AI Assistant Integration

### For AI (Claude/Codex) Reading This:

When asked to work on prototypes, follow this pattern:

1. **Read First**
   ```bash
   # Check if prototype exists
   ls docs/prototypes/{category}/{feature}/

   # Read version docs
   cat docs/prototypes/{category}/{feature}/prototype-*.md

   # Read feedback
   cat docs/prototypes/{category}/{feature}/feedback.md
   ```

2. **Understand Context**
   - What patterns have worked before?
   - What has been tried and rejected?
   - What are the key user pain points?
   - What decisions have been made?

3. **Propose Changes**
   - Reference previous iterations
   - Explain why suggestion differs from past approaches
   - Note any trade-offs

4. **Document Changes**
   - Update inline notes
   - Create new version docs if major revision
   - Update iteration log
   - Export notes to markdown

### Example AI Response:

> "I've reviewed Prototype 1 documentation and the user feedback about bidirectional workflow. Looking at the Peoria Lakes pattern that inspired the layout, I suggest adding visual indicators (↕ arrows) next to section headers to show data flow direction. This is similar to how the Planning Overview shows hierarchical relationships between Areas/Phases/Parcels.
>
> Previous attempts at bidirectional sync (see Budget Grid v2) struggled with conflict resolution. I recommend we add a 'Data Source' badge showing whether values are user-entered, AI-calculated, or aggregated from detail rows. This addresses the feedback: 'Needs to work both ways.'"

## Searching Across Prototypes

### Find Patterns That Work
```bash
# What patterns have users liked?
grep -r "works well" docs/prototypes/*/feedback.md

# What AI integration patterns exist?
grep -r "AI Integration" docs/prototypes/*/prototype-*.md

# What table patterns have been used?
grep -r "table" docs/prototypes/*/prototype-*.md
```

### Learn from Past Issues
```bash
# What hasn't worked?
grep -r "pain point\|doesn't work\|too" docs/prototypes/*/feedback.md

# What was rejected?
grep -r "Rejected\|Alternative" docs/prototypes/*/prototype-*.md
```

### Cross-Reference Features
```bash
# Find all MultiFam prototypes
ls docs/prototypes/multifam/

# Find all prototypes using floor plans
grep -r "floor plan" docs/prototypes/
```

## Directory Structure

```
docs/prototypes/
├── README.md                          # This file
├── BEST_PRACTICES.md                  # You are here
├── _template.md                       # Template for new prototypes
│
├── multifam/                          # Category
│   └── rent-roll-inputs/              # Feature
│       ├── prototype-1.md             # Version docs
│       ├── prototype-2.md
│       ├── iterations.md              # Timeline
│       ├── decisions.md               # Design decisions
│       └── feedback.md                # Auto-generated notes
│
├── planning/
│   ├── overview/
│   └── parcel-grid/
│
├── budget/
│   └── grid/
│
└── general/
    └── lease-input/
```

## Version Numbering Guidelines

### When to Create New Version

**Create Prototype 2, 3, etc. when:**
- Layout changes significantly
- Core workflow changes
- Major features added/removed
- Ready to show stakeholders
- Previous version being archived

**Keep same version when:**
- Bug fixes
- Minor styling tweaks
- Small copy changes
- Performance improvements

### Naming Convention
- `prototype-1.md` - First iteration
- `prototype-2.md` - Second iteration
- etc.

URL/ID: `{category}-{feature}-v{n}` (if needed)

## Maintenance Schedule

### Daily (During Active Development)
- [ ] Add inline notes as you work
- [ ] Update feedback.md if testing with users

### Weekly
- [ ] Run export script: `node scripts/export-prototype-notes.js`
- [ ] Review accumulated feedback
- [ ] Clean up duplicate/outdated notes

### Per Iteration
- [ ] Create new version doc from template
- [ ] Update iterations.md with summary
- [ ] Document key decisions
- [ ] Update related prototypes references

### Quarterly
- [ ] Archive superseded prototypes
- [ ] Update README with new prototypes
- [ ] Review patterns across all prototypes
- [ ] Update best practices based on learnings

## Quick Reference

### Add Inline Note
1. Open prototype page
2. Type thought in notes field
3. Click "Save Notes"
4. Note saved to JSON and will be exported to markdown

### Create New Prototype Documentation
```bash
# 1. Copy template
cp docs/prototypes/_template.md \
   docs/prototypes/{category}/{feature}/prototype-1.md

# 2. Fill in sections
# 3. Add to README index
```

### Export Notes to Markdown
```bash
node scripts/export-prototype-notes.js
```

### Search All Documentation
```bash
# Find specific term
grep -r "search term" docs/prototypes/

# Find in feedback only
grep -r "search term" docs/prototypes/*/feedback.md

# Find in decisions
grep -r "search term" docs/prototypes/*/decisions.md
```

## Common Pitfalls to Avoid

### ❌ Don't
- Leave notes vague ("good", "bad", "fix")
- Wait until end of week to document
- Skip documentation for "quick" prototypes
- Delete old versions (archive instead)
- Document only what worked (failures teach too)

### ✅ Do
- Be specific about what and why
- Document as you build
- Track even experimental prototypes
- Keep history of iterations
- Document both successes and failures

## For Managers/Stakeholders

### Where to Find Information

**Current prototypes:**
```bash
cat docs/prototypes/README.md
```

**Specific prototype status:**
```bash
cat docs/prototypes/{category}/{feature}/prototype-{n}.md
```

**User feedback summary:**
```bash
cat docs/prototypes/{category}/{feature}/feedback.md
```

**Evolution over time:**
```bash
cat docs/prototypes/{category}/{feature}/iterations.md
```

### Key Metrics to Track
- Number of prototypes created
- Number of iterations per feature
- Patterns that recur across prototypes
- Time from prototype to production
- User feedback themes

## Summary

**The Golden Rule:**
> If you learned something while building or using a prototype, document it. Your future self (or an AI assistant) will thank you.

**The Workflow:**
1. Build → Add inline notes
2. Test → Add more notes
3. Iterate → Create version docs
4. Export → Run script weekly
5. Review → Read docs before next iteration
