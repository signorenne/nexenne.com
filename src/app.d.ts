declare global {
	namespace App {}

	// Build-time values injected by Vite (see vite.config.ts).
	// Version from the latest git tag; commit hash + date from the last commit.
	const __APP_VERSION__: string;
	const __GIT_COMMIT_HASH__: string;
	const __GIT_COMMIT_DATE__: string;

	interface Window {
		__nexenneBootTweaks?: {
			theme: string;
			accent: string;
			font: string;
			hero: string;
			density: string;
			motion: boolean;
			resizeHud: boolean;
			nav: string;
			workCard: string;
		};
	}
}

export {};
