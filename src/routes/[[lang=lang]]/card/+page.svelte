<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { tweaks, theme } from '$lib/tweaks';
	import { t } from '$lib/i18n';

	// Edit the card here; text is localised via i18n.
	const card = {
		brand: 'nexenne',
		name: 'Nicolò Plebani'
	};
	$: role = $t('card.role');
	$: contacts = [
		{ icon: '@', value: 'nicolo@nexenne.com' },
		{ icon: '☎', value: '+39 346 311 6428' },
		{ icon: '↗', value: 'nexenne.com' },
		{ icon: 'git', value: 'github.com/signorenne', small: true },
		{ icon: '◉', value: $t('card.location') }
	];

	// Standard business-card sizes (mm) mapped to pixel canvases at the same ratio.
	const SIZES = [
		{ key: 'standard', label: 'Standard (EU)', mm: '85 × 55 mm', w: 1004, h: 650 },
		{ key: 'us', label: 'US', mm: '88.9 × 50.8 mm', w: 1050, h: 600 },
		{ key: 'credit', label: 'Credit-card', mm: '85.6 × 54 mm', w: 1020, h: 643 },
		{ key: 'square', label: 'Square', mm: '55 × 55 mm', w: 720, h: 720 },
		{ key: 'slim', label: 'Slim', mm: '85 × 40 mm', w: 1020, h: 480 }
	];
	let sel = 0;
	$: size = SIZES[sel];
	$: W = size.w;
	$: H = size.h;

	// Card accent follows the site theme tweaks; read live so exports stay correct.
	let accent = '#7c5cff';
	let accent2 = '#5ad8ff';

	// Resolve any CSS colour (including oklch) to a plain sRGB rgb() string so the
	// exported SVG renders in any viewer, since oklch is not widely supported.
	function toRgb(input: string, fallback: string): string {
		if (!input) return fallback;
		try {
			const cv = document.createElement('canvas');
			cv.width = cv.height = 1;
			const ctx = cv.getContext('2d', { willReadFrequently: true });
			if (!ctx) return fallback;
			ctx.fillStyle = '#000';
			ctx.fillStyle = input; // ignored if the browser can't parse it
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
			return `rgb(${r}, ${g}, ${b})`;
		} catch {
			return fallback;
		}
	}

	async function readColors() {
		if (!browser) return;
		await tick();
		const cs = getComputedStyle(document.documentElement);
		accent = toRgb(cs.getPropertyValue('--accent').trim(), accent);
		accent2 = toRgb(cs.getPropertyValue('--accent-2').trim(), accent2);
	}
	$: (void [$tweaks, $theme], readColors());
	onMount(readColors);
	onMount(loadExportFonts);

	const FONT = "'JetBrains Mono','DejaVu Sans Mono',monospace";
	// Display face for the wordmark + name (technical lines stay mono).
	const FONT_DISPLAY = "'Space Grotesk','Inter Tight',system-ui,sans-serif";
	// Icon column: one face that holds all the symbols (phone, arrow, dot), monospace like the values.
	const FONT_ICON = "'Nexenne Icons','DejaVu Sans Mono',monospace";

	// The PNG/SVG export renders the SVG via an <img>, an isolated context that
	// ignores the page's web fonts, so we inline the fonts as base64 @font-face
	// into the exported copy, otherwise the wordmark falls back to a generic sans.
	let fontFaceCss = '';
	async function loadExportFonts() {
		if (!browser || fontFaceCss) return;
		const want = [
			{ fam: 'Space Grotesk', style: 'normal', url: '/fonts/space-grotesk.woff2' },
			{ fam: 'JetBrains Mono', style: 'normal', url: '/fonts/jetbrains-mono.woff2' },
			{ fam: 'JetBrains Mono', style: 'italic', url: '/fonts/jetbrains-mono-italic.woff2' },
			{ fam: 'Nexenne Icons', style: 'normal', url: '/fonts/nexenne-icons.woff2' }
		];
		try {
			const faces = await Promise.all(
				want.map(async (f) => {
					const buf = await (await fetch(f.url)).arrayBuffer();
					const bytes = new Uint8Array(buf);
					let bin = '';
					for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
					return `@font-face{font-family:'${f.fam}';font-style:${f.style};font-weight:300 700;font-display:block;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
				})
			);
			fontFaceCss = faces.join('');
		} catch {
			fontFaceCss = '';
		}
	}

	// "Marco" logo path (drawn white on the card).
	const LOGO =
		'm 94.372922,247.09093 c -3.001546,-1.20901 -3.264825,-2.52592 -3.464751,-17.33037 -0.217661,-16.12119 1.010482,-14.39392 -10.067177,-14.15832 -12.053429,0.2564 -12.76027,-0.74958 -13.178986,-18.75651 -0.282309,-12.1392 -0.282309,-12.1392 -4.516909,-12.29813 -7.162915,-0.26882 -7.950607,-5.03878 -1.668775,-10.1054 2.799639,-2.25801 10.777288,-10.85837 13.535372,-14.59182 3.671909,-4.97052 6.670064,-5.42109 8.909094,-1.33881 0.529044,0.96464 3.221629,5.22047 5.983548,9.4575 9.416408,14.44553 9.226586,17.01977 -1.254961,17.01977 -5.742802,0 -5.742802,0 -5.742802,6.98857 0,9.38449 1.975357,10.47933 10.393688,5.76063 24.761417,-13.8795 43.450747,-60.66176 34.722557,-86.91595 -3.56327,-10.71828 -4.61605,-10.52456 -18.79667,3.45855 -16.848287,16.61375 -20.313384,16.76117 -38.144221,1.62315 -3.637694,-3.08838 -3.637694,-3.08838 -8.681897,0.81536 -5.072207,3.92548 -6.29166,4.40794 -8.352952,3.30478 -1.718569,-0.91974 -2.337443,-3.1996 -2.245807,-8.27322 0.10514,-5.81884 -0.624122,-7.62883 -4.995982,-12.399982 -8.704931,-9.4999 -7.389609,-13.3976 3.982503,-11.801214 11.35472,1.593907 18.003439,5.741722 18.003439,11.231571 0,2.220685 1.897667,4.032075 10.502266,10.024545 11.877218,8.27171 12.552209,8.20989 22.398231,-2.04977 7.60845,-7.928191 13.6038,-12.852639 18.36823,-15.087381 3.45939,-1.622577 3.54866,-1.718787 3.19114,-3.437021 -1.11748,-5.370664 -3.32738,-6.175689 -9.06166,-3.301016 -15.192449,7.616175 -29.760497,9.078928 -31.519269,3.164718 -0.579012,-1.947015 1.294661,-3.498574 6.387754,-5.289644 19.776665,-6.954851 25.849835,-19.903307 22.382755,-47.721595 -1.69971,-13.637962 -0.67105,-19.131485 3.39146,-18.111849 1.85527,0.465639 2.89524,2.216223 4.25748,7.166414 6.20341,22.542652 19.02116,32.514916 34.39366,26.758342 6.19879,-2.321297 8.60766,-2.457367 10.47342,-0.591601 4.55959,4.55965 -4.42347,13.29174 -22.68036,22.046696 -6.63094,3.179848 -6.95266,4.406694 -2.48882,9.490703 4.04416,4.606004 7.0859,3.98939 17.80115,-3.608504 16.43037,-11.650408 24.87624,-13.347578 36.51751,-7.338171 3.73344,1.927255 6.92776,3.364479 7.09838,3.193852 0.17067,-0.170683 0.80259,-1.775653 1.40425,-3.566607 2.3943,-7.127174 5.2478,-7.029214 10.47076,0.359373 1.44801,2.048362 4.31738,5.883955 6.37635,8.523523 7.94834,10.189475 7.66102,10.6922 -10.16022,17.776689 -13.31462,5.292959 -14.12364,5.460429 -16.22514,3.358879 -2.62534,-2.625277 -1.24915,-5.673007 4.94263,-10.946037 4.37078,-3.722278 4.40371,-3.136775 -0.35683,-6.354451 -13.98542,-9.452987 -17.63752,-8.813899 -38.13243,6.672994 -9.69159,7.323438 -9.02456,6.265128 -7.78947,12.358774 9.28304,45.80004 -5.35247,86.59598 -37.99935,105.9217 -4.89514,2.89776 -4.89514,2.89776 -5.28178,7.53934 -0.51544,6.18794 -0.36745,6.76361 1.79264,6.97404 5.91676,0.57642 23.98288,-8.34137 23.08999,-11.39774 -3.25031,-11.12593 -0.61757,-13.3303 15.92465,-13.33318 16.43009,-0.006 18.08226,1.5113 10.07468,9.23353 -4.45187,4.2932 -5.40731,6.22559 -5.41351,10.94927 -0.008,5.96107 -5.03377,6.22768 -10.15639,0.53886 -1.42129,-1.5785 -1.42129,-1.5785 -21.05783,13.07764 -21.908764,16.35212 -23.100828,17.01993 -27.334638,15.31453 z';
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

	// Exact logo bounding box (measured): centre (132.29, 132.29), height 230.88.
	const LCX = 132.29;
	const LCY = 132.29;
	const LH = 230.88;
	const QR_DARK = '#0a0b0f';

	// Labels under each QR + motto (editable via i18n).
	$: motto = $t('card.motto');
	$: qrTiles = [
		{ matrix: QR_SITE, n: QR_SITE_N, label: $t('card.qr.site') },
		{ matrix: QR_CONTACT, n: QR_CONTACT_N, label: $t('card.qr.contact') }
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
		const inset = Math.round(m * 0.034);

		// Front: logo-dominant layout (big mark, small wordmark, motto near the bottom).
		const logoS = (H * 0.52) / LH;
		const logoCy = H * 0.4;
		const wordSize = Math.round(Math.min(H * 0.122, W * 0.083));
		// Grow the motto for legibility, but cap it so even the longer Italian line
		// stays inside the card: JetBrains Mono advances ≈ 0.62em per glyph.
		const mottoDesired = Math.min(H * 0.04, W * 0.026);
		const mottoFitsWidth = motto ? (W - 2 * pad) / (motto.length * 0.62) : mottoDesired;
		const mottoSize = Math.round(Math.min(mottoDesired, mottoFitsWidth));
		const wordY = Math.round(H * 0.84);
		const mottoY = Math.round(wordY + mottoSize + H * 0.045);

		// Back: identity on the left, one large QR on the right.
		const nameSize = Math.round(Math.min(H * 0.088, W * 0.057));
		const roleSize = Math.round(Math.min(H * 0.037, W * 0.024));
		const rowSize = Math.round(Math.min(H * 0.044, W * 0.028));
		const nameY = Math.round(H * 0.21);
		const roleY = Math.round(nameY + nameSize * 0.62);
		const divY = Math.round(roleY + H * 0.05);
		const row0Y = Math.round(divY + H * 0.085);
		const rowStep = Math.round(H * 0.083);
		// big pet peeking (head) out of the bottom-left corner, slightly rotated so the
		// head points to the right. Mostly off-card; only the head shows below the contacts.
		const petS = (H * 1.0) / LH;
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
			inset,
			front: {
				logoTx: W / 2 - LCX * logoS,
				logoTy: logoCy - LCY * logoS,
				logoS,
				wordX: W / 2,
				wordY,
				wordSize,
				mottoY,
				mottoSize
			},
			back: {
				nameY,
				nameSize,
				roleY,
				roleSize,
				divY,
				divW: card.name.length * nameSize * 0.54, // ≈ Space Grotesk advance
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

	function save(blob: Blob, filename: string) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	// Exports are rendered oversized so they're always safe to print; scale down later.
	// Base canvas ≈ 300 dpi at the real card size, so EXPORT_SCALE = 4 ≈ 1200 dpi.
	const EXPORT_SCALE = 4;

	// Serialize a copy with preview-only elements (e.g. the cut border) removed and
	// an explicit large pixel size, so the file opens big in any tool.
	function exportXml(el: SVGSVGElement): string {
		const clone = el.cloneNode(true) as SVGSVGElement;
		clone.querySelectorAll('[data-noexport]').forEach((n) => n.remove());
		if (fontFaceCss) {
			const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
			styleEl.textContent = fontFaceCss;
			clone.insertBefore(styleEl, clone.firstChild);
		}
		clone.setAttribute('width', String(W * EXPORT_SCALE));
		clone.setAttribute('height', String(H * EXPORT_SCALE));
		return new XMLSerializer().serializeToString(clone);
	}

	function downloadSvg(el: SVGSVGElement, name: string) {
		const xml = exportXml(el);
		save(
			new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], { type: 'image/svg+xml' }),
			`${name}.svg`
		);
	}

	function downloadPng(el: SVGSVGElement, name: string, scale = EXPORT_SCALE) {
		const xml = exportXml(el);
		const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = W * scale;
			canvas.height = H * scale;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((b) => b && save(b, `${name}.png`), 'image/png');
		};
		img.src = src;
	}
</script>

<svelte:head>
	<title>nexenne · {$t('card.title').toLowerCase()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-anim card-page">
	<header class="page-title">
		<div><span class="meta">{$t('card.meta')}</span></div>
		<div>
			<h1 class="display">{$t('card.title')}</h1>
			<p class="lede" style="margin-top: 14px;">{$t('card.lede')}</p>
		</div>
	</header>

	<section class="section" style="padding-top: var(--sp-5);">
		<div class="size-tabs">
			{#each SIZES as s, i (s.key)}
				<button class="size-tab" class:is-active={sel === i} on:click={() => (sel = i)} data-hover>
					<span class="size-name">{$t('card.size.' + s.key)}</span>
					<span class="size-mm">{s.mm}</span>
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
					<rect
						x={L.inset}
						y={L.inset}
						width={W - 2 * L.inset}
						height={H - 2 * L.inset}
						rx={L.inset}
						fill="none"
						stroke="#23232e"
						stroke-width="2"
						data-noexport
					/>
					<path
						fill="#ffffff"
						transform="translate({L.front.logoTx},{L.front.logoTy}) scale({L.front.logoS})"
						d={LOGO}
					/>
					<text
						x={L.front.wordX}
						y={L.front.wordY}
						text-anchor="middle"
						font-family={FONT_DISPLAY}
						font-size={L.front.wordSize}
						font-weight="600"
						fill="#ffffff"
						letter-spacing="-0.5">{card.brand}</text
					>
					{#if motto}
						<text
							x={L.front.wordX}
							y={L.front.mottoY}
							text-anchor="middle"
							font-family={FONT}
							font-size={L.front.mottoSize}
							font-style="italic"
							fill="#9aa3b2"
							letter-spacing="0.4">{motto}</text
						>
					{/if}
				</svg>
				<figcaption>
					<span>{$t('card.front')} · {size.mm}</span>
					<div class="card-actions">
						<button
							class="btn btn--sm"
							on:click={() => downloadPng(frontEl, `nexenne-card-front-${size.key}`)}
							data-hover>PNG</button
						>
						<button
							class="btn btn--sm"
							on:click={() => downloadSvg(frontEl, `nexenne-card-front-${size.key}`)}
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
					<rect
						x={L.inset}
						y={L.inset}
						width={W - 2 * L.inset}
						height={H - 2 * L.inset}
						rx={L.inset}
						fill="none"
						stroke="#23232e"
						stroke-width="2"
						data-noexport
					/>

					{#if !qrOnly}
						<path
							fill="#ffffff"
							fill-opacity="0.2"
							transform="rotate({L.back.petRot} {L.back.petCx} {L.back.petCy}) translate({L.back
								.petCx -
								LCX * L.back.petS},{L.back.petCy - LCY * L.back.petS}) scale({L.back.petS})"
							d={LOGO}
						/>
						<text
							x={L.pad}
							y={L.back.nameY}
							font-family={FONT_DISPLAY}
							font-size={L.back.nameSize}
							font-weight="600"
							fill="#ffffff"
							letter-spacing="-0.5">{card.name}</text
						>
						<text
							x={L.pad}
							y={L.back.roleY}
							font-family={FONT}
							font-size={L.back.roleSize}
							fill="#9aa3b2">{role}</text
						>
						<rect
							x={L.pad}
							y={L.back.divY}
							width={L.back.divW}
							height={L.back.divH}
							fill={accent}
						/>
						{#each contacts as c, i (c.value)}
							<text
								x={L.pad}
								y={L.back.row0Y + i * L.back.rowStep}
								font-family={FONT_ICON}
								font-size={c.small ? L.back.rowSmall : L.back.rowSize}
								fill={accent2}>{c.icon}</text
							>
							<text
								x={L.back.valX}
								y={L.back.row0Y + i * L.back.rowStep}
								font-family={FONT}
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
						{@const lS = (lbox * 0.64) / LH}
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
							transform="translate({lcx - LCX * lS},{lcy - LCY * lS}) scale({lS})"
							d={LOGO}
						/>
						<text
							x={slot.x + slot.size / 2}
							y={slot.labelY}
							text-anchor="middle"
							font-family={FONT}
							font-size={L.back.qrLabelSize}
							fill={accent2}
							letter-spacing="0.5">{tile.label}</text
						>
					{/snippet}

					{@render qrTile(qrTiles[1], L.back.qr)}
				</svg>
				<figcaption>
					<span>{$t('card.back')} · {size.mm}</span>
					<div class="card-actions">
						<button
							class="btn btn--sm"
							on:click={() => downloadPng(backEl, `nexenne-card-back-${size.key}`)}
							data-hover>PNG</button
						>
						<button
							class="btn btn--sm"
							on:click={() => downloadSvg(backEl, `nexenne-card-back-${size.key}`)}
							data-hover>SVG</button
						>
					</div>
				</figcaption>
			</figure>
		</div>
	</section>
</div>

<style>
	.card-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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
</style>
