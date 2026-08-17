# HANDOFF - baseops

- **Timestamp:** Aug 17, 2026
- **Tool used:** opencode
- **Branch:** main
- **Last commit:** 41ee1b3 fix(data): merge expenses by ID on flight save to prevent data loss from race condition

## Project Overview
Helicopter Scheduler Web App (`baseops`). Manages flights, crew schedules, expenses, fleet, and documents with Firebase/Firestore backend.

## What Was Just Completed
1. **Cloud-only file storage**: Removed all local IndexedDB/localforage fallbacks from `FileStorageService.js`. All file uploads (flight documents and expense receipts) now go exclusively to Firebase Cloud Storage. Upload failures surface errors to the user instead of silently falling back to local storage.
2. **Firebase Storage rules deployed**: `storage.rules` deployed to Firebase project `baseops-9f0e9` — allows read/write for authenticated users.
3. **Cross-device receipt deletion sync**: Fixed `ExpensesTab.jsx` `handleDeleteReceipt` to call `persistExpensesToFlight()` so deletions propagate to Firestore and sync across devices via `onSnapshot`.
4. **AI auto-fill loading indicator**: When uploading an invoice for AI parsing, a new expense row immediately appears with animated purple spinners in every field. The row populates with extracted data when parsing completes. Added `onProcessingStart` callback to `AIInvoiceUploader` and `animate-spin` CSS keyframes to `App.css`. Fixed missing `App.css` import that prevented animation from working.

## Pending Tasks
1. **Redo layout for schedules grid** (Not started — from previous handoff)
2. **Fleet view layout** (Not started — from previous handoff)

## Contextual Notes
- Firebase project: `baseops-9f0e9`, dev sandbox: `orgs/dev_sandbox`, production: `orgs/default`
- Storage rules: `allow read, write: if request.auth != null`
- `FileStorageService.js` now has a simplified API: `saveFile`, `saveReceipt`, `getFileUrl`, `getReceiptUrl`, `deleteFile`, `deleteReceipt` — all cloud-only, no local fallback parameters
- `AIInvoiceUploader` accepts `onProcessingStart` callback (called before AI parsing begins)
- `ExpensesTab` tracks `aiLoadingId` state to manage the spinner row lifecycle
- `ExpensesPage.jsx` was also updated to match the new `FileStorageService` API signatures (removed extra args from `getReceiptUrl`, `deleteReceipt` calls)

## Next Steps
Start on the schedules grid layout redo or fleet view layout — whichever the user requests.
