/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFF7ED',
        primary: '#F59E0B',
        'text-primary': '#1E293B',
        'text-secondary': '#475569',
        glass: 'rgba(255, 255, 255, 0.75)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #FDBA74, #F59E0B)',
      },
      boxShadow: {
        'soft': '0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px -8px rgba(0, 0, 0, 0.12)',
      },
      backdropBlur: {
        'glass': '20px',
      },
    },
  },
  plugins: [],
}