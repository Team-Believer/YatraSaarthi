/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mobility White Theme Canvas & Evergreen Ink Tokens
        'canvas': '#FFFFFF',
        'canvas-soft': '#F0F4F4',
        'canvas-softer': '#F5F8F8',
        'surface-pressed': '#E2EBEB',
        'ink': '#083335',
        'ink-body': '#4A6364',
        'ink-mute': '#8CA5A6',
        'ink-elevated': '#0E4345',
        'border-clean': '#E5E5E5',
        'hairline': '#E5E5E5',

        // Primary Evergreen Brand System
        'primary': {
          DEFAULT: '#083335',
          hover: '#052426',
          active: '#031718',
          soft: '#E6EDED',
          subtle: '#F0F4F4',
          foreground: '#FFFFFF',
        },
        'brand': {
          '50': '#F0F5F5',
          '100': '#E1EAEA',
          '200': '#C3D5D5',
          '300': '#95B5B6',
          '400': '#5F8F90',
          '500': '#336C6E',
          '600': '#083335',
          '700': '#062B2D',
          '800': '#052426',
          '900': '#031819',
          '950': '#020E0F',
          'navy': '#083335',
        },
        'nav': {
          'surface': '#FFFFFF',
          'surface-dark': '#062B2D',
          'card': '#FFFFFF',
          'card-dark': '#083335',
          'border': '#E5E5E5',
          'border-dark': '#1C4A4C',
          'accent': '#083335',
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
        heading: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
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
