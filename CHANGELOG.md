# CHANGELOG

All notable changes to the BaseOps application will be documented in this file.

## [v1.6.0] - 2026-08-20

### Changed
- **TypeScript migration** — Converted all 56 source files from JavaScript (.js/.jsx) to TypeScript (.ts/.tsx). Added `tsconfig.json` with strict mode enabled for services/contexts/hooks, loose mode for large components
- **Bundle optimization** — Removed unused dependencies (`localforage`, `csv-parse`). Split heavy libraries into separate chunks: Firebase (567 kB), Leaflet (169 kB), date-fns (33 kB), PDF.js (427 kB). Main bundle reduced from 4,263 kB to 3,130 kB (-27%)
- **PDF.js lazy loading** — PDF parser service now dynamically imports pdfjs-dist only when a PDF is opened, reducing initial load
- **ExpensesDashboard lazy loaded** — Recharts-based dashboard now loads on demand when the dashboard tab is activated
- **Entry point fixes** — Corrected `index.html` and `main.tsx` references after TypeScript migration

### Added
- **TypeScript configuration** — `tsconfig.json` with `allowJs: true`, `strict: false` (services use strict types, components use loose types for gradual migration)
- **Vite env types** — `src/vite-env.d.ts` for `import.meta.env` support
- **Typecheck script** — `npm run typecheck` runs `tsc --noEmit`
- **Zod validation** — Added `src/services/validation.ts` with schemas for Flight, Aircraft, Pilot, Passenger, Account, Vendor, and Expense data. `saveFlight` now validates before Firestore write

## [v1.5.2] - 2026-08-19

### Changed
- **Lint cleanup** — Reduced warnings from 24 to 3 by removing unused imports, unused variables, and memoizing unstable references
- **Memoization fixes** — Added `useMemo` to `flights`, `schedules`, `pilotsList`, `aircraftList`, `passengersList`, `accountsList`, and `vendorsList` to prevent unnecessary re-renders
- **Version sync** — Fixed version mismatch between AGENTS.md (was v0.3.48) and package.json (was v1.5.1), now both at v1.5.2

## [v1.5.1] - 2026-08-19

### Fixed
- **False "remote changes" banner** — The sync useEffect was firing immediately after saves because `performSave` never set `suppressSyncRef`. This caused the Firestore listener to detect the just-saved data as a "remote change" and show a confusing banner. Added `suppressSyncRef` guard to `performSave`.

## [v1.5.0] - 2026-08-19

### Changed
- **All native dialogs replaced** — Every `window.confirm()` and `alert()` call across the entire codebase now uses styled ConfirmDialog/AlertDialog components. 54 instances replaced across 14 files. Zero native browser dialogs remain.

## [v1.4.1] - 2026-08-19

### Changed
- **Replaced native dialogs in EventModal** — All window.confirm() and alert() calls in EventModal.jsx now use styled ConfirmDialog/AlertDialog components
- **Replaced native dialogs in SettingsView** — All window.confirm() and alert() calls in SettingsView.jsx now use styled ConfirmDialog/AlertDialog components

## [v1.4.0] - 2026-08-19

### Added
- **Styled ConfirmDialog component** — Replaced native `window.confirm()` with a themed React modal that matches the app's design system. Includes title, message, confirm/cancel buttons, and optional danger styling.
- **Unsaved changes dialog** — The "You have unsaved changes" prompt now uses the new styled ConfirmDialog instead of the browser's native alert.

## [v1.3.7] - 2026-08-19

### Fixed
- **Drag-and-drop flight revert** — Dragging a flight to a new day was using `updateData('userFlights', ...)` which writes to the org document. Since flights now live in a subcollection, the change was never persisted to Firestore. Changed to `saveFlight()` so the flight is properly saved to the subcollection.

## [v1.3.6] - 2026-08-19

### Fixed
- **EventModal crash** — Reverted all code audit changes to EventModal.jsx (refs, stale closure fix, memoizations). Restored to pre-audit version with passenger features intact. The stale closure fix and memoizations will be re-applied carefully in a future release.

## [v1.3.5] - 2026-08-19

### Fixed
- **Rolldown TDZ crash** — Restored `data.js` module and all imports. Rolldown's scope hoisting requires the module graph to remain stable; removing `data.js` changed module initialization order and caused "Cannot access before initialization" crash at runtime.

## [v1.3.4] - 2026-08-19

### Fixed
- **EventModal TDZ crash** — Reverted memoized list derivations (pilotsList, aircraftList, etc.) that caused "Cannot access before initialization" error

## [v1.3.3] - 2026-08-19

### Fixed
- **DataProvider TDZ crash** — Reverted memoized context value in DataProvider that caused "Cannot access before initialization" error

## [v1.3.2] - 2026-08-19

### Fixed
- **Missing useMemo imports** — Added missing `useMemo` to React imports in MobileCrew, MobileExpenses, PilotsList, and DataProvider (caused runtime crash)

## [v1.3.1] - 2026-08-19

### Removed
- **Dead mock data** — Deleted `src/data.js` and removed all mock data imports/references across 9 files (EventModal, CalendarView, CrewSchedule, ExpensesPage, MobileAccounts, PilotsList, MobileLayout, AccountsView, pdfParserService). All data now comes from Firestore exclusively.

## [v1.3.0] - 2026-08-19

### Fixed
- **Critical: Conditional hook call** — Moved `usageAccumulatorRef` before early return to comply with Rules of Hooks
- **Critical: Stale closure in remote sync** — Refactored flight sync useEffect to use refs instead of closing over state, eliminating stale closure bugs
- **Performance: Memoized passengersList** — Prevents unnecessary recalculations in sorted passenger list
- **Performance: Memoized DataProvider context** — Prevents unnecessary re-renders of all useData consumers
- **DRY: Extracted getOrgName helper** — Single source of truth for dev/prod environment detection in DataProvider

### Changed
- **Code cleanup** — Removed unused imports (mockAccounts, mockVendors), unused variables (updateDataBatch, deleteFlight, saveFlightsBatch, updateGlobalAircraft), and console.log in DataProvider
- **Magic numbers extracted** — LAYOVER_MINUTES and ALERT_DELAY_MS constants in EventModal
- **Error boundary added** — Graceful crash handling with ErrorBoundary wrapper in main.jsx

## [v1.2.3] - 2026-08-19

### Changed
- **Passenger modal placeholder text removed** — Cleaned up all placeholder/suggestion text from the Add/Edit Passenger modal fields (Name, Phone, Email, Company, Title). Fields are now blank fillable boxes.

## [v1.2.2] - 2026-08-19

### Changed
- **Passenger dropdown sorted by usage frequency** — Passenger selector in flight modal now sorts by number of flights used (most frequent first), then alphabetically for ties. Most-used passengers appear at the top for quick access.

## [v1.2.1] - 2026-08-19

### Added
- **Edit Passenger from Flight Modal** — Clicking a passenger name badge in the flight leg now opens the passenger modal in edit mode, pre-filled with their current information (Name, Weight, Phone, Email, Company, Title). Changes persist to the system-wide passenger list. Works for both existing and newly added passengers.

## [v1.2.0] - 2026-08-19

### Added
- **Add New Passenger from Flight Modal** — Added "+ Add New Passenger..." option at the bottom of the passenger selector dropdown in the flight event modal (both desktop and mobile). Selecting it opens a modal to create a new passenger with Name, Weight, Phone, Email, Company, and Title fields. The new passenger is immediately saved to the system-wide passenger list (persisted to Firestore) and added to the current flight leg. Passenger ID is set to the person's full name, matching the existing convention in Crew & Passenger Management.

## [v1.0.5] - 2026-08-17

### Fixed
- **Expenses overview table truncation** — Removed artificial `maxWidth` constraints on Account, Vendor, Category, Payment, Fuel Provider, Purchaser, and Notes columns in the desktop expenses overview table. Changed container `overflowX` from `hidden` to `auto` so a horizontal scrollbar appears when the table exceeds the viewport width.

## [v1.0.4] - 2026-08-17

### Fixed
- **Aircraft hours double-counting on lock toggle** — Made `updateGlobalAircraft` in `FlightLogTab.jsx` idempotent. If aircraft hours already match the expected after-values (committed by `handleSignFlight`), the update is skipped to prevent duplicate hour commits when toggling lock.
- **Sync guard timeout too short** — Increased `suppressSyncRef` timeout from 3s to 10s in `EventModal.jsx` to prevent stale Firestore snapshots from overwriting local state during sign/clear operations on slow connections.

## [v1.0.3] - 2026-08-17

### Fixed
- **Flight expenses lost on save** — Fixed race condition in `CalendarView.handleSaveFlight` where expenses added via AI auto-fill or manual entry could be overwritten by stale Firestore data during save. Now merges expenses from both the local save payload and the existing Firestore record by ID, ensuring no expenses are silently dropped.

## [v1.0.2] - 2026-08-17

### Fixed
- **CSS Animation Import** — Added missing `App.css` import to `App.jsx` so the `animate-spin` keyframes are loaded. AI invoice auto-fill spinners now rotate while parsing instead of appearing static.

## [v1.0.1] - 2026-08-17

### Changed
- **Purely Numeric Mission / Flight Numbers** — Stripped the legacy `FLT-` prefix so mission numbers are clean integers (e.g. `1`, `2`, `3`, etc.), matching standard flight operations terminology where MSN / Mission # is already implied. Auto-increments sequentially.

### Fixed
- **Flight Save Reference Error (`locationUsage`)** — Destructured `locationUsage` in `EventModal.jsx` to prevent runtime reference errors when updating airport and custom LZ frequency counts during flight saves.
- **Resilient Firestore Sanitization** — Enabled `ignoreUndefinedProperties: true` in Firestore config and updated `sanitizeForFirestore` to recursively clean all undefined fields, ensuring new flight writes are never rejected by cloud storage.
- **Desktop Flight Modal Lifecycle** — Fixed `handleSaveFlight` in `CalendarView.jsx` to immediately close the modal and persist state to `userFlights`, and hardened the modal initialization `useEffect` so background data syncs cannot clobber in-progress form inputs.

## [v1.0.0] - 2026-08-17

### Added
- **First Official Production Release of BaseOps** — Full-stack aviation operations management system supporting multi-platform desktop and mobile fleet operations, digital flight logging with atomic meter sync, AI expense management, and real-time Firestore persistence.

### Fixed
- **Comprehensive Production Code Audit & Hardening** — Completed full audit across all 52 source files. Fixed context propagation in `DataProvider.jsx`, resolved reference errors in `AuthProvider.jsx`, and restored client-side web fallbacks in `firebase.js`.

## [v0.5.3] - 2026-08-16

### Changed
- **Removed "Note" from Duty Status Options** — "Note" is no longer a selectable personnel duty status in either the Schedules Grid or the Calendar View legends and dropdowns.

### Fixed
- **Phantom Account Legend Fix** — Filtered out phantom account keys (such as `acc-1785523358176`) from appearing in the Schedules Grid bottom legend when coloring by Account. Accounts that no longer exist in the `accountsList` will be ignored.

## [v0.5.2] - 2026-08-16

### Fixed
- **Fresh Unified Schedule Management Service (`scheduleService.js`)** — 
  - Completely rewrote and unified crew schedule key resolution, lookup, mutation, and deletion into a centralized service `scheduleService.js`.
  - Replaced naive `split('_')` parsing with `lastIndexOf(dateSuffix)` and `endsWith(dateSuffix)` to properly support personnel IDs containing underscores (e.g. `pilot_1`, `pax_123`, `FIRST_LAST`).
  - `setPersonStatusForDate` and `removePersonStatusForDate` purge all key variations across IDs and Names for that date before applying mutations, guaranteeing 100% clean deletions without orphaned keys.
  - Mirrored identical lookup and clear logic across both `CrewSchedule.jsx` (Schedules Grid) and `CalendarView.jsx` (Calendar View).

## [v0.5.1] - 2026-08-16

### Fixed
- **Firestore Stale Snapshot Overwrite Guard** — 
  - Fixed a critical race condition in `dataStore.js` where `onSnapshot` was blindly overwriting local mutations for keys other than `userFlights` before the server acknowledged the write.
  - Added strict `isPendingLocalWrite(lsKey)` check to skip snapshot application for any key that has a local mutation in flight.
  - Added session fallback for `currentUserId` so unauthenticated or dev sandbox writes are never permanently queued.

