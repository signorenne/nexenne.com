// Stub of SvelteKit's $app/stores for unit tests.
import { readable } from 'svelte/store';

export const page = readable({
	url: new URL('http://localhost/'),
	params: {} as Record<string, string>
});
export const navigating = readable(null);
export const updated = readable(false);
