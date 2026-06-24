<script lang="ts">
	import { onMount } from 'svelte';
	import { SITE } from '$lib/data';

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

	const scaleTicks = Array.from({ length: 11 }, (_, i) => i);
	const gaugeTicks = Array.from({ length: 24 }, (_, i) => i);
	const pcbDotsTop = Array.from({ length: 18 }, (_, i) => i);
	const pcbDotsBot = Array.from({ length: 18 }, (_, i) => i);
	const mcuPins = Array.from({ length: 24 }, (_, i) => i);
</script>

<div class="stack-stage" bind:this={stageEl}>
	<div class="stack-bg" aria-hidden="true"></div>

	<div class="stack-readout tl">
		<span class="k">UNIT</span><span class="v">NP-EMB-{SITE.short}</span>
		<span class="k">REV</span><span class="v">{SITE.revision}</span>
		<span class="k">MODE</span><span class="v">LIVE</span>
	</div>
	<div class="stack-readout tr">
		<span class="k">CTX</span><span class="v">Bergamo · IT</span>
		<span class="k">TZ</span><span class="v">Europe/Rome</span>
	</div>
	<div class="stack-readout br">
		<span class="k">RX</span><span class="v">128.7 kb/s</span>
		<span class="k">TX</span><span class="v">42.1 kb/s</span>
	</div>
	<div class="stack-readout bl">
		<span class="k">SYS</span><span class="v">FreeRTOS · 10.5</span>
		<span class="k">BLE</span><span class="v">NimBLE · OK</span>
	</div>

	<div class="stack-scale">
		{#each scaleTicks as i}
			<span class={i % 5 === 0 ? 'big' : ''}>{i * 10}</span>
		{/each}
	</div>

	<div class="stack-rotor">
		<div class="stack-layer l1">
			<span class="lbl">04 · HMI · Qt/QML · LVGL</span>
			<div class="lyr-hmi">
				<div class="gauge-ring">
					<svg viewBox="0 0 100 100" width="100%" height="100%">
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							stroke-opacity=".3"
							stroke-width="0.6"
						/>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="var(--accent)"
							stroke-width="1.4"
							stroke-dasharray="200 264"
							transform="rotate(-90 50 50)"
						/>
						{#each gaugeTicks as i}
							{@const a = (i / 24) * Math.PI * 2}
							{@const x1 = 50 + Math.cos(a) * 36}
							{@const y1 = 50 + Math.sin(a) * 36}
							{@const x2 = 50 + Math.cos(a) * (i % 3 === 0 ? 30 : 33)}
							{@const y2 = 50 + Math.sin(a) * (i % 3 === 0 ? 30 : 33)}
							<line
								{x1}
								{y1}
								{x2}
								{y2}
								stroke="currentColor"
								stroke-opacity=".5"
								stroke-width="0.5"
							/>
						{/each}
						<text
							x="50"
							y="48"
							text-anchor="middle"
							font-size="13"
							font-family="ui-monospace"
							font-weight="700"
							fill="currentColor">128</text
						>
						<text
							x="50"
							y="58"
							text-anchor="middle"
							font-size="4"
							font-family="ui-monospace"
							fill="currentColor"
							opacity=".6"
							letter-spacing="0.3">KM/H</text
						>
					</svg>
				</div>
				<div class="lyr-hmi-side">
					<div class="led ok"></div>
					<span>NAV</span>
					<div class="led ok"></div>
					<span>CAN</span>
					<div class="led wn"></div>
					<span>BLE</span>
					<div class="led"></div>
					<span>SD</span>
				</div>
			</div>
		</div>

		<div class="stack-layer l2">
			<span class="lbl">03 · CAN · 500 kbps</span>
			<svg class="lyr-can" viewBox="0 0 220 80" preserveAspectRatio="none">
				<g stroke="currentColor" stroke-opacity=".6" stroke-width="0.7" fill="none">
					<path
						d="M0 22 L10 22 L14 12 L24 12 L28 22 L52 22 L56 12 L72 12 L76 22 L96 22 L100 12 L116 12 L120 22 L220 22"
					/>
					<path
						d="M0 58 L10 58 L14 68 L24 68 L28 58 L52 58 L56 68 L72 68 L76 58 L96 58 L100 68 L116 68 L120 58 L220 58"
						stroke="var(--accent)"
						stroke-opacity=".75"
					/>
				</g>
				<g fill="var(--accent)">
					<circle cx="34" cy="22" r="1.6" />
					<circle cx="86" cy="22" r="1.6" />
					<circle cx="130" cy="22" r="1.6" />
				</g>
				<g font-size="3.6" font-family="ui-monospace" fill="currentColor" opacity=".55">
					<text x="6" y="44">0x1A4 · 8B · 04 1F …</text>
					<text x="100" y="44">0x2C0 · 8B · 7A 80 …</text>
				</g>
			</svg>
		</div>

		<div class="stack-layer l3">
			<span class="lbl">02 · PCB · 4-layer</span>
			<svg class="lyr-pcb" viewBox="0 0 220 80" preserveAspectRatio="none">
				<g
					stroke="currentColor"
					stroke-opacity=".45"
					stroke-width="0.6"
					fill="none"
					stroke-linecap="round"
				>
					<path d="M14 12 L60 12 L70 22 L120 22 L130 32 L206 32" />
					<path d="M14 24 L40 24 L50 34 L90 34 L100 24 L160 24 L170 14 L206 14" />
					<path d="M14 44 L60 44 L70 54 L110 54 L120 64 L206 64" />
					<path d="M14 56 L50 56 L60 66 L96 66 L106 56 L206 56" />
					<path d="M14 70 L80 70 L90 60 L140 60 L150 70 L206 70" />
				</g>
				<g fill="var(--accent)" opacity=".75">
					{#each pcbDotsTop as i}
						<circle cx={12 + i * 12} cy="6" r="1.2" />
					{/each}
					{#each pcbDotsBot as i}
						<circle cx={12 + i * 12} cy="76" r="1.2" />
					{/each}
				</g>
				<rect
					x="86"
					y="28"
					width="50"
					height="28"
					rx="2"
					fill="color-mix(in oklab, currentColor, transparent 88%)"
					stroke="currentColor"
					stroke-opacity=".7"
					stroke-width="0.5"
				/>
				<text
					x="111"
					y="46"
					text-anchor="middle"
					font-size="5"
					font-family="ui-monospace"
					fill="currentColor"
					opacity=".7"
					letter-spacing="0.2">ESP32-S3</text
				>
			</svg>
		</div>

		<div class="stack-layer l4">
			<span class="lbl">01 · MCU · ESP32-S3</span>
			<div class="lyr-mcu">
				<div class="mcu-block">
					<span>NP · 0x{SITE.short.toUpperCase()}</span>
					<span class="hash">∙ ∙ ∙</span>
				</div>
				{#each mcuPins as i}
					<span class="pin p{i}"></span>
				{/each}
			</div>
		</div>

		<span class="thread t1"></span>
		<span class="thread t2"></span>
		<span class="thread t3"></span>
		<span class="thread t4"></span>
	</div>

	<span class="floater f1">ESP-IDF</span>
	<span class="floater f2">NimBLE</span>
	<span class="floater f3">Qt · QML</span>
	<span class="floater f4">LVGL</span>
	<span class="floater f5">C++23</span>
	<span class="floater f6">Kotlin</span>
</div>
