import tsEslint from 'typescript-eslint'

export default tsEslint.config(
  {
    ignores: [
      'out/**',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.pipeline/**',
      'test-results/**',
      'playwright-report/**'
    ]
  },
  ...tsEslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
    }
  }
)
