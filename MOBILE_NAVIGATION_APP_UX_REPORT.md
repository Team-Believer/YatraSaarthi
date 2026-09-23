# Mobile Navigation App UX Rework Report: YatraSaarthi

**Date:** 2026-09-24  
**Scope:** Frontend Only (100% Backend & API Freeze Maintained)  
**Target:** Reworking `/app` and `/app/map` from a compressed desktop dashboard into a genuine, polished smartphone navigation application.

---

## 1. Old UX Problems (Visual Reference Analysis)
- **Top Header Overcrowding:** Large desktop brand logo and a prominent "Sign in" button competed directly with navigation controls, overwhelming the top safe-area and search bar.
- **Search Bar Overlap:** The search bar was positioned awkwardly close to or overlapping the header bar.
- **Oversized "Recenter" Pill:** A large dark pill displaying `[ ⌾ Recenter ]` took up dominant map space and permanently obstructed road network views.
- **Right Control Group Clutter:** A 6-to-7 button stack (Zoom In, Zoom Out, Orientation, 3D, Style layers, Recenter) formed a heavy vertical column.
- **Cramped Navigation HUD:** The bottom driver HUD suffered from aggressive truncation (displaying `"V..."` instead of `"Vastral, Ahmedabad"`) and a squeezed "Start navigation" button caused by an unnecessary duplicate recenter button inside the HUD row.
- **Bottom Navigation Toolbar:** Felt like a generic desktop website toolbar with heavy active pills instead of a standard mobile tab bar (`Home`, `Navigate`, `Trips`, `Saved`, `More`).

---

## 2. New Mobile Shell & Visual Hierarchy
The map is restored as the **primary background element (100vw × 100dvh)**. All UI components operate strictly as lightweight, floating overlays:
1. **Map canvas** (Primary backdrop)
2. **Search bar / Destination context** (Floating top overlay)
3. **Navigation HUD / Active Maneuver** (Floating bottom card)
4. **Map Controls** (Compact right vertical stack, max 4 items)
5. **Bottom Navigation Bar** (Fixed bottom tab bar, 64-72px + safe-area)

---

## 3. Top Header Rework
- **Layout:** Compact floating header (`h-[48px]`, `px-3`) with translucent blur (`bg-white/95 backdrop-blur-md`).
- **Structure:**
  ```
  ┌──────────────────────────────────┐
  │ ☰   YatraSaarthi          ⋮     │
  │     INTELLIGENT NAVIGATION      │
  └──────────────────────────────────┘
  ```
- **Left:** Compact `Menu` icon button (40×40px touch target) opening the navigation drawer.
- **Center:** Crisp Poppins `YatraSaarthi` title + uppercase Manrope `INTELLIGENT NAVIGATION` subtitle.
- **Right:** `MoreHorizontal` (⋯ / ⋮) trigger opening full secondary options & drawer.
- **Sign In Moved:** Sign In / Account removed from driving header and consolidated into the More drawer / profile menu.

---

## 4. Search Bar
- **Positioning:** Sits cleanly below the header with a dedicated gap (`top-[calc(env(safe-area-inset-top)+64px)]`).
- **Dimensions:** Height 52px, rounded-full / 16px radius, white surface, subtle floating shadow (`shadow-nav-floating`).
- **Icon & Copy:** Lucide `Search` icon, clear placeholder `"Where to?"`.
- **Clean Focus State:** Focused search suggestions drop down as an overlay without replacing the underlying map.

---

## 5. Map Controls & Recenter
- **Streamlined Stack (Max 4 controls):**
  1. **Locate / Recenter:** Compact circular floating button (44×44px, white surface, Evergreen `#083335` `LocateFixed` icon, active focus ring when camera is uncentered).
  2. **Zoom In (`+`):** 44×44px white button.
  3. **Zoom Out (`-`):** 44×44px white button.
  4. **Layers:** 44×44px toggle opening style picker.
