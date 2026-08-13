---
description: Save progress and prepare handoff to switch between opencode and Antigravity CLI
---

**FIRST: Verify working directory.** Run `pwd` or `Get-Location`. If the path does NOT contain `.gemini\antigravity\scratch\` or `.gemini/antigravity/scratch/`, STOP and tell me:

```
WARNING: You are not in the Antigravity scratch folder.
Current: [path]
Expected: C:\Users\chadm\.gemini\antigravity\scratch\baseops

Switch to the scratch folder before continuing, or changes won't sync with Antigravity CLI.
```

Wait for my confirmation before proceeding.

**Once confirmed in the correct directory**, perform the following steps to save my work and prepare a session handoff:

1. Run `git status` to check for uncommitted changes.
2. If there are uncommitted changes, stage all changes with `git add -A` and commit them with a concise message describing what was done. Ask me for the commit message if the changes are ambiguous.
3. Run `git log --oneline -5` to get recent history.
4. Run `git diff --name-only HEAD~1 HEAD` to get files changed in the last commit.
5. Update the "Current State" section in AGENTS.md with:
   - Last updated: current date/time
   - Last tool: opencode
   - Last commit: the latest commit hash and message
   - In progress: ask me if anything is unfinished, otherwise set to "nothing"
   - Next planned: ask me what I plan to do next, or set to "TBD"
   - Known issues: ask me if there are any, otherwise set to "none"
6. Write the updated handoff to `.session-handoff.md` with this format:

```
=====================================
 SESSION HANDOFF - BaseOps
=====================================
Timestamp: [current time]
Last tool: opencode
Branch: [current branch]

## Last commit
[hash + message]

## Recent commits
[last 5 commits]

## Files changed in last commit
[list of files]

## Summary
[brief summary of what was accomplished]

## Next steps
[what should be done next]

## Instructions for next session
Read AGENTS.md and run `git log --oneline -10` to understand the current state.
Do NOT modify files listed above unless explicitly asked.
Commit with a clear message after each change.
Update AGENTS.md "Current State" section when done.
=====================================
```

7. After completing all steps, tell me: "Handoff saved. You can now switch to Antigravity CLI. Run `agy` and paste the contents of .session-handoff.md, or just say 'Read .session-handoff.md and continue'."

$ARGUMENTS
