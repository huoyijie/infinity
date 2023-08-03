/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  safelist: [
    {
      pattern: /bg-(red|green|blue|yellow)-500/,
    },
    {
      pattern: /cursor-(crosshair|move)/,
    }
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

