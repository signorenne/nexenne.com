// Stub of SvelteKit's $app/navigation for unit tests. `goto` records its calls
// so tests can assert navigation targets without a real router.
export const goto: ((url: string | URL, opts?: unknown) => Promise<void>) & {
	calls: Array<string | URL>;
} = Object.assign(
	(url: string | URL) => {
		goto.calls.push(url);
		return Promise.resolve();
	},
	{ calls: [] as Array<string | URL> }
);

export function invalidateAll(): Promise<void> {
	return Promise.resolve();
}
