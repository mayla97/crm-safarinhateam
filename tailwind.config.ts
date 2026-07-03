import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        remax: {
          red: "#DC1C2E",
          "red-dark": "#B01525",
          "red-light": "#FEE2E4",
          blue: "#003DA5",
          "blue-dark": "#002B75",
          "blue-light": "#E8EEF8",
        },
        brand: {
          primary: "#003DA5",
          secondary: "#DC1C2E",
          surface: "#F8FAFC",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sidebar: "2px 0 8px rgba(0, 45, 98, 0.06)",
        card: "0 1px 3px rgba(0, 45, 98, 0.08), 0 1px 2px rgba(0, 45, 98, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
