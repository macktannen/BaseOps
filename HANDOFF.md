# Switch (Handoff) Document
Current Version: **v0.5.2**

## Project Overview
Helicopter Scheduler Web App (`baseops`). We are actively debugging state synchronization bugs, managing production data safety, and building out new UI layouts.

## Current Status (v0.5.2)
1. **Fresh Unified Schedule Management (`scheduleService.js`)**: Cleaned and unified schedule key resolution, lookup, mutation, and deletion into a centralized service. Corrected date suffix parsing to handle personnel IDs containing underscores without breaking date extraction.
2. **Firestore Stale Snapshot Protection**: Resolved race condition in `dataStore.js` where `onSnapshot` was overwriting active local writes for non-flight keys (`crewSchedules`, `calendarNotes`, etc.). Added explicit `isPendingLocalWrite(lsKey)` guard.
2. **Multi-Key Schedule Variant Cleanup**: `CrewSchedule.jsx` and `CalendarView.jsx` purge all key variants (ID, Name, and date variants) upon clearing or changing duty status.
3. **Synchronous Direct Schedule Mutation**: Hardened `handleCellClick` in `CrewSchedule.jsx` to update React state `setSchedules({ ...stored })` synchronously upon clicking Clear, eliminating render lag or dropped state updates.
4. **Production Safety & Sandbox Isolation**: Local development (`localhost`) is now automatically isolated to `orgs/dev_sandbox` in Firestore so local testing never alters production database (`orgs/default`).
5. **Clear Signature Single-Click Logic**: Completely rewritten into an atomic workflow inside `EventModal.jsx`, eliminating stale prop evaluations and multi-layer callback race conditions.

## Pending Tasks
1. **Redo layout for schedules grid** (Not started).
2. **Fleet view layout** (Not started).


