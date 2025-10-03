/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./index.html",
  ],
  prefix: "",
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
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
        // 네이버 캘린더 스타일 색상 시스템
        naver: {
          green: {
            DEFAULT: '#10b981',
            50: '#d1fae5',
            100: '#a7f3d0',
            500: '#10b981',
            600: '#059669',
          },
          blue: {
            DEFAULT: '#3b82f6',
            50: '#dbeafe',
            100: '#bfdbfe',
            500: '#3b82f6',
            600: '#2563eb',
          },
          red: {
            DEFAULT: '#ef4444',
            50: '#fee2e2',
            100: '#fecaca',
            500: '#ef4444',
            700: '#b91c1c',
          },
          purple: {
            DEFAULT: '#7c3aed',
            50: '#ede9fe',
            100: '#ddd6fe',
            500: '#7c3aed',
            700: '#6d28d9',
          },
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // 네이버 캘린더 스타일 폰트 크기
      fontSize: {
        'calendar-date': ['14px', { lineHeight: '1.5' }],
        'calendar-schedule': ['12px', { lineHeight: '1.5' }],
        'sidebar-menu': ['14px', { lineHeight: '1.5' }],
        'header-brand': ['18px', { lineHeight: '1.5', fontWeight: '600' }],
      },
      // 네이버 캘린더 스타일 간격
      spacing: {
        'sidebar': '256px',
        'header': '64px',
        'calendar-cell': '120px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}