# Handoff Document

## Project Overview
**BaseOps:** A web-based application to manage a fleet of helicopters, crew scheduling, and flight expenses. The app uses React and stores data in `localStorage`.

## Current Status
- **App Logo Updated (v0.3.49):** Replaced the previous SVG logo with a static PNG (`public/logo.png`) based on the user's explicit image upload and updated `Logo.jsx` to render it across the app.
- **Mobile Fleet Page Overhaul:** Completely rebuilt `MobileFleet.jsx` to correctly mirror the desktop `AircraftList.jsx` edit forms. This involved adding a neat dropdown selector for the active aircraft and vertically stacking the operational, maintenance, and logbook cards.
- **Mock Data Removal:** Fully removed reliance on mock data across the application. The app now strictly relies on local storage or loads a blank slate by default.
- **Mobile Layout & Navigation:** Added proper sorting and navigation callbacks for the `EventModal` so users can easily toggle left/right between flights without the modal closing.
- **Event Deletion Safety:** Implemented standard browser `window.confirm` dialogues and renamed buttons to "Delete Flight" across mobile views.
- **Permissions Integration:** Brought in permission checks (`canEditMeters`, `canEditOps`, `canEditMaintenance`, etc.) to the new mobile fleet view so fields lock/unlock based on user role correctly.

## Pending Tasks
- **Schedules Grid:** The user previously requested an overhaul/redo of the layout for the schedules grid (Pending from previous sessions).
- **Desktop Fleet View Review:** A long-term goal mentioned by the user was: *"The fleet view should stand and have aircraft across the top..."* which is currently NOT STARTED.

## Recent Context
- **Global EventModal:** The `EventModal` component serves as a globally shared component used by `CalendarView`, `MobileLayout`, and `CrewSchedule`. Passing the correct array index/sorting logic is critical for the left/right arrows to function as expected.
- **Data Persistence:** All edits sync perfectly to `localStorage` and appear instantly on the desktop views as well. State updates trigger `window.dispatchEvent(new Event('storage'))` to keep components globally synced.
