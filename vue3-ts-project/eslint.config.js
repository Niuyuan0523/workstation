export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**'],
  },

  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // 基础规则
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-unused-vars': 'off',
      'no-duplicate-imports': 'error',
      
      // Vue 规则
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'error',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-spacing': 'error',
      'vue/no-static-inline-styles': 'off',
      
      // 代码风格
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
]
