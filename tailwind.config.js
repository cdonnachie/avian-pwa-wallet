/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        avian: {
          50: "#f0fdfc",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          // Brand specific colors from the palette
          primary: "#34e2d5", // Main bright turquoise
          secondary: "#2a737f", // Dark teal
          accent: "#19827a", // Medium teal
          dark: "#17a2b8", // Darker teal
          light: "#5df5e6", // Light turquoise
          orange: "#ff6b35", // Avian brand orange for buttons and accents
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
