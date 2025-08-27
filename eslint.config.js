import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import turboPlugin from "eslint-plugin-turbo";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import filenameRules from "eslint-plugin-filename-rules";
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  // TypeScript 소스 파일에만 타입 체크 규칙 적용
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 타입 정보가 필요한 규칙들만 여기에 적용
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  },
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      prettier,
      'filename-rules': filenameRules,
      'sort-destructure-keys': sortDestructureKeys,
    },
    rules: {
      // Stylistic 규칙들
      '@stylistic/comma-dangle': ['error', 'only-multiline'],

      // TypeScript 규칙들
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['variable'],
          format: ['camelCase', 'UPPER_CASE', 'snake_case', 'PascalCase'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will', 'use'],
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
        {
          selector: ['parameter'],
          leadingUnderscore: 'allow',
          format: ['camelCase', 'snake_case', 'PascalCase'],
        },
        {
          selector: ['function'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: ['typeLike'],
          format: ['PascalCase'],
        },
        {
          selector: ['class'],
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/type-annotation-spacing': [
        'error',
        {
          before: false,
          after: true,
          overrides: {
            arrow: {
              before: true,
              after: true,
            },
          },
        },
      ],

      // JavaScript 기본 규칙들
      'brace-style': ['error', '1tbs'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-else-return': ['error', { allowElseIf: true }],
      'no-lonely-if': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-var': 'error',
      'object-property-newline': [
        'error',
        { allowAllPropertiesOnSameLine: false },
      ],
      'one-var': ['error', 'never'],
      'prefer-template': 'error',

      // Import 규칙들
      'import/no-unresolved': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'type',
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],

      // Prettier 규칙들
      'prettier/prettier': 'error',

      // 파일명 규칙들 - kebab-case 파일명 강제 (일단 주석 처리)
      // 'filename-rules/match': ['error', /^([a-z0-9]+-)*[a-z0-9]+(?:\..*)?$/],

      // 구조분해 할당 정렬 규칙
      'sort-destructure-keys/sort-destructure-keys': [
        'error',
        {
          caseSensitive: true,
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },
];
