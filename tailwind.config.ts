import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        // Brand green family — deliberately a shade deeper/quieter than
        // stock GFG green so it reads as original, not copied.
        brand: {
          950: "#06231A",
          900: "#0B3D24",
          700: "#146A38",
          600: "#1F8A4C",
          500: "#2CA25B",
          400: "#4CC38A",
          200: "#B7E6C8",
          100: "#E1F5E9",
        },
        paper: "#F7F9F7",
        ink: {
          900: "#0D1210",
          700: "#232B27",
          500: "#5B6560",
          300: "#A4ADA8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#0F1713",
          darkRaised: "#152019",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(13, 18, 16, 0.04), 0 8px 24px -8px rgba(13, 18, 16, 0.08)",
        raised: "0 2px 8px rgba(13, 18, 16, 0.06), 0 16px 40px -12px rgba(13, 18, 16, 0.14)",
        glow: "0 0 0 1px rgba(76, 195, 138, 0.25), 0 8px 30px -8px rgba(31, 138, 76, 0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
