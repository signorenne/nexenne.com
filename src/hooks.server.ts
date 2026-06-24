import type { Handle } from '@sveltejs/kit';

/**
 * Set the prerendered html lang attribute from the URL so crawlers see the
 * right language: English at the root, Italian under /it/. The client boot
 * script in app.html keeps it correct during in-app navigation.
 *
 * @param event   The request event; its URL decides the language.
 * @param resolve Renders the response and lets us transform the HTML.
 * @return The rendered response with the lang placeholder filled in.
 */
export const handle: Handle = ({ event, resolve }) => {
	const { pathname } = event.url;
	const lang = pathname === '/it' || pathname.startsWith('/it/') ? 'it' : 'en';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
