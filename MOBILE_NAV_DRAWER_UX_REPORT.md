# Mobile Navigation Drawer UX Rework Report

**Date:** 2026-09-24  
**Scope:** Frontend Only (100% Backend & API Freeze Maintained)  
**Target:** Reworking the mobile off-canvas navigation drawer into a sleek, compact, navigation-first drawer.

---

## 1. Drawer Width & Proportions
- **Width:** Scaled down from the previous viewport-dominating layout to `w-[84vw] sm:w-[86vw] max-w-[320px] md:max-w-[340px]`.
- **Backdrop Overlay:** Changed from heavy black to a subtle translucent dark teal `bg-[#083335]/20 backdrop-blur-2xs` (matching `rgba(8, 51, 53, 0.18)`), leaving the underlying map visible and dimmed.
- **Dismissal:** Tapping the backdrop or pressing `Escape` immediately closes the drawer.

---

## 2. Compact Header Redesign
- **Height:** Reduced to a compact `58–62px` (`h-15`).
- **Brand Structure:**
  - Left: Real `YatraSaarthiLogo` with `variant="header"` (crisp mark ~28px + Poppins `YatraSaarthi` title + uppercase Manrope `INTELLIGENT NAVIGATION` subtitle).
  - Right: Accessible circular close button (`X` icon, touch target `44×44px`, `aria-label="Close navigation menu"`).

---

## 3. Navigation Item Clean-up
- **Removed Visual Clutter:**
  - Eliminated redundant subtitles (`"Overview"`, `"Live navigation"`, `"Trip history"`, etc.) that made the drawer look like a desktop settings table.
  - Eliminated chevron indicators (`ChevronRight`) for direct single-tap page links.
- **Single-Line Layout:**
  - `[icon] Label`
  - Height: `46–48px` (`h-11 sm:h-12`).
  - Gap: `gap-1` between items.
  - Typography: Manrope font-body `text-[14px] font-medium`.
- **Navigation Items Included:**
  1. `Dashboard` (`/app`) → `LayoutGrid`
  2. `Navigation` (`/app/map`) → `Navigation2`
  3. `Trips` (`/app/history`) → `History`
  4. `Saved Routes` (`/app/memory`) → `Bookmark`
  5. `Navigation Intelligence` (`/app/learning`) → `BrainCircuit`
  6. `Diagnostics` (`/app/diagnostics`) → `Activity`

---

## 4. Active Item State
- **Background:** Evergreen `#083335`.
- **Corner Radius:** `rounded-xl` (12px).
- **Text & Icon:** Crisp white (`text-white`) with subtle shadow (`shadow-2xs`).
- **Inactive Items:** `text-slate-800 hover:text-[#083335] hover:bg-slate-100/80` with muted blue-gray icons (`text-[#4A6364]`).

---

## 5. System Section
- Section header: `SYSTEM` in Poppins `text-[10.5px] font-bold uppercase tracking-wider text-[#8CA5A6]`.
- Items:
  1. `Settings` (`/app/settings`) → `Settings`
  2. `Profile` (`/app/profile`) → `UserRound`
- Follows the same clean single-line structure without verbose subtitles.

---

## 6. Bottom Navigation Engine Status Redesign
- Replaced the previous large dashboard block with a compact status strip (`52–58px` height):
  - Left: Pulsing status indicator dot + `Navigation active` / `Navigation ready` text in Poppins.
  - Right: `LIVE` / `READY` status badge.
  - Subtitle: Real engine status (`"InEKF dead reckoning tracking"` or `"InEKF invariant filter standby"`).
- Connects directly to `useNavigationStore` for live/standby state.

---

## 7. Animation & Transitions
- Drawer slide-in from left: `duration-200 ease-out`.
- Backdrop fade-in: `duration-200 ease-out`.
- Fast, non-springy, responsive motion.

---

## 8. Responsive Behavior & Testing
- **360 × 800 (Compact Phone):** Drawer occupies `84vw` (max 302px), map stays visible on right.
- **390 × 844 (Standard Phone):** Ample room, safe-area awareness.
- **412 × 915 (Large Phone):** Capped at 320px width.
- **768 × 1024 (Tablet):** Drawer capped at 320–340px; desktop continues to use the narrow floating navigation rail.

---

## 9. Accessibility
- Touch targets: Minimum `44×44px`.
- Interactive labels: `aria-label="Close navigation menu"`, `aria-label="Open navigation menu"`.
- ARIA active state: `aria-current="page"` on the active route link.
- Keyboard support: Closes on `Escape` key.

---

## 10. Files Changed
- [`frontend/src/components/layout/Sidebar.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/layout/Sidebar.tsx)
- [`frontend/src/components/layout/AppLayout.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/layout/AppLayout.tsx)

---

## 11. Verification & Quality Gates
- `npm run build`: **PASS** (Compiled client bundle in 719ms)
- `npm run lint`: **PASS** (0 errors)
- `npx tsx src/tests/runAllTests.ts`: **PASS** (25/25 automated unit tests passed)
- **Backend Freeze Integrity:** `git diff HEAD -- backend/` is **100% clean (0 lines modified)**.
