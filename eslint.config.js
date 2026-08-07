import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

// Deliberately small. tsc --strict already covers types and unused locals, so ESLint is
// here for the one class of bug tsc cannot see: unawaited promises. Almost everything the
// extension host does is async, and a dropped await silently skips a settings write.
export default tseslint.config(
  { ignores: ['themes/', 'icons/', 'dist/', 'node_modules/', 'src/generated.ts', '*.vsix'] },

  js.configs.recommended,

  // Type-aware linting is scoped to src: it needs a tsconfig project, and neither the flat
  // config nor the CommonJS test harness is in one.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // One way to name a module. A relative path survives a file move by silently pointing
      // somewhere else, and two spellings for the same import make a module look like two.
      'no-restricted-imports': ['error', { patterns: ['./*', '../*'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // The build reads generated JSON whose shape is asserted by src/scripts/check.ts.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // The harness has to be CommonJS: it intercepts Module._load to stub `vscode` before
  // requiring the bundle, which ESM cannot do.
  {
    files: ['test/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },

  prettier,
)
