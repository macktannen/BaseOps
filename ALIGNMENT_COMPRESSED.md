# ALIGNMENT_COMPRESSED.md

## Project Stack & State
- **Tech**: React (Hooks), Vite, lucide-react, localforage (IndexedDB), Node.js 20 (Windows), plain CSS.
- **Active Paths**:
  - `src/components/ExpensesTab.jsx`
  - `src/components/SettingsView.jsx`
  - `src/services/FileStorageService.js`
  - `implementation_plan.md` (artifact)
- **Runtime**: Vite dev server (`npm run dev`) active on `http://localhost:5173`.
- **Data**: Receipts persisted in browser IndexedDB via `localforage`; no external storage.

## Core Requirements & Constraints
- UI must highlight receipt status: **red** (no receipt) / **blue** (has receipt) with badge count.
- Delete button must remove file from IndexedDB, update expense state atomically, refresh viewer, and close if empty.
- No demo‑receipt placeholder – removed.
- Development reminder under Settings → Development tab to strip `localforage` before production.
- All changes stay within the project folder; no external services.

## Decisions Made
- Chose **IndexedDB (`localforage`)** for local testing file storage.
- Consolidated state updates for upload & delete via single `setExpenses` call.
- Added `FileStorageService` abstraction (save/get/delete).
- Updated `ExpensesTab.jsx` click handler to consider `hasReceipt` / `receiptFiles` length.
- Implemented UI refresh after delete (`setLoadedReceipts`, close viewer when empty).
- Removed demo‑receipt UI and related `useEffect` branch.
- Added **Development** tab in `SettingsView.jsx` with a permanent warning.
- Planned Docker containerization (Dockerfile, compose, scripts) – pending.

## Current Backlog / Next Steps
- Create `Dockerfile` (multi‑stage: build Vite, serve via nginx or node).
- Add optional `docker-compose.yml` with bind‑mount for hot‑reload.
- Add `.dockerignore` (exclude node_modules, dist, .git, etc.).
- Extend `package.json` with `docker:dev` and `docker:prod` scripts.
- Update `README.md` with Docker usage instructions.
- Verify Docker build runs and UI functions identically.

## Key Code Reference
```js
// ExpensesTab.jsx – receipt handling core
const [uploadingExpId, setUploadingExpId] = useState(null);
const [viewingExpId, setViewingExpId] = useState(null);
const [loadedReceipts, setLoadedReceipts] = useState([]);

useEffect(() => {
  if (viewingExpId && viewingExpId !== 'demo') {
    const exp = expenses.find(e => e.id === viewingExpId);
    if (exp?.receiptFiles) {
      Promise.all(exp.receiptFiles.map(async f => {
        if (f.url) return f;
        const data = await FileStorageService.getFile(f.fileId);
        return data?.blob ? { ...f, url: URL.createObjectURL(data.blob) } : f;
      })).then(setLoadedReceipts);
    } else setLoadedReceipts([]);
  }
}, [viewingExpId, expenses]);

const handleDeleteReceipt = async (expId, idx) => {
  const exp = expenses.find(e => e.id === expId);
  const files = exp?.receiptFiles || [];
  const toDel = files[idx];
  if (toDel?.fileId) await FileStorageService.deleteFile(toDel.fileId);
  const newFiles = files.filter((_, i) => i !== idx);
  setExpenses(prev => prev.map(e => e.id === expId ? { ...e, receiptFiles: newFiles, receiptCount: newFiles.length, hasReceipt: newFiles.length > 0 } : e));
  if (viewingExpId === expId) {
    setLoadedReceipts(prev => prev.filter((_, i) => i !== idx));
    if (newFiles.length === 0) setViewingExpId(null);
  }
};
```
