<script lang="ts">
	import { onMount } from 'svelte';

	export let words: string[] = [];
	export let interval = 2400;

	let i = 0;
	let phase: 'in' | 'glitch' = 'in';

	onMount(() => {
		if (!words.length) return;
		let alive = true;
		const tick = () => {
			if (!alive) return;
			phase = 'glitch';
			setTimeout(() => {
				if (!alive) return;
				i = (i + 1) % words.length;
				phase = 'in';
			}, 360);
		};
		const id = setInterval(tick, interval);
		return () => {
			alive = false;
			clearInterval(id);
		};
	});

	$: w = words[i] || '';
</script>

<span class="glitch {phase === 'glitch' ? 'is-glitch' : 'is-in'}" data-text={w} aria-live="polite">
	<span class="glitch-main">{w}</span>
	<span class="glitch-r" aria-hidden="true">{w}</span>
	<span class="glitch-b" aria-hidden="true">{w}</span>
	<span class="glitch-caret" aria-hidden="true">▍</span>
</span>
