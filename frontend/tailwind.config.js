/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Deep Navy — primary brand color (nav, headings, primary text)
        navy: {
          50: "#EEF1F8",
          100: "#D7DDEF",
          200: "#AFBADE",
          300: "#8090BE",
          400: "#4C5D95",
          500: "#1F2E5E",
          600: "#182449",
          700: "#131C39",
          800: "#0D1329",
          900: "#080D1C",
        },
        // Saffron — accent for CTAs, highlights, active states
        saffron: {
          50: "#FFF8EC",
          100: "#FFEDCC",
          200: "#FFD98F",
          300: "#FFC24F",
          400: "#FFAE20",
          500: "#F4A100",
          600: "#D98900",
          700: "#B36F00",
        },
        // Off-white — page background
        cream: {
          DEFAULT: "#FBF8F2",
          100: "#FFFFFF",
          200: "#F5F1E8",
        },
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
