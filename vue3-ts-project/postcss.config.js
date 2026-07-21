export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {
        overrideBrowserslist: ['Chrome >= 52', 'Firefox >= 52', 'Safari >= 10.1', 'iOS >= 10.3', 'Android >= 5', 'ie >= 11'],
    },
  },
}
