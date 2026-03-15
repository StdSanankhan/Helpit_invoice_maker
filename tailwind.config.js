/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1d',
        sidebar: 'rgba(15, 23, 42, 0.6)',
        card: 'rgba(30, 41, 59, 0.7)',
        neon: '#00f2fe',
        primary: '#4facfe',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
