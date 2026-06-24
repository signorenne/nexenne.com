import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { t } from '$lib/i18n';
import { showToast } from '$lib/stores/toast';

export interface Tweaks {
	theme: 'system' | 'dark' | 'light';
	accent: 'violet' | 'cyan' | 'coral' | 'lime' | 'amber';
	font: 'mono-sans' | 'serif-sans' | 'all-sans' | 'serif-mono';
	hero: 'stack' | 'orbit' | 'terminal' | 'bento';
	density: 'comfortable' | 'compact';
	motion: boolean;
	resizeHud: boolean;
	nav: 'sidemap' | 'topbar';
	workCard: 'bento' | 'list';
}

const DEFAULTS: Tweaks = {
	theme: 'system',
	accent: 'violet',
	font: 'mono-sans',
	hero: 'stack',
	density: 'comfortable',
	motion: true,
	resizeHud: false,
	nav: 'sidemap',
	workCard: 'bento'
};

function loadInitial(): Tweaks {
	if (!browser) return DEFAULTS;
	try {
		const stored = JSON.parse(localStorage.getItem('nexenne.tweaks') || '{}');

		const accent = stored.accent === 'mono' ? 'amber' : stored.accent;
		// With no explicit choice, follow the OS "reduce motion" setting.
		const motion =
			stored.motion === undefined
				? !window.matchMedia('(prefers-reduced-motion: reduce)').matches
				: stored.motion;
		return { ...DEFAULTS, ...stored, accent, motion, density: 'comfortable' };
	} catch {
		return DEFAULTS;
	}
}

export const tweaks = writable<Tweaks>(loadInitial());

export const theme = writable<'dark' | 'light'>('dark');

function resolveTheme(t: Tweaks['theme']): 'dark' | 'light' {
	if (t === 'system') {
		return browser && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	}
	return t;
}

if (browser) {
	tweaks.subscribe((t) => {
		const root = document.documentElement;
		const resolved = resolveTheme(t.theme);
		root.setAttribute('data-theme', resolved);
		root.setAttribute('data-density', t.density);
		root.className = 'accent-' + t.accent + ' font-' + t.font + (t.motion ? '' : ' motion-off');
		theme.set(resolved);
		try {
			localStorage.setItem('nexenne.tweaks', JSON.stringify(t));
		} catch {}
	});

	const mq = window.matchMedia('(prefers-color-scheme: light)');
	mq.addEventListener('change', () => {
		tweaks.update((t) => ({ ...t }));
	});
}

export function cycleTheme() {
	tweaks.update((tw) => {
		const resolved = resolveTheme(tw.theme);
		const next = resolved === 'dark' ? 'light' : 'dark';
		return { ...tw, theme: next };
	});
	// `theme` is updated synchronously by the subscriber above; confirm the change.
	if (browser) showToast(get(t)(`toast.theme.${get(theme)}`));
}
