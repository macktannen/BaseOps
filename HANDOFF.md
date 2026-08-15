# Handoff Document

## Project Overview
**BaseOps:** A web-based application to manage a fleet of helicopters, crew scheduling, mission planning, document uploads, and flight expenses. The app uses React, localStorage with offline retry queues, IndexedDB localforage resilience, and live synchronization with Firebase Firestore & Firebase Storage.

## Current Status (v0.3.61)
- **Sidebar Collapse Controls Placement:** Removed top collapse arrow and positioned a dedicated collapse/expand caret button in the bottom footer. The caret is aligned to the right side of the menu bar when expanded, and centered when collapsed.
- **Collapsible Desktop Left Sidebar:** Added toggleable smooth-collapsing navigation sidebar for desktop. Features compact icon mode (`64px`), icon-only BaseOps logo mark, and persistent collapse state in `localStorage`.
- **Screen Resize State Persistence:** Lifted active navigation view and active modal flight ID into session storage and top-level app state, ensuring that window resizing, device rotation, or viewport mode switches never reset the active view to Calendar or close an active flight card modal.
- **Zero-Scroll Desktop Expenses Overview & Modal Rows:** Streamlined Expenses Overview table (`ExpensesPage.jsx`) and Flight Modal Expenses tab (`ExpensesTab.jsx`) with fluid column widths, compact cell padding, and auto-scaling typography to fit seamlessly without horizontal scrollbars on desktop screens.
- **Fluid Desktop Modal Header Auto-Scaling:** Re-engineered EventModal desktop header with adaptive font sizing, dynamic element compression, and fluid container widths to guarantee all header controls remain 100% visible and clickable on any window size down to mobile breakpoint.
- **Zero-Bloat Receipt & Upload Storage:** Eliminated base64 embedding in flight/expense records, ensuring Firestore documents never exceed the 1MB limit and realtime sync writes to `orgs/default` succeed 100% reliably.
- **Instant Cross-Device Synchronization:** Streamlined realtime Firestore snapshot engine in `dataStore.js` to propagate expense creations, edits, deletions, and uploads immediately across all mobile and desktop devices.
- **Live Modal Listeners:** Active modals now listen to `firestore-sync` events and re-render open flight/expense cards without requiring modal restart.
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
