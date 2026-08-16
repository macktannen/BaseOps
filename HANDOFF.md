# Switch (Handoff) Document
Current Version: **v0.3.95**

## Project Overview
Helicopter Scheduler Web App (`baseops`). We are actively debugging state synchronization bugs, managing production data safety, and building out new UI layouts.

## Current Status (v0.3.95)
1. **Failsafe Maintenance Meter Totals**: Fixed dual callback execution in `FlightLogTab.jsx` and added strict 1-decimal floating-point precision wrappers (`Math.round((val) * 10) / 10`) across all aircraft meters (Total Hours, Hobbs, Engine 1/2 Hours, Landings, Cycles) to guarantee exact maintenance records.
2. **Production Safety & Sandbox Isolation**: Local development (`localhost`) is now automatically isolated to `orgs/dev_sandbox` in Firestore so local testing never alters production database (`orgs/default`).
3. **Data Management Tools**: Added administrative controls in `SettingsView` under "Data Management" allowing one-click resets of flights or complete database wipes across local and cloud environments.
4. **Clear Signature Single-Click Logic**: Completely rewritten into an atomic workflow inside `EventModal.jsx`, eliminating stale prop evaluations and multi-layer callback race conditions.

## Pending Tasks
1. **Redo layout for schedules grid** (Not started).
2. **Fleet view layout** (Not started).

