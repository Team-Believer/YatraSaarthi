# YatraSaarthi — Fullscreen Map & Floating Sidebar UX Report

## 1. Map Layout Changes
- **True Full-Screen Viewport**: The map now occupies the entire viewport (`100vw × 100vh`, `fixed/absolute inset-0`).
- **Elimination of Sidebar Width Reservation**: Removed the horizontal flex column layout in `AppLayout.tsx`. The main content area is no longer restricted to a `flex-1` sub-container beside the sidebar.
- **Continuous Edge-to-Edge Map Rendering**: The map canvas extends seamlessly all the way to `left: 0, right: 0, top: 0, bottom: 0`. No white application shell or blank vertical strip exists beside the sidebar.

## 2. Sidebar Changes
- **Floating Navigation Rail**: The desktop sidebar is now an overlay rendered with `fixed top-4 bottom-4 left-4 z-40 hidden md:flex pointer-events-none` with the inner rail setting `pointer-events-auto`.
- **Dimensions & Silhouette**: Compact capsule rail ($70\text{px}$–$74\text{px}$ width) with rounded outer geometry (`rounded-3xl`), soft elevation (`shadow-[0_8px_30px_rgb(0,0,0,0.08)]`), and clean border (`border-slate-200/90`).
- **Active State**: Large rounded pill (`w-11 h-11 lg:w-12 lg:h-12 rounded-2xl`) with restrained dark charcoal background (`bg-slate-900 text-white shadow-xs`) matching the white mobility design theme.

## 3. Lucide Icon Mapping
All icons use uniform $20\text{px}$ sizing and consistent `strokeWidth={2}`:

| Navigation Item | Lucide Icon | Path | Tooltip |
|---|---|---|---|
| **Dashboard** | `LayoutGrid` | `/app` | *Overview* |
| **Navigation** | `Navigation2` | `/app/map` | *Live navigation* |
| **Trips** | `History` | `/app/history` | *Trip history* |
| **Saved Routes** | `Bookmark` | `/app/memory` | *Saved routes* |
| **AI Insights** | `BrainCircuit` | `/app/learning` | *Motion intelligence* |
| **Diagnostics** | `Activity` | `/app/diagnostics` | *System diagnostics* |
| **Settings** | `Settings` | `/app/settings` | *App settings* |
| **Profile** | `UserRound` | `/app/profile` | *Profile* |

## 4. Hover Tooltip Behavior
- **Positioning**: Right-positioned flyout tooltips (`left-full ml-3`) that never cover the rail icons or interfere with map controls.
- **Styling**: White card pills (`bg-white border border-slate-200/90 text-slate-900 font-semibold text-xs rounded-xl shadow-lg shadow-slate-900/5 px-3.5 py-1.5`).
- **Interaction**: Fast ~150ms delay fade and slide animation (`delay-150 transition-all opacity-0 -> opacity-100 translate-x-1 -> translate-x-0`).
- **Accessibility**: Dual trigger support on mouse hover (`group-hover:opacity-100`) and keyboard focus (`group-focus-visible:opacity-100`) with explicit `aria-label` attributes.

## 5. Right Map Controls
- Coherent, unified floating toolbar on the right (`absolute top-20 right-4 z-30 flex flex-col items-end gap-2`).
- Uniform 44px buttons (`w-11 h-11`) with rounded corners and consistent elevation:
  - **Zoom In**: `Plus` (*Zoom in*)
  - **Zoom Out**: `Minus` (*Zoom out*)
  - **Heading / Orientation**: `Compass` (*Orient north / Heading up*)
  - **3D Perspective**: `Box` (*3D perspective / 2D view*)
  - **Map Styles**: `Layers` (*Map styles*)
  - **Recenter**: `LocateFixed` (*Recenter*)
- Flyout tooltips to the left (`right-full mr-3`) on hover and keyboard focus.

## 6. Bottom Navigation HUD & Search
- **Top Destination Search**: Centered floating search bar (`top-4 sm:top-6 left-1/2 -translate-x-1/2 max-w-[560px]`) with Lucide `Search` and `ArrowLeft`.
- **Bottom Navigation HUD**: Centered floating card (`bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 max-w-3xl`) displaying speed, heading/location, and primary "Start navigation" CTA.
- **Route Preview Card**: Positioned with `sm:left-24` on desktop to sit gracefully beside the floating sidebar without visual overlap.

## 7. Responsive Behavior
- **Desktop & Tablet (≥768px)**: Floating vertical rail on the left, full-screen map canvas underneath, centered top search, and centered bottom HUD.
- **Mobile (<768px)**: Desktop floating rail is hidden (`hidden md:flex`). The interface utilizes the touch-friendly `MobileBottomNav` and an off-canvas drawer (`Sidebar isDrawer={true}`) triggered via the floating hamburger button.
- **Secondary Pages**: Non-map pages (`/app/history`, `/app/memory`, etc.) feature `md:pl-28` to maintain comfortable reading offsets from the floating navigation rail.

## 8. Files Changed
- `frontend/src/components/layout/AppLayout.tsx`: Switched layout model to full-screen viewport with floating sidebar overlay.
- `frontend/src/components/layout/Sidebar.tsx`: Configured container height and padding for overlay presentation.
- `frontend/src/components/map/MapControls.tsx`: Standardized right toolbar controls with tooltips.
- `frontend/src/components/map/DestinationSearch.tsx`: Standardized search icons and back button.
- `frontend/src/pages/LiveMap.tsx`: Updated route preview card placement offset.
- `frontend/src/pages/Dashboard.tsx`: Updated route preview card placement offset.

## 9. Build Result
```bash
> frontend@0.0.0 build
> tsc -b && vite build

✓ 1948 modules transformed.
dist/index.html                                 1.41 kB
dist/assets/index-BbMXEg6R.css                125.49 kB
dist/assets/index-BSsqpSYp.js               2,368.25 kB
✓ built in 729ms
```
Exit code: `0` (Success).

## 10. Lint Result
```bash
> frontend@0.0.0 lint
> oxlint

Found 0 errors.
```
Exit code: `0` (Success).

## 11. Backend / API / WebSocket Integrity
- **Backend files changed**: `0`
- **FastAPI routes changed**: `0`
- **API contracts changed**: `0`
- **WebSocket contracts changed**: `0`
- **Navigation logic (InEKF, E5, U2, NHC, ZUPT, Heading, Outage Manager, MapMatcher)**: 100% frozen and untouched.
- **Backend Test Suite**: `35 passed, 0 failed` in 2.41s (`pytest backend/tests -v`).
