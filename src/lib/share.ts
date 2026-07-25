import { get } from 'svelte/store';
import { t } from '$lib/i18n';
import { showToast } from '$lib/stores/toast';

/**
 * Copy text to the clipboard, reporting whether it worked so callers can pick
 * their own confirmation. Falls back to a hidden textarea because the async
 * clipboard API is unavailable outside secure contexts and in some in-app
 * browsers.
 *
 * @param text The text to place on the clipboard.
 * @return True when the text was copied, false when every attempt failed.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// fall through to the textarea path below
	}

	try {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand('copy');
		textarea.remove();
		return copied;
	} catch {
		return false;
	}
}

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
