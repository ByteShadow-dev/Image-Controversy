/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        adobe: {
          dark: '#1a1a1a',
          darker: '#0d0d0d',
          panel: '#252525',
          border: '#3a3a3a',
          accent: '#0078d4',
          accentHover: '#106ebe',
          text: '#e0e0e0',
          textMuted: '#9a9a9a',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
