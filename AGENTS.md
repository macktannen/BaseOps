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
- Last updated: 2026-08-20
- Last tool: opencode
- Last commit: v1.6.0
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
- recharts for expense dashboard charts
- oxlint for linting
- vitest for testing
- zod for data validation

## Commands
- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run lint` - run oxlint
- `npm run test` - run vitest
- `npm run test:watch` - run vitest in watch mode

## Conventions
- No comments unless asked
- Small, focused commits
- Update this file's "Current State" section after every change
- Bump `APP_VERSION` in `src/App.tsx` (derived from `package.json` version field; shown in the main menu) and add a CHANGELOG entry for every release
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before committing

## Versioning
- `APP_VERSION` is derived from `package.json` version field (shown in the main menu)
- `APP_VERSION` lives in `src/App.tsx` and `src/components/MobileLayout.tsx` (both must match)
- It MUST match the latest CHANGELOG version. Current: v1.6.0.

