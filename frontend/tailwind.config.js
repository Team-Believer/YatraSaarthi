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
        'status': {
          'success': '#22c55e',
          'warning': '#f59e0b',
          'danger': '#ef4444',
        },
        'accent': {
          'cyan': '#06b6d4',
          'gold': '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