### Fixed
- **Multi-Key Variant Cleanup on Duty Status Clear** —
  - `CrewSchedule.jsx` and `CalendarView.jsx` now clean up all key variants (matching by `person.id`, `person.name`, and date) when clearing or changing duty status.
  - Grid cell rendering now robustly checks both ID-keyed and Name-keyed schedule mappings (`schedules[key] || schedules[`${person.name}_${dateStr}`]`).
  - Added clear red-highlighted `✕ Clear Duty Status` option in `CustomStatusDropdown` for both Schedules Grid and Calendar View.
  - Hardened Schedule Generator `clearSchedule` to wipe all key variants for the selected person.

## [v0.5.0] - 2026-08-16

### Fixed
- **Synchronous Direct State Mutation on Status Clear** — 
  - `handleCellClick` now immediately sets `setSchedules({ ...stored })` synchronously in React state rather than relying on decoupled storage callbacks.
  - Normalized date parsing in schedule generator to `format(currDate, 'yyyy-MM-dd')`.
  - Guaranteed instant visual update and Firestore cloud synchronization when clicking "Clear" in the Schedules Grid Daily Itinerary modal.

### Fixed
- **Timezone UTC Date Key Normalization** — Replaced `day.toISOString().split('T')[0]` (which caused UTC timezone offset drift, writing/reading the previous or next day's key depending on user timezone) with `format(day, 'yyyy-MM-dd')` across both `CrewSchedule.jsx` and `CalendarView.jsx`. This ensures schedule keys match 100% identically across views.

### Fixed
- **Bidirectional Schedule Synchronization (Calendar View <-> Schedules Grid)** — 
  - Updated `handleStorageSync` in `CalendarView.jsx` to dynamically listen to `crewSchedules` and `firestore-sync` events, ensuring calendar status pills and the schedules grid stay in exact lockstep.
  - Hardened `handleCellClick` in `CrewSchedule.jsx` to execute direct atomic storage mutations with real-time Firestore sync broadcasts.

### Fixed
- **Instant Status Clearing in Daily Itinerary Modal** — 
  - Updated the "Clear" button in both the Crew Schedules grid and Calendar View modals to immediately delete the scheduled duty status from local state & Firestore and close the modal.
  - Added missing `storage` and `firestore-sync` events to `saveSchedules` in `CrewSchedule.jsx` so changes reflect in real-time across all views.

### Added
- **Interactive Personnel Status Pills on Calendar View** — Clicking on any crew/passenger status bubble in the main Calendar View now immediately opens the Daily Itinerary modal with full status editing and scheduled flight inspection, identical to the Schedules grid.

### Fixed
- **Missing ChevronDown Import** — Fixed `ReferenceError: ChevronDown is not defined` by adding `ChevronDown` to `lucide-react` import statement in `CrewSchedule.jsx`.

### Changed
- **Clear Duty Status Selector & Default Placeholder** — 
  - Updated the Daily Itinerary modal duty status input to display `-- Select Status --` when no status has been explicitly set instead of assuming `On Duty`.
  - Added a visible dropdown chevron and enhanced interactive dropdown styling so users immediately recognize it as a clickable status selector.

### Changed
- **Subtle Row Dividing Lines** — Softened the crew schedule grid row lines from prominent 1.5px slate borders to very subtle, faint 1px divider lines (`#f1f5f9`) for clean, understated visual separation.

### Changed
- **Matching Saturated Badge Fills for Pilot, Crew, and Pax** — Updated the `PILOT` (`#bee3f8`) and `PAX` (`#c6f6d5`) badge fills and borders to have the exact same rich, saturated aesthetic as `CREW` (`#fefcbf`).

### Reverted
- **Reverted v0.4.0 Badge & Shading Changes** — Restored the previous high-contrast personnel typography and balanced 1.5px slate borders from `v0.3.99` per user request.

### Changed
- **Personnel Typography & Balanced Row Dividers** — Enhanced the Crew Schedule grid with larger, high-contrast personnel names (`0.95rem` bold `#1e293b`) and balanced 1.5px medium-slate row divider lines (`#cbd5e1`), providing clear row separation without visual clutter.

### Changed
- **Subdued Crew Schedule Grid Delineation** — Softened row divider lines from bold borders to clean, faint 1px borders (`#e2e8f0` / `#edf2f7`) with ultra-subtle off-white alternating tint (`#fafbfc`), creating an elegant, non-distracting separation matching the core BaseOps theme.

### Added
- **Crew Schedule Grid Visual Row Dividers** — Enhanced the Crew & Passengers schedules grid with clear visual demarcation between personnel rows:
  - Added thick 2px slate row borders (`#cbd5e1`) and alternating zebra striping (`#ffffff` / `#f8fafc`).
  - Added colored left-accent border tabs per personnel type (Blue for Pilots, Gold for Crew, Green for Passengers).
  - Added subtle hover highlight (`.crew-row:hover td`) so users can easily trace which schedule events and flight cards belong to each person.

### Fixed
- **Atomic Single-Click Signing Architecture** — Unified signing execution into `EventModal.jsx` (`handleSignFlight`), ensuring aircraft meter updates, log snapshotting, flight persistence, and status updates execute in a single atomic transaction with active remote-sync suppression guards.
- **Strict Signed-Only Aircraft Totals Guarantee** — Aircraft meter totals update strictly once upon signature and revert cleanly upon clear signature with zero drift or multi-event echoes.

### Fixed
- **Failsafe Flight Log Totalling & Precision Rounding** — Hardened all mathematical addition and subtraction across aircraft meter hours, hobbs, engine hours, and cycles with `Math.round(x * 10) / 10` precision guards. Eliminated potential floating-point accumulation errors and enforced strict idempotent state synchronization for maintenance tracking.

### Fixed
- **Aircraft Meter Double-Addition On Signing** — Fixed an issue in `FlightLogTab.jsx` where clicking "Sign Logbook" triggered both `updateLog(nextLog)` and `onSign(nextLog)` simultaneously, creating duplicate save/sync calls and resulting in meter over-increments.

### Added
- **Strict Protocol Enforcement** — Automated version bumping, comprehensive changelog tracking, and handoff synchronization for every update.
- **Environment Isolation & Security Sandbox** — Isolated development environments (`localhost` / `127.0.0.1`) to `orgs/dev_sandbox` in Firestore, preventing local testing from ever polluting or overwriting production data.
- **Data Management Center** — Added an administrative data management tab in `SettingsView` with one-click actions to clear test flights or wipe mock data across local and cloud databases.

## [v0.3.92] - 2026-08-16

### Fixed
- **Atomic Single-Click Clear Signature Rewrite** — Centralized all clear-signature logic into `EventModal.jsx`, eliminating multi-layer callback bouncing. Resolved stale prop fallback bug in `isFlightSigned` that caused aircraft selectors and input boxes to require a second click to unlock.
- **Vercel Cache-Control** — Added custom HTTP cache-control headers in `vercel.json` to prevent stale HTML edge caching on deployments.

## [v0.3.91] - 2026-08-16

### Fixed
- **Flight Log Mapping Stability** — Fixed `legsActuals` array mapping crash when creating new flights and resolved Firestore conflict resolution bias.

### Fixed
- **Flight Log Modal Crash** — Fixed a `ReferenceError` preventing the flight log modal from opening when creating a new flight. Reordered the initialization of flight log baseline variables to correctly resolve JavaScript scope constraints and eliminate the temporal dead zone error.

## [v0.3.89] - 2026-08-15

### Fixed
- **True Single-Click Clear Signature** — Identified the exact root cause of the two-click bug: `updateGlobalAircraft` in `FlightLogTab.jsx` dispatched `new Event('storage')` (a plain, keyless event). `handleRemoteSync` in `EventModal.jsx` had no way to distinguish this from a `userFlights` update, so it immediately re-read `localStorage.userFlights` and overwrote the just-cleared `flightLog` state with the still-signed version. Fixed by replacing all plain `new Event('storage')` dispatches with keyed `CustomEvent('storage', { detail: { key: '...' } })` events throughout both `FlightLogTab.jsx` and `EventModal.jsx`, so the guard correctly routes aircraft updates away from flight log state.

## [v0.3.88] - 2026-08-15

### Fixed
- **Preserve Assigned Pilots During Calendar Drag & Drop** — Fixed an issue in `CalendarView.jsx` where dragging a flight to another date was forcibly overwriting the flight's assigned pilot with the default on-duty pilot scheduled for that day, creating false pilot conflict warnings. Moving a flight now preserves its existing assigned pilot.

## [v0.3.87] - 2026-08-15

### Fixed
- **Single-Click Unsign & Self-Healing Aircraft Totals Reconciliation** — Eliminated event echo race condition where `handleRemoteSync` was being triggered by aircraft storage events and overwriting flight logs with stale data. Updated baseline calculations to dynamically and accurately infer baseline values from signed flight logs, guaranteeing accurate aircraft totals and instant single-click signature clearing.

## [v0.3.86] - 2026-08-15

### Added
- **Signed Flight Date & Drag Immutability Guard** — Signed flights are now strictly locked to the logged date flown:
  - Calendar flight cards cannot be dragged or dropped to a different day on the calendar grid.
  - In `EventModal`, leg departure and arrival date pickers are disabled and read-only for signed flights.
  - Leg reordering drag grips, `ADD LEG`, and `Remove Leg` controls are disabled and locked on signed flights to guarantee route integrity.

## [v0.3.85] - 2026-08-15

### Fixed
- **Instant Single-Click Unsign Architecture** — Refactored `FlightLogTab.jsx` to eliminate internal duplicate state (`useState(log)`) and consume `flightLog` directly as the single source of truth. Clicking "Clear Signature" now synchronously uncommits aircraft totals, removes signature, sets status to `Confirmed`, unlocks the aircraft dropdown, and saves the flight in a single instantaneous click.

## [v0.3.84] - 2026-08-15

### Fixed
- **Atomic Single-Click Clear Signature with Live Status & Meter Reversion** — Unified and streamlined the "Clear Signature" execution flow: baseline meters are now computed deterministically before aircraft mutations, `setAircraft` updates the local UI immediately, and cross-tab/storage sync hooks update status to `Confirmed` and revert aircraft totals on the exact first click.

## [v0.3.83] - 2026-08-15

### Added
- **Automatic Status Reversion to Confirmed on Unsign** — When a user or administrator unsigns a flight log, the flight status automatically reverts to `Confirmed`, unlocks the mission, reverts committed aircraft totals, and immediately saves and syncs the flight.

## [v0.3.82] - 2026-08-15

### Fixed
- **Instant Single-Click Signature Clearing** — Resolved an issue where clicking "Clear Signature" required two clicks due to a prop-echo state race condition. Replaced the volatile boolean synchronization flag with serialized log tracking (`lastInternalLogJsonRef`) so that clearing a signature immediately un-signs the flight and resets status on the first click.

## [v0.3.81] - 2026-08-15

### Added
- **Signed Flight Aircraft Change Protection & Automatic Meter Reversion** — Non-admin users are prevented from changing the aircraft on signed flights. If an administrator reassigns the aircraft on a signed flight, a confirmation prompt un-signs the flight log, unlocks the logbook, automatically uncommits and reverts all recorded meter hours and landings from the previous aircraft, and notifies the administrator that the flight is now open and must be signed.

## [v0.3.80] - 2026-08-15

### Changed
- **Audit Logs Ordering & Granular Admin Deletion** — Reordered all audit logs (Flight Log Audit Trail and Aircraft Logbook Audit Trail) so the most recent entry appears at the top. Removed the bulk "Clear All" button and equipped administrators with individual delete actions on each audit row.

## [v0.3.79] - 2026-08-15

### Fixed
- **Retain Flight Log Tab on Save / Sign** — Updated `EventModal.jsx` to preserve the user's active sub-tab view (e.g. Flight Log or Expenses) when a flight is saved or signed, preventing unintended resets back to the Flight Plan tab.

## [v0.3.78] - 2026-08-15

### Fixed
- **Status Dropdown Casing Normalization** — Fixed an issue where the Event Modal status select defaulted to 'On Hold' when viewing completed or signed flights due to case sensitivity. Added `normalizeStatus` to ensure status values seamlessly match the dropdown options and reflect 'Completed' accurately.

## [v0.3.77] - 2026-08-15

### Added
- **Clickable BaseOps Logo Sidebar Toggle** — Clicking the "BaseOps" logo at the top of the left navigation menu bar now collapses or expands the sidebar smoothly, with hover styling and interactive cursor indicators.

## [v0.3.76] - 2026-08-15

### Added
- **Automatic Flight Save on Logbook Signing** — When a user signs the flight logbook, the entire flight record (including updated leg actuals, signed logbook totals, and 'Completed' status) is automatically saved with visual save feedback, identical to clicking the "Save Flight" button.

## [v0.3.75] - 2026-08-15

### Added
- **Auto-Complete Status on Flight Log Sign** — Signing a flight log immediately transitions the flight status to `'Completed'` and persists the status to storage and Firestore.
- **Admin-Only Flight Deletion for Signed Flights** — Protected signed flight logs from accidental deletion: non-admin users cannot delete flights with signed flight logs in `EventModal.jsx` or `CalendarView.jsx`, displaying disabled tooltips and authorization warnings. Only administrators are authorized to delete signed flights.

## [v0.3.74] - 2026-08-15

### Fixed
- **Bulletproof Logbook Synchronization Architecture** — Reworked flight log merging in `dataStore.js`, `CalendarView.jsx`, and `ExpensesPage.jsx` to guarantee signed/locked flight log preservation during cloud synchronization. Decoupled modal state from background event loops and enforced idempotent deterministic calculations for aircraft meter readings, ensuring flight log and fleet logbook totals match accurately at all times across all users.

## [v0.3.73] - 2026-08-15

### Fixed
- **Idempotent Aircraft Logbook Meter Calculation** — Refactored `updateGlobalAircraft` in `FlightLogTab.jsx` to set aircraft logbook totals directly to the exact target `Before + Change` meter readings upon signing/locking (and exact `Before` values upon unlocking), making the calculation completely idempotent. This prevents any multi-click accumulation, ensuring the Aircraft page meters always match the signed logbook figures exactly.

## [v0.3.72] - 2026-08-15

### Fixed
- **Flight Log Signing & Signature Persistence Bug** — Fixed an issue where signing a flight log dispatched a `storage`/`firestore-sync` event from aircraft meter updates that triggered `EventModal.jsx`'s `handleRemoteSync` without key filtering, reverting the in-memory signature back to the older un-persisted record. Added key-scoped filtering to `handleRemoteSync` and instant atomic persistence via `persistFlightLogToFlight`, ensuring signatures and locks persist immediately without reverting.

## [v0.3.71] - 2026-08-15

### Fixed
- **Flight Log Infinite Sync Loop & Glitching Fix** — Resolved recursive re-render feedback loop in `FlightLogTab.jsx` caused by `refreshAircraftData` calling `setLog` on every Firestore/storage event and echoing back to `setFlightLog`. Replaced with a clean unidirectional state architecture, decoupling live aircraft reads from internal flight log state and eliminating all UI flicker and constant sync loops in the signature block and aircraft logbook totals table.

## [v0.3.70] - 2026-08-15

### Added
- **Admin vs Non-Admin Audit Trail Visibility & Controls** — Non-admin users are now restricted to seeing only the most recent (last) logbook and flight log audit entry. Admin users have full access to view the entire audit history, with collapsible/expandable toggles (`Expand All` / `Collapse`) and a dedicated `Clear` button to purge audit histories when authorized. All audit records are preserved in real-time Firestore synchronization until cleared by an administrator.

## [v0.3.69] - 2026-08-15

### Added
- **Real-Time Cross-Device Logbook & Audit Trail Synchronization** — Connected `AircraftList.jsx`, `MobileFleet.jsx`, `FlightLogTab.jsx`, and `EventModal.jsx` to live Firestore `firestore-sync` events. The Aircraft Logbook Totals, Logbook Audit Trail, and Event Modal Flight Log Audit Log now broadcast and receive real-time updates seamlessly across all devices and active sessions.
- **Flight Log Sign / Unlock Audit Logging** — Signing or unlocking a flight log automatically appends a detailed audit trail entry with delta breakdown to the aircraft's logbook audit history and broadcasts the changes instantly to the cloud.

## [v0.3.68] - 2026-08-15

### Fixed
- **Engine 1 Hours Double-Addition Bug** — Resolved an issue in `FlightLogTab.jsx` where modifying `ac.totalHours` prior to snapshotting the baseline engine hours caused uninitialized or fallback `engine1Hours` properties to read the already-incremented total hours and add the flight leg duration a second time. Baseline values are now fully snapshotted before performing increments.

## [v0.3.67] - 2026-08-15

### Added
- **Flight Log Fuel Quantity Input** — Added a numeric `Fuel (Gal)` input per flight leg in the Flight Log table to record exact fuel gallons/quantities purchased with automatic total fuel calculation in the summary row.
- **Auto-Calculated Passenger Counts** — Removed manual `Total Pax` input from the Flight Info section and enabled automatic calculation of passenger counts directly from the flight plan passenger manifest, totaling passengers seamlessly in the bottom Aircraft Log Summary table.

## [v0.3.66] - 2026-08-15

### Added
- **Flight Log Fuel Purchased Checkbox Column** — Added a dedicated `Fuel Purchased` checkbox column under the Flight Info section of the Flight Log table in the event modal (`FlightLogTab.jsx`), enabling pilots and dispatchers to record fuel purchases per leg with automatic totals tracking.

## [v0.3.65] - 2026-08-15

### Added
- **Clickable Stat Card Filtering (NET 15, Paid, Unpaid, Total)** — Clicking the `NET 15` box filters the list to show only overdue invoices (> 15 days unpaid). Clicking `Paid` or `Unpaid` filters directly to paid or unpaid items, and clicking `Total Expenses` (or `Paid / Unpaid`) resets the filter to show all rows. Includes active border indicators and a quick-clear filter banner on both desktop and mobile.

## [v0.3.64] - 2026-08-15

### Added
- **NET 15 Overdue Invoices Tracking** — Added dedicated `NET 15` stat card to both desktop and mobile expenses overviews, computing all unpaid expenses with transaction dates older than 15 calendar days from today.
- **Paid / Unpaid Clean Labeling** — Cleaned up the status counter label to `Paid / Unpaid` across desktop and mobile.

## [v0.3.63] - 2026-08-15

### Changed
- **Paid vs Unpaid Expense Line Counter** — Replaced receipt counter card on both desktop (`ExpensesPage.jsx`) and mobile (`MobileExpenses.jsx`) with a real-time Paid vs Unpaid line status counter (`paidCount / unpaidCount`), making it instantly clear how many expense lines still need to be paid.

## [v0.3.62] - 2026-08-15

### Fixed
- **Smooth Sidebar Sliding Caret Animation** — Anchored the collapse/expand caret button to the right edge of the sidebar footer so that it continuously and smoothly slides across the screen in sync with the menu's width transition without jumping.

## [v0.3.61] - 2026-08-15

### Fixed
- **Sidebar Collapse Controls Placement** — Removed top collapse arrow from header and placed a single collapse/expand caret button in the bottom footer. Aligned caret to the right side of the menu bar when expanded, and centered when collapsed.

## [v0.3.60] - 2026-08-15

### Added
- **Collapsible Desktop Left Sidebar** — Added a toggleable, smooth-collapsing navigation sidebar for desktop. Features compact icon mode (`64px`), tooltips for all navigation items, icon-only BaseOps logo mark, top and bottom toggle buttons, and persistent collapse state saved to `localStorage`.

## [v0.3.59] - 2026-08-15

### Fixed
- **Screen Resize State Persistence** — Lifted active navigation view and open flight modal state into session storage and top-level app state, ensuring that window resizing, device rotation, or viewport mode switches never reset the active view to Calendar or close an active flight card modal.

## [v0.3.58] - 2026-08-15

### Fixed
- **Fluid Zero-Scroll Desktop Expenses Overview & Modal Rows** — Redesigned Expenses Overview table and Expenses Tab rows with auto-scaling typography, compact padding, truncated text fields with tooltips, and fluid column layouts so that all expense columns fit on desktop and modal screens without horizontal scrolling.

## [v0.3.57] - 2026-08-15

### Fixed
- **Fluid Desktop Event Modal Header Auto-Scaling** — Re-engineered desktop flight card modal header with fluid typography, proportional padding, and responsive breakpoints so all fields (view toggle, MSN #, title, account, aircraft, status, tag, duplicate, and close) smoothly scale down to fit any desktop/laptop window size without wrapping, overflowing, or becoming unclickable before the mobile version kicks in.

## [v0.3.56] - 2026-08-15

### Fixed
- **Zero-Bloat Receipt & Upload Storage Architecture** — Fixed root cause where base64 data URLs were embedded in flight/expense records, exceeding Firestore's 1MB hard document limit and causing cloud persistence to fail silently. Files and receipts now store lightweight metadata with Firebase Storage URLs and IndexedDB Blob handles on demand. Added automatic payload sanitization in `dataStore.js` and hardcoded configuration fallbacks in `firebase.js`.

## [v0.3.55] - 2026-08-15

### Fixed
- **Instant Real-Time Multi-Device Synchronization** — Streamlined `dataStore.js` `onSnapshot` handler to immediately apply remote Firestore updates to local state across all connected devices in sub-second time. Resolved stale merge overwriting so new expenses, edits, and deletions replicate instantaneously. Added live `firestore-sync` listeners to open modals so active screens update in real time.

## [v0.3.54] - 2026-08-15

### Changed
- **Pilot Schedule Status Icon** — Replaced airplane icon/emoji with the official `Helicopter` icon across the pilot list and pilot profile editor under "Today's Schedule Status" in Crew & Passenger Management.

## [v0.3.53] - 2026-08-15

### Changed
- **Desktop Modal Header Optimization** — Abbreviated `MISSION #` to `MSN #` in the desktop EventModal flight header and increased the Title field flex width to provide more horizontal space for mission titles.

## [v0.3.52] - 2026-08-15

### Fixed
- **Desktop Flight Duplication** — Fixed missing `parseISO` and `differenceInCalendarDays` imports that prevented dropping duplicated flights onto target dates. Added multi-leg date offset shifting with timezone-safe calculations and allowed clicking anywhere on day cells or badges.
- **Zero-Loss Data Persistence & Cloud Sync** — Resolved storage interceptor conflict between `dataSyncService.js` and `dataStore.js`. Implemented `mergeFlights` smart deep-merge algorithm ensuring attached uploads, documents, and expenses are never overwritten on browser refresh. Added `firestore-sync` realtime listeners to `CalendarView` and `ExpensesPage`.
- **Direct Expense Row-Level Saving** — Clicking the Save icon on an expense row immediately writes and persists to the flight record and Firestore without requiring full flight save. Auto-imported AI expenses default directly to saved checkmark status.

### Changed
- **Nomenclature Update** — Changed all user-facing references from `Trip #` to `Mission #` (and `MSN #` in compact table/mobile headers).
- **Fluid Expenses Table Layout** — Removed fixed 1400px min-width constraint on the flight modal expenses table, tuning proportional column widths and padding to scale fluidly without horizontal scrollbars.

## [v0.3.48] - 2026-08-13

### Changed
- **Logo rebuilt** — Complete SVG rewrite to match the reference illustration: dark navy (#163a5f) CH-53E with teal (#3ecfb2) accents. Proper proportions, cockpit windshield with frame lines, engine intakes with highlights, sponson teal stripes, panel lines, window row, rotor disc arcs, and belly accent line.

## [v0.3.47] - 2026-08-12

### Changed
- **Logo final design** — CH-53E illustration-style logo matching the provided reference. Bold navy silhouette with teal accent lines on rotor arcs, engine intakes, and belly stripe. Includes panel lines, window dots, sponsons, landing gear with wheels, tail pylon with rotor, and horizontal stabilizer.

## [v0.3.46] - 2026-08-12

### Changed
- **Logo accuracy** — Redesigned CH-53E silhouette to match the exact angle and proportions from the reference photo. Now includes accurate fuselage shape, engine nacelles, tail boom with pylon, horizontal stabilizer, sponsons, landing gear with wheels, and rotor disc arc.

## [v0.3.45] - 2026-08-12

### Changed
- **Logo redesign** — Replaced abstract rotor mark with CH-53E Super Stallion silhouette. Captures the bulky fuselage, 6-blade main rotor, engine pods, sponsons, canted tail rotor, and landing gear from the reference photo angle.

## [v0.3.44] - 2026-08-12

### Changed
- **Sidebar header layout** — Logo, app name, and version now display inline with name/version stacked vertically beside the logo.

## [v0.3.43] - 2026-08-12

### Added
- **BaseOps logo** — Custom 3-blade helicopter rotor mark in Corporate Blue (#0f4c81). Replaces generic icons in sidebar header, mobile top bar, login/signup pages, and favicon.

### Changed
- **Page title** — Updated browser tab title from "baseops" to "BaseOps".

## [v0.3.42] - 2026-08-12

### Fixed
- **Duration picker reliability** — Dropdowns now stay in DOM (hidden via CSS) so scroll-to-current-value works on open. Uses mousedown with preventDefault to avoid blur conflicts. Click outside to close.

## [v0.3.41] - 2026-08-12

### Fixed
- **Duration picker scroll position** — Dropdown now scrolls to the current value instead of starting at the top. Applies to both desktop DurationPicker and mobile MobileScrollPicker.

## [v0.3.40] - 2026-08-12

### Changed
- **Desktop duration picker** — Replaced plain number input with a scrollable dropdown (.1 HR increments) that also allows typing. Opens centered below the value, defaults to current value.

## [v0.3.39] - 2026-08-12

### Fixed
- **Same-airport NM display** — Shows "0 NM" instead of "? NM" when departure and destination are the same airport.

## [v0.3.38] - 2026-08-12

### Changed
- **Flight path card refinement** — Removed cruise speed display, enlarged flight hour selector to 1.4rem for better tap targets.

## [v0.3.37] - 2026-08-12

### Changed
- **Flight path column redesign** — Replaced the old distance/Plane icon/duration layout with a clean stacked card showing distance (NM), editable duration (HR), aircraft cruise speed (KTS), and layover time (for non-last legs). Removed redundant flight time bar below leg rows.

## [v0.3.36] - 2026-08-10

### Added
- **Mobile Expenses bottom action bar** — "Add Expense" and "Auto-fill Invoice" buttons fixed to the bottom of the mobile expenses page.
- **Manual expense popup** — slide-up modal with vendor, category, amount, date, trip number (auto-matches flight), payment, notes, and paid toggle.
- **Auto-fill invoice popup** — slide-up modal with AI invoice uploader for PDF/image receipt parsing.

## [v0.3.35] - 2026-08-10

### Fixed
- **Blank screen fix** — `CategoryCombobox` sub-component was using `isMobile` without receiving it as a prop.

## [v0.3.34] - 2026-08-10

### Changed
- **Mobile native selects replaced** across all mobile pages with `MobileDropdownMenu`:
  - ExpensesTab: Category (with custom fallback), Vendor, Payment, Airport, Fuel Type selects
  - FlightLogTab: Landing Type select
  - ExpensesPage: Trip, Category, Payment, Fuel Provider selects (manual expense modal)
  - CrewSchedule: Personnel select

## [v0.3.33] - 2026-08-10

### Changed
- **MobileDropdownMenu** added to ExpensesPage category filter and ExpensesDashboard chart sort dropdowns on mobile.

## [v0.3.32] - 2026-08-10

### Changed
- **Mobile dropdown menus** — replaced native `<select>` with `MobileDropdownMenu` in EventModal (header: Account, Aircraft, Status, Tag; leg: Pilot, Passenger). Opens as a positioned dropdown below the trigger with rounded corners, themed options, and click-outside-to-close.
- **MobileDropdownMenu** (`src/components/MobileDropdownMenu.jsx`) — reusable dropdown component that positions below the trigger, has rounded corners matching the app theme, and animated fade-in.

## [v0.3.31] - 2026-08-10

### Changed
- **Mobile expense inputs/selects rounded corners** — all boxes now use `border-radius: var(--radius-md)` (8px) with themed border and background, matching the app's overall design.

## [v0.3.30] - 2026-08-10

### Changed
- **Mobile expenses inputs and selects uniform height** — both forced to 30px with `box-sizing: border-box` so they match exactly.
- **Select dropdowns open downward** — `position: relative` + `z-index: 10` on selects + `overflow: visible` on cells to prevent upward flipping.

## [v0.3.29] - 2026-08-10

### Changed
- **Mobile expenses row uniform height** — all cells fixed to 38px height, vertical alignment centered.
- **Gal, Purchaser, Amount columns** constrained to compact widths (70px, 100px, 80px) so they don't dominate the row.
- **Notes column** expands to fit all text with wrapping enabled.

## [v0.3.28] - 2026-08-10

### Changed
- **Mobile expenses table columns auto-size** — columns collapse to just the column title and a compact input when empty, expanding as data is entered or auto-filled. Notes column wraps long text.

## [v0.3.27] - 2026-08-10

### Changed
- **Mobile expenses table** — columns now expand to fit entered/auto-filled data (min table width 1400px, horizontal scroll). Inputs/selects size to content so rows are readable.
- **Receipt document icon** enlarged from 16px to 24px to match the row, with a matching larger receipt-count badge.

## [v0.3.26] - 2026-08-10

### Changed
- **Mobile dropdowns** now match the app theme: consistent border, rounded corners, white background, custom chevron arrow. Borderless header selects (account/aircraft/status/tag) intentionally keep their inline styles.
- **Flight Log landing type select** (Day/Night/NVG) no longer clipped — widened to fit its 16px mobile font and themed like the rest of the app.

## [v0.3.25] - 2026-08-10

### Fixed
- **Mobile departure/land times always visible** — scroll wheel time picker now renders as a visible chip (with `--:--` fallback) so the current time is always shown; tapping it still opens the scroll dropdown.

## [v0.3.24] - 2026-08-10

### Changed
- **Mobile tag button** — restored desktop-style "TAGS" pill with color-matched bubble (orange=Emergency, red=Maintenance, primary=default).
- **Mobile time entry** — takeoff/land times now use a scroll wheel dropdown (5-min increments) instead of native time input.
- **Mobile leg duration** — flight time between departure/arrival uses a 0.1-hour scroll wheel; changing it still recalculates land time from departure time.

## [v0.3.23] - 2026-08-10

### Changed
- **EventModal footer buttons** — made Delete, Duplicate, Uploads, and Save Flight compact (horizontal icon+text, smaller padding/font) to free up usable space.

## [v0.3.22] - 2026-08-10

### Changed
- **Mobile EventModal header** — chevron toggle in header row (always visible, rotates open/closed). Expanded view now uses stacked rows: Trip+Title, Account+Aircraft, Status+Tag, then view toggle. Removed "Collapse" text button.

## [v0.3.21] - 2026-08-10

### Fixed
- **Mobile EventModal expanded header** — view toggle (Flight Plan / Flight Log / Expenses) moved to its own dedicated row on mobile so it no longer overlaps the header buttons. Collapse control is now a bordered button in a summary row below the header.

## [v0.3.20] - 2026-08-10

### Fixed
- **Mobile EventModal header** — removed "Expand" text that was overlapping Expenses tab. Summary row (trip # + title + status) is the only expand trigger now. "Collapse" link in header only shows when expanded.

## [v0.3.19] - 2026-08-10

### Fixed
- **Mobile EventModal header overlap** — removed "Edit Details" button from header row that was covering the Expenses tab. Summary row is now fully tappable to expand. Small "Expand"/"Collapse" text link stays in the top-right corner out of the way.

## [v0.3.18] - 2026-08-10

### Changed
- **Mobile EventModal header** — reworked collapsed state: now shows a summary row with trip number, title, and status badge. Expand button has a clear "Edit Details" label instead of a bare rotating chevron.

## [v0.3.17] - 2026-08-10

### Fixed
- **Mobile flight number generation** — new flights on mobile were getting empty flight numbers instead of auto-incrementing. Now passes `flightsCount` to EventModal so mobile and desktop share the same `max + 1` logic.

## [v0.3.16] - 2026-08-10

### Changed
- **Mobile Fleet page** — redesigned with landing view: aircraft cards showing tail number, make/model, today's status, sorted by flight count (most used first). Click a card to open full detail view with back arrow navigation.

## [v0.3.15] - 2026-08-10

### Changed
- **Mobile note modal** — now matches desktop: Start Date + End Date inputs for date range, Title, Notes textarea. Notes span across all dates in the range.

## [v0.3.14] - 2026-08-10

### Added
- **Mobile calendar — Add Flight & Notes buttons** — sticky date header now has a + (add flight) and message (add note) icon on the right. Note modal supports add/edit/delete. Notes show as a small grey bar indicator on mini calendar days.

## [v0.3.13] - 2026-08-10

### Changed
- **ExpensesTab row layout** — swapped document/upload and save button positions: document button + remove now on the left, save button on the right for better UX flow.

## [v0.3.12] - 2026-08-10

### Changed
- **ExpensesPage receipt viewer** — clicking the paperclip icon now opens a standalone receipt viewer directly on the ExpensesPage instead of opening the EventModal. Includes download, delete, and image/PDF preview.

## [v0.3.11] - 2026-08-10

### Fixed
- **Auto-fill invoice receipt not uploading** — the auto-fill expense handler was uploading to a temporary expense path then re-uploading with an empty `File` object, losing the content. Now uploads directly with the real expense ID. Also fixed `ExpensesPage.jsx` auto-fill to use `saveReceipt` API (was still using old `saveFile`).

## [v0.3.10] - 2026-08-10

### Fixed
- **PDF.js worker failing to load** — PDF.js worker is now bundled locally instead of fetched from CDN (`cdnjs.cloudflare.com`). Eliminates the "Failed to fetch dynamically imported module" error.

## [v0.3.9] - 2026-08-10

### Fixed
- **Receipt viewer image not loading** — receipt viewer now always fetches a fresh download URL from Cloud Storage `storagePath` instead of relying on a stored URL that could become stale. File upload now reads content as `ArrayBuffer` before upload to prevent the `File` object from being consumed by `uploadBytes`.

## [v0.3.8] - 2026-08-10

### Fixed
- **Receipt viewer not displaying receipts** — upload handler now includes the Cloud Storage URL in receipt metadata, the viewer opens immediately after upload, and receipt loading logic simplified to eliminate stale-state race conditions.

## [v0.3.7] - 2026-08-10

### Added
- **Expense receipts now use Firebase Cloud Storage** — receipts survive browser clears, sync across devices, and are backed up to the cloud. Storage path: `receipts/{flightId}/{expenseId}/{filename}`.
- **Receipt download button** — receipts can now be saved to disk from the viewer (not just viewed in-browser).
- **Upload progress indicator** — spinner shown while receipts upload to Cloud Storage.
- **Upload error UI** — red banner with dismissible error for failed uploads or oversized files.
- **File size validation** — 10MB limit per receipt file, with user-facing error messages.
- **Receipt indicator in Expenses Overview** — paperclip icon with badge count in the main expenses table; clicking opens the flight card to the Expenses tab.
- **Receipts summary card** — new card in the Expenses Overview showing total receipt count across filtered expenses.
- **IndexedDB migration** — any existing local-only receipts are automatically migrated to Cloud Storage when opened in the receipt viewer.

### Changed
- **FileStorageService** redesigned: `saveReceipt()`, `getReceiptUrl()`, `deleteReceipt()`, `getReceipts()`, `validateFileSize()`, `migrateIndexedDBReceipts()` methods added alongside existing flight-document methods.
- **Storage rules** updated: added `receipts/{flightId}/{expenseId}/{allPaths=**}` path for authenticated read/write.

### Fixed
- v0.3.6: Offline sync queue + retry for blocked Firestore writes.
- v0.3.5: Aircraft times not saving — Firestore sync restored on session restore.
- v0.3.4: Download button forces file save instead of opening new tab.
- v0.3.3: Flight documents + GIS files open in full-screen in-app viewer.

## [v0.3.6] - 2026-08-10

### Added
- **Offline cloud-sync resilience**: If Firestore writes are blocked or unavailable (e.g. ad-blocker, firewall, or DNS blocking `firestore.googleapis.com`), changes are saved locally immediately and queued for automatic retry every 10 seconds. Data syncs to the cloud as soon as the connection is restored — no data loss.
  - `dataStore.js`: persistent retry queue in localStorage (`_BaseOpsPendingSync`), auto-retry timer, and queued writes now win over stale Firestore data.
  - New `SyncStatusIndicator` shows a "Not syncing" badge in the header when queued changes are pending, with a tooltip explaining the situation.
- **Storage rules**: Deployed security rules for Cloud Storage (files accessible to any authenticated user).

### Changed
- v0.3.3: Flight documents + GIS files now open in a full-screen in-app viewer; supported upload types expanded (KML, KMZ, GeoJSON, GPX, SHP, shapefile sidecars, video, audio, HTML, XML, SVG).
- v0.3.4: Download button now forces a file save instead of opening a new tab.

### Fixed
- v0.3.5: Aircraft times not saving — Firestore sync restored on session restore, and stale remote data no longer overwrites fresh local saves.

## [v0.3.5] - 2026-08-10

### Fixed
- **Aircraft times not saving**: Fixed Firestore sync losing saved aircraft meter/hours.
  - `setUserId` is now called on session restore (`onAuthStateChanged`), so Firestore sync works correctly after page reloads (previously it silently disabled sync after any refresh).
  - Added a pending-write guard in `dataStore.js` so `onSnapshot`/`initStore` no longer overwrite a freshly-saved local change with stale Firestore data during the remote-write window.

## [v0.3.4] - 2026-08-10

### Changed
- **File Download**: Download button now forces a file save instead of opening in a new tab. Files transfer seamlessly to any device.

## [v0.3.3] - 2026-08-10

### Added
- **Flight Document Viewer**: View images, PDFs, videos, audio, and text files in-app with a full-screen viewer modal.
- **GIS File Upload Support**: Added KML, KMZ, GeoJSON, GPX, SHP, DBF, PRJ to accepted upload types.
- **File Type Icons**: Different icons for images (green), PDFs (red), GIS files (yellow), and generic files (blue).

## [v0.3.1] - 2026-08-10

### Fixed
- **Firebase Auth**: Rewrote authService with explicit uid handling. Fixed signup/login flow with Firebase Authentication.
- **Locations Page ZIP Overflow**: Fixed City/State/ZIP row overflowing outside the Physical Address container.

### Changed
- **Firebase Backend Migration**: Migrated from localStorage-only to Firestore write-through cache. All data syncs to Firestore in real-time. Auth via Firebase Authentication.

---

## [v0.2.9] - 2026-08-10

### Fixed
- **Vendor Management Table Headers**: Aligned table column headers with actual data columns. Headers now correctly show: Vendor ID, Vendor Name, Point of Contact, Phone, Email, Address, Category, Actions.
- **EventModal `recalculateLegTimes` Crash**: Defined the missing `recalculateLegTimes` function that recalculates arrival times when removing legs or changing aircraft.

### Changed
- **Settings Tabs Admin-Only**: AI & Integrations, System Users, and Development tabs are now hidden from non-admin roles (pilot, coordinator, maintenance, view_only).
- **Edit User Button**: Added Edit button next to Delete on the System Users page for admins to edit user profiles inline.
- **GitHub Pages Deployment**: App deployed to https://macktannen.github.io/BaseOps/

---

## [v0.2.8] - 2026-08-10

### Fixed
- **Settings Page Polish**: Added `.form-control` CSS class with consistent border, padding, focus ring, and disabled state. Cleaned up all settings form inputs to use the class instead of conflicting inline styles. Standardized section headers (removed bottom borders, consistent font sizes), label styling (uppercase, muted color, consistent spacing), border-radius values (all 8px), and alert message border-radius (6px). Mobile hamburger menu matches app button styling.

---

## [v0.2.7] - 2026-08-10

### Fixed
- **Locations Map Responsive**: On the Airports & Landing Zones page, the map now drops below the hazards/notes section when the editor panel gets narrow (≤1200px). The inner row uses `flex-wrap: wrap` and the data fields use `flex: 1 1 450px` with `max-width: 500px`, so the map wraps to full width below the form when space is tight.

---

## [v0.2.6] - 2026-08-10

### Fixed
- **Calendar Cell Compression**: Added `overflow: hidden`, `min-width: 0`, and `box-sizing: border-box` to calendar cells and the grid so each day column compresses properly. Flight badges truncate with ellipsis, flight lists scroll vertically when overflowing, and notes are contained. Cell padding, font sizes, and badge sizes reduce progressively at ≤1400px and ≤1300px breakpoints.

---

## [v0.2.5] - 2026-08-10

### Fixed
- **Desktop Responsive Compression**: Added three CSS breakpoints (≤1500px, ≤1400px, ≤1300px) that progressively compress the sidebar (250→160px), content padding, calendar cells (120→70px min-height), calendar header (wraps buttons, shrinks fonts), topbar, and EventModal leg row columns. The desktop layout now compresses smoothly down to 1280px before switching to mobile.

---

## [v0.2.4] - 2026-08-10

### Changed
- **Mobile Breakpoint Raised to 1280px**: Covers all iPad models in both portrait and landscape (iPad Air 1180px, iPad Pro 11" 1194px, iPad Pro 12.9" 1366px). Laptops (1366px+) still get the desktop layout.

---

## [v0.2.3] - 2026-08-10

### Changed
- **Mobile Breakpoint Raised to 1024px**: Screens at 1024px and below now use the mobile layout (bottom nav, stacked views) instead of the desktop layout. This prevents content overflow and horizontal scrolling on tablet-sized screens.

---

## [v0.2.2] - 2026-08-10

### Fixed
- **Drag-and-Drop Conflict Detection**: Scheduling conflicts (pilot and aircraft overlaps) are now also checked when drag-and-dropping a flight to a new date on the calendar. The same warning modal appears with "Save Anyway" / "Cancel" options.

---

## [v0.2.1] - 2026-08-10

### Added
- **Scheduling Conflict Detection**: When saving a flight, the system now checks for pilot and aircraft scheduling conflicts against all other flights. If a pilot is already assigned to another flight during overlapping times, or the same aircraft is double-booked, a warning modal appears showing the conflicting flights with details (flight number, title, date, time, route). The user can choose to "Save Anyway" or "Cancel" to resolve the conflict. Canceled flights are excluded from conflict checks.

---

## [v0.2.0] - 2026-08-10

### Changed
- **Mobile Settings Hamburger Menu**: The settings page on mobile now uses a hamburger dropdown menu instead of the sidebar layout. The menu shows the current section name and expands to show all available sections. Selecting a section closes the menu and displays the content full-width, maximizing usable screen space. Desktop layout remains unchanged.

---

## [v0.1.99] - 2026-08-10

### Changed
- **User Avatar / Name Click → Settings**: On both desktop topbar and mobile header, clicking the user name or avatar circle now navigates to the Settings page.

---

## [v0.1.98] - 2026-08-10

### Fixed
- **Sticky Calendar Header Gap**: The sticky calendar toolbar now extends into the content area padding so it sits flush against the topbar with no visible gap when scrolled.

---

## [v0.1.97] - 2026-08-10

### Fixed
- **Sticky Calendar Toolbar**: The calendar header bar (month navigation, View, Schedule Flight, and Notes buttons) now sticks to the top of the content area when scrolling down the calendar grid.

---

## [v0.1.96] - 2026-08-10

### Changed
- **Calendar Notes Date Range**: The Add Note modal now includes start and end date pickers, allowing a single note to be placed on multiple consecutive days at once. End date defaults to the start date and enforces start ≤ end. Editing an existing note shows only its original date.

---

## [v0.1.95] - 2026-08-10

### Added
- **Calendar Day Notes**: Added a "+Notes" button next to "Schedule Flight" on the desktop calendar. Notes are stored per day with a title and content. On the calendar grid, notes appear as gray cards at the top of each day cell showing only the title. Hovering over a note displays the full content in a browser tooltip. Clicking a note opens it for editing; notes can also be deleted.

---

## [v0.1.94] - 2026-08-10

### Fixed
- **Schedules Grid Legend Dynamic Colors**: The bottom legend on the desktop schedules grid now reflects the active color-by mode (Tag/Aircraft/Account) instead of a hardcoded purple "Flight Assigned" entry. It only shows colors actually present on the current week's grid, using the same `getColorLegend()` logic as the settings popup.

---

## [v0.1.93] - 2026-08-10

### Fixed
- **Mobile Crew Schedule Flight Coloring**: The mobile crew schedule grid now uses the same color-by setting (Tag/Aircraft/Account) as the desktop schedules grid. Reads `schedulesGridColorBy` from localStorage and applies matching colors via `gridColors.js` — no longer hardcoded purple for all flights.

---

## [v0.1.92] - 2026-08-10

### Fixed
- **Event Modal Header Responsive**: Added desktop media queries so the EventModal flight card header wraps, shrinks, and reflows on narrower desktop screens (≤1200px, ≤1000px, ≤860px) before the mobile layout kicks in. Dividers hide, fonts shrink, and the header stacks vertically at smaller widths to prevent overflow.

---

## [v0.1.91] - 2026-08-09

### Changed
- **Swapped Account Colors**: NIPSCO Electric and NISOURCE Communications now exchange colors across the Company Accounts & Departments page, mobile accounts list, and the schedules grid "color by account" mode. The swap lives in `services/gridColors.js` via `getAccountColor()` and is applied consistently everywhere.

---

## [v0.1.90] - 2026-08-09

### Changed
- **Account Color Dots**: The Company Accounts & Departments page (and mobile accounts list) now shows a color dot to the left of each account name. Dots use the same shared color utility (`services/gridColors.js`) as the schedules grid "color by account" mode, so the account colors match exactly between the two pages. The schedules grid legend now also displays account names (e.g., NIPSCO Electric) instead of raw IDs.

---

## [v0.1.89] - 2026-08-09

### Added
- **Schedules Grid Color Settings**: Added a settings cog next to the Schedule Generator button. It opens a popup to color flight boxes on the schedules grid by Tag, Aircraft, or Account (with a live legend). The chosen mode persists in localStorage (`schedulesGridColorBy`).

---

## [v0.1.88] - 2026-08-09

### Added
- **Duplicate Flight Date Picker (Mobile)**: On mobile, tapping Duplicate on a flight opens a centered date-selector popup matching the mobile app style instead of the desktop calendar day-click flow. Picking a date and confirming creates the duplicated flight (with a new flight number and legs shifted to the chosen date) and saves it to localStorage.

---

## [v0.1.87] - 2026-08-09

### Changed
- **Delete Flight Custom Confirm**: Replaced the browser's native `window.confirm` dialog with a custom in-app confirmation popup centered on screen and styled to match the mobile app. It shows a trash icon, "Delete Flight?" message, and Cancel / Delete Flight buttons.

---

## [v0.1.86] - 2026-08-09

### Changed
- **EventModal Header Layout (Mobile)**: TRIP # now uses a fixed width while the TITLE input flexes to fill the entire remaining width of its row, so the title maximizes to the screen edge. The flight status selector and the Tags pill share the same row, with the tag keeping its natural size (priority to large tag names) and the status select absorbing the leftover space.

---

## [v0.1.85] - 2026-08-09

### Changed
- **EventModal Header Layout (Mobile)**: Moved the flight status selector out of the top row and placed it on the same row as the Tags button (status left, tags right). The title field now spans the full top row width, giving it more room on small screens.

---

## [v0.1.84] - 2026-08-09

### Fixed
- **Mobile Crew & Passenger Status Labels**: Pilots and crew members were being displayed as "Passenger" in the mobile day-view "Crew & Passenger Status" section. The `crewList` in `MobileLayout` was built from raw localStorage records without tagging each person's role, so the role label fell through to its "Passenger" default. Pilots, crew, and passengers are now explicitly tagged (`pilot`/`crew`/`pax`) — matching the logic already used by `CrewSchedule` and `MobileCrew` — so each person shows the correct label.

---

## [v0.1.83] - 2026-08-09

### Changed
- **Flight Log Layout Enhancements**: Removed fixed height constraints on the FlightLogTab panels (Legs Actuals, Logbook Totals, etc.) and enabled vertical expansion. Long, multi-leg flights will no longer squish vertically, allowing users to scroll the main modal to view all inputs.
- **Button Uniformity**: Adjusted global button CSS (order: 1px solid transparent) so that filled primary buttons and outline buttons render at the exact same pixel height across the application.
- **Reverted Mobile Expenses/Flight Log Tables**: Removed the vertical card-stacking responsive tables applied in earlier iterations, returning the Expenses and Flight Log tables to their standard desktop data-grid layouts.

---
## [v0.1.82] - 2026-08-09

### Changed
- **Comprehensive Calendar Day View**: In MobileLayout, selecting a day now shows a complete picture including Flights, Custom Events (via Flight Tags and Notes), and Crew Assignments (Duty, Vacation, Training) for that specific date.
- **Flight Card Upgrades**: Flight cards in the day view are now dynamically color-coded based on their tags (Emergency, Maintenance, Training) and display Operations and Crew Notes inline.
- **Mobile Crew Redesign**: Replaced the bulky, compressed grid with a dedicated, touch-friendly `MobileCrew` component. Users select a crew member from a sticky top dropdown and view their 7-day schedule in a clean vertical list.
- **Complete Fleet Parity**: Added the previously missing data points (Landings, Hobbs Meter, Aircraft Status) to `MobileFleet`, ensuring 100% data parity with the desktop view.
- **Split Accounts & Contacts Tabs**: Separated the unified "Accounts & Contacts" list into two distinct navigation tabs on mobile while retaining the mobile-friendly expandable card layout.

---

## [v0.1.81] - 2026-08-09

### Changed
- **Mobile Fleet View**: Completely replaced the complex desktop Aircraft List table on mobile with a touch-friendly, card-based `MobileFleet` component. Features horizontal tabs for aircraft selection and a single vertical scrolling detail view.
- **Mobile Expenses View**: Built a dedicated `MobileExpenses` view for small screens. Data rows are now compressed into readable cards instead of horizontal scroll tables. Summary widgets (Total, Paid, Unpaid) use dynamic flex layout to shrink and fit properly.
- **Mobile Accounts/Contacts**: Rebuilt the Accounts and Global Contacts view into a unified `MobileAccounts` component that acts like a standard mobile contact list with expandable rows.
- **Mobile Calendar Fix**: Restored the 7-day mini-calendar grid, which was accidentally being crushed into a single column by greedy CSS overrides.
- **Mobile Crew Fixes**: Compressed padding and row heights to fit more data on screen. Hid the Schedule Generator button from mobile view. Fixed header layout so Next/Prev buttons remain visible.
- Removed the Locations tab from the mobile "More" menu.

---

## [v0.1.80] - 2026-08-09

### Added
- **Mobile Layout**: Phones and tablets (≤768px) now load a dedicated mobile-friendly layout with a bottom tab navigation bar, compact header, and touch-optimized spacing. Desktop layout is completely unchanged.
- **Mobile Mini-Calendar**: The mobile Flights tab shows a compact monthly calendar with colored dots indicating scheduled flights. Tapping a day opens a vertical scrollable list of flight detail cards for that day. Tapping a flight card opens the full EventModal.
- **Mobile CSS Overrides** (`mobile.css`): Tables get horizontal scroll wrappers, master-detail views stack vertically, form grids go single-column, EventModal goes full-screen, and input font sizes are bumped to 16px to prevent iOS zoom.
- **"More" Slide-Up Menu**: Overflow navigation items (Locations, Accounts, Settings) are accessible via a "More" tab that opens a slide-up sheet on mobile.

---

## [v0.1.79] - 2026-08-09

### Added
- **Every Other Week Schedule Generator**: Added an "Every Other Week" checkbox to the Schedule Generator in the Crew and Passengers page (under Specific Days mode). This allows you to easily generate an alternating 14-day schedule where personnel are on-duty for your selected days during week 1, and off-duty for week 2.

---

## [v0.1.78] - 2026-08-09

### Added
- **Expenses Dashboard Quick Filters**: You can now click on the "Total Expenses", "Paid", or "Unpaid" summary boxes at the top of the Expenses Dashboard to instantly filter the underlying charts and data by payment status. The active filter is highlighted with a colored border.

---

## [v0.1.77] - 2026-08-09

### Added
- **Expenses Dashboard Date Navigation**: Added "Prev", "Current", and "Next" navigation controls below the period selection buttons in the Expenses Dashboard. This allows users to seamlessly navigate through past or future days, weeks, months, quarters, or years, with the selected date range dynamically displayed.

---

## [v0.1.76] - 2026-08-09

### Added
- **Dashboard Date-Range Filtering**: The Expenses Dashboard now has a period selector to narrow the data by Day, Week, Month, Quarter, Year to Date, Year, or a Custom date range (plus All Time). All summary cards and charts update to reflect the selected range, and the active range is displayed.

---

## [v0.1.75] - 2026-08-09

### Added
- **Expenses Dashboard**: A new "Expenses Dashboard" tab (next to Vendor Management) on the Expenses page, powered by Recharts. It provides a visual breakdown of where expenses come from and where they go:
  - Summary cards for Total, Paid, Unpaid, and record count.
  - A category distribution donut chart.
  - Sortable horizontal bar charts for Spending by Category, Vendor, Account, Payment Method, and Aircraft (sort by amount, count, or name).
  - A monthly spending trend chart.

---

## [v0.1.74] - 2026-08-09

### Changed
- **Expenses Overview Vendor Column**: The Vendor column now shows only the full vendor name, removing the `[VendorID]` prefix that previously appeared before the name.

---

## [v0.1.73] - 2026-08-09

### Changed
- **Expenses Overview Readability**:
  - The Trip column now shows the trip number and trip title on the same line (previously stacked on two lines).
  - Added alternating row shading to the Expenses Overview table for clearer row delineation, with a distinct hover highlight preserved. Also corrected the "no expenses" row to span the full table width.

---

## [v0.1.72] - 2026-08-09

### Changed
- **Code Cleanup / Zero Lint Warnings**: Resolved all 94 oxlint warnings across the codebase with no behavior changes:
  - Converted unused `catch (e)` bindings to optional catch binding (`catch {}`).
  - Removed unused imports and dead code (including an unused "Add Schedule" block in Crew Schedule).
  - Renamed unused event-handler parameters and elided unused `useState` values.
  - Fixed three `react-hooks/exhaustive-deps` warnings safely (no re-render loops).
  - Split `AuthContext` so the context object, the `AuthProvider` component, and the `useAuth` hook each live in their own file (improves fast-refresh).
  - Excluded the `scratch/` draft folder from linting.

---

## [v0.1.71] - 2026-08-09

### Changed
- **Simplified Calendar View Options**: Removed the "Overnight icon", "Status chip", and "Tag chips" toggles from the View panel. The overnight indicator, status chip, and tag chips now always display on flight cards (in non-compact mode).
- **Menu Version Display**: The main menu now shows the correct release version, and the version constant will be kept in sync with the CHANGELOG on every release.

---

## [v0.1.70] - 2026-08-09

### Added
- **Calendar View Options**: A new "View" button in the calendar header opens a panel to control what appears on the calendar. Options include:
  - Compact flight cards (collapse each card to just its title).
  - Per-field toggles for each flight card: Aircraft, Account, Pilot, Route/Legs, Passengers.
  - Show/hide layers: crew status bubbles, overnight icon, status chip, tag chips.
  - Hide flights by tag (e.g. Emergency, Maintenance) or by status.
  - Filter to only show flights for selected aircraft, accounts, or pilots.
  - A Reset button restores defaults. Preferences persist across sessions via localStorage.

---

## [v0.1.69] - 2026-08-09

### Fixed
- **Vendor Edits Now Propagate to All Expenses**: Editing a vendor's ID or name no longer orphaned existing expenses. When a vendor's reference key (Vendor ID, or Name for vendors without an ID) changes, all expenses — both flight expenses and department expenses — that pointed to the old value are automatically remapped to the updated vendor. This keeps expense tracking intact and prevents rows from falling back to a stale or blank vendor after a vendor is updated. Editing other vendor details (address, phone, email, category, POC) also refreshes immediately across the app.

---

## [v0.1.68] - 2026-08-09

### Added
- **Edit & Delete Department Expenses**: Clicking a department (non-flight) expense row in the Expenses Overview now opens the manual expense editor pre-filled with that expense, so it can be adjusted or deleted. The editor shows a red Delete button and a "Save Changes" action when editing. An expense can also be moved from Department to a specific flight (or vice versa) by changing the Trip selector while editing. Flight-related expenses continue to use the flight card's expenses tab as before.

---

## [v0.1.67] - 2026-08-09

### Changed
- **Department (Non-Flight) Expenses**: The Manual Expense "Trip" field is now optional and defaults to "Department (no flight)". Saving without selecting a flight records the expense as a department expense, shown under the Trip column as "Department" in the Expenses Overview. Department expenses are stored separately so they do not appear on the calendar or in flight lists, and their Paid status can still be toggled from the overview table.

---

## [v0.1.66] - 2026-08-09

### Added
- **Manual Expense Button on Expenses Page**: Added a "Manual Expense" button to the main Expenses page top bar, positioned to the right of the "Auto-Fill Expense" (AI) button. Clicking it opens a modal that lets you manually enter an expense (flight, date, amount, vendor, category, payment, location, fuel details, purchaser, and notes) and attach it to a chosen flight — matching the manual entry capability that previously only existed on the flight card's expenses tab. New vendors typed into the form are auto-created if they don't already exist.

---

## [v0.1.65] - 2026-08-07

### Changed
- **Aircraft Status Display**: Replaced the static status dropdown on the Aircraft Fleet Management page with a dynamic, read-only display that reflects the aircraft's calendar status for the current day. This provides immediate visibility into whether an aircraft is available, scheduled for flights, or in maintenance today, similar to the pilot status page.

---

## [v0.1.64] - 2026-08-07

### Added
- **Expanded Expenses Overview Table**: Added new columns for "Aircraft", "Account", "Payment" (Payer), "Fuel Provider" (Fuel Type), and "Purchaser" to the main Expenses Overview table, matching the fields available in the flight card's expenses tab.

---

## [v0.1.63] - 2026-08-07

### Fixed
- **Row-Level Save Now Persists Across the Entire App**:
  - Root cause: clicking the line Save icon wrote to `localStorage` but CalendarView and ExpensesPage never listened for storage changes, so their in-memory `flights` state stayed stale. Closing and reopening a flight card would reload old data.
  - Added `storage` event listeners to both CalendarView and ExpensesPage so they refresh their flight/expense state whenever `localStorage` is updated.
  - Now clicking the line-level Save icon immediately persists the row's changes to `localStorage`, CalendarView picks up the update, and re-opening the flight card shows the saved data — exactly like clicking "Save Flight" but scoped to just that one expense row.

---

## [v0.1.62] - 2026-08-07

### Fixed
- **Instant Expense Line Persistence**:
  - Fixed an issue where clicking the line-level Save icon updated the checkmark state locally in component memory but didn't write to `localStorage` unless the overall flight card Save button was also pressed.
  - Now, clicking the line-level Save icon (or deleting/importing a line) immediately writes the updated expense array directly to `localStorage` and broadcasts a `storage` event, ensuring edits are fully preserved even if you close the card without pressing the main Save button.

---

## [v0.1.61] - 2026-08-07

### Improved
- **Expense Field Auto-Highlight**:
  - Clicking into any fillable text or number box on expense rows (Date, Gallons, Purchaser, Amount, Notes, and custom category text box) now automatically selects/highlights all text.
  - Excludes select dropdown menus (Vendor, Category dropdown, Payment, Location, Fuel Type) as requested.

---

## [v0.1.60] - 2026-08-07

### Improved
- **Flight Card Save Sync for Expenses**:
  - Clicking the overall **Save Flight** button in the flight card now automatically marks all expense rows as clean and saved.
  - Switches any pending blue line-level Save icons to green check marks (**✓**) across the entire expense tab upon flight save.

---

## [v0.1.59] - 2026-08-07

### Improved
- **Expense Line Save Icon & Auto-Save Overhaul**:
  - Auto-fills from PDF / Receipt or AI uploader now automatically save expenses upon import/upload.
  - Added line-level **Save** button (blue disk icon) that appears in the first column whenever an expense line is newly added or edited.
  - Clicking the Save icon saves changes for that line specifically and updates the icon to a green check mark (**✓**) to confirm saved state.

---

## [v0.1.58] - 2026-08-07

### Fixed
- **Vendor Auto-Creation Fix**:
  - Fixed a bug where deleting a vendor caused the system to fall back to `mockVendors` because `localStorage.getItem('userVendors')` returned `[]` (an empty array), preventing new vendor creation.
  - Tightened vendor matching to exact vendor ID/name so deleted vendors can be re-created cleanly upon uploading a new receipt.

---

## [v0.1.57] - 2026-08-07

### Improved
- **Button Label Update**:
  - Renamed the AI invoice upload button to **"Auto-Fill Expense"** across all expense tabs and views.

---

## [v0.1.56] - 2026-08-07

### Improved
- **Maximized Vendor Information Extraction**:
  - Enhanced Gemini AI prompt rules to actively search for and extract street address, city/state/zip, phone number, email/domain, and cashier/manager/point of contact (POC) name from documents.
  - Automatically populates `address`, `phone`, `email`, and `poc` fields on new vendor entries when created in Vendor Management.

---

## [v0.1.55] - 2026-08-07

### Improved
- **Context-Aware AI Vendor Matching & Auto-Creation**:
  - The existing vendor list (including vendor names, IDs, categories, and addresses) is now fed directly into the Gemini prompt context.
  - The AI uses full document context (header titles, company names, airport/FBO facility names, address, phone number) to match against existing vendors.
  - If a match is found, it automatically links the existing vendor by Name / Vendor ID.
  - If no match is found, a new vendor entry is created in `localStorage` containing the extracted business name, category, address, and phone number, and dispatched across all views.

---

## [v0.1.54] - 2026-08-07

### Improved
- **Smart AI Invoice Parsing Overhaul**:
  - AI prompt now includes exact dropdown option lists for Category, Payment, Fuel Type, and Gallons fields — only fills values it's confident about.
  - **Category**: Uses exact category names from dropdown. Can create new custom categories if no match fits.
  - **Payment**: Only selects from existing payment methods (Avcard, Avfuel, World Fuel, etc.). Leaves blank if unknown.
  - **Fuel Type**: Only populated when category is Fuel. Defaults to "FBO" if fuel supplier isn't in the dropdown list.
  - **Gallons**: Only filled for fuel invoices with visible quantity. Left blank otherwise.
  - **Amount**: Total invoice/receipt amount. Left blank if unable to determine.
  - **Vendor**: Always extracted and auto-creates a new vendor entry in the Vendors list.
  - **Document Auto-Upload**: Parsed PDF/image is automatically attached as a receipt viewable via the document icon.

---

## [v0.1.53] - 2026-08-07

### Fixed
- **Migrated to Current Free-Tier Gemini Models**:
  - Replaced deprecated `gemini-1.5-flash` and quota-exhausted `gemini-2.0-flash` endpoints with active free-tier models: **`gemini-3.5-flash-lite`** (primary) and **`gemini-3.6-flash`** (fallback).
  - The older 1.5/2.0 models have been removed from Google's free tier as of 2026, causing all previous attempts to fail with 404 or 429 (limit: 0) errors.

---

## [v0.1.52] - 2026-08-07

### Fixed
- **API Endpoint Diagnostics & Model Ordering**:
  - Placed standard **`v1beta/models/gemini-1.5-flash`** at the top of candidate endpoints in `pdfParserService.js` and `SettingsView.jsx`.
  - Added clean error diagnostics for invalid or uninitialized API keys to guide users to `aistudio.google.com`.

---

## [v0.1.51] - 2026-08-07

### Fixed
- **Free-Tier Model Priority & Quota Routing**:
  - Re-ordered model candidate list to prioritize **`v1/models/gemini-1.5-flash`** (the 100% free model with 1,500 requests/day).
  - Enhanced candidate loop in `pdfParserService.js` and `SettingsView.jsx` to automatically bypass `429 (limit: 0)` errors from unbilled preview models (e.g. `gemini-2.0-flash`), routing directly to active free-tier endpoints.

---

## [v0.1.50] - 2026-08-07

### Fixed
- **Multi-Model Endpoint Fallback**:
  - Implemented automatic sequential fallback (`gemini-2.0-flash`, `v1/gemini-1.5-flash`, `gemini-1.5-flash-latest`, `gemini-1.5-pro`) in `pdfParserService.js` and `SettingsView.jsx`.
  - Automatically bypasses 404 model routing errors regardless of regional API key tier or endpoint permissions.

---

## [v0.1.49] - 2026-08-07

### Fixed
- **Updated AI Vision Endpoint**:
  - Replaced endpoint URL to use `gemini-1.5-flash` in `pdfParserService.js` and `SettingsView.jsx`, resolving 404 API model deprecation error.

---

## [v0.1.48] - 2026-08-07

### Added
- **AI & Integrations Settings Panel**:
  - Added a dedicated **AI & Integrations** tab in `SettingsView.jsx` for managing and testing Google Gemini API keys.
  - Included 1-click test button (`Test Connection`) to instantly verify key connectivity and status.

---

## [v0.1.47] - 2026-08-07

### Added
- **AI-Powered PDF Invoice & Receipt Reader**:
  - Integrated `pdfjs-dist` and Google Gemini Vision API (`gemini-2.5-flash`) into `src/services/pdfParserService.js` to automatically extract structured expense details (`vendor`, `amount`, `date`, `category`, `invoiceNumber`, `description`) from uploaded PDF invoices or paper receipt scans.
  - Added interactive `<AIInvoiceUploader />` dropzone buttons to both the global **Expenses Page** and the **Flight Expenses Tab** inside the Flight Modal.
  - Included a key setup modal for saving free Gemini API keys locally or configuring via `VITE_GEMINI_API_KEY`.

---

## [v0.1.46] - 2026-08-07

### Changed
- **Matched Passengers UI Format & Text Size**:
  - Aligned the dropdown size, label styling, tag font size (`0.62rem`), padding, and dedicated `X` remove button structure of the **Passengers** section to match **Pilots / Crew** in `EventModal.jsx`.
  - Maintained distinct domain logic: PIC/SIC role toggling remains strictly for Pilots, while Passengers remain a clean passenger assignment list.

---

## [v0.1.45] - 2026-08-07

### Fixed
- **Isolated Leg Card Drag-and-Drop**:
  - Updated `handleDrop` in `CalendarView.jsx` so dragging a flight card on a multi-day flight only moves the dates of the specific leg corresponding to the dragged card (`sourceDay`), keeping other legs on their scheduled dates untouched.

---

## [v0.1.44] - 2026-08-07

### Fixed
- **Synchronized Drag-and-Drop Date Shifting**:
  - Updated `handleDrop` in `CalendarView.jsx` to calculate the date offset when moving a flight card and shift both Takeoff Date (`date`) and Landing Date (`arrDate`) across all legs in sync.
  - Preserved multi-day overnight leg spans when moving flight cards to new calendar dates.

---

## [v0.1.43] - 2026-08-07

### Changed
- **Cleaned Flight Card Labels**:
  - Removed `Tail:` prefix to display the aircraft tail directly (e.g. `N123HA`).
  - Removed `Acc:` prefix to display the account name directly on flight cards in `CalendarView.jsx`.

---

## [v0.1.42] - 2026-08-07

### Fixed
- **Atomic Pilot Removal & Compact Badge Sizing**:
  - Replaced double state updates with atomic `handleAddPilotToLeg` and `handleRemovePilotFromLeg` helpers in `EventModal.jsx`, fixing the issue where clicking `X` would fail to remove a pilot from the leg.
  - Compacted pilot tag font size (`0.62rem`), padding (`2px 4px`), and `X` button icon size (`9px`) so multi-pilot badges fit cleanly without inflating leg card height.

---

## [v0.1.41] - 2026-08-07

### Fixed
- **Pilot Tag Role Transitions & Dedicated Remove Button**:
  - Automatically assign newly added pilots as `SIC` when a `PIC` already exists on the leg.
  - Clicking an existing `[PIC]` moves them to `[SIC]` and bumps the previous `[SIC]` to `Crew` (unassigned).
  - Separated the pilot tag name click target from a dedicated `X` remove button with explicit event stopping, ensuring clean pilot removal from legs.

---

## [v0.1.40] - 2026-08-07

### Added
- **Clickable PIC / SIC Pilot Role Toggling**:
  - Clicking an assigned pilot tag badge in `EventModal.jsx` cycles their role through `[PIC]` (Gold highlight) -> `[SIC]` (Blue highlight) -> `Crew` (Neutral).
  - Linked explicit `PIC` and `SIC` role designations directly into `FlightLogTab.jsx` for log summary reporting.
- **Dynamic "Pilots" Card Label**:
  - Updated `CalendarView.jsx` flight cards to display **Pilots:** when more than 1 pilot is assigned to a leg, and **Pilot:** when 1 pilot is assigned.

---

## [v0.1.39] - 2026-08-07

### Added
- **Multi-Pilot Selection per Leg**:
  - Upgraded the leg pilot selection in `EventModal.jsx` to support multi-pilot assignment (`pilots: string[]`), matching the passenger selection UI with tag badges and remove buttons.
  - Updated `FlightLogTab.jsx` to render the primary pilot as **PIC** and secondary assigned pilots as **SIC**.
  - Updated `CrewSchedule.jsx` and `CalendarView.jsx` to resolve and display all assigned pilots across schedule rows and calendar cards.

---

## [v0.1.38] - 2026-08-07

### Added
- **Multi-Day Leg 2+ Overnight Symbol Support**:
  - Expanded `isOvernight` flight card logic on `CalendarView.jsx` and `CrewSchedule.jsx` to show the top-right moon symbol badge whenever any leg (including Leg 2 or Leg 3+) takes off or lands on a different date than Leg 1.
  - Added a `Multi-day leg` purple badge on the takeoff date picker in `EventModal.jsx` when Leg 2+ is set to a different date than Leg 1.

---

## [v0.1.37] - 2026-08-07

### Fixed
- **Independent Leg Editing for Leg 2+**:
  - Replaced global loop recalculations with single-leg handlers (`calculateSingleLegArrival` and `calculateSingleLegDuration`) in `EventModal.jsx`.
  - Leg 2, Leg 3, and subsequent legs now allow editing takeoff date, takeoff time, departure location, destination location, duration, landing date, landing time, pilot, and passengers independently, matching Leg 1 behavior.

---

## [v0.1.36] - 2026-08-07

### Changed
- **Compact Top-Right Moon Icon Badge**:
  - Removed the text label from the top-right overnight badge on `CalendarView.jsx` and `CrewSchedule.jsx`, leaving solely the moon icon (`🌙`) in a clean circular badge.
  - Prevents overlap or clipping with long flight titles.

---

## [v0.1.35] - 2026-08-07

### Added
- **Top-Right Overnight Badge on Calendar & Schedule Flight Cards**:
  - Added a dedicated top-right **Overnight Symbol Badge** (`🌙 Overnight`) to flight cards on both the originating date and spanned next-day date in `CalendarView.jsx` and `CrewSchedule.jsx`.
  - Positioned in the top right corner with a dark slate background, warm yellow moon icon, and high-visibility styling.

---

## [v0.1.34] - 2026-08-07

### Added
- **Multi-Day Leg Takeoff & Landing Date Support**:
  - Added dedicated **Takeoff Date** (`date`) and **Landing Date** (`arrDate`) input fields for each flight leg in `EventModal.jsx`.
  - Automatically defaults the Landing Date to match the Takeoff Date when a leg is initialized or when the Takeoff Date changes.
  - Enforced `min={leg.date}` and date validation logic to prevent landing dates from being selected backwards in time.
  - Automatically calculates flight duration (in minutes & decimal hours) across multi-day overnight flight spans (e.g. departing 23:00 and landing 02:30 next day).
  - Added an overnight indicator badge (`+1d overnight`) on the flight plan leg card when a flight lands on a subsequent date.
  - Updated `CalendarView.jsx` and `CrewSchedule.jsx` date range queries so multi-day overnight legs render across all spanned calendar days.

---

## [v0.1.33] - 2026-08-06

### Added
- **Clickable Flight Cards on Schedule Grid**:
  - Clicking any flight card on the **Schedules Grid** (`CrewSchedule.jsx`) now opens the full interactive **Flight Modal** (`EventModal.jsx`).
  - Allows viewing and editing flight details, leg actuals, flight log signatures, and flight expenses directly from the schedule grid view.
  - Added live data sync so changes made in the flight modal immediately update the schedule grid.

---

## [v0.1.32] - 2026-08-06

### Changed
- **Unified Layout Color Palette**:
  - Removed blue text (`#2b6cb0`) and blue background shading (`#ebf8ff`, `#bee3f8`) across `AircraftList.jsx`, `FlightLogTab.jsx`, `PilotsList.jsx`, `SettingsView.jsx`, `ExpensesTab.jsx`, and `ExpensesPage.jsx`.
  - Restored standard table input backgrounds, default dark text, and theme primary / neutral background styling for full design consistency.

---

## [v0.1.31] - 2026-08-06

### Added
- **Flight Log & Fleet Aircraft Meter Synchronization**:
  - Dynamically synchronized the Flight Log card totals with the live Fleet Aircraft management page (`userAircraft`).
  - Added live meter syncing for unsigned flight logs so opening any flight card always displays the latest live `Before` meter figures from the aircraft logbook.
  - Ensured signing a flight updates `totalHours`, `landings`, `engine1Hours`, `engine1Cycles`, `engine2Hours`, `engine2Cycles`, and `hobbs` in real-time across both pages.
- **Twin Engine Leg Actuals Support**:
  - Updated `FlightLogTab.jsx` to render separate **Engine 1 (Hrs)**, **Engine 2 (Hrs)**, **Eng 1 Cyc**, and **Eng 2 Cyc** input fields when a twin-engine aircraft (`dualEngine`) is selected.
  - Mirrored the exact 7 boxes of logbook meters (Aircraft Hours, Aircraft Landings, Engine 1 Hours, Engine 1 Cycles, Engine 2 Hours, Engine 2 Cycles, Hobbs) between `FlightLogTab` and `AircraftList`.

---

## [v0.1.30] - 2026-08-06

### Added
- **Expanded Expenses & Vendor Permissions for Coordinator & Pilot Roles**:
  - Granted full access to **Coordinator** and **Pilot** roles to manage flight expenses (add, edit, delete, mark paid/unpaid).
  - Granted full access to **Coordinator** and **Pilot** roles for **Vendor Management** (add, edit, and delete vendor records in the vendor database).
  - Enabled access to the **Expenses Page** and **Expenses Tab** for both roles.

---

## [v0.1.29] - 2026-08-06

### Added
- **Full Role-Based Access Control (RBAC) System**: Complete multi-role permission engine across the entire app.
  - **New** `src/services/permissionService.js`: Centralized `PERMISSIONS` map per role with a `can(user, permission)` helper. Roles: `admin`, `coordinator`, `pilot`, `maintenance`, `view_only`.
  - **Multi-Role User Support**: Users can now hold multiple roles simultaneously. Permissions are additive — the union of all assigned roles.
  - **authService.js** overhauled: User schema upgraded from `role: string` to `roles: string[]`. Auto-migrates all existing users on startup. Chad McKie → `admin`, Test User → `pilot`.
  - **AuthContext.jsx** updated: Exposes `can(permission)`, `hasRole(role)`, and `getUserRoles()` helpers bound to the current session user.
  - **SettingsView.jsx** redesigned: Multi-role checkbox selectors with colored role badges for user management. View Only users get a "Show My Flights Only" toggle in their profile.
  - **AircraftList.jsx**: Granular permission guards — `canEditMeters` (admin/maintenance), `canEditMaintenance` (admin/maintenance), `canEditProfile` (admin only), `canEditStatus` (admin/coordinator/maintenance), `canEditOps` (admin/coordinator/maintenance).
  - **App.jsx**: Accounts & Expenses nav items hidden for roles without `manageAccounts` or `viewExpensesOverview` permissions.

---

## [v0.1.28] - 2026-08-06

## [v0.1.28] - 2026-08-06

### Added
- **Twin Engine Toggle & Engine 1/2 Logbook Tracking**: Updated `AircraftList.jsx` and `FlightLogTab.jsx` to support multi-engine aircraft management:
  - Added a **Twin Engine** checkbox toggle on the Fleet Aircraft management card.
  - Enabled separate **Engine 1 Hours**, **Engine 1 Cycles**, **Engine 2 Hours**, and **Engine 2 Cycles** input fields.
  - Dynamically updated flight log signature handling to record before/after meter changes for both engines on twin-engine helicopters.

---

## [v0.1.27] - 2026-08-06

### Added
- **Dynamic Pilot Medical Status Indicators**: Added real-time medical status indicators tied to each pilot's entered medical expiration date in `PilotsList.jsx`:
  - **Current** (Green): Expiration date is more than 30 days in the future.
  - **Caution** (Yellow/Orange): Expiration date is within 30 days.
  - **Expired** (Red): Expiration date has passed.
  - Rendered next to the expiration date input on the pilot card and under the duty/flight status indicator in the pilot list.

---

## [v0.1.26] - 2026-08-06

### Changed
- **Fillable Logged Flight Hours Display & Any Signature Trigger**: Updated `PilotsList.jsx` so that any valid signature (pilot or admin) on a flight log triggers logged hours calculation. The fillable input box now dynamically displays the total running flight hours (`signed hours + baseline hours`), allowing direct adjustment while preserving automated flight time addition.

---

## [v0.1.25] - 2026-08-06

### Added
- **Automatic Pilot Flight Hours Accumulation**: Updated `PilotsList.jsx` to dynamically sum all completed flight hours from signed flight logs (`flightLog.signature`) for each assigned pilot. The total running flight time (baseline set in profile + accumulated signed flight hours) displays across the pilot directory and profile card.

---

## [v0.1.24] - 2026-08-06

### Changed
- **Crew & Passengers Navigation Labels**: Simplified subtab button titles in `CrewView.jsx` from "Pilots Directory", "Crew Directory", and "Passengers Directory" to **Pilots**, **Crew**, and **Passengers**.

---

## [v0.1.23] - 2026-08-06

### Changed
- **Dynamic Pilot Card Status & Flight Info**: Replaced the static status dropdown in `PilotsList.jsx` with live status pulling directly from the schedule grid for the current day. If a pilot is on duty and assigned to a flight today, the card displays their duty status along with the Flight Trip number and Flight Title (`#FLT-1: Flight Title`).

---

## [v0.1.22] - 2026-08-06

### Changed
- **Expenses Dropdowns Usage & Alphabetical Sorting**: Updated the **Vendor**, **Category**, **Payment**, and **Fuel** dropdown menus on the Flight Card Expenses tab to calculate historical usage frequency across saved flights. Dropdown options now order by frequency (most used first) and then alphabetically.

---

## [v0.1.21] - 2026-08-05

### Added
- **Click Expense Line to Open Flight Card**: Clicking any expense row in `ExpensesPage.jsx` now pops up its corresponding flight card, defaulting directly to the **Expenses** tab for immediate viewing and editing.

---

## [v0.1.20] - 2026-08-05

### Fixed
- **Flight Card Initialization & Date Auto-Fill**: Updated `initialDateStr` parsing in `EventModal.jsx` to prevent React render state array issues when passing Date objects or strings, ensuring leg dates, on-duty pilot, and on-duty crew passengers populate immediately upon clicking any calendar cell.

---

## [v0.1.19] - 2026-08-05

### Added
- **Auto-Fill Date, On-Duty Pilot & On-Duty Crew Passengers**: When clicking a calendar day to create a flight card:
  - Leg dates automatically match the clicked calendar date.
  - The pilot defaults to the scheduled on-duty pilot for that date.
  - Passengers automatically default to any crew/passengers marked as on-duty on that date.

---

## [v0.1.18] - 2026-08-05

### Fixed
- **Hide Unknown Deleted Personnel Badges on Calendar**: Updated `CalendarView.jsx` to filter out schedule entries for personnel who no longer exist in the pilots or passenger/crew directories.
- **Schedule Storage Cleanup on Delete**: Updated `PilotsList.jsx`, `PassengersList.jsx`, and `CrewList.jsx` to automatically remove all schedule keys associated with deleted personnel from `crewSchedules` upon deletion.

---

## [v0.1.17] - 2026-08-05

### Added
- **Auto-Fill On-Duty Pilot on Calendar Flight Creation**: Updated `getDefaultPilotForDate` in `EventModal.jsx` to look up scheduled on-duty/duty-training pilots for the selected date and automatically select them for the flight and all subsequent legs.

---

## [v0.1.16] - 2026-08-05

### Fixed
- **Flight Card Save Animation & Re-Save**: Updated `handleSubmit` in `EventModal.jsx` to reset and re-trigger `isSaved` state on every save click, guaranteeing that the green checkmark animation plays correctly on every single save action.

---

## [v0.1.15] - 2026-08-05

### Changed
- **Expenses Tab Fuel Selection**: Updated the **Fuel** dropdown menu in `ExpensesTab.jsx` to allow clearing back to a blank / default state (`-- Select Fuel --`) after an option has been chosen.

---

## [v0.1.14] - 2026-08-05

### Reverted
- Reverted v0.1.13 changes to Expenses tab fuel vendor selection and gallon input requirements as requested.

---

## [v0.1.13] - 2026-08-05

### Changed
- **Monday-to-Sunday Schedule Grid Week Format**: Updated `CrewSchedule.jsx` to start each weekly schedule view on Monday (`weekStartsOn: 1`) and end on Sunday instead of starting on Sunday.

---

## [v0.1.12] - 2026-08-05

### Changed
- **Monday-to-Sunday Schedule Grid Week Format**: Updated `CrewSchedule.jsx` to start each weekly schedule view on Monday (`weekStartsOn: 1`) and end on Sunday instead of starting on Sunday.

---

## [v0.1.11] - 2026-08-05

### Added
- **Custom Save Button Labels & Animation**: Updated `SaveButton` to display specific action labels ("Save Pilot", "Save Crew Member", "Save Passenger") and trigger the checkmark animation upon saving.

### Fixed
- **Fit-To-Screen Layout**: Adjusted line heights, field padding, and container heights across `PilotsList`, `CrewList`, and `PassengersList` so all directory views fit cleanly onto the screen without vertical scrolling of the page layout.

---

## [v0.1.10] - 2026-08-05

### Added
- **Crew Directory Sub-Tab (`CrewList.jsx`)**: Added a dedicated **Crew Directory** tab in the Crew & Passenger Management view between *Pilots Directory* and *Passengers Directory*.

### Changed
- **Automatic Crew/Passenger Separation**: Toggling the "Crew Member" checkbox on any person now automatically routes them to the Crew Directory and removes them from the Passengers Directory.

---

## [v0.1.9] - 2026-08-05

### Added
- **AI Agent Workflow Rules (`AGENTS.md`, `GEMINI.md`, `.agents/rules/workflow.md`)**: Enforced mandatory automated workflow across all AI models (version bump in sidebar, CHANGELOG entry, data sync, and git push).

---

## [v0.1.8] - 2026-08-05

### Added
- **Cross-Port & Multi-Tab Data Sync**: Implemented `BroadcastChannel` + `SharedWorker` fallback data sync service (`dataSyncService.js`) to automatically synchronize `localStorage` state across multiple browser tabs and different ports (`:5173`, `:5174`, etc.).
- **CHANGELOG.md**: Added official change log tracking application versions and updates.

### Fixed
- **Visible Personnel Dropdown**: Added `mousedown` and `touchstart` click-outside event listeners on the Crew & Passenger Management page to close the dropdown menu when clicking anywhere outside of the field.

---

## [v0.1.7] - Initial Setup
- Initial local release with schedule grid, flight modal, fleet, airports/LZs, contacts, and settings.

