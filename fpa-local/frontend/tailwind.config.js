/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        card: '#12121e',
        border: '#1f1f33',
        primary: '#4f46e5',
        primaryHover: '#4338ca',
      }
    },
  },
  plugins: [],
}
