<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { lgoto } from '$lib/paths';
	import { cycleTheme } from '$lib/tweaks';
	import { switchLanguage } from '$lib/stores/pageFlash';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/i18n';
	import { SITE } from '$lib/data';

	export let open = false;
	export let paletteOpen = false;
	export let onOpenPalette: () => void = () => {};

	interface Node {
		key: string;
		label: string;
		glyph?: string;
		run?: () => void;
		children?: Node[];
	}

	function nav(path: string) {
		return () => lgoto(path);
	}
	function copyEmail() {
		try {
			navigator.clipboard?.writeText(SITE.email);
			showToast(get(t)('toast.email'), { tone: 'success' });
		} catch {
			showToast(get(t)('toast.copyfail'), { tone: 'error' });
		}
	}

	// Reactive so the labels follow the active language. Rebuilt on language change;
	// the menu resets to ROOT whenever it opens, so the open stack picks up the
	// new strings on the next open.
	$: ROOT = [
		{
			key: 'g',
			label: $t('leader.goto'),
			glyph: '→',
			children: [
				{ key: 'h', label: $t('leader.home'), glyph: '→', run: nav('/') },
				{ key: 'w', label: $t('leader.work'), glyph: '◆', run: nav('/work/') },
				{ key: 'b', label: $t('leader.blog'), glyph: '✎', run: nav('/blog/') },
				{ key: 's', label: $t('leader.services'), glyph: '→', run: nav('/services/') },
				{ key: 'a', label: $t('leader.about'), glyph: '→', run: nav('/about/') },
				{ key: 'r', label: $t('leader.resume'), glyph: '→', run: nav('/resume/') },
				{ key: 'c', label: $t('leader.contact'), glyph: '→', run: nav('/contact/') },
				{ key: 'u', label: $t('leader.uses'), glyph: '→', run: nav('/uses/') },
				{ key: 'n', label: $t('leader.now'), glyph: '→', run: nav('/now/') },
				{ key: 'k', label: $t('leader.card'), glyph: '▢', run: nav('/card/') },
				{ key: 'o', label: $t('leader.colophon'), glyph: '→', run: nav('/colophon/') }
			]
		},
		{ key: 's', label: $t('leader.search'), glyph: '⌕', run: () => onOpenPalette() },
		{ key: 't', label: $t('leader.theme'), glyph: '○', run: cycleTheme },
		{ key: 'l', label: $t('leader.lang'), glyph: '⇄', run: switchLanguage },
		{ key: 'e', label: $t('leader.email'), glyph: '@', run: copyEmail }
	] satisfies Node[];

	// Stack of menu levels; first entry is always ROOT.
	// Reset to [ROOT] whenever the menu opens (see onKey/reset), so this initial
	// value is never rendered; kept empty to avoid reading ROOT before it's built.
	let levels: Node[][] = [];
	let crumbs: string[] = [];
	$: current = levels[levels.length - 1];

	function reset() {
		open = false;
		levels = [ROOT];
		crumbs = [];
	}

	function back() {
		if (levels.length > 1) {
			levels = levels.slice(0, -1);
			crumbs = crumbs.slice(0, -1);
		} else {
			reset();
		}
	}

	function choose(node: Node) {
		if (node.children) {
			levels = [...levels, node.children];
			crumbs = [...crumbs, node.key];
		} else if (node.run) {
			node.run();
			reset();
		}
	}

	function isTyping(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		const tag = el.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
	}

	function onKey(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		if (!open) {
			// Space is the leader, but only when not typing and no other overlay is up.
			if (e.key === ' ' && !paletteOpen && !isTyping(e.target)) {
				e.preventDefault();
				levels = [ROOT];
				crumbs = [];
				open = true;
				(document.activeElement as HTMLElement | null)?.blur?.();
			}
			return;
		}

		// Menu is open, so capture every key.
		e.preventDefault();
		if (e.key === 'Escape' || e.key === ' ') {
			reset();
			return;
		}
		if (e.key === 'Backspace') {
			back();
			return;
		}
		const node = current.find((n) => n.key === e.key.toLowerCase());
		if (node) choose(node);
	}

	onMount(() => {
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<div class="leader-overlay" on:click={reset} role="presentation">
		<div class="leader-panel" on:click|stopPropagation role="none">
			<div class="leader-head">
				<span class="leader-crumb">
					<kbd>SPC</kbd>
					{#each crumbs as c (c)}
						<span class="leader-sep">›</span><kbd>{c}</kbd>
					{/each}
				</span>
				<span class="leader-tip"
					><kbd>esc</kbd> {$t('leader.close')} · <kbd>⌫</kbd> {$t('leader.back')}</span
				>
			</div>
			<div class="leader-grid">
				{#each current as n (n.key)}
					<button class="leader-item" on:click={() => choose(n)} data-hover>
						<kbd class="leader-key">{n.key === ' ' ? 'SPC' : n.key}</kbd>
						<span class="leader-glyph">{n.glyph ?? ''}</span>
						<span class="leader-label">{n.label}{n.children ? '' : ''}</span>
						{#if n.children}<span class="leader-more">›</span>{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
