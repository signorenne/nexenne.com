/**
 * Language-aware link helpers, the single source of truth for internal links.
 *
 * English lives at the site root and Italian under /it/, so every internal link
 * must go through these helpers rather than being built by hand. They add the
 * SvelteKit base path and the language prefix consistently.
 */
import { base } from '$app/paths';
import { goto } from '$app/navigation';
import { derived, get } from 'svelte/store';
import { lang } from '$lib/i18n';
import type { Lang } from '$lib/i18n';

const prefixFor = (l: Lang) => (l === 'it' ? '/it' : '');

/**
 * Turn an app-absolute path into a full href for the given language, including
 * the SvelteKit base path.
 *
 * @param path App-absolute path, for example /about/.
 * @param l    Target language. Defaults to the current language store.
 * @return The full href, for example /about/ or /it/about/.
 */
export function lpath(path: string, l?: Lang): string {
	return `${base}${prefixFor(l ?? get(lang))}${path}`;
}

/**
 * Reactive variant of lpath for templates, used as href={$lhref('/about/')}.
 * Recomputes whenever the language changes.
 */
export const lhref = derived(lang, ($lang) => (path: string) => lpath(path, $lang));

/**
 * Navigate to a path while keeping the user in the current language.
 *
 * @param path App-absolute path to navigate to.
 */
export function lgoto(path: string): void {
	goto(lpath(path));
}

/**
 * Return the same page in the other language, keeping the rest of the path.
 * For example /about/ becomes /it/about/, and /it/about/ becomes /about/.
 *
 * @param pathname Current pathname, which may include the base path.
 * @return The mirrored pathname in the other language.
 */
export function mirrorPath(pathname: string): string {
	const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
	if (rest === '/it' || rest.startsWith('/it/')) {
		return `${base}${rest.slice(3) || '/'}`;
	}
	return `${base}/it${rest}`;
}

/**
 * Derive the content language from a route's optional lang param.
 *
 * @param param The optional [[lang]] route param.
 * @return "it" when the param is "it", otherwise "en".
 */
export function langFromParam(param: string | undefined): Lang {
	return param === 'it' ? 'it' : 'en';
}

/**
 * Detect the language straight from a pathname. Unlike langFromParam this works
 * even when no route matched (e.g. the 404 fallback for an unknown /it/… URL),
 * so the error/404 page shows the language the visitor is actually browsing.
 *
 * @param pathname Current pathname, which may include the base path.
 * @return "it" for /it or /it/… , otherwise "en".
 */
export function langFromPath(pathname: string): Lang {
	const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
	return rest === '/it' || rest.startsWith('/it/') ? 'it' : 'en';
}

/**
 * Strip both the SvelteKit base path and the /it language prefix from a
 * pathname, so route detection (active nav, page stamp) behaves the same in
 * either language.
 *
 * @param pathname Current pathname, which may include the base and language.
 * @return A leading-slash path with no base or language prefix, for example
 *         /about/.
 */
export function stripLang(pathname: string): string {
	const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
	if (rest === '/it' || rest.startsWith('/it/')) return rest.slice(3) || '/';
	return rest || '/';
}
