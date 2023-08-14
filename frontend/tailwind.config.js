/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  safelist: [
    {
      pattern: /cursor-(move|none)/,
    }
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

