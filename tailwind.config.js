/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './frontend/index.html',
    './frontend/src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--outline-variant)",
        input: "var(--surface-high)",
        ring: "var(--primary)",
        background: "var(--background)",
        foreground: "var(--on-surface)",
        primary: {
          DEFAULT: "var(--primary)",
          dim: "var(--primary-dim)",
          foreground: "var(--surface)",
        },
        "on-primary": "var(--on-primary)",
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--surface)",
        },
        tertiary: {
          DEFAULT: "var(--tertiary)",
          foreground: "var(--surface)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          low: "var(--surface-low)",
          container: "var(--surface-container)",
          high: "var(--surface-high)",
          highest: "var(--surface-highest)",
          bright: "var(--surface-bright)",
        },
        "on-surface": {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },
        "outline-variant": "var(--outline-variant)",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-20px) scale(1.05)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.1" },
          "50%": { transform: "translateY(20px) scale(1.1)", opacity: "0.2" },
        },
        "pulse-slow": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.1" },
          "50%": { transform: "scale(1.2)", opacity: "0.3" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float-delayed 8s ease-in-out infinite",
        "pulse-slow": "pulse-slow 10s ease-in-out infinite",
        "spin-slow": "spin-slow 12s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
