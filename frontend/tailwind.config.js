/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mobility White Theme Canvas & Ink Tokens
        'canvas': '#FFFFFF',
        'canvas-soft': '#EFEFEF',
        'canvas-softer': '#F3F3F3',
        'surface-pressed': '#E2E2E2',
        'ink': '#000000',
        'ink-body': '#5E5E5E',
        'ink-mute': '#AFAFAF',
        'ink-elevated': '#282828',
        'border-clean': '#E5E5E5',
        'hairline': '#E5E5E5',

        // Legacy brand mappings gracefully transitioning to crisp black/white mobility style
        'brand': {
          '50': '#F3F3F3',
          '100': '#EFEFEF',
          '200': '#E2E2E2',
          '300': '#AFAFAF',
          '400': '#5E5E5E',
          '500': '#282828',
          '600': '#000000',
          '700': '#000000',
          '800': '#000000',
          '900': '#000000',
          'navy': '#1A1A1A',
        },
        'nav': {
          'surface': '#FFFFFF',
          'surface-dark': '#1A1A1A',
          'card': '#FFFFFF',
          'card-dark': '#282828',
          'border': '#E5E5E5',
          'border-dark': '#383838',
          'accent': '#000000',
        },
        // Restrained Semantic Navigation Indicators
        'status': {
          'success': '#10B981',
          'warning': '#F59E0B',
          'danger': '#EF4444',
          'info': '#06B6D4',
          'dr': '#F59E0B',
          'gnss': '#10B981',
        },
        'accent': {
          'cyan': '#06B6D4',
          'gold': '#F59E0B',
          'emerald': '#10B981',
        },
      },
      boxShadow: {
        'nav-floating': '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'nav-sheet': '0 -4px 24px rgba(0, 0, 0, 0.09)',
        'nav-pill': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'nav-card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'nav-modal': '0 16px 48px rgba(0, 0, 0, 0.14)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'card': '1rem', // 16px
        'pill': '9999px',
        'hud': '1rem',
      }
    },
  },
  plugins: [],
}
