/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F5EF",
        jade: "#1E5E58",
        brick: "#BC4749",
        ink: "#243B35",
      },
    },
  },
  plugins: [],
};
