import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const commonLanguageOptions = {
    ecmaVersion: 2023,
    sourceType: 'module',
};

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/build/**', '**/.next/**', '**/node_modules/**'],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ...commonLanguageOptions,
            globals: {
                ...globals.es2021,
            },
        },
        rules: {
            'no-console': 'warn',
            'no-debugger': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: ['apps/web/**/*.{js,jsx,ts,tsx}', 'apps/landing/**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ...commonLanguageOptions,
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: ['apps/api/**/*.{js,ts}'],
        languageOptions: {
            ...commonLanguageOptions,
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
    },
    {
        files: ['**/*.{cjs,mjs,cts,mts}'],
        languageOptions: {
            ...commonLanguageOptions,
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
    },
);
