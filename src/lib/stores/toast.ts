import { writable, get } from 'svelte/store';

export type ToastTone = 'default' | 'success' | 'error';

export interface ToastAction {
	label: string;
	run: () => void;
}

export interface Toast {
	id: number;
	message: string;
	tone: ToastTone;
	action?: ToastAction;
}

export interface ToastOptions {
	tone?: ToastTone;
	// Auto-dismiss delay in ms.
	ms?: number;
	// Optional action button, for example Undo.
	action?: ToastAction;
	// Collapse an identical trailing toast instead of stacking it. Default true.
	dedupe?: boolean;
}

export const toasts = writable<Toast[]>([]);

let counter = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function scheduleRemoval(id: number, ms: number): void {
	const existing = timers.get(id);
	if (existing) clearTimeout(existing);
	timers.set(
		id,
		setTimeout(() => dismissToast(id), ms)
	);
}

/**
 * Show a transient toast at the bottom of the screen.
 *
 * @param message The text to display.
 * @param opts    Tone, auto-dismiss delay, optional action, and dedupe flag.
 * @return The id of the toast (existing id when an identical one is refreshed).
 */
export function showToast(message: string, opts: ToastOptions = {}): number {
	const { tone = 'default', ms = 2400, action, dedupe = true } = opts;

	// Refresh the timer on an identical trailing toast rather than stacking it,
	// so hammering Cmd+E doesn't pile up duplicates.
	const list = get(toasts);
	const last = list[list.length - 1];
	if (dedupe && last && last.message === message && last.tone === tone && !action && !last.action) {
		scheduleRemoval(last.id, ms);
		return last.id;
	}

	const id = ++counter;
	toasts.update((l) => [...l, { id, message, tone, action }]);
	scheduleRemoval(id, ms);
	return id;
}

/**
 * Remove a toast. Used by auto-dismiss, click-to-dismiss, and action buttons.
 *
 * @param id The id returned by showToast.
 */
export function dismissToast(id: number): void {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	toasts.update((l) => l.filter((t) => t.id !== id));
}
