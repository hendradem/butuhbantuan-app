/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      // Add paths that will be common across apps
      "../../packages/ui/**/*.{js,ts,jsx,tsx}",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Your shared theme extensions
      },
    },
    plugins: [],
  }