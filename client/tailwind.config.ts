import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        cloud: "rgb(var(--cloud) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)"
      }
    }
  },
  plugins: []
} satisfies Config;
