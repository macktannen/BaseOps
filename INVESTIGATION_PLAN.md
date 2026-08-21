# Investigation Plan: Aircraft Flight Hours Mismatch Between Fleet Page and Fleet Usage Dashboard

## Problem Summary
When a flight log is unsigned and re-signed, aircraft totals don't match between:
- **Fleet page** (AircraftList.tsx): Shows `aircraft.totalHours` — a manually maintained field on the aircraft object
- **Fleet Usage Dashboard** (AircraftUsageDashboard.tsx): Uses `computeAircraftUsage()` which calculates totals dynamically from flight logs

The requirement: **Aircraft totals should only use data from signed flight logs.**

---

## Root Cause Analysis

### Two Different Data Sources
| View | Data Source | Update Mechanism |
|------|-------------|------------------|
| Fleet Page | `aircraft.totalHours` (stored on aircraft object) | Updated atomically when flight is signed/unsigned via `handleSign`/`handleClearSignature` |
| Dashboard | `computeAircraftUsage(flights, aircraft, ...)` | Computed on-the-fly from flight logs; filters via `isCompletedFlight()` |

### `isCompletedFlight()` Logic (aircraftUsage.ts:76-82)
```typescript
const isCompletedFlight = (flight: Flight): boolean => {
  const status = normalizeStatus(flight.status);
  if (status === 'completed') return true;
  const log = flight.flightLog as FlightLog | undefined;
  if (log?.signature) return true;
  return false;
};
```
A flight counts if: **status === 'completed' OR flightLog.signature exists**

### Sign/Unsign Flow (EventModal.tsx)
| Action | Aircraft Totals | Flight Status | FlightLog.signature |
|--------|-----------------|---------------|---------------------|
| **Sign** | Add flight hours to aircraft | 'completed' | Set (with snapshot) |
| **Clear Signature** | Revert to snapshot ("before" values) | 'confirmed' | Set to null |
| **Re-sign** | Add flight hours again | 'completed' | Set (new snapshot) |

### Potential Failure Modes
1. **Non-atomic updates**: Aircraft and flight updates are separate Firestore writes (no transaction)
2. **Status/signature drift**: `persistFlightLogToFlight` (line 1058) has complex logic that may leave `status === 'completed'` while `signature === null`
3. **Stale snapshots**: `aircraftTotals` snapshot in flightLog may not reflect manual aircraft edits
4. **Double-count on re-sign**: If revert on clear-signature fails, re-sign adds hours twice
5. **Dashboard includes unsigned flights**: If flight.status stays 'completed' after clear-signature, `isCompletedFlight` still counts it

---

## Investigation Steps

### 1. Verify `isCompletedFlight` Correctly Excludes Unsigned Flights
**Agent:** frontend-developer  
**Dependencies:** None  
**Key Files:** `src/services/aircraftUsage.ts` (lines 76-82), `src/services/aircraftUsage.test.ts` (lines 175-183)  
**Tasks:**
- Add test case: flight with `status: 'completed'` but `flightLog.signature: null` → should be excluded
- Add test case: flight with `status: 'confirmed'` and `flightLog.signature: { ... }` → should be included
- Verify current test at line 175-183 only tests `signature: 'signed'` (string) not proper signature object

### 2. Audit Sign/Clear-Signature Atomicity
**Agent:** frontend-developer  
**Dependencies:** Step 1  
**Key Files:** `src/components/EventModal.tsx` (lines 880-1000, 1042-1065)  
**Tasks:**
- Trace `handleSign`: Does `performSave` write aircraft AND flight in same batch? (line 933)
- Trace `handleClearSignature`: Does revert + flight update happen atomically? (line 995)
- Check `performSave` implementation for batch/transaction usage
- Verify `suppressSyncRef` guard prevents race conditions during sync

### 3. Check `persistFlightLogToFlight` Status Logic
**Agent:** frontend-developer  
**Dependencies:** Step 2  
**Key Files:** `src/components/EventModal.tsx` (lines 1042-1065)  
**Tasks:**
- Analyze line 1058: `status: isSigned ? 'completed' : ((existingFlight?.status === 'completed') ? 'confirmed' : (existingFlight?.status || 'confirmed'))`
- Scenario: Flight was 'completed' → unsigned → status becomes 'confirmed' ✓
- Scenario: Flight was 'on hold' → signed → unsigned → status becomes 'on hold' (not 'confirmed') → `isCompletedFlight` returns false ✓
- **Bug risk**: If `existingFlight` is undefined, falls back to `'confirmed'` — but what if flight was never in userFlights?

