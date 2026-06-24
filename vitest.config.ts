import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Unit tests run outside SvelteKit, so the `$app/*` virtual modules and the
// `$lib` alias are mapped to local stubs / source here.
export default defineConfig({
	resolve: {
		alias: {
			$lib: r('./src/lib'),
			'$app/paths': r('./src/test/stubs/app-paths.ts'),
			'$app/navigation': r('./src/test/stubs/app-navigation.ts'),
			'$app/environment': r('./src/test/stubs/app-environment.ts'),
			'$app/stores': r('./src/test/stubs/app-stores.ts')
		}
	},
	define: {
		// Provided by vite.config.ts at build time; stubbed for tests.
		__APP_VERSION__: '"test"'
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		clearMocks: true
	}
});
