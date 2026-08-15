# Handoff Document

## Project Overview
**BaseOps:** A web-based application to manage a fleet of helicopters, crew scheduling, mission planning, document uploads, and flight expenses. The app uses React, localStorage with offline retry queues, IndexedDB localforage resilience, and live synchronization with Firebase Firestore & Firebase Storage.

## Current Status (v0.3.53)
- **Desktop Modal Title Space:** Abbreviated `MISSION #` to `MSN #` in desktop EventModal header to maximize space for the Mission Title.
- **Desktop Flight Duplication:** Fixed click-to-place flight duplication on calendar cells and badges.
- **Zero Data Loss Persistence & Cloud Sync:** Consolidated localStorage interceptor in `dataStore.js` and unified multi-tab / cloud sync (`mergeFlights`) to guarantee attached files, documents, and expense line items never disappear on page refresh.
- **Direct Row-Level Expense Saving:** Expense table rows feature direct save functionality and auto-imported AI expenses default directly to saved checkmark status.
- **Nomenclature Standardized:** Updated all user-facing `Trip #` labels to `Mission #` and `MSN #`.
- **Fluid Layout:** Scaled expenses tables fluidly across modal dialogs without forced horizontal scrollbars.
- **Unrestricted File & Receipt Attachments:** Allows all document file formats (.pdf, .png, .jpg, .csv, .xlsx, .docx, GIS, CAD, etc.) with dual Firebase Storage & IndexedDB fallback.

## Pending / Future Tasks
- **Schedules Grid:** Ongoing layout enhancements for the schedules grid.
- **Desktop Fleet View Review:** Future top-aligned aircraft view review.

## Architecture Context
- **Global EventModal (`EventModal.jsx`):** Shared across `CalendarView`, `MobileLayout`, and `CrewSchedule`.
- **Data Persistence (`dataStore.js`):** Intercepts `localStorage.setItem` for all tracked entity keys, persists changes immediately to Firestore `orgs/default`, and broadcasts changes locally via storage and `firestore-sync` events.
