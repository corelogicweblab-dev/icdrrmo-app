import type { Config } from "tailwindcss";

/** Orange–red accent scale (existing `rose-*` classes map here). */
const icdFlame = {
  50: "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316",
  600: "#ea580c",
  700: "#dc2626",
  800: "#b91c1c",
  900: "#991b1b",
  950: "#450a0a",
} as const;

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui, sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        rose: { ...icdFlame },
        ops: {
          panel: "#0a0a0a",
          rail: "#050505",
          border: "rgba(249, 115, 22, 0.14)",
        },
        icd: {
          orange: "#f97316",
          red: "#dc2626",
          black: "#030303",
          glow: "rgba(249, 115, 22, 0.45)",
        },
      },
      boxShadow: {
        panel:
          "0 0 0 1px rgba(249, 115, 22, 0.12), 0 0 32px rgba(220, 38, 38, 0.08), 0 18px 48px rgba(0, 0, 0, 0.55)",
        glow: "0 0 28px rgba(249, 115, 22, 0.35), 0 0 64px rgba(220, 38, 38, 0.12)",
        "glow-red": "0 0 24px rgba(220, 38, 38, 0.4)",
      },
      animation: {
        "live-pulse": "live-pulse 2s ease-in-out infinite",
        "alert-blink": "alert-blink 1.6s ease-in-out infinite",
        "voice-ring-flash": "voice-ring-flash 0.9s ease-in-out infinite",
        "agency-call-flash": "agency-call-flash 0.75s ease-in-out infinite",
        "icd-scan": "icd-scan 8s linear infinite",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "alert-blink": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.35)",
          },
          "50%": {
            opacity: "0.92",
            boxShadow: "0 0 18px rgba(220, 38, 38, 0.55)",
          },
        },
        "voice-ring-flash": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(249, 115, 22, 0.45), 0 0 32px rgba(220, 38, 38, 0.28)",
          },
          "50%": {
            boxShadow:
              "0 0 0 2px rgba(251, 146, 60, 0.9), 0 0 56px rgba(220, 38, 38, 0.5)",
          },
        },
        "agency-call-flash": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.25)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow:
              "0 0 0 3px rgba(251, 191, 36, 0.95), 0 0 72px rgba(245, 158, 11, 0.55)",
            transform: "scale(1.02)",
          },
        },
        "icd-scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
