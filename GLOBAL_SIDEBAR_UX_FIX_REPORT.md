# YatraSaarthi — Global Sidebar UX Fix Report

## 1. Root Cause of Current Sidebar UX Issue
- **Height-Stretching Void**: The previous desktop navigation rail was constrained with `h-full justify-between` inside a `top-4 bottom-4` wrapper, causing the browser flex container to distribute the navigation items across the entire 100vh height. This created massive empty gaps between the logo, the main icon group, and the system settings buttons.
- **Visual Disconnect**: Because the rail stretched vertically from top to bottom, non-map pages (such as `/app/history`) appeared to have a heavy vertical white column rather than a compact, floating navigation rail.

## 2. Shared Components Modified
- **`frontend/src/components/layout/Sidebar.tsx`**: Updated desktop rail container to use natural compact height (`h-fit gap-2.5`) with tight, consistent item spacing (`gap-1.5` for main and bottom stacks).
- **`frontend/src/components/layout/AppLayout.tsx`**: Positioned desktop sidebar rail with `fixed top-4 left-4 z-40` overlay container and established clean `md:pl-28` offset for non-map pages.
- **`frontend/src/components/layout/Topbar.tsx`**: Polished back/navigate pill button with Lucide `ArrowLeft` and clean header typography.

## 3. Pages Affected & Uniform Behavior
All application routes share the exact same floating vertical navigation rail:
- `/app` (Dashboard & Live Driver Map)
- `/app/map` (Live Navigation Map)
- `/app/tunnel` (GNSS Outage Simulator)
- `/app/history` (Trips History)
- `/app/memory` (Saved Routes)
- `/app/learning` (Motion Intelligence & AI Insights)
- `/app/diagnostics` (InEKF & Sensor Diagnostics)
- `/app/settings` (App Settings)
- `/app/profile` (Driver Profile)

## 4. Lucide Icon Mapping
Consistent 20px Lucide icons with uniform `strokeWidth={2}`:

| Navigation Item | Lucide Icon | Path | Tooltip Label |
|---|---|---|---|
| **Dashboard** | `LayoutGrid` | `/app` | *Overview* |
| **Navigation** | `Navigation2` | `/app/map` | *Live navigation* |
| **Trips** | `History` | `/app/history` | *Trip history* |
| **Saved Routes** | `Bookmark` | `/app/memory` | *Saved routes* |
| **AI Insights** | `BrainCircuit` | `/app/learning` | *Motion intelligence* |
| **Diagnostics** | `Activity` | `/app/diagnostics` | *System diagnostics* |
| **Settings** | `Settings` | `/app/settings` | *App settings* |
| **Profile** | `UserRound` | `/app/profile` | *Profile* |

## 5. Active State Design
- On `/app/history`, **Trips** is prominently active with a large rounded container (`w-11 h-11 lg:w-12 lg:h-12 rounded-2xl`).
- Restrained dark charcoal styling (`bg-slate-900 text-white shadow-xs`) provides unmistakable active recognition without harsh purple or generic tiny squares.
- Inactive items retain subtle hover feedback (`text-slate-500 hover:text-slate-900 hover:bg-slate-100/90`).

## 6. Tooltip Behavior & Accessibility
- Right-positioned flyouts (`left-full ml-3`) with ~150ms delay.
- Clean white card pills (`bg-white border border-slate-200/90 text-slate-900 font-semibold text-xs rounded-xl shadow-lg shadow-slate-900/5 px-3.5 py-1.5`).
- Accessible across both mouse hover (`group-hover`) and keyboard focus (`group-focus-visible`) with explicit `aria-label` tags on every control.

## 7. Responsive Behavior
- **Desktop (≥768px)**: Floating compact vertical rail on the left. On non-map pages, content is padded with `md:pl-28` to begin after the rail with clean spacing.
- **Mobile (<768px)**: Touch-friendly `MobileBottomNav` bar at bottom with slide-out drawer (`Sidebar isDrawer={true}`) accessible via the hamburger button.

## 8. History Page Improvements
- Clean header hierarchy with quiet trip summary (`X trips · Y km · Z min`).
- Live search input with Lucide `Search` and clear `X` button.
- Travel mode filter with vehicle mode detection (Car, Motorcycle, Bicycle, Walking).
- Trip list with clear selection styling (`bg-[#F3F3F3] border-slate-300`).
- Selected trip panel with route preview map (`TripRouteMap`), Session ID copy button, and JSON telemetry export.

## 9. Build Result
```bash
> frontend@0.0.0 build
> tsc -b && vite build

✓ 1948 modules transformed.
dist/index.html                                 1.41 kB
dist/assets/index-B_NKqWqv.css                125.10 kB
dist/assets/index-DOVpPwOL.js               2,368.17 kB
✓ built in 694ms
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
- **Navigation logic (InEKF, E5, U2, NHC, ZUPT, Heading, Outage Manager, MapMatcher)**: Completely untouched.
- **Backend Test Suite**: `35 passed, 0 failed` in 2.33s (`pytest backend/tests -v`).
