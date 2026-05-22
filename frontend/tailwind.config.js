/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#06b6d4',
          dark: '#0ea5e9',
          light: '#22d3ee',
          muted: '#a5f3fc',
        },
        surface: '#f6f8fa',
        ink: '#0f172a',
        sidebar: '#0d1117',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...fontFamily.sans],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl: '0.5rem',
        '2xl': '0.75rem',
      },
      backgroundImage: {
        'cyan-gradient': 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 45%, #0ea5e9 100%)',
      },
    },
  },
  plugins: [],
}
