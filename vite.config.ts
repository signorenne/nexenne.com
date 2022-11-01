import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

/**
 * Resolve the app version at build time.
 * Order: explicit CI override -> latest git tag -> v0.0.0 fallback.
 * Versions follow `v0.0.0` releases with `v0.0.0-rc.0` release candidates.
 */
function resolveVersion(): string {
	const override = process.env.PUBLIC_APP_VERSION || process.env.APP_VERSION;
	if (override && override.trim()) return override.trim();

	try {
		const tag = execSync('git describe --tags --abbrev=0', {
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim();
		if (tag) return tag;
	} catch {
		// No tags, or git is unavailable, so fall through to the default.
	}

	return 'v0.0.0';
}

/** Short hash of the last commit (e.g. "a1b2c3d"), or "" when git is unavailable. */
function resolveCommitHash(): string {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return '';
	}
}

/** Date of the last commit as YYYY-MM-DD, falling back to "" when unavailable. */
function resolveCommitDate(): string {
	try {
		return execSync('git log -1 --format=%cd --date=short', {
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim();
	} catch {
		return '';
	}
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(resolveVersion()),
		__GIT_COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
		__GIT_COMMIT_DATE__: JSON.stringify(resolveCommitDate())
	}
});
