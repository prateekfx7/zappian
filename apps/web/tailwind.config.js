/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#e60023",
          pressed: "#cc001f",
        },
        ink: {
          DEFAULT: "#000000",
          soft: "#211922",
        },
        body: "#33332e",
        charcoal: "#262622",
        mute: "#62625b",
        ash: "#91918c",
        stone: "#c8c8c1",
        hairline: {
          DEFAULT: "#dadad3",
          soft: "#e5e5e0",
        },
        secondary: {
          bg: "#e5e5e0",
          pressed: "#c8c8c1",
        },
        surface: {
          canvas: "#ffffff",
          soft: "#fbfbf9",
          card: "#f6f6f3",
          elevated: "#ffffff",
          dark: "#262622",
        },
        semantic: {
          error: "#9e0a0a",
          errorDeep: "#cc001f",
          successDeep: "#103c25",
          successPale: "#c7f0da",
          focusOuter: "#435ee5",
        },
      },
      borderRadius: {
        pin: "16px",
        "pin-lg": "32px",
      },
      letterSpacing: {
        display: "-1.2px",
        heading: "-0.8px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