- **Eliminated:** Giant text pills and 6-7 button vertical towers.

---

## 6. Bottom Navigation HUD
- **Design:** Compact floating card (`rounded-2xl`, `p-3`, `shadow-nav-floating`).
- **Position:** `bottom-[calc(68px+env(safe-area-inset-bottom)+10px)]` guaranteeing zero overlap with bottom nav.
- **Content:**
  - **Speed Display:** Large Poppins speed number + Manrope `km/h` unit.
  - **Location Name:** Full `Vastral, Ahmedabad` without `"V..."` truncation.
  - **Active State GNSS/DR Status:** Small clear semantic badge (`● GNSS signal`, `● Dead reckoning · 00:18`, `● GNSS degraded`, `● GNSS recovering`).
  - **Start Navigation CTA:** Evergreen `#083335` button with white text and `rotate-45` `Navigation2` (`↗`) icon.

---

## 7. Mobile Bottom Navigation Bar
- **Tabs (5 items):**
  1. `Home` (`LayoutGrid`)
  2. `Navigate` (`Navigation2`)
  3. `Trips` (`History`)
  4. `Saved` (`Bookmark`)
  5. `More` (`MoreHorizontal`)
- **Active State:** Quiet Evergreen `#083335` icon & label, no oversized dark pills.
- **Touch Targets:** Minimum 44×44px per tab, distributed evenly across viewport width.

---

## 8. Route Preview Sheet
- Bottom sheet layout with `max-h-[75dvh]` internal smooth scrolling.
- Mobile drag handle indicator on top.
- Clear route summary, travel modes (`driving`, `motorcycle`, `cycling`, `walking`), route alternatives, and prominent `[ ↗ Start navigation ]` CTA.

---

## 9. Safe-Area Handling & Responsive Tests
- Uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for all overlays.
- **Portrait Tested:** 360×800, 390×844, 412×915 — All overlays remain legible with zero overlapping elements.
- **Landscape Tested:** 844×390, 915×412 — Header and HUD compress gracefully to maximize map visibility.

---

## 10. Typography & Evergreen Branding
- **Poppins:** Headings, speed numbers, brand title, destination names.
- **Manrope:** Body text, navigation labels, button text, GNSS status chips, units (`km/h`).
- **Primary Color:** Evergreen `#083335` (`rgb(8, 51, 53)`).
- **Semantic Colors:** Green for GNSS healthy, Amber for DR / degraded, Cyan for GNSS recovering, Rose for connection loss / end session.

---

## 11. Files Changed
- [`frontend/src/components/layout/AppLayout.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/layout/AppLayout.tsx)
- [`frontend/src/components/layout/MobileBottomNav.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/layout/MobileBottomNav.tsx)
- [`frontend/src/components/map/MapControls.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/map/MapControls.tsx)
- [`frontend/src/components/map/DestinationSearch.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/map/DestinationSearch.tsx)
- [`frontend/src/components/navigation/TripHudCard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/navigation/TripHudCard.tsx)
- [`frontend/src/components/navigation/RoutePreviewCard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/navigation/RoutePreviewCard.tsx)
- [`frontend/src/pages/LiveMap.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/LiveMap.tsx)
- [`frontend/src/pages/Dashboard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/Dashboard.tsx)
- [`frontend/src/pages/TunnelMode.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/TunnelMode.tsx)

---

## 12. Build, Lint & Automated Test Verification
- `npm run build`: **PASS** (Vite v8.3.0 production bundle compiled successfully in <1s)
- `npm run lint`: **PASS** (0 errors across 80 files)
- `npx tsx src/tests/runAllTests.ts`: **PASS** (25/25 automated tests passed)

---

## 13. Backend Freeze & API Integrity Verification
- `git diff HEAD -- backend/`: **0 lines changed (100% frozen)**
- API endpoints, WebSocket contracts, InEKF fusion algorithms, and backend navigation logic remained completely untouched.
