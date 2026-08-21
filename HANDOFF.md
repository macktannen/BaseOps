# HANDOFF - BaseOps

- **Timestamp:** 2026-08-20
- **Tool used:** opencode
- **Branch:** main
- **Last commit:** 48703d8 — fix: eagerly load CalendarView (default tab) to eliminate initial loading delay

## Project Overview
BaseOps is a helicopter scheduling/operations web app built with React 19, Vite 8, Firebase (Auth/Firestore/Storage), Leaflet for maps, and recharts for dashboards. It supports flight planning, crew scheduling, fleet management, expense tracking with AI invoice parsing, and digital flight log signing.

## What Was Just Completed
- **v1.7.0:** Gemini API key proxy (serverless function), filtered airports to eastern US (8,208 of 16,169), component tests, dead code removal, noUnusedLocals/noUnusedParameters enabled
- **v1.8.0:** Aircraft Usage Dashboard on Fleet page with period selector, fuel tracking, account pie chart, tag breakdown, fleet/aircraft filtering
- **Post-release fixes:** Resolved account IDs showing raw IDs (now resolved to names), changed Plane→Helicopter icon, aircraft dropdown now filters dashboard instead of showing separate view, eager-loaded CalendarView to fix perceived slowness
- **CI fixes:** Switched from jsdom to happy-dom for Node.js 24 compatibility, simplified CI workflow

## Pending Tasks
- **TypeScript strict mode (Phases C/D):** ~400 type errors remain in large components (EventModal, MobileLayout, SettingsView, CrewSchedule, etc.). Need to type props and state properly, then flip `strict: true` in tsconfig.json.
- **TypeScript strict in CI:** Currently `npm run typecheck || true` (non-blocking). Should be made blocking after Phase C/D.
- **Gemini API key:** Server-side `GEMINI_API_KEY` env var is set in Vercel. Client no longer needs `VITE_GEMINI_API_KEY`.
- **Firestore rules:** Need to deploy updated rules with `firebase deploy --only firestore:rules` for the admin write check on user docs.
- **Mobile Fleet page:** Doesn't have the Usage Dashboard tab yet (desktop only).

## Contextual Notes
- **AGENTS.md conventions:** No comments unless asked. Run `npm run lint`, `npm run test`, and `npm run build` before committing.
- **Versioning:** Version is in `package.json`. `APP_VERSION` derives from it in `App.tsx` and `MobileLayout.tsx`.
- **Lint warnings:** 3 pre-existing warnings (DataProvider fast-refresh, EventModal exhaustive-deps) — these are intentional/acceptable.
- **Typecheck:** 400+ errors in large components (strict:false). Services/contexts/hooks are well-typed.
- **Test environment:** happy-dom (not jsdom) for Node.js 24 compatibility.
- **Firebase:** `dev_sandbox` org for localhost, `default` org for production.
- **Flight hours:** Dashboard uses `flightLog.legsActuals[].flightHrs` (pilot-signed) when available, falls back to `leg.duration` (planned).
- **Completed flights only:** Dashboard filters to `status === 'completed'` OR signed logbooks (`flightLog.signature`).

## Next Steps
1. Commit any pending work (currently clean)
2. Continue TypeScript strict mode rollout (Phase C: type large components, Phase D: flip `strict: true`)
3. Add component tests for remaining components
4. Deploy Firestore rules update
