/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        lg: "0.375rem", // reduced from 0.5rem
        md: "0.25rem", // reduced from 0.375rem
        sm: "0.125rem", // reduced from 0.25rem
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
