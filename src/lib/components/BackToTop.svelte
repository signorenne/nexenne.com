<script lang="ts">
	/**
	 * "Back to top" floating button, stacked above the Tweaks gear and the "?"
	 * guide. The long articles run to several thousand words, and scrolling back
	 * by hand from the foot of one is slow, so this offers a single jump.
	 *
	 * It only appears once there is something to come back from: showing it at the
	 * top of a short page would add chrome that does nothing.
	 */
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';

	/** Reveal once a full viewport has been scrolled past. */
	const REVEAL_AFTER = 1;

	let visible = false;

	function update() {
		visible = window.scrollY > window.innerHeight * REVEAL_AFTER;
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
		};
	});
</script>

{#if visible}
	<button
		type="button"
		class="totop-fab"
		on:click={toTop}
		aria-label={$t('a11y.toTop')}
		title={$t('a11y.toTop')}
		data-hover
	>
		<span aria-hidden="true">↑</span>
	</button>
{/if}

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
		animation: totop-in var(--t-med) var(--ease-out) both;
		transition:
			transform var(--t-med) var(--ease-out),
			border-color var(--t-med) var(--ease-out),
			color var(--t-med) var(--ease-out);
	}
	/* Mouse-only, like the gear and the "?": avoids a stuck transform on touch. */
	@media (hover: hover) {
		.totop-fab:hover {
			transform: translateY(-2px);
			border-color: var(--accent);
			color: var(--accent);
		}
	}
	.totop-fab:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	@keyframes totop-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	:global(.motion-off) .totop-fab {
		animation: none;
		transition: none;
	}
</style>
