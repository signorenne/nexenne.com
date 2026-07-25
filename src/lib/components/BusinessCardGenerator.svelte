<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		CARD_EXPORT_SCALE,
		CARD_SAFE_MM,
		CARD_SIZES,
		cardLockup,
		cardMottoSegments,
		cardSafeBox,
		cardSizeLabel,
		mottoSweepBar,
		mottoText
	} from '$lib/brand/cards';
	import {
		BRAND_FONT_STACK,
		BRAND_ICON_STACK,
		downloadPng as exportPng,
		downloadSvg as exportSvg,
		readThemeColor
	} from '$lib/brand/export';
	import { MASCOT_BBOX, MASCOT_PATH } from '$lib/brand/mascot';
	import { SITE } from '$lib/data';
	import { showToast } from '$lib/stores/toast';
	import { tweaks, theme } from '$lib/tweaks';
	import { t } from '$lib/i18n';

	const card = {
		brand: 'nexenne',
		name: SITE.name
	};
	$: role = $t('brand.card.role');
	$: contacts = [
		{ icon: '@', value: SITE.email },
		{ icon: '☎', value: SITE.phone },
		{ icon: '↗', value: 'nexenne.com' },
		{ icon: 'git', value: 'github.com/signorenne', small: true },
		{ icon: '◉', value: $t('brand.card.location') }
	];

	/** Driven by the workspace toggle, so card and banner guides switch together. */
	export let showSafeArea = false;

	let sel = 0;
	let exporting = false;
	let mottoEl: SVGTextElement;

	/**
	 * SVG collapses whitespace between tspans, so the spaces that fall on a
	 * segment boundary become non-breaking ones, which it never collapses.
	 */
	const keepSpaces = (value: string) => value.replaceAll(' ', '\u00a0');
	$: size = CARD_SIZES[sel];
	$: W = size.width;
	$: H = size.height;

	// Card accent follows the site theme tweaks; read live so exports stay correct.
	let accent = '#7c5cff';
	let accent2 = '#5ad8ff';

	function readColors() {
		accent = readThemeColor('--accent', accent);
		accent2 = readThemeColor('--accent-2', accent2);
	}

	/**
	 * Replace the estimated highlight bar with the real glyph advances, as the
	 * banner does. Exports serialize the DOM, so the measured value is what ships.
	 */
	async function measureSweep() {
		if (!browser) return;
		await document.fonts?.ready;
		await tick();
		if (!sweep || !mottoEl?.getSubStringLength) return;

		const index = mottoSegments.findIndex((part) => part.mark === 'sweep');
		if (index < 0) return;
		const before = mottoText(mottoSegments.slice(0, index)).length;
		const run = mottoSegments[index].text.length;

		try {
			const offset = before ? mottoEl.getSubStringLength(0, before) : 0;
			const width = mottoEl.getSubStringLength(before, run);
			const start = W / 2 - mottoEl.getComputedTextLength() / 2;
			sweep = { ...sweep, x: start + offset, width };
		} catch {
			// Not measurable yet: the estimate stands.
		}
	}

	$: (void [mottoSegments, L, W], measureSweep());
	$: (void [$tweaks, $theme], readColors());
	onMount(readColors);

	// QR matrices (ecc H), rendered as styled dots below.
	const QR_SITE = [
		'11111110110011000110101111111',
		'10000010110110100011001000001',
		'10111010111101000011101011101',
		'10111010010011100101101011101',
		'10111010000011110011101011101',
		'10000010101100111010101000001',
		'11111110101010101010101111111',
		'00000000110001100000100000000',
		'00111010101101101010111100111',
		'10011001100110100000011111101',
		'10101011001011101110111100100',
		'01101100100110011000011101010',
		'01110011011001101110010100111',
		'11010100101100010111111011011',
		'01000111100110111000001100000',
		'00111101111001010011100011011',
		'01000010011000100111010001101',
		'10011001010000010110110111011',
		'10100110111100011011001101000',
		'10111000011011000101101010001',
		'10010011001011011111111110110',
		'00000000100101001010100011011',
		'11111110001100100111101010000',
		'10000010011001001001100011000',
		'10111010110111101010111111100',
		'10111010110001101101110101100',
		'10111010101100001111111110110',
		'10000010001110001110010011010',
		'11111110010000011010010010100'
	];
	const QR_CONTACT = [
		'111111101000100000101011101111111',
		'100000101101110111100101001000001',
		'101110100001010011101000101011101',
		'101110101011100101110000001011101',
		'101110101111000000001100001011101',
		'100000101101101111000011001000001',
		'111111101010101010101010101111111',
		'000000000101001001101100100000000',
		'000100100000111101100100100111011',
		'000110010101101001111100101000111',
		'011111100110010010000000001001001',
		'011101010101000101101111001001010',
		'000011101000111110001010111000010',
		'001111001010111100100000101010101',
		'011010100010001011010101111101010',
		'111011010010011111111110111100011',
		'110000100111101110110101001011000',
		'011010011011011101010001010000110',
		'010010111011100110101100011100101',
		'110100011110010111010110001000011',
		'101101101100001100101101100000011',
		'000011001001010100101001010000011',
		'110011110111001101001010111001101',
		'010100000101010010111100011111000',
		'100111110011000100100100111111001',
		'000000001000011001111011100010101',
		'111111100011001010010100101010110',
		'100000100000101001000000100011001',
		'101110100110001100011010111110000',
		'101110101101100001011001001011001',
		'101110100101010101011010010110001',
		'100000100001000010101111111110000',
		'111111100111110100000010101111010'
	];
	const QR_SITE_N = QR_SITE.length;
	const QR_CONTACT_N = QR_CONTACT.length;

	let frontEl: SVGSVGElement;
	let backEl: SVGSVGElement;

	const QR_DARK = '#0a0b0f';

	// Labels under each QR. The motto comes from the hero keys, like the banners,
	// so the site says the same sentence everywhere and marks the same two runs.
	$: mottoSegments = cardMottoSegments({
		l1: $t('hero.motto.l1'),
		l2Before: $t('hero.motto.l2.before'),
		l2Accent: $t('hero.motto.l2.accent'),
		l2After: $t('hero.motto.l2.after'),
		l3: $t('hero.motto.l3'),
		l4Before: $t('hero.motto.l4.before'),
		l4Sweep: $t('hero.motto.l4.sweep'),
		l4After: $t('hero.motto.l4.after')
	});
	$: motto = mottoText(mottoSegments);
	$: safe = cardSafeBox(size);
	$: sweep = mottoSweepBar(mottoSegments, L.front, W / 2);
	$: qrTiles = [
		{ matrix: QR_SITE, n: QR_SITE_N, label: $t('brand.card.qr.site') },
		{ matrix: QR_CONTACT, n: QR_CONTACT_N, label: $t('brand.card.qr.contact') }
	];

	$: qrOnly = size.key === 'square';
	// Everything is derived from the chosen canvas so each size lays out cleanly.
	$: L = layout(W, H, qrOnly, motto);

	function finder(r: number, c: number, n: number) {
		return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
	}

	function layout(W: number, H: number, qrOnly: boolean, motto: string) {
		const m = Math.min(W, H);
		const pad = Math.round(m * 0.085);

		// Front: logo-dominant layout (big mark, small wordmark, motto near the bottom).
		const front = cardLockup(W, H, motto, pad);

		// Back: identity on the left, one large QR on the right.
		const nameSize = Math.round(Math.min(H * 0.088, W * 0.057));
		const roleSize = Math.round(Math.min(H * 0.037, W * 0.024));
		const rowSize = Math.round(Math.min(H * 0.044, W * 0.028));
		const nameY = Math.round(H * 0.21);
		const roleY = Math.round(nameY + nameSize * 0.62);
		const divY = Math.round(roleY + H * 0.05);
		const row0Y = Math.round(divY + H * 0.085);
		const rowStep = Math.round(H * 0.083);
		// The original back design uses a large, translucent mascot peeking out
		// from the bottom-left corner behind the contact information.
		const petS = (H * 1.0) / MASCOT_BBOX.height;
		const petCx = W * 0.24;
		const petCy = H * 1.16;
		const petRot = 38;

		// One styled QR: the vCard contact code, which carries the site URL too.
		const labelGap = Math.round(m * 0.05);
		const labelH = Math.round(m * 0.028);
		const unitExtra = labelGap + labelH; // label space under each QR
		const labelOf = (y: number, s: number) => y + s + labelGap + Math.round(labelH * 0.72);

		type Slot = { x: number; y: number; size: number; labelY: number };
		let qr: Slot;
		if (qrOnly) {
			// square card: the QR centred and large
			const s = Math.max(0, Math.round(Math.min((Math.min(W, H) - 2 * pad) * 0.78, H * 0.6)));
			const x = Math.round((W - s) / 2);
			const y = Math.round((H - (s + unitExtra)) / 2);
			qr = { x, y, size: s, labelY: labelOf(y, s) };
		} else {
			// landscape: one big QR on the right, vertically centred
			const availW = W - pad - W * 0.58;
			const s = Math.max(0, Math.round(Math.min(availW, H * 0.6)));
			const x = Math.round(W - pad - s);
			const y = Math.round((H - (s + unitExtra)) / 2);
			qr = { x, y, size: s, labelY: labelOf(y, s) };
		}

		return {
			pad,
			front: { ...front, wordX: W / 2 },
			back: {
				nameY,
				nameSize,
				roleY,
				roleSize,
				divY,
				divW: card.name.length * nameSize * 0.6, // JetBrains Mono advances 0.6em
				divH: Math.max(2, Math.round(H * 0.0046)),
				valX: Math.round(pad + rowSize * 1.95),
				row0Y,
				rowStep,
				rowSize,
				rowSmall: Math.round(rowSize * 0.72),
				petCx,
				petCy,
				petS,
				petRot,
				qr,
				qrLabelSize: Math.max(8, Math.round(qr.size * 0.072))
			}
		};
	}

	/** Shared wrapper so every card export reports success or failure the same way. */
	async function runExport(element: SVGSVGElement, name: string, kind: 'png' | 'svg') {
		if (exporting) return;
		exporting = true;
		const options = {
			width: W,
			height: H,
			scale: CARD_EXPORT_SCALE,
			filename: name,
			fonts: ['JetBrains Mono', 'Nexenne Icons'] as const
		};
		try {
			await (kind === 'png' ? exportPng(element, options) : exportSvg(element, options));
			showToast($t('brand.toast.exported'), { tone: 'success' });
		} catch {
			showToast($t('brand.toast.failed'), { tone: 'error' });
		} finally {
			exporting = false;
		}
	}
