/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Manual dark mode (we will force it on html tag)
  theme: {
    extend: {
      colors: {
        background: '#020617', // slate-950
        surface: '#1e293b',    // slate-800
        primary: '#3b82f6',    // blue-500
        accent: '#f59e0b',     // amber-500
        'knob-ring': '#334155', // slate-700
        'knob-indicator': '#3b82f6', // blue-500
        'rack-bg': '#020617', // slate-950
        'active-led': '#22c55e', // green-500
      },
      cursor: {
        'ns-resize': 'ns-resize',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
