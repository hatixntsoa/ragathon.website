/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          light: "#F3F4F6",
          dark: "#111111",
        },
        border: {
          light: "#E5E7EB",
          dark: "#333333",
        },
        accent: "#1D9BF0",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Roboto",
          "Segoe UI",
          "sans-serif",
        ],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
    },
  },
  plugins: [],
};
