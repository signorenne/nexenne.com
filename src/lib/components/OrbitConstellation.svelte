<script lang="ts">
	import { onMount } from 'svelte';
	import { SITE } from '$lib/data';
	import LogoMark from './LogoMark.svelte';

	interface Orbit {
		r: string;
		speed: number;
		dir: 'cw' | 'ccw';
		labels: string[];
	}

	const orbits: Orbit[] = [
		{ r: '20cqw', speed: 22, dir: 'cw', labels: ['Android', 'Kotlin'] },
		{ r: '32cqw', speed: 38, dir: 'ccw', labels: ['NimBLE', 'CAN · bus', 'Embedded'] },
		{ r: '44cqw', speed: 64, dir: 'cw', labels: ['C · C++', 'Qt · QML', 'LVGL', 'ESP32'] }
	];

	const items = orbits.flatMap((orbit, ringIdx) =>
		orbit.labels.map((text, i) => {
			const angle = (i / orbit.labels.length) * 360;
			const delay = -orbit.speed * (angle / 360);
			return {
				text,
				orbitR: orbit.r,
				speed: orbit.speed,
				dir: orbit.dir,
				delay,
				ringIdx
			};
		})
	);

	let stageEl: HTMLDivElement;

	onMount(() => {
		const el = stageEl;
		if (!el) return;
		const onMove = (e: MouseEvent) => {
			const r = el.getBoundingClientRect();
			const x = (e.clientX - r.left) / r.width - 0.5;
			const y = (e.clientY - r.top) / r.height - 0.5;
			el.style.setProperty('--mx', x.toFixed(3));
			el.style.setProperty('--my', y.toFixed(3));
		};
		const onLeave = () => {
			el.style.setProperty('--mx', '0');
			el.style.setProperty('--my', '0');
		};
		el.addEventListener('mousemove', onMove);
		el.addEventListener('mouseleave', onLeave);
		return () => {
			el.removeEventListener('mousemove', onMove);
			el.removeEventListener('mouseleave', onLeave);
		};
	});
</script>

<div class="constel-stage" bind:this={stageEl}>
	<div class="constel-bg" aria-hidden="true"></div>

	<div class="constel-readout tl">
		<span class="k">NODE</span><span class="v">{SITE.short}</span>
		<span class="k">DOMAIN</span><span class="v">EMBEDDED · AUTO · HMI</span>
	</div>
	<div class="constel-readout tr">
		<span class="k">CTX</span><span class="v">Bergamo · IT</span>
		<span class="k">REV</span><span class="v">{SITE.revision}</span>
	</div>
	<div class="constel-readout br">
		<span class="k">EDGES</span><span class="v">{items.length}</span>
		<span class="k">SYS</span><span class="v">LIVE</span>
	</div>
	<div class="constel-readout bl">
		<span class="k">CORE</span><span class="v">SOFTWARE ARCH</span>
	</div>

	<div class="constel-frame">
		<span class="constel-ring r1" aria-hidden="true"></span>
		<span class="constel-ring r2" aria-hidden="true"></span>
		<span class="constel-ring r3" aria-hidden="true"></span>

		<div class="constel-core">
			<span class="core-halo" aria-hidden="true"></span>
			<div class="loading-cube" style="--cube-size: 70px" aria-hidden="true">
				<span><LogoMark /></span><span><LogoMark /></span><span><LogoMark /></span><span
					><LogoMark /></span
				><span><LogoMark /></span><span><LogoMark /></span>
			</div>
		</div>

		{#each items as item, i (item.text)}
			<span
				class="constel-label orbit-{item.dir}"
				style="--orbit-r: {item.orbitR}; animation-duration: {item.speed}s; animation-delay: {item.delay}s;"
				data-hover
			>
				<span class="label-dot" aria-hidden="true"></span>
				<span class="label-text">{item.text}</span>

				<span
					class="satellite"
					style="animation-duration: {3.6 + (i % 3) * 0.7}s; animation-delay: {-i * 0.4}s;"
					aria-hidden="true"
				></span>
			</span>
		{/each}
	</div>
</div>
