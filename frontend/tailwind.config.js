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
          '500': '#3b82f6',
          '600': '#2563eb',
          '900': '#1e3a8a',
          'navy': '#0f172a',
        },
        'status': {
          'success': '#22c55e',
          'warning': '#f59e0b',
          'danger': '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
