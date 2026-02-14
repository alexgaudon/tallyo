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
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      borderWidth: {
        3: "3px",
        4: "4px",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
        "soft-lg":
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 24px -4px rgba(0, 0, 0, 0.06)",
        block: "4px 4px 0 0 rgba(0, 0, 0, 1)",
        "block-sm": "2px 2px 0 0 rgba(0, 0, 0, 1)",
        "block-lg": "6px 6px 0 0 rgba(0, 0, 0, 1)",
        "block-dark": "4px 4px 0 0 rgba(255, 255, 255, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
