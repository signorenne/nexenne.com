<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		BANNER_PRESETS,
		bannerFilename,
		layoutBanner,
		sweepBar,
		type BannerKey,
		type BannerLayout,
		type Box
	} from '$lib/brand/banners';
	import { CARD_SIZES } from '$lib/brand/cards';
	import { BRAND_FONT_STACK, downloadPng, downloadSvg, readThemeColor } from '$lib/brand/export';
	import { fill, t } from '$lib/i18n';
	import { showToast } from '$lib/stores/toast';
	import { tweaks, theme } from '$lib/tweaks';
	import BusinessCardGenerator from './BusinessCardGenerator.svelte';
	import LogoMark from './LogoMark.svelte';

	type AssetKey = 'card' | BannerKey;

	/** The /card compatibility route, which stays out of search. */
	export let legacy = false;

	const CARD_ASSET = {
		key: 'card' as const,
		labelKey: 'brand.asset.card',
		groupKey: 'brand.group.print',
		noteKey: 'brand.note.card'
	};

	/** How the hero marks a run of the motto, mirrored here so a banner matches it. */
	type Mark = 'accent' | 'sweep' | null;

	interface MottoLine {
		before: string;
		run: string;
		after: string;
		mark: Mark;
		text: string;
	}

	/** Index of the line the hero underlines. */
	const SWEEP_LINE = 3;

	// The card is the asset people come here for; the banners follow it.
	let selectedKey: AssetKey = 'card';
	let bannerEl: SVGSVGElement;
	let lineEls: SVGTextElement[] = [];
	let accent = '#7c5cff';
	let showSafeArea = false;
	let exporting = false;
	let sweep: Box = { x: 0, y: 0, width: 0, height: 0 };

	$: isCard = selectedKey === 'card';
	$: preset = BANNER_PRESETS.find((item) => item.key === selectedKey) ?? BANNER_PRESETS[0];
	$: assetCount = BANNER_PRESETS.length + 1;

	/**
	 * SVG collapses whitespace that falls between two tspans, so a segment that
	 * ends or starts with a space (the Italian "deve essere ") would lose it and
	 * run into the tinted word. Non-breaking spaces are not collapsed.
	 */
	function segment(before: string, run: string, after: string, mark: Mark): MottoLine {
		const keepSpaces = (value: string) => value.replaceAll(' ', '\u00a0');
		return {
			before: mark ? keepSpaces(before) : before,
			run,
			after: mark ? keepSpaces(after) : after,
			mark,
			text: `${before}${run}${after}`
		};
	}

	// The motto is the one piece of copy a banner carries, so it is read straight
	// from the hero keys: the banner and the home page can never say different
	// things, and the tinted word and the underlined word are the same ones.
	$: mottoLines = [
		segment($t('hero.motto.l1'), '', '', null),
		segment(
			$t('hero.motto.l2.before'),
			$t('hero.motto.l2.accent'),
			$t('hero.motto.l2.after'),
			'accent'
		),
		segment($t('hero.motto.l3'), '', '', null),
		segment(
			$t('hero.motto.l4.before'),
			$t('hero.motto.l4.sweep'),
			$t('hero.motto.l4.after'),
			'sweep'
		)
	];

	$: layout = layoutBanner(
		preset,
		mottoLines.map((line) => line.text)
	);
	$: portrait = preset.height > preset.width;
	$: wide = preset.width / preset.height > 2.5;
	$: glowX = `${((layout.mascotX + layout.mascotSize / 2) / preset.width) * 100}%`;
	$: glowY = `${((layout.mascotY + layout.mascotSize / 2) / preset.height) * 100}%`;

	$: resetSweep(layout, mottoLines);

	/** Start from the estimate, then refine it against the text actually drawn. */
	function resetSweep(current: BannerLayout, lines: MottoLine[]) {
		const line = lines[SWEEP_LINE];
		sweep = sweepBar(current, line.text, line.before, line.run, SWEEP_LINE);
		void measureSweep();
	}

	/**
	 * Replace the estimated bar with the real glyph advances. The estimate is a
	 * character-count approximation, which is close enough to lay a banner out but
	 * visibly off for a bar that has to sit under one specific word. Exports
	 * serialize whatever is in the DOM, so the measured value is what ships.
	 */
	async function measureSweep() {
		if (!browser) return;
		// Before the display face loads, the fallback would be measured instead.
		await document.fonts?.ready;
		await tick();

		const line = mottoLines[SWEEP_LINE];
		const element = lineEls[SWEEP_LINE];
		if (!line.run || !element?.getSubStringLength) return;

		try {
			const offset = line.before.length ? element.getSubStringLength(0, line.before.length) : 0;
			const width = element.getSubStringLength(line.before.length, line.run.length);
			const full = element.getComputedTextLength();
			const start = layout.sloganAnchor === 'middle' ? layout.sloganX - full / 2 : layout.sloganX;
			sweep = { ...sweep, x: start + offset, width };
		} catch {
			// Not measurable yet: the estimate stands.
		}
	}

	function readColors() {
		accent = readThemeColor('--accent', accent);
	}

	/** Shared wrapper so both export buttons report success or failure the same way. */
	async function runExport(run: () => Promise<void>) {
		if (exporting) return;
		exporting = true;
		try {
			await run();
			showToast($t('brand.toast.exported'), { tone: 'success' });
		} catch {
			showToast($t('brand.toast.failed'), { tone: 'error' });
		} finally {
			exporting = false;
		}
	}

	function exportOptions() {
		return {
			width: preset.width,
			height: preset.height,
			filename: bannerFilename(preset)
		};
	}

	$: (void [$tweaks, $theme], readColors());
	onMount(readColors);