### 4. Verify Aircraft Totals Revert Correctly on Clear-Signature
**Agent:** frontend-developer  
**Dependencies:** Step 2  
**Key Files:** `src/components/EventModal.tsx` (lines 940-976), `src/components/FlightLogTab.tsx` (lines 184-226)  
**Tasks:**
- Check `flightBefore` calculation in FlightLogTab (lines 186-190): Uses snapshot if exists, else infers from current aircraft minus change
- **Critical**: If aircraft was manually edited after sign, `flightBefore` infers wrong baseline → revert sets wrong value
- Verify `aircraftTotals` snapshot is captured at sign time (line 230-246) and stored in flightLog

### 5. Test Dashboard vs Fleet Page with Sign/Unsign/Re-sign Cycle
**Agent:** qa-engineer  
**Dependencies:** Steps 1-4  
**Key Files:** `src/components/AircraftUsageDashboard.tsx`, `src/components/AircraftList.tsx`  
**Tasks:**
- Create test scenario: Aircraft at 100 hrs → Sign 2hr flight → Unsign → Re-sign
- Expected: Fleet page = 102, Dashboard = 102
- Check for divergence at each step
- Test with period selector (All Time vs Month vs Custom)

### 6. Check Firestore Sync Consistency
**Agent:** backend-developer  
**Dependencies:** Step 2  
**Key Files:** `src/contexts/DataProvider.tsx` (lines 244-305, 325-347), `src/firebase.ts`  
**Tasks:**
- Verify `saveFlight` and `updateData('userAircraft', ...)` use same batch/transaction
- Check if `onSnapshot` listeners for flights and aircraft can deliver stale intermediate states
- Review offline queue behavior (mentioned in AGENTS.md) — could cause delayed sync

### 7. Audit Manual Aircraft Edits Impact
**Agent:** frontend-developer  
**Dependencies:** Step 4  
**Key Files:** `src/components/AircraftList.tsx` (lines 163-225), `src/components/EventModal.tsx` (lines 1616-1650)  
**Tasks:**
- When user manually edits `totalHours` on Fleet page, does it invalidate existing flightLog snapshots?
- Check `handleSave` in AircraftList (line 163) — updates aircraft but doesn't touch flightLogs
- EventModal line 1621-1650: Aircraft change on signed flight — shows warning but allows with un-sign workflow

### 8. Add Integration Test for Sign/Unsign/Re-sign Cycle
**Agent:** qa-engineer  
**Dependencies:** Steps 1, 5  
**Key Files:** `src/services/aircraftUsage.test.ts`, new test file for EventModal  
**Tasks:**
- Unit test: `computeAircraftUsage` with flight that was signed → unsigned → re-signed
- Integration test: Full sign → clear → sign flow with mocked Firestore
- Verify fleet totalHours matches dashboard totalHours at each step

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Non-atomic Firestore writes cause temporary divergence | High | Medium | Add transaction/batch; verify suppressSyncRef works |
| `isCompletedFlight` includes flights with status='completed' but no signature | Medium | High | Fix logic to require signature; add tests |
| Manual aircraft edits break snapshot-based revert | Medium | High | Invalidate snapshots on manual edit; or recompute from flight logs |
| Dashboard period filter excludes re-signed flight due to date bounds | Low | Medium | Verify date bounds use flight.date not signature timestamp |

---

## Recommended Fix Priority

1. **P0**: Fix `isCompletedFlight` to require `flightLog.signature` (not just status)
2. **P0**: Ensure sign/clear-signature uses Firestore batch for atomicity
3. **P1**: Fix `persistFlightLogToFlight` status logic to always sync with signature state
4. **P1**: Add validation: manual aircraft edit warns if signed flights exist
5. **P2**: Consider migrating Fleet page to use computed totals (single source of truth)

---

## Next Steps After Investigation

1. Implement fixes in order of priority
2. Add regression tests for sign/unsign/re-sign cycle
3. Verify with QA on staging
4. Deploy with feature flag if needed