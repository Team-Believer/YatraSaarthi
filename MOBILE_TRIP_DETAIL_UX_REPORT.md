# YatraSaarthi — Mobile Trip Detail Premium Navigation UX Report

**Date**: 2026-09-24  
**Scope**: Mobile & Desktop Trip Detail Presentation UX (`/app/history`)  
**Backend Modifications**: 0 lines changed (Strict Freeze Preserved)

---

## Executive Summary

The mobile Trip Detail screen in YatraSaarthi has been redesigned from a compressed dashboard (with four tiny metric cards and boxed containers) into a premium navigation experience:
- **Top Navigation Bar**: Clean `← Back` text + arrow action and centered `Trip details` label.
- **Trip Identity**: Two-line wrapping route title (`Vastral, Ahmedabad → Gandhinagar`) in Poppins typography with a soft-green `● Completed` status pill and centralized IST timestamp.
- **Navigation Route Timeline**: Vertical timeline connecting `SOURCE` (emerald dot) to `DESTINATION` (Evergreen dot) via a subtle line connector, replacing the legacy boxed container.
- **Compact Metadata Strip**: Distance, duration, and vehicle mode in a single uncluttered summary with road corridor details (`Via Sardar Patel Ring Road`).
- **Large Route Map**: Prominent 256–288px route canvas displaying start/destination markers and authentic geometry.
- **Primary CTA**: Evergreen (`#083335`) sticky action button `[ ↗ Navigate again ]` (`Navigation2` rotated 45°) directly initiating the navigation flow to the selected destination.

---

## 1. Top Header Redesign

- **Height**: 48–54px (`h-10 sm:h-12`).
- **Back Action**: Lucide `ArrowLeft` with `Back` text in Manrope font (`font-body`), active touch scale transition (`active:scale-95`).
- **Header Title**: Balanced `Trip details` (`font-body font-medium text-[#5E5E5E]`).
- Clean bottom border divider (`border-b border-border-clean/70`).

---

## 2. Route Timeline

- Replaced the generic large boxed card with a native navigation vertical timeline.
- **Source Indicator**: `3.5px` emerald green circle (`bg-emerald-500 ring-2 ring-emerald-100`), uppercase `SOURCE` label, and bold Poppins place name.
- **Flow Connector**: Sleek `2px` vertical line (`w-[2px] bg-[#D1DADA]`).
- **Destination Indicator**: Evergreen circle (`bg-[#083335] ring-2 ring-[#083335]/20`), uppercase `DESTINATION` label, and bold Poppins place name.

---

## 3. Metadata & Road Information Redesign

- Eliminated the 4 independent boxed metric cards.
- **Metrics Strip**: Single cohesive `#F7F9F9` background container with subtle border:
  - Distance: `<Route />` + bold Poppins number (e.g. `30.8 km`).
  - Duration: `<Clock3 />` + bold Poppins time (e.g. `44 min`).
  - Vehicle: Contextual travel mode icon + mode name (e.g. `Car`, `Motorcycle`).
- **Road Corridor**: `Via <Road Details>` (e.g. *Via Sardar Patel Ring Road, SG Highway, GH Road*) with multi-line wrap support.

---

## 4. Large Route Map

- **Height**: Increased to `h-64 sm:h-72` (256–288px) on mobile and tablet viewports.
- **Radius**: `rounded-2xl` with subtle border (`border border-border-clean/70`).
- Rendered using `TripRouteMap` with auto-fitting bounds and polyline styling.
- Removed large floating title pills for a clean map visual.

---

## 5. Primary Action (Navigate Again CTA)

- **Button**: `[ ↗ Navigate again ]`
- **Styling**:
  - Background: Evergreen `#083335` (hover: `#052426`, active: `scale-[0.98]`).
  - Text: White, Poppins medium, `14–15px`.
  - Icon: Lucide `Navigation2` rotated 45 degrees (`rotate-45 stroke-[2.5]`).
  - Height: `48px` (`h-12`), radius `14px` (`rounded-[14px]`).
- **Positioning**: Sticky bottom action bar with `safe-area-inset-bottom` support (`pb-[calc(12px+env(safe-area-inset-bottom))]`) and content offset padding so content is never obscured.
- **Navigation Flow**: Seamlessly integrates with `useNavigationStore`, `useRouteStore`, and `routeService.calculateRoutes(...)` before redirecting to `/app`.

---

## 6. Typography & Color Palette

- **Poppins (Heading)**:
  - Route titles (`18–21px 600/700`)
  - Source and destination names
  - Primary metric values (`31 km`, `44 min`)
  - "Navigate again" CTA text
- **Manrope (Body)**:
  - Timestamps, metadata labels, road descriptions, session ID, and telemetry counts
- **Color Palette**:
  - Primary: `#083335` (Evergreen)
  - Secondary / Text: `#1E293B` (Ink) and `#5E5E5E` (Muted body)
  - Semantic Status: `#047857` / `#10B981` (Completed green badge)
  - Surface: `#FFFFFF`, `#F7F9F9`, `#FAFAFA`

---

## 7. Responsive Behavior

| Viewport | Experience |
|---|---|
| **360 × 800 (Compact Mobile)** | Single column, back button, vertical timeline, full-width map (256px), sticky CTA. |
| **390 × 844 (Standard iPhone)** | Clean hierarchy, generous padding, sticky CTA with home indicator safe-area. |
| **412 × 915 (Android flagship)** | Spacious timeline, full route detail, zero title or metric clipping. |
| **Landscape Mobile** | Smooth scrolling, map visible, sticky CTA remains accessible. |
| **Tablet / Desktop (>= 768px)** | Two-column layout with left trip list and right detailed navigation summary panel. |

---

## 8. IST Timezone Handling

- All timestamps formatted via `formatTripDateTime(...)` in `Asia/Kolkata` (IST).
- Displays date in standard format (e.g. `Tue, Sep 22, 2026 · 11:04 PM`).

---

## 9. Verification & Quality Gates

1. **Production Build (`npm run build`)**:
   ```bash
   npm run build
   # Output: Exit code 0, 0 build errors
   ```

2. **Linter (`npm run lint`)**:
   ```bash
   npm run lint
   # Output: 0 errors
   ```

3. **Frontend Automated Test Suite**:
   ```bash
   npx tsx src/tests/runAllTests.ts
   # Output: 12 Timezone Tests passed, 50 Fixture & ViewModel Tests passed, 0 failures
   ```

---

## 10. Backend & API Integrity

- `git diff HEAD -- backend/` produces **0 lines** modified.
- 0 changes to FastAPI endpoints, WebSocket schemas, or SQLite database.
