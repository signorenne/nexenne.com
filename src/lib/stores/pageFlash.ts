import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { mirrorPath } from '$lib/paths';
import { DICT } from '$lib/i18n';
import { showToast } from '$lib/stores/toast';

export interface FlashRequest {
	id: number;
	// Optional callback to run while the overlay fully covers the screen, for
	// example to swap the language without a visible flash.
	midAction?: () => void;
}

export const pageFlash = writable<FlashRequest | null>(null);

let counter = 0;

/**
 * Show the page-transition loader briefly, running the optional callback while
 * it fully covers the screen.
 *
 * @param midAction Optional callback to run while the overlay is opaque.
 */
export function flashTransition(midAction?: () => void) {
	counter += 1;
	pageFlash.set({ id: counter, midAction });
}

/**
 * Switch language by navigating to the same page in the other language (English
 * at the root, Italian under /it/), hidden behind the loader overlay. Also shows
 * a confirmation toast with an Undo action.
 */
export function switchLanguage() {
	// A deliberate choice, so silence the auto language-suggestion banner for good.
	try {
		localStorage.setItem('nexenne.langPrompt', '1');
	} catch {
		// ignore (private mode)
	}
	const from = window.location.pathname;
	const target = mirrorPath(from);
	const rest = target.startsWith(base) ? target.slice(base.length) : target;
	const newLang = rest === '/it' || rest.startsWith('/it/') ? 'it' : 'en';
	flashTransition(() => {
		void goto(target).then(() => {
			// Confirm in the new language, with a quick Undo back to where they were.
			showToast(DICT[newLang]['toast.switched'], {
				tone: 'success',
				ms: 5000,
				action: { label: DICT[newLang]['toast.undo'], run: () => void goto(from) }
			});
		});
	});
}
