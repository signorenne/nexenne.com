<script lang="ts">
	import { onDestroy, onMount, tick as svelteTick } from 'svelte';

	export let items: string[] = [];
	export let durationMs = 64000;

	$: doubled = [...items, ...items];

	let trackEl: HTMLDivElement;
	let anim: Animation | null = null;
	let halfWidth = 0;
	let resizeObs: ResizeObserver | null = null;
	let lastItemsKey = '';

	function measureHalf(): number {
		if (!trackEl) return 0;
		const w = trackEl.scrollWidth;

		return w / 2;
	}

	function buildAnimation(preservePhase = true) {
		if (!trackEl) return;
		halfWidth = measureHalf();
		if (halfWidth <= 0) return;

		let progress = 0;
		if (anim && preservePhase) {
			const ct = Number(anim.currentTime ?? 0);
			progress = (ct % durationMs) / durationMs;
		}
		if (anim) {
			anim.cancel();
			anim = null;
		}

		anim = trackEl.animate(
			[{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-halfWidth}px, 0, 0)` }],
			{
				duration: durationMs,
				iterations: Infinity,
				easing: 'linear',
				composite: 'replace'
			}
		);
		anim.currentTime = progress * durationMs;
	}

	onMount(() => {
		lastItemsKey = items.join('');
		buildAnimation(false);

		if (document.fonts && 'ready' in document.fonts) {
			document.fonts.ready.then(() => {
				const w = measureHalf();
				if (Math.abs(w - halfWidth) > 0.5) buildAnimation(false);
			});
		}

		resizeObs = new ResizeObserver(() => {
			if (!trackEl) return;
			const w = measureHalf();
			if (Math.abs(w - halfWidth) > 0.5) buildAnimation(true);
		});
		resizeObs.observe(trackEl);

		return () => {
			resizeObs?.disconnect();
			resizeObs = null;
		};
	});

	$: if (typeof window !== 'undefined' && trackEl) {
		const key = items.join('');
		if (key !== lastItemsKey) {
			lastItemsKey = key;
			svelteTick().then(() => buildAnimation(true));
		}
	}

	onDestroy(() => {
		if (anim) anim.cancel();
		resizeObs?.disconnect();
	});
</script>

<div class="marquee" role="marquee" aria-hidden="true">
	<div class="marquee-track" bind:this={trackEl}>
		{#each doubled as t, i (i)}
			<span class="marquee-item">
				<span class="marquee-label">{t}</span>
				<span class="dot" aria-hidden="true">●</span>
			</span>
		{/each}
	</div>
</div>
