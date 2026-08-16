# Switch (Handoff) Document
Current Version: **v0.3.96**

## Project Overview
Helicopter Scheduler Web App (`baseops`). We are actively debugging state synchronization bugs, managing production data safety, and building out new UI layouts.

## Current Status (v0.3.96)
1. **Atomic Single-Click Signing & Unsigning Architecture**: Unified both signing (`handleSignFlight`) and unsigning (`handleClearSignature`) into `EventModal.jsx`. Both operations execute strictly once, block remote Firestore event cross-contamination via `suppressSyncRef`, snapshot exact pre-flight baselines, and guarantee aircraft maintenance totals match only signed logs.
2. **Production Safety & Sandbox Isolation**: Local development (`localhost`) is now automatically isolated to `orgs/dev_sandbox` in Firestore so local testing never alters production database (`orgs/default`).
3. **Data Management Tools**: Added administrative controls in `SettingsView` under "Data Management" allowing one-click resets of flights or complete database wipes across local and cloud environments.
4. **Clear Signature Single-Click Logic**: Completely rewritten into an atomic workflow inside `EventModal.jsx`, eliminating stale prop evaluations and multi-layer callback race conditions.

## Pending Tasks
1. **Redo layout for schedules grid** (Not started).
2. **Fleet view layout** (Not started).

