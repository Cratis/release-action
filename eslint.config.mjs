// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', '.yarn/**', '*.d.ts']
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.node }
        },
        rules: {
            'semi': ['error', 'always'],
            'eqeqeq': ['error', 'smart'],
            'no-console': 'error',
            'no-irregular-whitespace': 'off',
            'no-prototype-builtins': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-module-boundary-types': 'off'
        }
    },
    {
        // Specs assert through chai's fluent `.should` interface, which reads as an unused expression.
        files: ['**/for_*/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off'
        }
    }
);
