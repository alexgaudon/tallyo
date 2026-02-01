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
    fontFamily: {
      mono: [
        '"Geist Mono"',
        '"JetBrains Mono"',
        '"Fira Code"',
        "ui-monospace",
        "SFMono-Regular",
        "monospace",
      ],
    },
    extend: {
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
      borderWidth: {
        3: "3px",
        4: "4px",
      },
      boxShadow: {
        // Blocky shadows with no blur
        block: "4px 4px 0 0 rgba(0, 0, 0, 1)",
        "block-sm": "2px 2px 0 0 rgba(0, 0, 0, 1)",
        "block-lg": "6px 6px 0 0 rgba(0, 0, 0, 1)",
        "block-dark": "4px 4px 0 0 rgba(255, 255, 255, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
