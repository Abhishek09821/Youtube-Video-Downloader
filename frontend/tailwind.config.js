/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base + surfaces (design system)
        ink: {
          900: '#0a0a0a', // app background
          800: '#0d0d0d', // deep panels / inputs
          700: '#151515', // raised glass cards
          600: '#1a1a1a',
          500: '#202020',
        },
        // Metallic badge gradient stops
        metal: {
          from: '#2b2b2b',
          to: '#3f3f3f',
        },
        red: {
          glow: '#ff1e2e', // primary accent
          brand: '#ff1e2e', // solid button base (alias of accent)
          hover: '#e11d2e', // hover accent
          deep: '#9e0018', // gradient shadow end
        },
        silver: '#a0a0b0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Chakra Petch"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(255,30,46,0.30)',
        'glow-lg': '0 0 30px rgba(255,30,46,0.45)',
        'glow-sm': '0 0 8px rgba(255,30,46,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,30,46,0.25)' },
          '50%': { boxShadow: '0 0 22px rgba(255,30,46,0.5)' },
        },
        breathe: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(255,30,46,0.35))' },
          '50%': { filter: 'drop-shadow(0 0 26px rgba(255,30,46,0.65))' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        breathe: 'breathe 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
