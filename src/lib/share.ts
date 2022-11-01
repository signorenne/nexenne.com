import { get } from 'svelte/store';
import { t } from '$lib/i18n';
import { showToast } from '$lib/stores/toast';

/**
 * Share the current page. Uses the native share sheet where available,
 * otherwise copies the link and confirms with a toast.
 *
 * @param title Title passed to the native share sheet.
 * @return A promise that resolves once the share or copy attempt finishes.
 */
export async function sharePage(title: string): Promise<void> {
	const url = typeof location !== 'undefined' ? location.href : '';
	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share({ title, url });
		} catch {
			// user dismissed the share sheet, nothing to do
		}
		return;
	}
	try {
		await navigator.clipboard?.writeText(url);
		showToast(get(t)('toast.link'), { tone: 'success' });
	} catch {
		showToast(get(t)('toast.copyfail'), { tone: 'error' });
	}
}
