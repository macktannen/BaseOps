---
name: check-path
description: Check if working in the correct Antigravity scratch folder and alert if not. Use when the user says /check-path, "check path", "verify location", or wants to confirm they're in the right folder.
---

# Check Working Directory

Check the current working directory and verify it matches the Antigravity scratch folder structure.

1. Run `pwd` or `Get-Location` to get the current working directory.
2. Check if the path contains `.gemini\antigravity\scratch\` or `.gemini/antigravity/scratch/`.
3. If YES: Confirm to the user that they are working in the correct Antigravity scratch folder.
4. If NO: **STOP and alert the user** with this message:

```
WARNING: You are not working in the Antigravity scratch folder.
Current directory: [current path]
Expected location: C:\Users\chadm\.gemini\antigravity\scratch\[project-name]

This means changes may not sync with opencode.
Would you like to switch to the Antigravity scratch folder for this project?
```

5. List the available Antigravity scratch projects:
   - `baseops`
   - `transmission-map`
   - `kvpz-tracker`
   - `am_sync_project`
   - `Proxima`
   - `executive_travel_portal`
   - `executive_travel`
   - `dog_ball_video`

6. Ask the user which project they want to work on if they're in the wrong location.
