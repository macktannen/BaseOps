# BaseOps - Agent Context

## CRITICAL: Working Directory Rules
All project work MUST happen in the Antigravity scratch folders to maintain consistency between tools:

- **BaseOps**: `C:\Users\chadm\.gemini\antigravity\scratch\baseops`
- **NIPSCO Lines**: `C:\Users\chadm\.gemini\antigravity\scratch\transmission-map`
- **KVPZ Tracker**: `C:\Users\chadm\.gemini\antigravity\scratch\kvpz-tracker`
- **AM Sync**: `C:\Users\chadm\.gemini\antigravity\scratch\am_sync_project`

If you are ever working in a different directory (e.g., `C:\Users\chadm\Projects\BaseOps`), **STOP and ask the user** if they want to switch to the Antigravity scratch folder.

Never create new project folders outside of `C:\Users\chadm\.gemini\antigravity\scratch\` without explicit permission.

## Current State
- Last updated: 2026-08-10
- Last tool: opencode
- Last commit: v0.3.36 - Mobile expenses bottom action bar with manual expense and auto-fill invoice popups
- In progress: nothing
- Next planned: none
- Known issues: Firestore writes blocked client-side by ad-blocker/extension (v0.3.6 offline queue handles this gracefully)

## Project Overview
Helicopter scheduling app built with React + Vite. Uses Leaflet for maps, date-fns for time handling, Firebase for auth/Firestore/Storage.

## Tech Stack
- React 19, Vite 8, React Router 7
- Leaflet / React-Leaflet for maps
- date-fns + date-fns-tz for scheduling logic
- Firebase Auth, Firestore, Cloud Storage
- localforage for IndexedDB (legacy, being migrated to Cloud Storage)
- recharts for expense dashboard charts
- oxlint for linting

## Commands
- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run lint` - run oxlint

## Conventions
- No comments unless asked
- Small, focused commits
- Update this file's "Current State" section after every change
- Bump `APP_VERSION` in `src/App.jsx` (shown in the main menu) and add a CHANGELOG entry for every release

## Versioning
- `APP_VERSION` lives in `src/App.jsx` and `src/components/MobileLayout.jsx` (both must match).
- It MUST match the latest CHANGELOG version. Current: v0.3.48.

