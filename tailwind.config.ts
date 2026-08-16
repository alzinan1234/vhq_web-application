import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pink: { neon: "#FF006E" },
        cyan: { neon: "#00F5FF" },
        purple: { neon: "#7B2FFF" },
        yellow: { neon: "#FFE600" },
        dark: { base: "#080810", card: "#0F0F1A", surface: "#13131F", border: "#1A1A2E" },
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', "cursive"],
        syne: ["Syne", "sans-serif"],
        grotesk: ['"Space Grotesk"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
