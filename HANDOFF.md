# Switch (Handoff) Document

## Project Overview
Helicopter Scheduler Web App (`baseops`). We are actively debugging state synchronization bugs and building out new UI layouts.

## Current Status
- **Fix "Clear Signature" Single-Click Functionality (AWAITING VERIFICATION)**: Just implemented a comprehensive fix for a race condition where the "Clear Signature" button in the flight log required two clicks to fully update the UI. The issue involved duplicate `firestore-sync` events and React batching quirks that kept the signature visually present despite the backend un-signing the flight.
- Made `handleClearSignature` atomic in `FlightLogTab.jsx`.
- Forced the signature object to be strictly stripped via `forcedUnsigned` inside `EventModal.jsx`'s `onUnsign` handler before persisting to `localStorage.userFlights`.
- Pushed the latest build to production.

## Pending Tasks
1. **Redo layout for schedules grid**: The user requested this earlier in the conversation. It has NOT been started yet.
2. **Fleet view layout**: The user requested this earlier in the conversation. It has NOT been started yet.

## Recent Context
- **State Architecture**: `CalendarView.jsx` handles master saves to `localStorage` and triggers `CustomEvent('firestore-sync', { detail: { key: 'userFlights' } })`. `EventModal.jsx` listens to this event to keep its local state in sync.
- **Clear Signature Flow**: `FlightLogTab.jsx` -> calls `updateGlobalAircraft(-1)` -> calls `EventModal`'s `onUnsign` -> calls `performSave` -> calls `CalendarView`'s `handleSaveFlight`.
- **Open Questions**: We are currently waiting on the user to hard-refresh their browser and confirm that the "Clear Signature" functionality now works perfectly on the first click before proceeding to the layout reworks.
