import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f7f5f0"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

