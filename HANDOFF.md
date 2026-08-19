# HANDOFF - baseops

- **Timestamp:** Aug 19, 2026
- **Tool used:** opencode
- **Branch:** main
- **Last commit:** (uncommitted — v1.2.0 changes)

## Project Overview
Helicopter Scheduler Web App (`baseops`). Manages flights, crew schedules, expenses, fleet, and documents with Firebase/Firestore backend.

## Architecture
- **Firestore structure:** `orgs/{orgName}` (org doc for lists) + `orgs/{orgName}/flights/{flightId}` (per-entity flight documents)
- **Dev sandbox:** `orgs/dev_sandbox`, **Production:** `orgs/default`
- **DataProvider.jsx** exposes: `updateData`, `updateDataBatch`, `saveFlight`, `saveFlightsBatch`, `deleteFlight`
- `userFlights` reads from flights subcollection subscription; all other data reads from org document subscription

## What Was Just Completed (Aug 18)
1. **Firestore write optimization (93% reduction):** Deferred expense writes to flight save, batched flight save + location usage + aircraft updates, batched crew/pilot/passenger deletes, batched vendor remap
2. **Client-side image resizing:** Images resized to 1024px max, JPEG 80% quality before Firebase Storage upload. Shows alert on resize failure.
3. **Expense save flow:** "Save Expense" button persists to Firestore immediately; auto-fill expenses require explicit Save Expense click
4. **Unsaved changes warning:** Modal warns before close if status, flightNumber, date, or other fields changed
5. **Receipt delete deferral:** Receipt files not deleted from Storage until Save Expense or Save Flight clicked
6. **File delete error alerts:** Storage deletion failures now show user-facing alerts
7. **Aircraft update consolidation:** Flight sign/clear/toggle lock all route through single batched write path
8. **Crew schedule deferral:** Status changes update locally; sticky bar with Save/Discard appears
9. **Remote change detection:** When another user saves a flight you have open, banner shows which fields changed with See Latest/Keep Mine options
10. **Flight log signature priority:** Signature changes always auto-sync regardless of unsaved changes
11. **Per-entity flight documents:** Flights now live in `orgs/{org}/flights/{flightId}` subcollection, eliminating last-write-wins race condition for flight saves

## What Was Just Completed (Aug 19)
12. **Add New Passenger from Flight Modal** — "+ Add New Passenger..." option in passenger dropdown opens a modal to create a new passenger (Name, Weight, Phone, Email, Company, Title). Saves to system-wide `userPassengers` list and adds to current flight leg. Works on both desktop and mobile. Passenger ID = Name.
13. **Edit Passenger from Flight Modal** — Clicking a passenger name badge in the flight leg opens the same modal in edit mode with pre-filled info. Changes persist to system-wide list.
14. **Passenger dropdown sorted by usage** — Passenger selector now sorts by flight count (most used first), then alphabetically.
15. **Passenger modal cleanup** — Removed placeholder text from all Add/Edit Passenger modal fields.
16. **Code audit & cleanup (v1.3.0)** — Fixed 2 critical bugs (conditional hook, stale closure), 3 high issues (memoization, DRY, context perf), removed unused code, added ErrorBoundary, extracted magic numbers. Lint reduced from 14 issues to 3.
17. **Removed dead mock data (v1.3.1)** — Deleted `data.js` and cleaned up all mock data imports/references across 9 files.

## Files Changed (Aug 18 session)
- `src/contexts/DataProvider.jsx` — Flights subscription from subcollection, saveFlight/deleteFlight/saveFlightsBatch API
- `src/services/FileStorageService.js` — Image resize, resizeFailed flag, throw on delete errors
- `src/components/EventModal.jsx` — Batched performSave, deferred receipt deletion, remote changes banner, unsaved changes detection, aircraft toggle lock callback
- `src/components/ExpensesTab.jsx` — Deferred expense writes, saveFlight for persistExpensesToFlight, dirty on receipt delete
- `src/components/ExpensesPage.jsx` — saveFlight/deleteFlight for all flight writes
- `src/components/CalendarView.jsx` — saveFlight/deleteFlight, crew schedule deferral bar
- `src/components/CrewSchedule.jsx` — saveFlight/deleteFlight
- `src/components/FlightLogTab.jsx` — onToggleLock callback (no direct updateData)
- `src/components/MobileExpenses.jsx` — saveFlight
- `src/components/MobileLayout.jsx` — saveFlight/deleteFlight
- `src/components/SettingsView.jsx` — deleteFlight for clear all

## Pending Tasks
1. **Redo layout for schedules grid** (Not started)
2. **Fleet view layout** (Not started)

## Remaining Data Loss Risks
- **#4:** suppressSyncRef 10-second window (medium — can be fixed with writeId detection)
- **#12-16:** Notes/CustomZone modals close without confirmation; persist functions silently fail
- **#18-25:** Various edge cases (stale localStorage, conflict detection bypass, etc.)

## Key APIs
- `saveFlight(flightData)` — Writes one flight to flights subcollection
- `saveFlightsBatch(flightsArray)` — Batch-writes multiple flights
- `deleteFlight(flightId)` — Deletes one flight from subcollection
- `updateData(key, value)` — Writes to org document (for lists, schedules, etc.)
- `updateDataBatch(updates)` — Batch-writes multiple keys to org document

## Deployment Workflow (Standing Instructions)
For every app change:
1. Bump version in `package.json`
2. Update `CHANGELOG.md` with the change
3. Update `HANDOFF.md` (timestamp, last commit, completed work, files changed)
4. Commit and push to `origin/main`
5. Vercel auto-deploys from git main — no manual deploy needed
