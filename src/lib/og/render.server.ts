import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

// Build-time only. Fonts and the resvg wasm are read from disk during prerender
// (cwd is the project root then); none of this ships to the client.
const root = process.cwd();
const spaceGrotesk = readFileSync(join(root, 'src/lib/og/fonts/space-grotesk-700.ttf'));
const jetbrainsMono = readFileSync(join(root, 'src/lib/og/fonts/jetbrains-mono-500.ttf'));

let wasmReady: Promise<unknown> | null = null;
function ensureWasm(): Promise<unknown> {
	if (!wasmReady) {
		const bytes = readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm'));
		wasmReady = initWasm(bytes);
	}
	return wasmReady;
}

const BG = '#0a0a0f';
const INK = '#f4f4f6';
const MUTED = '#8b8b96';
const ACCENT = '#8a73ff'; // brand violet (the default accent), as hex for satori

export interface OgInput {
	title: string;
	kicker: string;
}

// satori takes a React-element-like tree; we build it as plain objects.
type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
	type,
	props: { style, children }
});

function template({ title, kicker }: OgInput): Node {
	return el(
		'div',
		{
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			width: '100%',
			height: '100%',
			padding: '72px',
			backgroundColor: BG,
			color: INK,
			fontFamily: 'JetBrains Mono'
		},
		[
			el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
				el('div', { fontFamily: 'Space Grotesk', fontSize: 30, color: ACCENT }, 'nexenne'),
				el('div', { fontSize: 22, letterSpacing: '0.12em', color: MUTED }, kicker.toUpperCase())
			]),
			el(
				'div',
				{
					display: 'flex',
					fontFamily: 'Space Grotesk',
					fontSize: 70,
					lineHeight: 1.08,
					letterSpacing: '-0.03em',
					color: INK,
					maxWidth: '960px'
				},
				title
			),
			el('div', { display: 'flex', alignItems: 'center' }, [
				el('div', {
					width: '54px',
					height: '8px',
					borderRadius: '4px',
					backgroundColor: ACCENT,
					marginRight: '16px'
				}),
				el('div', { fontSize: 22, color: MUTED }, 'nexenne.com')
			])
		]
	);
}

/**
 * Render a 1200x630 PNG Open Graph card for an article.
 *
 * @param input The title and kicker shown on the card.
 * @return The encoded PNG image bytes.
 */
export async function renderOg(input: OgInput): Promise<Uint8Array> {
	const svg = await satori(template(input) as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{ name: 'Space Grotesk', data: spaceGrotesk, weight: 700, style: 'normal' },
			{ name: 'JetBrains Mono', data: jetbrainsMono, weight: 500, style: 'normal' }
		]
	});
	await ensureWasm();
	return new Resvg(svg).render().asPng();
}
