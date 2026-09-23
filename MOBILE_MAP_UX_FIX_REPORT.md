# YatraSaarthi — Mobile Map UI/UX Complete Rework Report

**Date:** September 24, 2026  
**Status:** Completed & Validated  
**Scope:** Frontend Only (Zero Backend / API / WebSocket Modifications)  

---

## 1. Problems Found & Addressed

1. **Document Flow vs. Fullscreen Overlays**: Previous layout pushed the map canvas down beneath a standard flexbox header, breaking true 100% viewport coverage and causing unwanted document scrolling.
2. **Top Header & Search Collisions**: Hamburger menu, logo, and search input were jammed together at the top of the screen with visual overlap and broken touch targets.
3. **Bottom Navigation & Driver HUD Overlap**: The Bottom Navigation HUD was anchored directly to the screen bottom or overlapping the mobile bottom tab bar, causing clipped actions and unusable controls.
4. **Clipped Bottom Tab Bar & Labels**: Mobile bottom navigation lacked proper `env(safe-area-inset-bottom)` consideration for gesture bars and home indicators.
5. **Oversized & Crowded Map Controls**: Right-hand map controls were too tall, crowded the screen edge, and showed desktop hover tooltips when tapped on touch screens.
6. **Route Preview Card Sizing**: Route preview panel lacked mobile bottom sheet ergonomics and collided with the bottom tab bar.

---

## 2. Top Header Fix (Compact Floating Overlay)

- **Positioning**: Configured as an absolute floating overlay at `top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)] px-3`.
- **Structure**:
  - `Menu` (☰ Hamburger button, 44x44px touch target)
  - `YatraSaarthiLogo` (compact, height 28px with Poppins wordmark)
  - `Sign in` / `Profile` pill in Evergreen `#083335`
- **Surface**: White translucent background (`bg-white/95 backdrop-blur-md`), 16px radius (`rounded-2xl`), subtle border and shadow.

```tsx
<div className="absolute top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)] px-3 sm:px-4 pointer-events-none md:hidden">
  <div className="pointer-events-auto flex items-center justify-between h-12 sm:h-13 px-3.5 sm:px-4 bg-white/95 backdrop-blur-md rounded-2xl border border-border-clean shadow-nav-floating mt-2 max-w-lg mx-auto">
    ...
  </div>
</div>
```

---

## 3. Search Bar Fix

- **Positioning**: Moved directly **BELOW** the top floating header at `top-[calc(env(safe-area-inset-top)+64px)]`.
- **Dimensions**: Sized `h-12` (48-52px), rounded-full, with Lucide `Search` icon and placeholder `"Where to?"`.
- **Overlay State**: Search suggestion dropdown renders seamlessly without shifting map elements or viewport geometry.

---

## 4. Map Controls Fix (Independent Floating Stack)

- **Positioning**: Positioned on the right edge at `top-[44%] -translate-y-1/2 right-3 sm:right-4 z-20`.
- **Structure**: Grouped into independent, compact rounded-2xl clusters with 8-10px gap:
  - **Cluster 1**: Zoom In (`+`) & Zoom Out (`-`)
  - **Cluster 2**: Compass / Heading orientation toggle (`HDG` / `N`)
  - **Cluster 3**: 3D perspective (`Box`) & Map styles (`Layers`)
  - **Cluster 4**: Recenter (`LocateFixed`)
- **Touch Targets**: All buttons meet or exceed **44 × 44px**.
- **Mobile Tooltips**: Desktop hover tooltips hidden on touch screens via `hidden md:block` to eliminate sticky tooltip popups.

---

## 5. Navigation HUD Fix (Strict Non-Overlapping Layering)

- **Positioning**: Positioned strictly **ABOVE** the bottom navigation bar:
  `bottom: calc(68px + env(safe-area-inset-bottom) + 10px)`
- **Dimensions & Styling**: Height 64-76px, `rounded-2xl`, white surface with subtle shadow.
- **Content**:
  - **Speed Value**: Hero Poppins font (`SpeedDisplay`)
  - **Current Location / Route**: Clean pill with `placeName` or `destination.name`
  - **Start Navigation CTA**: Evergreen `#083335`, Lucide `Navigation2` rotated 45° (`↗`), 44px height, rounded-full, white icon and text.
  - Zero technical clutter (E5, U2, covariance, and biases kept strictly in Diagnostics).

---

## 6. Mobile Bottom Navigation Fix

- **Positioning**: Fixed at screen bottom: `fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]`.
- **Height**: 64px (`h-16`) + safe-area padding.
- **5 Standard Tabs**:
  1. **Home** (`/app`) — `LayoutGrid`
  2. **Navigation** (`/app/map`) — `Navigation2`
  3. **Trips** (`/app/history`) — `History`
  4. **Saved** (`/app/memory`) — `Bookmark`
  5. **More** (Opens slide-out menu drawer) — `Menu`
- **Active State**: Evergreen `#083335` indicator bar and bold typography (Manrope 600).
- **Touch Target**: Sized at `min-w-[56px] min-h-[44px]` with zero label clipping.

---

## 7. Safe-Area Implementation

- Handled universally using dynamic viewport units (`100dvh`) and CSS `env(safe-area-inset-*)`:
  - Top header: `pt-[env(safe-area-inset-top)]`
  - Search offset: `top-[calc(env(safe-area-inset-top)+64px)]`
  - Bottom navigation: `pb-[env(safe-area-inset-bottom)]`
  - Driver HUD & Route preview: `bottom-[calc(68px+env(safe-area-inset-bottom)+10px)]`
  - Content scrolling views: `pb-[calc(76px+env(safe-area-inset-bottom))]`

---

## 8. Mobile Route Preview Sheet Behavior

- Rendered as a bottom sheet with a mobile drag handle (`w-10 h-1 bg-slate-300 rounded-full mx-auto`).
- Positioned strictly above the bottom navigation bar.
- Uses `max-h-[75dvh]` with internal smooth scrolling for alternative routes.
- Action CTA: `[ ↗ Start navigation ]` with rotated `Navigation2` icon.

---

## 9. Verification & Quality Gates

### Automated Build Check
```bash
> frontend@0.0.0 build
> tsc -b && vite build

✓ 1953 modules transformed.
✓ built in 973ms
```
**Result:** 0 Errors.

### Automated Lint Check
```bash
> frontend@0.0.0 lint
> oxlint

Found 20 warnings and 0 errors.
```
**Result:** 0 Errors.

### Unit Tests
```bash
> npx tsx src/tests/runAllTests.ts

Timezone Tests: 12 passed, 0 failed
Fixture Tests:  13 passed, 0 failed
✅ ALL TEST SUITES PASSED SUCCESSFULLY!
```
**Result:** 25/25 passed.

### Absolute Backend Freeze Verification
```bash
git diff HEAD -- backend/
```
**Result:** Empty output (0 files modified, 0 lines changed).
- Backend routes: Unchanged
- API contracts: Unchanged
- WebSocket contracts: Unchanged
- Navigation algorithms (InEKF, NHC, ZUPT, MapMatcher): Unchanged
