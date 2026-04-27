---
description: "Generate a standup summary from recent work (for use when /chronicle is unavailable)"
tools: ["read", "search", "execute"]
argument-hint: "Optionally specify time range: 'last 3 days', 'this week'"
---

Generate a standup report summarizing recent work.

## Instructions

**In Copilot CLI**, prefer the built-in command:
```
/chronicle standup last 3 days
```

**In VS Code / IDE chat**, use this prompt to reconstruct a standup from git history:

1. Run `git log --oneline --since="3 days ago" --author="$(git config user.name)"` to find recent commits.
2. Run `git branch --show-current` to identify the current branch.
3. Check for open PRs if possible.
4. Summarize in this format:

```markdown
## Standup — [Date]

### Yesterday / Recent
- [What was accomplished, grouped by feature/branch]

### Today
- [Inferred next steps based on recent work]

### Blockers
- [Any failing tests or build issues detected]
```
