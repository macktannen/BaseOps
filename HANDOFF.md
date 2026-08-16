# Switch (Handoff) Document
Current Version: **v0.4.8**

## Project Overview
Helicopter Scheduler Web App (`baseops`). We are actively debugging state synchronization bugs, managing production data safety, and building out new UI layouts.

## Current Status (v0.4.8)
1. **Bidirectional Calendar & Schedules Grid Mirroring**: Added live `firestore-sync` and `storage` event listeners for `crewSchedules` inside `CalendarView.jsx` and `CrewSchedule.jsx`, ensuring status changes and clears mirror instantaneously between the monthly calendar and weekly schedules grid.
2. **Production Safety & Sandbox Isolation**: Local development (`localhost`) is now automatically isolated to `orgs/dev_sandbox` in Firestore so local testing never alters production database (`orgs/default`).
3. **Data Management Tools**: Added administrative controls in `SettingsView` under "Data Management" allowing one-click resets of flights or complete database wipes across local and cloud environments.
4. **Clear Signature Single-Click Logic**: Completely rewritten into an atomic workflow inside `EventModal.jsx`, eliminating stale prop evaluations and multi-layer callback race conditions.

## Pending Tasks
1. **Redo layout for schedules grid** (Not started).
2. **Fleet view layout** (Not started).

