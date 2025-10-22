# Claude Code Commands

This directory contains custom slash commands for the Landscape Platform project.

## Available Commands

### `/update-docs`

**Purpose:** Comprehensive documentation update workflow

**What it does:**
1. Scans for recent changes (last 7 days)
2. Updates status documents and READMEs
3. Updates the documentation center page
4. Creates completion documents for new features
5. Stages, commits, and pushes changes to git

**Usage:**
```
/update-docs
```

Or simply say: **"update documentation"**

**When to use:**
- After completing a major feature
- After finishing a migration
- After adding new API endpoints
- At end of coding session with significant changes
- When documentation is out of date

**Related documentation:**
- Full workflow guide: `/docs/DOCUMENTATION_UPDATE_WORKFLOW.md`
- Command details: `.claude/commands/update-docs.md`

---

## Creating New Commands

To add a new custom command:

1. Create a new `.md` file in this directory
2. Name it with the command you want (e.g., `quick-test.md` for `/quick-test`)
3. Write clear instructions for what Claude should do
4. Add any necessary permissions to `.claude/settings.local.json`

### Command File Template

```markdown
# [Command Name]

**Purpose:** Brief description

**When to use:** Usage scenarios

## Instructions

Step-by-step instructions for Claude to follow...

## Example

Show example of command usage and output...
```

---

## Permissions

Git and file operations require permissions in `.claude/settings.local.json`.

Current allowed operations:
- `git status`, `git diff`, `git log` - Viewing git state
- `git add docs/`, `git add backend/*.md` - Staging documentation
- `find` commands for scanning recent changes
- Date and file stat commands

See [.claude/settings.local.json](../.claude/settings.local.json) for full list.

---

## Best Practices

1. ✅ Keep commands focused on specific workflows
2. ✅ Include verification steps
3. ✅ Provide clear examples
4. ✅ Update permissions as needed
5. ✅ Document prerequisites
6. ✅ Include error handling notes

---

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [Project Documentation Center](../../src/app/documentation/page.tsx)
- [Documentation Update Workflow](../../docs/DOCUMENTATION_UPDATE_WORKFLOW.md)
