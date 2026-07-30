<script lang="ts">
	/**
	 * "Back to top" floating button, stacked above the Tweaks gear and the "?"
	 * guide. The long articles run to several thousand words, and scrolling back
	 * by hand from the foot of one is slow, so this offers a single jump.
	 *
	 * It only appears once there is something to come back from: showing it at the
	 * top of a short page would add chrome that does nothing. It stays mounted and
	 * fades rather than being toggled with `{#if}`, so crossing the threshold does
	 * not tear the button down and rebuild it mid-scroll.
	 */
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';

	/** Reveal once a full viewport has been scrolled past. */
	const REVEAL_AFTER = 1;

	let visible = false;

	function update() {
		visible = window.scrollY > window.innerHeight * REVEAL_AFTER;
		// The Tweaks and guide panels open above the whole stack, but they live in
		// their own components, so the presence of this button travels as a root
		// class their slot variable reads (--fab-slot-panel in app.css). Without it
		// they clear a slot that holds nothing until the first viewport is passed.
		document.documentElement.classList.toggle('has-totop', visible);
	}

	function toTop() {
		// The `motion-off` preference is a site tweak, not a media query, so the
		// smooth scroll has to be opted out of explicitly.
		const reduced = document.documentElement.classList.contains('motion-off');
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
	}

	onMount(() => {
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update, { passive: true });
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
			document.documentElement.classList.remove('has-totop');
		};
	});
</script>

<button
	type="button"
	class="totop-fab"
	class:is-visible={visible}
	on:click={toTop}
	aria-label={$t('a11y.toTop')}
	title={$t('a11y.toTop')}
	data-hover
>
	<span aria-hidden="true">↑</span>
</button>

<style>
	.totop-fab {
		position: fixed;
		/* Shares the size, edge and gap the other FABs use, and sits in the slot
		   above them (see --fab-slot-top in app.css, which accounts for the "?"
		   being hidden on touch). */
		right: var(--fab-edge, 20px);
		bottom: var(--fab-slot-top);
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
		/* Same layer pin and hover curve as the other two FABs: see NavGuide.svelte
		   for why --ease-out is wrong here and why the layer has to be held. */
		will-change: transform;
		transition:
			opacity var(--t-fast) var(--ease),
			visibility var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease),
			border-color var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease);
		/* Hidden state. `visibility` also keeps the button out of the tab order and
		   the accessibility tree while it is not offered, and it interpolates as
		   "visible" for the whole duration, so the fade plays in both directions. */
		opacity: 0;
		visibility: hidden;
		transform: translateY(6px);
	}
	.totop-fab.is-visible {
		opacity: 1;
		visibility: visible;
		transform: none;
	}
	/* Mouse-only, like the gear and the "?": avoids a stuck transform on touch.
	   Scale rather than lift: a button that moves up slides out from under a
	   pointer resting near its lower edge, which drops the hover, springs it back
	   down under the pointer and starts the whole thing again. */
	@media (hover: hover) {
		.totop-fab.is-visible:hover {
			transform: scale(1.05);
			border-color: var(--accent);
			color: var(--accent);
		}
	}
	.totop-fab:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	:global(.motion-off) .totop-fab {
		transition: none;
	}
</style>