</script>

<div class="card-generator">
	<div class="size-tabs" role="group" aria-label={$t('brand.card.formats')}>
		{#each CARD_SIZES as s, i (s.key)}
			<button class="size-tab" class:is-active={sel === i} on:click={() => (sel = i)} data-hover>
				<span class="size-name">{$t('brand.card.size.' + s.key)}</span>
				<span class="size-mm">{cardSizeLabel(s)}</span>
			</button>
		{/each}
	</div>

	<div class="card-list">
		<!-- Front -->
		<figure class="card-fig">
			<svg
				bind:this={frontEl}
				class="card-svg"
				viewBox="0 0 {W} {H}"
				style="aspect-ratio: {W} / {H};"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<radialGradient id="glowF" cx="50%" cy="40%" r="65%">
						<stop offset="0%" stop-color={accent} stop-opacity="0.34" />
						<stop offset="55%" stop-color={accent} stop-opacity="0.08" />
						<stop offset="100%" stop-color={accent} stop-opacity="0" />
					</radialGradient>
					<filter id="grainF" x="0" y="0" width="100%" height="100%">
						<feTurbulence
							type="fractalNoise"
							baseFrequency="0.9"
							numOctaves="2"
							stitchTiles="stitch"
							result="n"
						/>
						<feColorMatrix in="n" type="saturate" values="0" />
					</filter>
				</defs>
				<rect width={W} height={H} fill="#0a0b0f" />
				<rect width={W} height={H} fill="url(#glowF)" />
				<rect width={W} height={H} filter="url(#grainF)" opacity="0.05" />
				<path
					fill="#ffffff"
					transform="translate({L.front.logoX},{L.front.logoY}) scale({L.front.logoScale})"
					d={MASCOT_PATH}
				/>
				<text
					x={L.front.wordX}
					y={L.front.wordY}
					text-anchor="middle"
					font-family={BRAND_FONT_STACK}
					font-size={L.front.wordSize}
					font-weight="600"
					fill="#ffffff"
					letter-spacing="-0.5">{card.brand}</text
				>
				{#if motto}
					<!-- The hero's .sweep highlight, drawn before the text so it sits behind. -->
					{#if sweep}
						<rect x={sweep.x} y={sweep.y} width={sweep.width} height={sweep.height} fill={accent} />
					{/if}
					<text
						bind:this={mottoEl}
						x={L.front.wordX}
						y={L.front.mottoY}
						text-anchor="middle"
						font-family={BRAND_FONT_STACK}
						font-size={L.front.mottoSize}
						font-style="italic"
						fill="#c8ccd7"
						letter-spacing="0"
						>{#each mottoSegments as part, i (i)}<tspan
								fill={part.mark === 'accent' ? accent : undefined}
								font-weight={part.mark === 'accent' ? '700' : undefined}
								>{keepSpaces(part.text)}</tspan
							>{/each}</text
					>
				{/if}
				{#if showSafeArea}
					<g data-noexport>
						<rect
							x={safe.x}
							y={safe.y}
							width={safe.width}
							height={safe.height}
							fill="none"
							stroke={accent}
							stroke-width={Math.max(1, W * 0.002)}
							stroke-dasharray="{W * 0.014} {W * 0.01}"
							opacity="0.85"
						/>
						<text
							x={safe.x}
							y={safe.y - H * 0.018}
							font-family={BRAND_FONT_STACK}
							font-size={Math.round(H * 0.026)}
							fill={accent}
							opacity="0.85">{CARD_SAFE_MM} mm</text
						>
					</g>
				{/if}
			</svg>
			<figcaption>
				<span>{$t('brand.card.front')} · {cardSizeLabel(size)}</span>
				<div class="card-actions">
					<button
						class="btn btn--sm"
						disabled={exporting}
						on:click={() => runExport(frontEl, `nexenne-card-front-${size.key}`, 'png')}
						data-hover>PNG</button
					>
					<button
						class="btn btn--sm"
						disabled={exporting}
						on:click={() => runExport(frontEl, `nexenne-card-front-${size.key}`, 'svg')}
						data-hover>SVG</button
					>
				</div>
			</figcaption>
		</figure>

		<!-- Back -->
		<figure class="card-fig">
			<svg
				bind:this={backEl}
				class="card-svg"
				viewBox="0 0 {W} {H}"
				style="aspect-ratio: {W} / {H};"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<radialGradient id="glowB" cx="86%" cy="16%" r="65%">
						<stop offset="0%" stop-color={accent} stop-opacity="0.28" />
						<stop offset="55%" stop-color={accent} stop-opacity="0.07" />
						<stop offset="100%" stop-color={accent} stop-opacity="0" />
					</radialGradient>
					<filter id="grainB" x="0" y="0" width="100%" height="100%">
						<feTurbulence
							type="fractalNoise"
							baseFrequency="0.9"
							numOctaves="2"
							stitchTiles="stitch"
							result="n"
						/>
						<feColorMatrix in="n" type="saturate" values="0" />
					</filter>
				</defs>
				<rect width={W} height={H} fill="#0a0b0f" />
				<rect width={W} height={H} fill="url(#glowB)" />
				<rect width={W} height={H} filter="url(#grainB)" opacity="0.05" />

				{#if !qrOnly}
					<path
						fill="#ffffff"
						fill-opacity="0.2"
						transform="rotate({L.back.petRot} {L.back.petCx} {L.back.petCy}) translate({L.back
							.petCx -
							MASCOT_BBOX.centerX * L.back.petS},{L.back.petCy -
							MASCOT_BBOX.centerY * L.back.petS}) scale({L.back.petS})"
						d={MASCOT_PATH}
					/>
					<text
						x={L.pad}
						y={L.back.nameY}
						font-family={BRAND_FONT_STACK}
						font-size={L.back.nameSize}
						font-weight="600"
						fill="#ffffff"
						letter-spacing="-0.5">{card.name}</text
					>
					<text
						x={L.pad}
						y={L.back.roleY}
						font-family={BRAND_FONT_STACK}
						font-size={L.back.roleSize}
						fill="#9aa3b2">{role}</text
					>
					<rect x={L.pad} y={L.back.divY} width={L.back.divW} height={L.back.divH} fill={accent} />
					{#each contacts as c, i (c.value)}
						<text
							x={L.pad}
							y={L.back.row0Y + i * L.back.rowStep}
							font-family={BRAND_ICON_STACK}
							font-size={c.small ? L.back.rowSmall : L.back.rowSize}
							fill={accent2}>{c.icon}</text
						>
						<text
							x={L.back.valX}
							y={L.back.row0Y + i * L.back.rowStep}
							font-family={BRAND_FONT_STACK}
							font-size={L.back.rowSize}
							fill="#e7e9ef">{c.value}</text
						>
					{/each}
				{/if}

				<!-- styled QR tile: rounded dots + rounded eyes + centre logo + label -->
				{#snippet qrTile(
					tile: { matrix: string[]; n: number; label: string },
					slot: { x: number; y: number; size: number; labelY: number }
				)}
					{@const qp = Math.round(slot.size * 0.08)}
					{@const inner = slot.size - 2 * qp}
					{@const ms = inner / tile.n}
					{@const ox = slot.x + qp}
					{@const oy = slot.y + qp}
					{@const lbox = Math.round(ms * 7)}
					{@const lcx = ox + inner / 2}
					{@const lcy = oy + inner / 2}
					{@const lS = (lbox * 0.64) / MASCOT_BBOX.height}
					<rect
						x={slot.x}
						y={slot.y}
						width={slot.size}
						height={slot.size}
						rx={slot.size * 0.08}
						fill="#ffffff"
					/>
					{#each tile.matrix as row, r}
						{#each row.split('') as bit, c}
							{#if bit === '1' && !finder(r, c, tile.n)}
								<circle
									cx={ox + c * ms + ms / 2}
									cy={oy + r * ms + ms / 2}
									r={ms * 0.44}
									fill={QR_DARK}
								/>
							{/if}
						{/each}
					{/each}
					{#each [[0, 0], [0, tile.n - 7], [tile.n - 7, 0]] as [er, ec] (er + '-' + ec)}
						<rect
							x={ox + ec * ms}
							y={oy + er * ms}
							width={7 * ms}
							height={7 * ms}
							rx={2.3 * ms}
							fill={QR_DARK}
						/>
						<rect
							x={ox + (ec + 1) * ms}
							y={oy + (er + 1) * ms}
							width={5 * ms}
							height={5 * ms}
							rx={1.6 * ms}
							fill="#ffffff"
						/>
						<rect
							x={ox + (ec + 2) * ms}
							y={oy + (er + 2) * ms}
							width={3 * ms}
							height={3 * ms}
							rx={1.0 * ms}
							fill={QR_DARK}
						/>
					{/each}
					<rect
						x={lcx - lbox / 2}
						y={lcy - lbox / 2}
						width={lbox}
						height={lbox}
						rx={lbox * 0.24}
						fill="#ffffff"
					/>
					<path
						fill={QR_DARK}
						transform="translate({lcx - MASCOT_BBOX.centerX * lS},{lcy -
							MASCOT_BBOX.centerY * lS}) scale({lS})"
						d={MASCOT_PATH}
					/>
					<text
						x={slot.x + slot.size / 2}
						y={slot.labelY}
						text-anchor="middle"
						font-family={BRAND_FONT_STACK}
						font-size={L.back.qrLabelSize}
						fill={accent2}
						letter-spacing="0.5">{tile.label}</text
					>
				{/snippet}

				{@render qrTile(qrTiles[1], L.back.qr)}
				{#if showSafeArea}
					<g data-noexport>
						<rect
							x={safe.x}
							y={safe.y}
							width={safe.width}
							height={safe.height}
							fill="none"
							stroke={accent}
							stroke-width={Math.max(1, W * 0.002)}
							stroke-dasharray="{W * 0.014} {W * 0.01}"
							opacity="0.85"
						/>
						<text
							x={safe.x}
							y={safe.y - H * 0.018}
							font-family={BRAND_FONT_STACK}
							font-size={Math.round(H * 0.026)}
							fill={accent}
							opacity="0.85">{CARD_SAFE_MM} mm</text
						>
					</g>
				{/if}
			</svg>
			<figcaption>
				<span>{$t('brand.card.back')} · {cardSizeLabel(size)}</span>
				<div class="card-actions">
					<button
						class="btn btn--sm"
						disabled={exporting}
						on:click={() => runExport(backEl, `nexenne-card-back-${size.key}`, 'png')}
						data-hover>PNG</button
					>
					<button
						class="btn btn--sm"
						disabled={exporting}
						on:click={() => runExport(backEl, `nexenne-card-back-${size.key}`, 'svg')}
						data-hover>SVG</button
					>
				</div>
			</figcaption>
		</figure>
	</div>
</div>

<style>
	.card-generator {
		min-width: 0;
	}
	.card-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
		gap: var(--sp-6);
	}
	.card-fig {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.size-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: var(--sp-6);
	}
	.size-tab {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font-family: var(--font-mono);
		transition:
			border-color var(--t-fast) var(--ease),
			background var(--t-fast) var(--ease);
	}
	.size-tab:hover {
		border-color: var(--ink-2);
	}
	.size-tab:focus-visible {
		border-color: var(--accent);
		outline: 2px solid color-mix(in oklab, var(--accent), transparent 75%);
		outline-offset: 2px;
	}
	.size-tab.is-active {
		border-color: var(--accent);
		background: color-mix(in oklab, var(--accent), transparent 90%);
	}
	.size-name {
		font-size: 12px;
		color: var(--ink);
		letter-spacing: 0.02em;
	}
	.size-mm {
		font-size: 10.5px;
		color: var(--muted);
	}
	.card-svg {
		width: 100%;
		height: auto;
		border-radius: 14px;
		box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.6);
		display: block;
	}
	.card-fig figcaption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.card-actions {
		display: flex;
		gap: 8px;
	}
	@media (max-width: 560px) {
		.size-tabs {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.size-tab {
			min-width: 0;
		}
		.card-fig figcaption {
			align-items: flex-start;
			flex-direction: column;
			gap: 8px;
		}
	}
</style>
