<script lang="ts">
	import { onMount } from 'svelte';
	import { tweaks } from '$lib/tweaks';

	let visible = false;
	let w = 0;
	let h = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function onResize() {
		if (!$tweaks.resizeHud) return;
		w = window.innerWidth;
		h = window.innerHeight;
		visible = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => (visible = false), 900);
	}

	onMount(() => {
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
			if (timer) clearTimeout(timer);
		};
	});
</script>

{#if visible}
	<div class="resize-hud" role="status" aria-live="polite">
		<span class="resize-hud-dim">{w}</span>
		<span class="resize-hud-x">×</span>
		<span class="resize-hud-dim">{h}</span>
		<span class="resize-hud-unit">px</span>
	</div>
{/if}

<style>
	.resize-hud {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 200;
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 12px 18px;
		border: 1px solid var(--line-2);
		border-radius: var(--r-md);
		background: color-mix(in oklab, var(--bg-elev), transparent 8%);
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow);
		font-family: var(--font-mono);
		font-size: 18px;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		pointer-events: none;
		user-select: none;
		animation: resize-hud-in 140ms var(--ease-out);
	}
	.resize-hud-x {
		color: var(--muted);
	}
	.resize-hud-unit {
		font-size: 11px;
		color: var(--muted);
	}
	@keyframes resize-hud-in {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
</style>
