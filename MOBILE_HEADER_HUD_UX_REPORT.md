# Mobile Header & Navigation HUD Upgrade Report

**Date:** 2026-09-24  
**Scope:** Frontend Only (100% Backend & API Freeze Maintained)  
**Target:** Upgrading the Mobile Top Header and Bottom Navigation HUD into a native smartphone navigation experience.

---

## 1. Mobile Top Header Redesign
- **Structure:** Clean floating header card positioned over the map (`h-[54px]`, `px-2.5`, `rounded-2xl`, `bg-white/96 backdrop-blur-md border border-border-clean shadow-nav-floating`).
- **Layout:**
  - **Left (z-10):** Accessible circular hamburger button (`Menu`, `44×44px` touch target in Evergreen `#083335`).
  - **Center:** Absolute centered brand container (`absolute inset-0 flex items-center justify-center`).
  - **No Right Utility Button:** Removed completely without leaving empty or unbalanced reserved space.

---

## 2. Logo Treatment & Visual Balance
- **Asset Used:** Authentic existing mark [`frontend/src/assets/yatrasaarthi-logo.png`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/assets/yatrasaarthi-logo.png).
- **Proportions:**
  - Mark size: `26px` with natural aspect ratio.
  - Brand name: Poppins 600 `text-[13.5px] sm:text-[14px]` in Evergreen `#083335`.
  - Subtitle: Manrope `text-[8.5px] sm:text-[9px]` uppercase tracking-wider `INTELLIGENT NAVIGATION` in `#4A6364`.
- **Centering:** Mathematically centered over the entire header card width, preventing off-center drift across all viewports (`360px`, `390px`, `412px`).

---

## 3. Navigation HUD Redesign (Driving Control Dock)
- **Container:** Compact floating card (`h-[64–72px]`, `rounded-[18px]`, `bg-white/97 backdrop-blur-md border border-border-clean shadow-nav-floating`).
- **Speed Display:**
  - Speed number: Poppins font-heading `22–26px` in Evergreen `#083335`.
  - Unit: Manrope `11–12px` in `#8CA5A6` lowercase `km/h`.
- **Current Location / Route:**
  - `MapPin` icon (14px) + `Vastral, Ahmedabad` text in Manrope 500 (`text-slate-800`).
  - Natural single-line flow with non-aggressive ellipsis.
- **Start Navigation CTA:**
  - Prominent Evergreen `#083335` button with white text.
  - Height: `44px`, corner radius `12–14px`, horizontal padding `14–18px`.
  - Lucide `Navigation2` icon rotated 45° clockwise (`↗`).
  - Text: `"Start navigation"` in Manrope 600.
- **Telemetry Minimalism:** No engineering telemetry (E5, U2, InEKF equations) on the driver screen; clean semantic badges (`● GNSS signal`, `● Dead reckoning · 00:18`, `● GNSS degraded`, `● GNSS recovering`) are shown only when active.

---

## 4. Mobile Bottom Navigation Redesign
- **Container:** Clean dock bar fixed to viewport bottom (`h-[66px] + env(safe-area-inset-bottom)`, `bg-white/98 backdrop-blur-md`, subtle top border).
- **4 Equal Columns (`grid grid-cols-4`):**
  1. `Home` (`LayoutGrid`, `/app`)
  2. `Navigate` (`Navigation2`, `/app/map`)
  3. `Trips` (`History`, `/app/history`)
  4. `Saved` (`Bookmark`, `/app/memory`)
- **Active State:** Quiet Evergreen `#083335` top indicator pill and label.
- **Touch Targets:** Minimum `44×44px` per tab.

---

## 5. Layering & z-Index Relationship
- **Map Canvas:** Full-bleed background (`100vw × 100dvh`, z-0).
- **Navigation HUD:** Floating dock strictly positioned above bottom nav:
  `bottom: calc(68px + env(safe-area-inset-bottom) + 10px)` (z-30).
- **Bottom Navigation Tab Bar:** Fixed bottom dock (`bottom: 0`, z-40).
- **Top Search Overlay:** Sits with a clean gap below the header (`top: calc(env(safe-area-inset-top) + 68px)`, z-20).
- **Route Preview Sheet:** When active, HUD hides/adapts cleanly so only the Route sheet with its Start Navigation button is displayed above bottom nav.

---

## 6. Safe-Area Handling & Responsiveness
- All overlays utilize CSS `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **Portrait Tests (360×800, 390×844, 412×915):** Logo stays centered, search never collides with header, HUD stays above bottom nav, 4-tab bar is balanced.
- **Landscape Tests (844×390, 915×412):** Header and HUD compress cleanly to maximize map visibility.

---

## 7. Typography & Evergreen Branding
- **Poppins (Headings & Speed):** Brand title, speed number (`0`).
- **Manrope (Body, Units, Buttons):** Speed unit (`km/h`), location name, tab labels, CTA button (`Start navigation`).
- **Primary Color:** Evergreen `#083335` (`rgb(8, 51, 53)`).
- **Semantic Status Colors:** Green for GNSS healthy, Amber for DR, Cyan for recovery, Rose for session end.

---

## 8. Verification & Quality Gates
- `npm run build`: **PASS** (Zero errors, client bundle compiled in 694ms)
- `npm run lint`: **PASS** (0 errors across 83 files)
- `npx tsx src/tests/runAllTests.ts`: **PASS** (25/25 automated unit tests passed)
- **Backend Freeze Integrity:** `git diff HEAD -- backend/` is **100% clean (0 lines modified)**.
