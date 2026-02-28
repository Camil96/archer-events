/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Archer brandbook colors
        'archer-blue': '#0000ff',
        'archer-dark': '#2d3036',
        'archer-darkest': '#000000',
        // UI support blues
        'archer-blue-500': '#4d73ff',
        'archer-blue-300': '#85aeff',
        'archer-blue-200': '#a9d0ff',
        // Neutral palette
        'neutral': {
          50: '#f8f9fc',
          100: '#f4f4f4',
          200: '#e8edf3',
          300: '#d6dde6',
          400: '#a6b3c0',
          500: '#7a8b9b',
          600: '#5f6c78',
          700: '#47505a',
          800: '#2d3036',
          900: '#000000',
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
