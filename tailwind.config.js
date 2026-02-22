/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Archer brand colors
        'archer-blue': '#4d73ff',
        'archer-dark': '#2d50ef',
        'archer-darkest': '#1032cf',
        // Neutral palette
        'neutral': {
          50: '#f8faff',
          100: '#f0f4ff',
          200: '#e5ecfa',
          300: '#d4def2',
          400: '#b8c9e3',
          500: '#94a8c7',
          600: '#6b7a94',
          700: '#4a5568',
          800: '#2d3748',
          900: '#1a202c',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
