---
name: resume
description: Resume work from where opencode left off. Use when the user says /resume, "pick up", "continue", or wants to resume from the last session handoff.
---

# Resume Session

**FIRST: Verify working directory.** Run `pwd` or `Get-Location`. If the path does NOT contain `.gemini\antigravity\scratch\` or `.gemini/antigravity/scratch/`, STOP and tell me:

```
WARNING: You are not in the Antigravity scratch folder.
Current: [path]
Expected: C:\Users\chadm\.gemini\antigravity\scratch\baseops

Switch to the scratch folder before continuing, or changes won't sync with opencode.
```

Wait for my confirmation before proceeding.

**Once confirmed in the correct directory**, perform the following steps to resume from the last session handoff:

1. Read the file `.session-handoff.md` if it exists.
2. Read `AGENTS.md` to understand the project context.
3. Run `git log --oneline -10` to see recent history.
4. Run `git status` to check current state.
5. Summarize to me:
   - What the last tool did
   - What files were changed
   - What's planned next
   - Any known issues
6. Ask me what I'd like to work on next.

If `.session-handoff.md` does not exist, tell me there's no handoff file and ask me to describe what I'd like to work on.
