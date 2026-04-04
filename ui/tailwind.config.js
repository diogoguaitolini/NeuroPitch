/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme — session view
        bg:             '#080808',
        surface:        '#111010',
        surface2:       '#171614',
        border:         '#242220',
        'text-primary': '#f0ede6',
        'text-muted':   '#5e5952',
        caramel:        '#c9a96e',
        'caramel-bright': '#e8c99a',
        'caramel-dim':  '#7a6240',
        // Warm theme — home page
        'warm-bg':      '#EBE7DF',
        'warm-dark':    '#2E2C28',
        'warm-muted':   '#948E81',
        'warm-border':  '#C8C3B8',
        'warm-surface': '#E0DBD2',
      },
      fontFamily: {
        sans:    ['Josefin Sans', 'system-ui', 'sans-serif'],
        display: ['Josefin Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
