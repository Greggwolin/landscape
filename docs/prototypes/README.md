# Prototype Documentation

## Overview

This directory contains documentation for all UI/UX prototypes developed for the Landscape platform. Each prototype represents an experimental design or feature implementation that helps us iterate toward the best user experience.

## Purpose

- **Track Evolution**: Document how designs evolve across iterations
- **Capture Feedback**: Preserve user feedback and observations
- **Record Decisions**: Document why certain approaches were chosen or rejected
- **Enable Learning**: Help future iterations learn from past experiments
- **AI Context**: Provide context for AI assistants (Claude, Codex) working on future iterations

## Documentation Structure

Each prototype follows this structure:

```
prototypes/
  {category}/              # e.g., multifam, planning, budget
    {feature-name}/        # e.g., rent-roll-inputs
      prototype-{n}.md     # Version-specific documentation
      iterations.md        # Timeline of all iterations
      decisions.md         # Key design decisions
      feedback.md          # Aggregated user feedback
```

## Active Prototypes

### MultiFam
- [Rent Roll & Unit Inputs](./multifam/rent-roll-inputs/prototype-1.md) - Floor plan matrix with AI analysis

## How to Document a Prototype

### 1. Create Version Documentation
Use the template in `_template.md` to create `prototype-{n}.md` for each version.

### 2. Add Inline Notes
Use the notes field on each prototype page to capture real-time thoughts:
- What works well
- What doesn't work
- Ideas for improvement
- Technical considerations

### 3. Update Iteration Log
After each major revision, update `iterations.md` with:
- Date
- Version number
- Key changes
- Rationale

### 4. Record Decisions
When making significant design choices, document in `decisions.md`:
- The decision
- Alternatives considered
- Why this approach was chosen
- Trade-offs accepted

## Best Practices

1. **Be Specific**: Don't just say "layout is good" - explain what makes it good
2. **Include Context**: Note the date and current system state
3. **Think Forward**: Write notes that will help someone (or an AI) understand your reasoning months later
4. **Compare**: Reference other prototypes or patterns that worked/didn't work
5. **Capture Workflow**: Document how users would actually interact with the feature

## AI Assistant Guidelines

When working on prototypes, AI assistants should:
- Read existing prototype documentation before making changes
- Reference previous iterations and their feedback
- Suggest improvements based on documented patterns
- Update documentation when creating new iterations
- Cross-reference related prototypes

## Searching Documentation

All prototype notes are also stored in:
- `data/prototype-notes.json` - Structured data for API access
- `docs/prototypes/notes.log` - Chronological log of all notes

Use grep to search across all documentation:
```bash
grep -r "floor plan" docs/prototypes/
```

## Version Numbering

- Prototype 1, 2, 3... = Major iterations with significant changes
- Update notes inline for minor tweaks without creating new versions
- Create new version when layout, workflow, or core functionality changes substantially
