/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

const spacing = Array.from({ length: 1000 }, (_, index) => index + 1).reduce(
  (acc, curr) => ({ ...acc, [`${curr}px`]: `${curr}px` }),
  {},
)

module.exports = {
  important: '#app',
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    colors: {
      theme: {
        primary: 'var(--el-color-primary)',
        success: 'var(--el-color-success)',
        warning: 'var(--el-color-warning)',
        danger: 'var(--el-color-error)',
        error: 'var(--el-color-error)',
        info: 'var(--el-color-info)',
      },
      white: '#fff',
      black: '#000',
      transparent: 'transparent', // 透明色
    },
    extend: {
      spacing,
    },
    fontSize: {
      ...spacing,
    },
    maxHeight: {
      ...spacing,
    },
    minHeight: {
      ...spacing,
    },
    maxWidth: {
      ...spacing,
    },
    minWidth: {
      ...spacing,
    },
    fontWeight: {
      400: '400',
      500: '500',
      600: '600',
      700: '700',
      800: '800',
      900: '900',
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        '.el-button': {
          'background-color': 'var(--el-button-bg-color,var(--el-color-white))',
        },
      })
    },
    plugin(({ addComponents, matchUtilities, theme }) => {
      matchUtilities(
        {
          lh: value => ({
            'line-height': value,
          }),
        },
        { values: theme('lh') },
      )

      matchUtilities(
        {
          br: value => ({
            'border-radius': value,
          }),
        },
        { values: theme('br') },
      )

      matchUtilities(
        {
          fw: value => ({
            'font-weight': value,
          }),
        },
        { values: theme('fw') },
      )

      addComponents({})
    }),
  ],
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
  },
}
