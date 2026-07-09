import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 医療機関向けの落ち着いたネイビー / ブルーグレー系
        brand: {
          50: "#f2f5f9",
          100: "#e3e9f1",
          200: "#c7d3e3",
          300: "#9fb2cd",
          400: "#6f8bb0",
          500: "#4d6a95",
          600: "#3c547a",
          700: "#324563",
          800: "#2c3b53",
          900: "#283347",
          950: "#1a2130",
        },
        ink: {
          DEFAULT: "#1f2733",
          muted: "#5b6472",
          soft: "#8b93a1",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Meiryo",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        cardHover: "0 4px 12px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
