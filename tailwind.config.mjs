/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./Calcs/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        georgia: ["Georgia", "serif"],
      },
      screens: {
        'xs': '400px', // ✅ custom breakpoint added
      },
    },
  },
  plugins: [],
};