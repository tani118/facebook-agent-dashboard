/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e4d91", // Blue color similar to the one used in the expected frontend
      },
    },
  },
  plugins: [],
}