</script>

<svelte:head>
	{#if legacy}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<div class="page-anim brand-page">
	<header class="page-title">
		<div><span class="meta">{$t('brand.meta')}</span></div>
		<div>
			<h1 class="display">{$t('brand.title')}</h1>
			<p class="lede brand-lede">{$t('brand.lede')}</p>
		</div>
	</header>

	<section class="section brand-section">
		<div class="brand-assets-layout">
			<aside class="brand-assets" aria-label={$t('brand.assets')}>
				<div class="brand-panel-title">
					<span>{$t('brand.assets')}</span>
					<span>{String(assetCount).padStart(2, '0')}</span>
				</div>
				<div class="brand-asset-list">
					<button
						type="button"
						class:is-active={selectedKey === 'card'}
						on:click={() => (selectedKey = 'card')}
						aria-pressed={selectedKey === 'card'}
						data-hover
					>
						<span class="brand-asset-index">01</span>
						<span class="brand-asset-copy">
							<strong>{$t(CARD_ASSET.labelKey)}</strong>
							<small>{$t(CARD_ASSET.groupKey)}</small>
						</span>
						<span class="brand-asset-ratio"
							>{fill($t('brand.asset.multi'), { count: CARD_SIZES.length })}</span
						>
					</button>
					{#each BANNER_PRESETS as banner, index (banner.key)}
						<button
							type="button"
							class:is-active={selectedKey === banner.key}
							on:click={() => (selectedKey = banner.key)}
							aria-pressed={selectedKey === banner.key}
							data-hover
						>
							<span class="brand-asset-index">{String(index + 2).padStart(2, '0')}</span>
							<span class="brand-asset-copy">
								<strong>{$t(banner.labelKey)}</strong>
								<small>{$t(banner.groupKey)}</small>
							</span>
							<span class="brand-asset-ratio">{banner.width}×{banner.height}</span>
						</button>
					{/each}
				</div>
			</aside>

			<div class="brand-workspace">
				<div class="brand-workspace-head">
					<div>
						<span class="eyebrow"
							><span class="dot"></span>{$t(isCard ? CARD_ASSET.labelKey : preset.labelKey)}</span
						>
						<p>{$t(isCard ? CARD_ASSET.noteKey : preset.noteKey)}</p>
					</div>
					<div class="brand-export-actions">
						<!-- One toggle for the whole workspace: a card's print margin and a
						     banner's platform safe area are the same idea. -->
						<label class="brand-safe-toggle">
							<input type="checkbox" bind:checked={showSafeArea} />
							<span>{$t('brand.safearea')}</span>
						</label>
						{#if !isCard}
							<button
								type="button"
								class="btn btn--sm"
								disabled={exporting}
								on:click={() => runExport(() => downloadPng(bannerEl, exportOptions()))}
								data-hover>PNG <span>{preset.width}×{preset.height}</span></button
							>
							<button
								type="button"
								class="btn btn--sm"
								disabled={exporting}
								on:click={() => runExport(() => downloadSvg(bannerEl, exportOptions()))}
								data-hover>SVG <span>{$t('brand.vector')}</span></button
							>
						{/if}
					</div>
				</div>

				{#if isCard}
					<div class="brand-card-workspace">
						<BusinessCardGenerator {showSafeArea} />
					</div>
				{:else}
					<div class="brand-preview-stage" class:is-portrait={portrait} class:is-wide={wide}>
						<div class="brand-preview-meta">
							<span>{$t('brand.preview')}</span>
							<span>{preset.width} × {preset.height} px</span>
						</div>
						<svg
							bind:this={bannerEl}
							class="brand-canvas"
							viewBox="0 0 {preset.width} {preset.height}"
							style="aspect-ratio: {preset.width} / {preset.height};"
							xmlns="http://www.w3.org/2000/svg"
							role="img"
							aria-label={$t(preset.labelKey)}
						>
							<defs>
								<linearGradient id="bannerBase" x1="0" y1="0" x2="1" y2="1">
									<stop offset="0%" stop-color="#0d0e13" />
									<stop offset="52%" stop-color="#0a0b0f" />
									<stop offset="100%" stop-color="#08090c" />
								</linearGradient>
								<radialGradient id="bannerGlow" cx={glowX} cy={glowY} r="82%">
									<stop offset="0%" stop-color={accent} stop-opacity="0.34" />
									<stop offset="55%" stop-color={accent} stop-opacity="0.08" />
									<stop offset="100%" stop-color={accent} stop-opacity="0" />
								</radialGradient>
								<filter id="bannerGrain" x="0" y="0" width="100%" height="100%">
									<feTurbulence
										type="fractalNoise"
										baseFrequency="0.9"
										numOctaves="2"
										stitchTiles="stitch"
										result="noise"
									/>
									<feColorMatrix in="noise" type="saturate" values="0" />
								</filter>
							</defs>

							<rect width={preset.width} height={preset.height} fill="url(#bannerBase)" />
							<rect width={preset.width} height={preset.height} fill="url(#bannerGlow)" />
							<rect
								width={preset.width}
								height={preset.height}
								filter="url(#bannerGrain)"
								opacity="0.035"
							/>

							<LogoMark
								embedded
								x={layout.mascotX}
								y={layout.mascotY}
								width={layout.mascotSize}
								height={layout.mascotSize}
								paint="#ffffff"
							/>

							<!-- The hero's .sweep highlight, drawn before the text so it sits behind it. -->
							{#if sweep.width > 0}
								<rect
									x={sweep.x}
									y={sweep.y}
									width={sweep.width}
									height={sweep.height}
									fill={accent}
								/>
							{/if}

							{#each mottoLines as motto, index (index)}
								<text
									bind:this={lineEls[index]}
									x={layout.sloganX}
									y={layout.sloganY + layout.sloganStep * index}
									text-anchor={layout.sloganAnchor}
									font-family={BRAND_FONT_STACK}
									font-size={layout.sloganSize}
									font-weight="600"
									font-style="italic"
									fill="#ffffff"
									letter-spacing={-layout.sloganSize * 0.04}
								>
									{#if motto.mark === 'accent'}
										<tspan>{motto.before}</tspan><tspan fill={accent} font-weight="700"
											>{motto.run}</tspan
										><tspan>{motto.after}</tspan>
									{:else}
										{motto.text}
									{/if}
								</text>
							{/each}

							<!-- Preview-only guide: serializeSvg drops every data-noexport node. -->
							{#if showSafeArea}
								<g data-noexport>
									<rect
										x={layout.safe.x}
										y={layout.safe.y}
										width={layout.safe.width}
										height={layout.safe.height}
										fill="none"
										stroke={accent}
										stroke-width={Math.max(1, preset.width * 0.0018)}
										stroke-dasharray="{preset.width * 0.012} {preset.width * 0.008}"
										opacity="0.85"
									/>
								</g>
							{/if}
						</svg>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>

<style>
	.brand-lede {
		margin-top: 14px;
	}
	.brand-section {
		padding-top: var(--sp-5);
	}
	.brand-assets-layout {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		align-items: start;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--bg-elev);
		box-shadow: var(--shadow);
	}
	.brand-assets {
		min-width: 0;
		border-right: 1px solid var(--line);
		background: color-mix(in oklab, var(--bg-elev), var(--bg) 30%);
	}
	.brand-panel-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 13px 14px;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.brand-asset-list {
		display: grid;
	}
	.brand-asset-list button {
		min-width: 0;
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr) auto;
		align-items: center;
		gap: 3px 10px;
		padding: 12px 14px;
		position: relative;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		text-align: left;
		cursor: pointer;
	}
	.brand-asset-list button::after {
		content: '';
		width: 3px;
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--accent);
		transform: scaleY(0);
		transition: transform var(--t-fast) var(--ease);
	}
	.brand-asset-list button:hover,
	.brand-asset-list button:focus-visible,
	.brand-asset-list button.is-active {
		background: color-mix(in oklab, var(--accent), transparent 94%);
		color: var(--ink);
		outline: 0;
	}
	.brand-asset-list button.is-active::after {
		transform: scaleY(1);
	}
	.brand-asset-index {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	.brand-asset-copy {
		min-width: 0;
		display: grid;
		gap: 3px;
	}
	.brand-asset-copy strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-display);
		font-size: 13px;
		font-weight: 600;
	}
	.brand-asset-copy small,
	.brand-asset-ratio {
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.brand-asset-ratio {
		grid-column: 3;
		margin: 0;
		white-space: nowrap;
		text-align: right;
	}
	.brand-workspace {
		min-width: 0;
	}
	.brand-workspace-head {
		min-height: 70px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--line);
	}
	.brand-workspace-head > :first-child {
		min-width: 0;
	}
	.brand-workspace-head p {
		max-width: 62ch;
		margin: 5px 0 0;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 10px;
		line-height: 1.45;
	}
	.brand-export-actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 7px;
	}
	.brand-export-actions .btn {
		height: auto;
		display: grid;
		gap: 1px;
		padding: 7px 11px;
		line-height: 1.2;
	}
	.brand-export-actions .btn[disabled] {
		opacity: 0.55;
		cursor: progress;
	}
	.brand-export-actions .btn span {
		color: var(--muted);
		font-size: 8px;
	}
	.brand-safe-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-right: 4px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.brand-safe-toggle input {
		width: 13px;
		height: 13px;
		accent-color: var(--accent);
		cursor: pointer;
	}
	.brand-safe-toggle:hover {
		color: var(--ink-2);
	}
	.brand-preview-stage {
		min-width: 0;
		min-height: 520px;
		display: grid;
		align-content: center;
		gap: 10px;
		overflow: hidden;
		padding: clamp(18px, 3vw, 34px);
		background: var(--bg);
	}
	.brand-preview-stage.is-portrait {
		min-height: 720px;
	}
	.brand-preview-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.brand-canvas {
		width: 100%;
		max-width: 100%;
		max-height: 620px;
		height: auto;
		display: block;
		margin: auto;
		overflow: hidden;
		border-radius: 14px;
		box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.75);
	}
	.brand-preview-stage.is-portrait .brand-canvas {
		width: min(100%, 440px);
		height: auto;
		max-height: none;
	}
	.brand-preview-stage.is-wide .brand-canvas {
		border-radius: 8px;
	}
	.brand-card-workspace {
		padding: clamp(18px, 3vw, 32px);
		background: var(--bg);
	}
	@media (max-width: 800px) {
		.brand-assets-layout {
			grid-template-columns: 1fr;
		}
		.brand-assets {
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}
		.brand-asset-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.brand-asset-list button {
			border-right: 1px solid var(--line);
		}
		.brand-preview-stage {
			min-height: 420px;
		}
		.brand-preview-stage.is-portrait {
			min-height: 620px;
		}
	}
	@media (max-width: 560px) {
		.brand-asset-list {
			grid-template-columns: 1fr;
		}
		.brand-workspace-head {
			align-items: flex-start;
			flex-direction: column;
		}
		.brand-export-actions {
			width: 100%;
			flex-wrap: wrap;
		}
		.brand-export-actions .btn {
			flex: 1;
		}
		.brand-safe-toggle {
			width: 100%;
			margin: 0 0 2px;
		}
		.brand-preview-stage {
			min-height: 320px;
			padding: 14px;
		}
		.brand-preview-stage.is-portrait {
			min-height: 560px;
		}
		.brand-card-workspace {
			padding: 14px;
		}
	}
</style>
