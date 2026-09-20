/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        barber: {
          50:  'rgb(var(--barber-50)  / <alpha-value>)',
          100: 'rgb(var(--barber-100) / <alpha-value>)',
          200: 'rgb(var(--barber-200) / <alpha-value>)',
          300: 'rgb(var(--barber-300) / <alpha-value>)',
          400: 'rgb(var(--barber-400) / <alpha-value>)',
          500: 'rgb(var(--barber-500) / <alpha-value>)',
          600: 'rgb(var(--barber-600) / <alpha-value>)',
          700: 'rgb(var(--barber-700) / <alpha-value>)',
          800: 'rgb(var(--barber-800) / <alpha-value>)',
          900: 'rgb(var(--barber-900) / <alpha-value>)',
        },
        dark: {
          900: 'rgb(var(--dark-900) / <alpha-value>)',
          800: 'rgb(var(--dark-800) / <alpha-value>)',
          700: 'rgb(var(--dark-700) / <alpha-value>)',
          600: 'rgb(var(--dark-600) / <alpha-value>)',
          500: 'rgb(var(--dark-500) / <alpha-value>)',
          400: 'rgb(var(--dark-400) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        amharic: ['"Noto Sans Ethiopic"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
