# YatraSaarthi — Poppins + Manrope Typography System Report

**Date:** September 24, 2026  
**Status:** Completed & Validated  
**Scope:** Frontend Only (Zero Backend / API / WebSocket Modifications)  

---

## 1. Font Loading Method

Fonts are loaded centrally using optimized Google Fonts `<link>` tags with `preconnect` and `display=swap` inside [`frontend/index.html`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/index.html):

```html
<!-- Centralized Typography System: Poppins (Headings) + Manrope (Body/UI) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 2. Typography Tokens & Tailwind Integration

Centralized CSS variables defined in [`frontend/src/index.css`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/index.css) and wired into [`frontend/tailwind.config.js`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/tailwind.config.js):

### CSS Variables:
```css
:root {
  --font-heading: 'Poppins', sans-serif;
  --font-body: 'Manrope', sans-serif;
  --color-primary: #083335;
  ...
}

@layer base {
  body {
    font-family: var(--font-body);
    @apply bg-white text-ink font-body antialiased overflow-hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }

  button, input, optgroup, select, textarea {
    font-family: var(--font-body);
  }
}
```

### Tailwind Config:
```javascript
fontFamily: {
  heading: ['Poppins', 'sans-serif'],
  body: ['Manrope', 'sans-serif'],
  sans: ['Manrope', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
}
```

---

## 3. Poppins vs. Manrope Usage Architecture

| Category | Font Family | Applied Elements |
|---|---|---|
| **Headings & Page Titles** | **Poppins** | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, page headers across `/app`, `/app/map`, `/app/history`, `/app/memory`, `/app/learning`, `/app/diagnostics`, `/settings`, `/onboarding` |
| **Brand Identity** | **Poppins** | YatraSaarthi brand wordmark in header & navigation (`YatraSaarthiLogo.tsx`) |
| **Hero Numeric Values** | **Poppins** | Driver HUD main vehicle speed (`SpeedDisplay.tsx`), route duration header (`RoutePreviewCard.tsx`) |
| **Global Body & Prose** | **Manrope** | Paragraphs, descriptions, technical explanations, subtitle cues |
| **Buttons & CTAs** | **Manrope** | `.btn-primary`, `.btn-secondary`, `.btn-subtle`, navigation actions ("Start navigation", "Navigate to Mahesana", "Save a place", "Sign in", "Export JSON") |
| **Form Controls & Search**| **Manrope** | Search inputs, placeholders, select boxes, dropdown filters |
| **Labels & Tooltips** | **Manrope** | Sensor labels, state descriptions, metadata badges, sidebar tooltips |
| **Standard Metrics** | **Manrope** | Distances (`86 km`), durations (`2h 18m`), telemetry latencies, filter counts |
| **Raw Telemetry Only** | **Monospace** | Matrix vectors, raw lat/lon coordinates, covariance traces, bias arrays |

---

## 4. Weight Mapping

- **Poppins**:
  - `400`: Supporting section titles
  - `500`: Normal section headers
  - `600`: Primary headings, route titles, card headers
  - `700`: Major page titles, hero numeric speed values
- **Manrope**:
  - `400`: Body text, descriptions, input placeholders
  - `500`: Field labels, metadata, tooltips, secondary tags
  - `600`: Primary & secondary buttons, active filter pills, emphasized metrics
  - `700`: Strong numeric UI counters, prominent badges

---

## 5. Components & Pages Updated

1. **[`frontend/index.html`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/index.html)**: Added Google Fonts font preconnect and multi-weight loading.
2. **[`frontend/tailwind.config.js`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/tailwind.config.js)**: Configured font-heading (Poppins) and font-body/font-sans (Manrope).
3. **[`frontend/src/index.css`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/index.css)**: Implemented CSS root font variables, `@layer base` element styling, and button semibold font weights.
4. **[`frontend/src/components/branding/YatraSaarthiLogo.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/branding/YatraSaarthiLogo.tsx)**: Applied `font-heading` to brand title and `font-body` to subtitle.
5. **[`frontend/src/components/navigation/SpeedDisplay.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/navigation/SpeedDisplay.tsx)**: Hero speed value uses `font-heading font-bold`, units use `font-body font-medium`.
6. **[`frontend/src/components/navigation/TripMetrics.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/navigation/TripMetrics.tsx)**: Metrics use `font-body font-semibold`.
7. **[`frontend/src/components/navigation/RoutePreviewCard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/navigation/RoutePreviewCard.tsx)**: Destination heading in `font-heading font-bold`, CTA buttons in `font-body font-semibold`.
8. **[`frontend/src/pages/SensorDiagnostics.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/SensorDiagnostics.tsx)**: Replaced terminal/monospace typography on status descriptors with `font-body` while reserving monospace strictly for raw numerical telemetry vectors.
9. **[`frontend/src/components/dashboard/ModelManagerCard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/dashboard/ModelManagerCard.tsx)**: Standardized headers to `font-heading` and cards/buttons to `font-body`.

---

## 6. Old Font Overrides Removed

- Replaced legacy `font-sans` default (system UI / Inter) with `Manrope`.
- Replaced non-technical `font-mono` styling on status descriptors with `Manrope 500/600`.
- Ensured zero ad-hoc Arial, Helvetica, or unconfigured font definitions remain across product UI.

---

## 7. Verification & Build Results

### Automated Build Check
```bash
> frontend@0.0.0 build
> tsc -b && vite build

✓ 1953 modules transformed.
✓ built in 837ms
```
**Result:** 0 Errors.

### Automated Lint Check
```bash
> frontend@0.0.0 lint
> oxlint

Found 20 warnings and 0 errors.
```
**Result:** 0 Errors.

### Test Suite Execution
```bash
> npx tsx src/tests/runAllTests.ts

Timezone Tests: 12 passed, 0 failed
Fixture Tests:  13 passed, 0 failed
✅ ALL TEST SUITES PASSED SUCCESSFULLY!
```
**Result:** 25/25 passed.

---

## 8. Backend & API Freeze Verification

```bash
git diff HEAD -- backend/
```
**Result:** Empty output (0 files modified, 0 lines changed).
- FastAPI routes: Unchanged
- API contracts: Unchanged
- WebSocket telemetry contracts: Unchanged
- Navigation algorithms (InEKF, NHC, ZUPT, MapMatcher, etc.): Unchanged
