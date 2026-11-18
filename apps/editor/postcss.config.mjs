// Tailwind v4 runs as a PostCSS plugin. This styles the EDITOR UI only — never the user's site.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
