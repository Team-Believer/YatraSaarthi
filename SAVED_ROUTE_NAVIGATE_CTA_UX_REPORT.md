# SAVED ROUTE NAVIGATE CTA UX & NORTH-EAST ICON REPORT

**Project:** YatraSaarthi Navigation Platform  
**Target:** Saved Routes Detail Panel (`/app/memory`)  
**Scope:** Frontend Only (Strict Backend Freeze Maintained)  
**Date:** September 23, 2026

---

## Executive Summary
The primary CTA button on the Saved Routes detail panel ("Navigate to <destination>") has been redesigned. Previously, it rendered as an oversized, full-width block that dominated the card and overpowered the interactive route map preview, with an upward-pointing arrow.

The new design provides a compact, right-aligned primary CTA on desktop with the Lucide `Navigation2` icon rotated 45° clockwise (`↗` North-East), branded in deep Evergreen (`#083335`), with full responsiveness for tablet and mobile screens.

---

## 1. Button Sizing & Hierarchy Changes

| Metric | Previous Layout | New Polished Layout |
| :--- | :--- | :--- |
| **Width** | Full width (`w-full`), stretching 100% across card | Compact `w-full sm:w-auto min-w-[200px] max-w-[320px]` |
| **Height** | Large block (~54px) | Controlled `h-11 sm:h-12` (44px–48px) |
| **Padding** | Generic padding | Balanced `px-5 sm:px-6` (20px–24px) |
| **Border Radius** | Variable | `rounded-xl` (12px) |
| **Visual Weight** | Visually heavy bar dominating preview | Subservient to route preview map, positioned in dedicated action area |

### Page Hierarchy
1. **Route Header:** Title (e.g., *Mahesana*) & Subtitle (*Via NH48, SH41*) + Top-Right Action Controls (Save/Bookmark, Delete).
2. **Metrics Bar:** Distance, Duration, Travel Mode badges.
3. **Route Preview Map:** Primary visual focal point with route geometry, start/end markers, and step details.
4. **Action Area (Bottom Right):** Compact, prominent primary action `[ ↗ Navigate to Mahesana ]` separated with top padding and subtle border separator.

---

## 2. Alignment & Dedicated Action Area
- **Action Container:** `pt-4 mt-2 border-t border-border-clean/80 flex items-center justify-end`
- **Desktop/Tablet:** Button is anchored cleanly to the bottom-right corner of the route preview card.
- **Mobile Viewports (`< 640px`):** Flex container gracefully expands button to full width (`w-full`) while maintaining ergonomic touch height (44px).

---

## 3. Evergreen Color System & States
Applied brand Evergreen palette:
- **Default State:** `bg-[#083335]` with pure white text (`text-white`) and white icon (`fill-white text-white`).
- **Hover State:** `hover:bg-[#052426]` (darker Evergreen tone, preserving rich chromatic depth rather than reverting to plain black).
- **Active State:** `active:bg-[#031718]` with micro-interaction scale down `active:scale-[0.98]`.
- **Keyboard Focus:** Visible ring `focus-visible:ring-2 focus-visible:ring-[#083335] focus-visible:ring-offset-2`.
- **Transitions:** Fast and subtle `transition-all duration-150`.

---

## 4. Navigation Icon (Lucide Navigation2 pointing North-East)
- **Component:** Lucide `Navigation2`
- **Rotation:** `rotate-45` (45° clockwise)
- **Visual Direction:** Points distinctly **North-East (`↗`)** rather than North (`↑`).
- **Rendering:** Solid white fill and stroke (`fill-white text-white w-4.5 h-4.5 shrink-0`).

---

## 5. Dynamic Destination Label & Accessibility
- **Dynamic Text:** `Navigate to {selectedItem.name}` (e.g., *Navigate to Mahesana*, *Navigate to Gandhinagar*, *Navigate to Ahmedabad Railway Station*).
- **Accessibility:** Explicit `aria-label={`Navigate to ${selectedItem.name}`}` with truncated label container to prevent overflow on long destination names.

---

## 6. Existing Navigation Flow Preservation
- **Handler:** Retains exact standard handler invocation:
  ```tsx
  onClick={() => handleNavigate(selectedItem)}
  ```
- No changes made to session lifecycle, route calculation, or map navigation transitions.
- Top-right panel controls (Bookmark, Delete) remain unaltered at their dedicated header position.

---

## 7. Verification & Quality Assurance

### Build Verification
```bash
npm run build
```
- **Result:** Exit Code `0` (Success in 669ms).
- Production bundle compiled with zero errors.

### Lint Verification
```bash
npm run lint
```
- **Result:** Exit Code `0` (0 errors, 20 baseline non-blocking warnings across 80 files).

### Test Suite Execution
```bash
npx -y tsx src/tests/runAllTests.ts
```
- **Result:** 100% Passed (12/12 Timezone tests, 13/13 Trip fixture view model tests).

---

## 8. Strict Backend & API Freeze Status

```bash
git diff HEAD -- backend/
```
- **Backend changes:** `0`
- **FastAPI route changes:** `0`
- **API contract changes:** `0`
- **WebSocket changes:** `0`
- **Database/Dead reckoning engine changes:** `0`
