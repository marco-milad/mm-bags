import type { Config } from "tailwindcss";

/**
 * M.M Bags — tailwind.config.ts
 *
 * Tailwind v4 reads the @theme block in app/globals.css as the source of
 * truth for tokens. This file is here for parity with v3-era tooling
 * (eslint-plugin-tailwindcss, IDE intellisense in some plugins) and to
 * declare brand keyframes + animations.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F3F5F9", 100: "#E4E8F0", 200: "#BFC8D8", 300: "#8E9CB8",
          400: "#5E7197", 500: "#3A5078", 600: "#283C61", 700: "#1B2B4B",
          800: "#14213D", 900: "#0F1A30", 950: "#0B1322",
        },
        brass: {
          100: "#F5EEDF", 200: "#EADFC6", 300: "#DCC79B", 400: "#C9AC74",
          500: "#B8975A", 600: "#A6864B", 700: "#8F7440", 800: "#7C6438",
        },
        paper: "#FAFAF8",
        surface: { DEFAULT: "#F4F2ED", 2: "#ECE9E1" },
        line: { DEFAULT: "#E2DFD6", strong: "#D2CDBF" },
        ink: { 400: "#8C8B82", 500: "#6B6A63", 700: "#3D3C39", 900: "#1A1A1A" },
        success: "#3A7D5B",
        warning: "#C8892F",
        error: "#B4452F",
        sale: "#B4452F",
        // shadcn semantic aliases (read CSS vars from globals.css)
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        body: ["var(--font-jost)", "Jost", "system-ui", "sans-serif"],
        ui: ["var(--font-jost)", "Jost", "system-ui", "sans-serif"],
        ar: ["var(--font-tajawal)", "Tajawal", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", "1.5"], sm: ["0.875rem", "1.5"], base: ["1rem", "1.7"],
        lg: ["1.125rem", "1.6"], xl: ["1.25rem", "1.5"], "2xl": ["1.5rem", "1.25"],
        "3xl": ["1.875rem", "1.2"], "4xl": ["2.375rem", "1.15"], "5xl": ["3rem", "1.08"],
        "6xl": ["4rem", "1.04"], "7xl": ["5rem", "1.02"],
      },
      letterSpacing: { tight: "-0.02em", wide: "0.04em", wider: "0.14em" },
      borderRadius: {
        xs: "2px", sm: "4px", md: "8px", lg: "12px", xl: "18px",
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(20,33,61,.06)",
        sm: "0 2px 6px rgba(20,33,61,.07)",
        md: "0 8px 20px rgba(20,33,61,.09)",
        lg: "0 18px 40px rgba(20,33,61,.12)",
        xl: "0 30px 70px rgba(20,33,61,.16)",
        focus: "0 0 0 3px rgba(184,151,90,.35)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out-soft": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        rise:    { from: { opacity: "0", transform: "translateY(26px)" }, to: { opacity: "1", transform: "none" } },
        fade:    { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        slotUp:  { from: { opacity: "0", transform: "translateY(80%)" }, to: { opacity: "1", transform: "none" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        rise:    "rise .9s cubic-bezier(0.22,1,0.36,1) forwards",
        fade:    "fade .5s cubic-bezier(0.22,1,0.36,1)",
        shimmer: "shimmer 1.4s infinite",
        slotUp:  "slotUp .45s cubic-bezier(0.22,1,0.36,1)",
        marquee: "marquee 26s linear infinite",
      },
      maxWidth: { container: "1200px", "container-wide": "1360px" },
    },
  },
  plugins: [],
};

export default config;
