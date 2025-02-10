/** @type {import('tailwindcss').Config} */
export default {
  content: [ "./src/**/*.{js,jsx,ts,tsx}",],
  theme: {
    extend: {},
  },
  plugins: [ function({ addUtilities }) {
    const newUtilities = {
      '.scrollbar-thin::-webkit-scrollbar': {
        width: '6px',
      },
      '.scrollbar-thin::-webkit-scrollbar-track': {
        backgroundColor: '#1f2937',
      },
      '.scrollbar-thin::-webkit-scrollbar-thumb': {
        backgroundColor: '#4b5563',
        borderRadius: '3px',
      },
    }
    addUtilities(newUtilities, ['responsive', 'hover'])
  },
],
}

