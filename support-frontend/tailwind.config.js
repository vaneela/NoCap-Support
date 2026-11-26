/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          50: '#FFF0FC',
          100: '#FFDDF8',
          200: '#FFBAF1',
          300: '#FF86E6',
          400: '#FF4FD8',
          500: '#F91FC6',
          600: '#D90BA8',
          700: '#B00787',
          800: '#8C0A6C',
          900: '#6E0C56',
        },
        cyber: {
          50: '#ECFEFF',
          100: '#C9FBFF',
          300: '#67F5FF',
          400: '#22E8FF',
          500: '#00CFEF',
          600: '#00A6C7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(249,31,198,0.18), 0 8px 24px -8px rgba(249,31,198,0.55)',
        'neon-lg': '0 0 0 1px rgba(249,31,198,0.2), 0 16px 40px -12px rgba(249,31,198,0.6)',
        cyber: '0 0 0 1px rgba(34,232,255,0.25), 0 8px 24px -8px rgba(34,232,255,0.6)',
      },
      backgroundImage: {
        'neon-gradient': 'linear-gradient(135deg, #F91FC6 0%, #A855F7 50%, #22E8FF 100%)',
      },
    },
  },
  plugins: [],
};
