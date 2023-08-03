/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  safelist: [
    'bg-[#ff0000]',
    'bg-[#0000ff]',
    'bg-[#ffff00]',
    {
      pattern: /bg-(red|blue|yellow)-300/,
      variants: ['hover'],
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

