# IST TIMEZONE FIX REPORT
**YatraSaarthi Dead Reckoning & Inertial Navigation System**  
*Normalization and Standardized Display of All Dates and Times in India Standard Time (IST, Asia/Kolkata)*

---

## 1. Executive Summary & Root Cause

### 1.1 Root Cause
Prior to this fix, user-facing dates and times in YatraSaarthi were being formatted using browser-dependent methods such as:
```typescript
new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
new Date(dateStr).toLocaleDateString([], { ... })
new Date().toLocaleTimeString('en-US', { hour12: false })
```
Furthermore, date grouping ("Today", "Yesterday", "This week") calculated midnight boundaries using the client browser's local timezone:
```typescript
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
```

**Impact**:
- A user or device in another timezone (e.g. UTC, US/Pacific, or European time) saw dates and timestamps shifted by their local timezone offset rather than India Standard Time.
- A UTC timestamp at 19:00:00 UTC (00:30 IST the next day) was classified under the previous calendar day instead of "Today" in India.

---

## 2. Existing Timestamp Formats Discovered

Across the YatraSaarthi frontend and backend boundaries, the following timestamp formats were identified:

1. **Backend Database Sessions (`SessionSummary.start_time`, `end_time`)**:
   - ISO 8601 UTC strings: e.g. `'2026-09-23T10:00:00.000Z'`
   - SQLite `CURRENT_TIMESTAMP` strings: e.g. `'2026-09-23 10:00:00'` (UTC without explicit offset)
2. **Client Persisted Metadata (`TripMetadata.startedAt`, `endedAt`)**:
   - ISO strings generated on client: e.g. `'2026-09-23T11:45:00.000Z'`
3. **Telemetry & Sensor Streams (`sensorCollector`, `sensorClock`)**:
   - Epoch timestamps in seconds: e.g. `1790163900.25`
   - High-precision relative offsets for dead-reckoning mathematical durations
4. **Diagnostics & Timeline Events (`SensorDiagnostics`, `LearningInsights`)**:
   - Formatted 24-hour time strings: e.g. `'17:15:30'`

---

## 3. Centralized Formatter Architecture (`timeFormat.ts`)

A dedicated, centralized utility was created at `frontend/src/utils/timeFormat.ts` to manage all time conversion, parsing, and formatting:

- **Timezone**: `Asia/Kolkata`
- **Locale**: `en-IN`
- **Fixed Offset**: UTC+05:30 (`+19,800,000` ms)

### Key Utilities Provided:
1. `parseToDate(input)`:
   - Robustly parses ISO strings, SQLite UTC timestamps, epoch seconds, epoch milliseconds, and `Date` objects without double-offsetting.
2. `getISTDateBucket(input, nowReference?)`:
   - Computes calendar day index in IST (`Math.floor((timestamp + 19800000) / 86400000)`).
   - Classifies trips strictly by IST calendar day: `'Today' | 'Yesterday' | 'This week' | 'Earlier'`.
3. `formatISTTime(input, options?)`:
   - Formats 12-hour time in IST (e.g. `5:15 PM` or `12:15 AM`).
4. `formatISTTime24(input, options?)`:
   - Formats 24-hour time in IST (e.g. `17:15:30`) for telemetry and diagnostics.
5. `formatISTDate(input, style?)`:
   - Formats date in IST (`'23 Sep 2026'`, `'23/09/2026'`, `'Wed, 23 Sep 2026'`).
6. `formatTripDateTime(input, nowReference?)`:
   - Returns structured `{ relativeDate, timeStr, fullDate, monthDay, bucket }` object for Trips history.

---

## 4. Components & Pages Updated

| File | Changes Made |
|---|---|
| `src/utils/timeFormat.ts` `[NEW]` | Central IST formatter with `Asia/Kolkata` and `en-IN` binding |
| `src/tests/timeFormat.test.ts` `[NEW]` | Validation test suite for IST conversions, midnight rollovers, and epoch formats |
| `src/tests/runAllTests.ts` `[NEW]` | Master test runner executing time format and fixture tests |
| `src/pages/History.tsx` `[MODIFIED]` | Replaced local date formatting and grouping with `getISTDateBucket` and `formatTripDateTime` |
| `src/pages/SensorDiagnostics.tsx` `[MODIFIED]` | Timeline events use `formatISTTime24(new Date())` |
| `src/pages/LearningInsights.tsx` `[MODIFIED]` | Rolling velocity sample timestamps use `formatISTTime24(new Date())` |

---

## 5. Test Cases & Validation Results

The automated test suite (`frontend/src/tests/runAllTests.ts`) executed the following verification tests:

| Test Scenario | Input Timestamp | Expected IST Output | Result |
|---|---|---|---|
| **1. Standard UTC Timestamp** | `2026-09-23T11:45:00Z` | `5:15 PM IST`, `23 Sep 2026` | **PASS** |
| **2. Midnight Crossing UTC** | `2026-09-23T18:45:00Z` | `12:15 AM IST`, `24 Sep 2026` | **PASS** |
| **3. Date Grouping at Midnight (IST Day 24)** | `2026-09-23T19:00:00Z` (00:30 IST) | Classified as `'Today'` in IST | **PASS** |
| **4. Date Grouping Yesterday (IST Day 23)** | `2026-09-23T17:30:00Z` (23:00 IST) | Classified as `'Yesterday'` in IST | **PASS** |
| **5. Epoch Seconds Parsing** | `1790163900` | `5:15 PM IST` | **PASS** |
| **6. SQLite UTC String** | `2026-09-23 11:45:00` | `5:15 PM IST` | **PASS** |
| **7. Full Datetime Formatter** | `2026-09-23T11:45:00Z` | `Wed, 23 Sep, 2026, 5:15 PM` | **PASS** |
| **8. Fixture Scenarios (A, B, C, D, E)** | 5 fixture datasets | Correct ViewModels & honest fallbacks | **PASS** |

### Test Runner Output:
```text
====================================================
🚀 YATRA SAARTHI FRONTEND TEST SUITE EXECUTION
====================================================
--- 1. IST Timezone & Date Formatting Tests ---
🧪 Starting YatraSaarthi IST Time Format Validation Suite...
✅ Validation Complete: 12 passed, 0 failed.

--- 2. Trip Fixture & ViewModel Resolution Tests ---
====================================================
📊 FINAL TEST RESULTS SUMMARY:
Timezone Tests: 12 passed, 0 failed
Fixture Tests:  13 passed, 0 failed
====================================================
✅ ALL TEST SUITES PASSED SUCCESSFULLY!
```

---

## 6. Build & Lint Verification

- **Linter (`oxlint`)**:
  ```bash
  > npm run lint
  Found 25 warnings and 0 errors.
  Finished in 223ms on 79 files.
  ```
- **TypeScript & Vite Build**:
  ```bash
  > tsc -b && vite build
  vite v8.3.0 building client environment for production...
  ✓ 1952 modules transformed.
  dist/index.html                                 1.41 kB │ gzip:   0.64 kB
  dist/assets/index-XmwxO0Lr.css                125.93 kB │ gzip:  18.81 kB
  dist/assets/index-eBriaUXD.js               2,384.81 kB │ gzip: 658.63 kB
  ✓ built in 1.13s
  ```

---

## 7. Backend Freeze & Contract Integrity

Verification command:
```bash
git diff HEAD -- backend/
```
**Output**: Empty (0 lines changed).

- Backend files modified: `0`
- API routes modified: `0`
- WebSocket contracts modified: `0`
- Database schema modified: `0`
- Core algorithms (InEKF, NHC, ZUPT, Heading, MapMatcher, Outage Manager): `0`
