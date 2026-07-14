/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8ECF4',
          100: '#C5CEE0',
          200: '#9BAACD',
          300: '#7085B0',
          400: '#4A6293',
          500: '#2A4476',
          600: '#1E3260',
          700: '#152449',
          800: '#0F1E3A',
          900: '#0A1528',
        },
        emerald: {
          50: '#E8F8EF',
          100: '#C5EDD7',
          200: '#9BDFB5',
          300: '#6FD08F',
          400: '#43C26E',
          500: '#1FA463',
          600: '#178A52',
          700: '#0F6E40',
          800: '#0A5230',
          900: '#063620',
        },
        sunshine: {
          50: '#FEF9E7',
          100: '#FDEFC0',
          200: '#FBE089',
          300: '#F9D04C',
          400: '#F6C445',
          500: '#EBAE1E',
          600: '#C68E15',
          700: '#9E6F0F',
          800: '#75520A',
          900: '#4C3506',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F5F6F8',
          200: '#E6E8EC',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
        'navy-gradient': 'linear-gradient(135deg, #0F1E3A 0%, #152449 50%, #1E3260 100%)',
        'emerald-gradient': 'linear-gradient(135deg, #1FA463 0%, #43C26E 100%)',
      },
    },
  },
  plugins: [],
};
