/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          '50': '#f0f7ff',
          '100': '#e0effe',
          '200': '#baddfe',
          '300': '#7dc4fd',
          '400': '#38a3fa',
          '500': '#3b82f6',
          '600': '#2563eb',
          '700': '#1d4ed8',
          '800': '#1e40af',
          '900': '#1e3a8a',
          'navy': '#0f172a',
        },
        'nav': {
          'surface': '#ffffff',
          'surface-dark': '#0b1329',
          'card': 'rgba(255, 255, 255, 0.94)',
          'card-dark': 'rgba(15, 23, 42, 0.92)',
          'border': 'rgba(226, 232, 240, 0.8)',
          'border-dark': 'rgba(51, 65, 85, 0.6)',
          'accent': '#0284c7',
        },
        'status': {
          'success': '#10b981',
          'warning': '#f59e0b',
          'danger': '#ef4444',
          'info': '#0ea5e9',
          'dr': '#f59e0b',
          'gnss': '#10b981',
        },
        'accent': {
          'cyan': '#06b6d4',
          'gold': '#f59e0b',
          'emerald': '#10b981',
        },
      },
      boxShadow: {
        'nav-floating': '0 8px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
        'nav-sheet': '0 -10px 40px rgba(15, 23, 42, 0.12)',
        'nav-pill': '0 4px 14px rgba(15, 23, 42, 0.08)',
        'nav-glow-gnss': '0 0 15px rgba(16, 185, 129, 0.35)',
        'nav-glow-dr': '0 0 15px rgba(245, 158, 11, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'hud': '1.25rem',
      }
    },
  },
  plugins: [],
}
