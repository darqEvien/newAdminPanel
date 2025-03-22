/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        flip: "flip 0.6s ease-in-out",
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
      },
    },
  },
  variants: {
    extend: {
      // Mevcut variantlar...
      transform: ["hover", "focus"],
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        ".scrollbar-thin::-webkit-scrollbar": {
          width: "6px",
        },
        ".scrollbar-thin::-webkit-scrollbar-track": {
          backgroundColor: "#1f2937",
        },
        ".scrollbar-thin::-webkit-scrollbar-thumb": {
          backgroundColor: "#4b5563",
          borderRadius: "3px",
        },
        ".rotate-y-180": {
          transform: "rotateY(180deg)",
        },
      };
      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
};
