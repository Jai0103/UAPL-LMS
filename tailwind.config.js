export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        aviation: {
          navy: "#0B1F3A",
          blue: "#2563EB",
          sky: "#38BDF8",
          mint: "#14B8A6",
          amber: "#F59E0B"
        }
      },
      boxShadow: {
        premium: "0 24px 70px rgba(15, 23, 42, 0.16)"
      }
    }
  },
  plugins: []
};
