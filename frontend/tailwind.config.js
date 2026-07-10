/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0A0A0C', // main workspace
          800: '#0E0E12',
          700: '#121216', // glass panels
          600: '#17171d',
          500: '#1d1d25',
        },
        red: {
          glow: '#FF1E27',
          brand: '#E50914',
        },
        silver: '#A0A0B0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(229,9,20,0.30)',
        'glow-lg': '0 0 30px rgba(229,9,20,0.45)',
        'glow-sm': '0 0 8px rgba(229,9,20,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(229,9,20,0.25)' },
          '50%': { boxShadow: '0 0 22px rgba(229,9,20,0.5)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
