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
          DEFAULT: "#171717",
          pressed: "#000000",
          hover: "#000000",
        },
        secondary: {
          DEFAULT: "#5A5A5A",
          bg: "#F4F4F5",
          pressed: "#E4E4E7",
        },
        tertiary: "#FFFFFF",
        neutral: "#FAFAFA",
        surface: {
          DEFAULT: "#FFFFFF",
          canvas: "#FAFAFA",
          card: "#FFFFFF",
          soft: "#FAFAFA",
          elevated: "#FFFFFF",
          dark: "#171717",
        },
        "on-surface": "#171717",
        border: "#E5E7EB",
        accent: "#000000",
        error: "#B42318",
        ink: {
          DEFAULT: "#171717",
          soft: "#5A5A5A",
        },
        body: "#171717",
        mute: "#5A5A5A",
        ash: "#9CA3AF",
        stone: "#E5E7EB",
        hairline: {
          DEFAULT: "#E5E7EB",
          soft: "#F3F4F6",
        },
        semantic: {
          error: "#B42318",
          errorDeep: "#B42318",
          successDeep: "#171717",
          successPale: "#F4F4F5",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
        pin: "8px",
        "pin-lg": "12px",
      },
      letterSpacing: {
        display: "-3.84px",
        "headline-lg": "-3.36px",
        "body-lg": "-0.96px",
        tight: "-0.02em",
      },
      fontFamily: {
        sans: [
          "Geist",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      spacing: {
        xs: "2px",
        sm: "12px",
        md: "20px",
        lg: "32px",
        xl: "80px",
      },
    },
  },
  plugins: [],
};

