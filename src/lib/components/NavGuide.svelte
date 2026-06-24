<script lang="ts">
	/**
	 * First-visit navigation guide. A small "?" button (left of the Tweaks gear)
	 * opens a popover listing the keyboard shortcuts that drive the site:
	 *   - Space        quick menu (see LeaderMenu.svelte)
	 *   - ⌘/Ctrl + K   search palette (see CommandPalette.svelte)
	 *   - ⌘/Ctrl + J   toggle theme
	 *   - ⌘/Ctrl + E   copy email
	 *
	 * The popover auto-opens once, on the first visit, then stays closed (the
	 * choice is remembered in localStorage, mirroring LangSuggest). The button
	 * stays available so a returning visitor can reopen the guide at any time.
	 */
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';

	// Set once the guide has been seen (opened then dismissed, or dismissed
	// straight away), so the first-visit auto-open never fires twice.
	const STORAGE_KEY = 'nexenne.navGuide';

	let open = false;
	let panelEl: HTMLDivElement;

	// Apple keyboards use ⌘; everything else uses Ctrl. Resolved on the client.
	let mod = '⌘';

	$: shortcuts = [
		{ keys: ['Space'], label: $t('guide.d.menu') },
		{ keys: [mod, 'K'], label: $t('guide.d.search') },
		{ keys: [mod, 'J'], label: $t('guide.d.theme') },
		{ keys: [mod, 'E'], label: $t('guide.d.email') }
	];

	function remember() {
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// localStorage blocked (private mode); nothing to persist.
		}
	}

	function toggle() {
		open = !open;
		if (open) remember();
	}

	function dismiss() {
		open = false;
		remember();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			dismiss();
		}
	}

	function onClickOutside(e: MouseEvent) {
		if (!open || !panelEl) return;
		const target = e.target as Node | null;
		if (target && !panelEl.contains(target)) open = false;
	}

	onMount(() => {
		const uaPlatform = (navigator as Navigator & { userAgentData?: { platform?: string } })
			.userAgentData?.platform;
		const isMac = /mac|iphone|ipad|ipod/i.test(
			uaPlatform || navigator.platform || navigator.userAgent
		);
		mod = isMac ? '⌘' : 'Ctrl';

		// The guide only documents keyboard shortcuts, which don't exist on touch
		// devices. The button is hidden there via CSS; also skip the auto-open so
		// the popover never flashes on a phone.
		if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

		// Auto-open on the very first visit only.
		try {
			if (!localStorage.getItem(STORAGE_KEY)) open = true;
		} catch {
			// localStorage blocked: skip the auto-open, keep the button usable.
		}

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<svelte:window on:click={onClickOutside} />

<button
	class="guide-fab"
	class:is-open={open}
	on:click|stopPropagation={toggle}
	aria-label={$t('guide.fab')}
	aria-expanded={open}
	data-hover
>
	<span aria-hidden="true">?</span>
</button>

{#if open}
	<div
		bind:this={panelEl}
		class="guide-panel"
		role="dialog"
		aria-modal="false"
		aria-label={$t('guide.title')}
	>
		<header class="guide-head">
			<span class="guide-eyebrow"
				><span class="dot" aria-hidden="true"></span>{$t('guide.title')}</span
			>
			<button class="guide-close" on:click={dismiss} aria-label={$t('guide.dismiss')}>×</button>
		</header>

		<p class="guide-lede">{$t('guide.lede')}</p>

		<ul class="guide-list">
			{#each shortcuts as s (s.label)}
				<li class="guide-item">
					<span class="guide-keys" aria-hidden="true">
						{#each s.keys as k, i (k)}
							{#if i > 0}<span class="guide-plus">+</span>{/if}
							<kbd>{k}</kbd>
						{/each}
					</span>
					<span class="guide-label">{s.label}</span>
				</li>
			{/each}
		</ul>

		<footer class="guide-foot">
			<span class="guide-foot-text">{$t('guide.foot')}</span>
			<button class="guide-cta" on:click={dismiss} data-hover>{$t('guide.dismiss')}</button>
		</footer>
	</div>
{/if}

<style>
	.guide-fab {
		position: fixed;
		/* Shares the Tweaks FAB's size/edge/gap (defined in app.css :root) and sits
		   one slot directly above the gear, so the two stay aligned and consistent. */
		right: var(--fab-edge, 20px);
		bottom: calc(var(--fab-edge, 20px) + var(--fab-size, 46px) + var(--fab-gap, 12px));
		z-index: 80;
		width: var(--fab-size, 46px);
		height: var(--fab-size, 46px);
		display: grid;
		place-items: center;
		background: var(--bg-elev);
		color: var(--ink);
		border: 1px solid var(--line-2);
		border-radius: 50%;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 20px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
		transition:
			transform var(--t-med) var(--ease-out),
			border-color var(--t-med) var(--ease-out),
			color var(--t-med) var(--ease-out);
	}
	/* Mouse-only, like the tweaks gear: avoids a stuck rotation on touch. */
	@media (hover: hover) {
		.guide-fab:hover {
			transform: rotate(-12deg) scale(1.05);
			border-color: var(--accent);
			color: var(--accent);
		}
	}
	.guide-fab.is-open {
		transform: rotate(45deg);
		border-color: var(--accent);
		color: var(--accent);
	}

	.guide-panel {
		position: fixed;
		right: var(--fab-edge, 20px);
		/* Opens above both FABs, the same spot the Tweaks panel uses, so the two
		   menus appear in an identical position. */
		bottom: calc(var(--fab-edge, 20px) + 2 * (var(--fab-size, 46px) + var(--fab-gap, 12px)));
		z-index: 79;
		width: min(320px, calc(100vw - 2 * var(--fab-edge, 20px)));
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		background: var(--bg-elev);
		border: 1px solid var(--line-2);
		border-radius: var(--r-md);
		box-shadow: var(--shadow);
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font-family: var(--font-mono);
		animation: guide-pop 260ms var(--ease-out);
	}
	@keyframes guide-pop {
		from {
			transform: translateY(8px) scale(0.98);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}

	.guide-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.guide-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.guide-eyebrow .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}
	.guide-close {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 18px;
		line-height: 1;
		padding: 0 2px;
		cursor: pointer;
		transition: color 0.15s ease;
	}
	.guide-close:hover {
		color: var(--ink);
	}

	.guide-lede {
		margin: 0;
		font-family: var(--font-sans, inherit);
		font-size: 13px;
		line-height: 1.5;
		color: var(--ink-2);
	}

	.guide-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.guide-item {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.guide-keys {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex: none;
		min-width: 84px;
	}
	.guide-keys kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--ink);
		background: color-mix(in oklab, var(--ink) 6%, transparent);
		border: 1px solid var(--line-2);
		border-radius: 4px;
	}
	.guide-plus {
		color: var(--muted);
		font-size: 11px;
	}
	.guide-label {
		flex: 1 1 auto;
		font-family: var(--font-sans, inherit);
		font-size: 13px;
		color: var(--ink);
	}

	.guide-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding-top: 10px;
		border-top: 1px dashed var(--line);
	}
	.guide-foot-text {
		font-size: 11px;
		color: var(--muted);
		line-height: 1.4;
	}
	.guide-cta {
		appearance: none;
		background: transparent;
		border: 1px solid var(--line);
		color: var(--ink);
		padding: 5px 10px;
		font: inherit;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		flex: none;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.guide-cta:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	:global(.motion-off) .guide-panel {
		animation: none;
	}

	/* Keyboard-only feature: no keyboard on touch devices, so hide it entirely. */
	@media (hover: none), (pointer: coarse) {
		.guide-fab,
		.guide-panel {
			display: none !important;
		}
	}

	@media print {
		.guide-fab,
		.guide-panel {
			display: none !important;
		}
	}
</style>
