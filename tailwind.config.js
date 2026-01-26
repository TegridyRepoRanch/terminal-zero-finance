/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#09090b',
          surface: '#18181b',
          border: '#27272a',
          text: '#d4d4d8',
          muted: '#71717a',
        },
        profit: '#34d399',
        loss: '#f43f5e',
        accent: '#22d3ee',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
