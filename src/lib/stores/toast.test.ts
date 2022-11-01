import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { toasts, showToast, dismissToast } from '$lib/stores/toast';

beforeEach(() => {
	vi.useFakeTimers();
	toasts.set([]);
});
afterEach(() => vi.useRealTimers());

describe('showToast', () => {
	it('adds a toast with a default tone', () => {
		showToast('Email copied');
		const list = get(toasts);
		expect(list).toHaveLength(1);
		expect(list[0].message).toBe('Email copied');
		expect(list[0].tone).toBe('default');
	});

	it('stores tone and action', () => {
		const run = vi.fn();
		showToast('Switched', { tone: 'success', action: { label: 'Undo', run } });
		const [toast] = get(toasts);
		expect(toast.tone).toBe('success');
		expect(toast.action?.label).toBe('Undo');
		toast.action?.run();
		expect(run).toHaveBeenCalledOnce();
	});

	it('gives toasts with different messages unique ids', () => {
		showToast('one');
		showToast('two');
		const [a, b] = get(toasts);
		expect(a.id).not.toBe(b.id);
		expect(get(toasts)).toHaveLength(2);
	});

	it('auto-dismisses after the timeout', () => {
		showToast('bye', { ms: 1000 });
		expect(get(toasts)).toHaveLength(1);
		vi.advanceTimersByTime(999);
		expect(get(toasts)).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(get(toasts)).toHaveLength(0);
	});

	it('removes only the expired toast, leaving newer ones', () => {
		showToast('first', { ms: 1000 });
		vi.advanceTimersByTime(400);
		showToast('second', { ms: 1000 });
		vi.advanceTimersByTime(600); // first expires at 1000, second at 600
		const list = get(toasts);
		expect(list).toHaveLength(1);
		expect(list[0].message).toBe('second');
	});
});

describe('dedupe', () => {
	it('collapses an identical trailing toast and refreshes its timer', () => {
		showToast('Email copied', { ms: 1000 });
		vi.advanceTimersByTime(800);
		showToast('Email copied', { ms: 1000 });
		expect(get(toasts)).toHaveLength(1); // not stacked
		vi.advanceTimersByTime(800); // 1600 total, would have expired the original
		expect(get(toasts)).toHaveLength(1); // timer was refreshed
		vi.advanceTimersByTime(200);
		expect(get(toasts)).toHaveLength(0);
	});

	it('does not dedupe when tones differ', () => {
		showToast('Copy', { tone: 'success' });
		showToast('Copy', { tone: 'error' });
		expect(get(toasts)).toHaveLength(2);
	});

	it('does not dedupe toasts with actions', () => {
		showToast('Switched', { action: { label: 'Undo', run: () => {} } });
		showToast('Switched', { action: { label: 'Undo', run: () => {} } });
		expect(get(toasts)).toHaveLength(2);
	});

	it('can be disabled explicitly', () => {
		showToast('hi', { dedupe: false });
		showToast('hi', { dedupe: false });
		expect(get(toasts)).toHaveLength(2);
	});
});

describe('dismissToast', () => {
	it('removes a toast by id and clears its timer', () => {
		const id = showToast('one', { ms: 1000 });
		showToast('two', { ms: 1000 });
		dismissToast(id);
		const list = get(toasts);
		expect(list).toHaveLength(1);
		expect(list[0].message).toBe('two');
	});
});
