import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ops: {
          panel: "#0c0c0f",
          rail: "#0f1014",
          border: "rgba(255,255,255,0.06)",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 48px rgba(0,0,0,0.45)",
        glow: "0 0 24px rgba(225,29,72,0.15)",
      },
      animation: {
        "live-pulse": "live-pulse 2s ease-in-out infinite",
        "alert-blink": "alert-blink 1.6s ease-in-out infinite",
        "voice-ring-flash": "voice-ring-flash 0.9s ease-in-out infinite",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "alert-blink": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(225,29,72,0.35)" },
          "50%": { opacity: "0.92", boxShadow: "0 0 14px rgba(225,29,72,0.45)" },
        },
        "voice-ring-flash": {
          "0%, 100%": {
            boxShadow: "0 0 0 1px rgba(225,29,72,0.4), 0 0 32px rgba(225,29,72,0.25)",
          },
          "50%": {
            boxShadow: "0 0 0 2px rgba(251,113,133,0.85), 0 0 56px rgba(225,29,72,0.55)",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
