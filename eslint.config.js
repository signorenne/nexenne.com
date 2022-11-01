import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const browserAndNodeGlobals = {
	...globals.browser,
	...globals.node,
	...globals.es2024
};

export default [
	js.configs.recommended,
	{
		files: ['**/*.{js,ts,mjs,cjs}'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: browserAndNodeGlobals
		},
		plugins: { '@typescript-eslint': ts },
		rules: {
			...ts.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-useless-assignment': 'off',
			'no-unused-vars': 'off',
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: { parser: tsParser, extraFileExtensions: ['.svelte'] },
			globals: browserAndNodeGlobals
		},
		plugins: { svelte, '@typescript-eslint': ts },
		rules: {
			...svelte.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-useless-assignment': 'off',
			'no-unused-vars': 'off',
			'no-undef': 'off',
			'svelte/no-at-html-tags': 'off'
		}
	},
	prettier,
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'static/', 'content/']
	}
];
