/**
 * Browser-side helpers shared by the brand asset generators: resolving theme
 * colors to plain sRGB, inlining the self-hosted fonts, and downloading an SVG
 * element as SVG or PNG.
 *
 * Both generators draw live SVG and export the same element the visitor sees,
 * so this module is what keeps the exported file identical to the preview.
 */
import { browser } from '$app/environment';
import { base } from '$app/paths';

export { readThemeColor, resolveCssColor } from '$lib/colors';

export type BrandFontFamily = 'JetBrains Mono' | 'Nexenne Icons';

/**
 * The face every brand asset draws with. Pinned to JetBrains Mono because that
 * is what --font-display resolves to by default, so a banner or card reads as
 * the same typography as the hero and the site wordmark. It is also the only
 * self-hosted family that ships a real italic, which the motto needs.
 */
export const BRAND_FONT_STACK = "'JetBrains Mono','DejaVu Sans Mono',monospace";

/** One face holding the card's contact symbols (phone, arrow, dot). */
export const BRAND_ICON_STACK = "'Nexenne Icons','DejaVu Sans Mono',monospace";

interface FontFace {
	style: 'normal' | 'italic';
	file: string;
}

const FONT_FACES: Record<BrandFontFamily, readonly FontFace[]> = {
	'JetBrains Mono': [
		{ style: 'normal', file: 'jetbrains-mono.woff2' },
		{ style: 'italic', file: 'jetbrains-mono-italic.woff2' }
	],
	'Nexenne Icons': [{ style: 'normal', file: 'nexenne-icons.woff2' }]
};

/** Inlined @font-face CSS, cached per set of families so exports refetch nothing. */
const fontCssCache = new Map<string, Promise<string>>();

function toBase64(bytes: Uint8Array): string {
	// Chunked so a large font file cannot blow the argument limit of fromCharCode.
	let binary = '';
	const chunk = 0x8000;
	for (let index = 0; index < bytes.length; index += chunk) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
	}
	return btoa(binary);
}

/**
 * Build @font-face rules with the fonts inlined as base64.
 *
 * An export is rasterised through an <img>, an isolated document that ignores
 * the page's web fonts, so without this the wordmark and motto fall back to a
 * generic system face.
 *
 * @param families The families the asset draws with.
 * @return The CSS to inject into the exported SVG, or '' when a fetch failed.
 */
export function loadFontFaceCss(families: readonly BrandFontFamily[]): Promise<string> {
	if (!browser) return Promise.resolve('');

	const cacheKey = [...families].sort().join('|');
	const cached = fontCssCache.get(cacheKey);
	if (cached) return cached;

	const pending = (async () => {
		try {
			const faces = families.flatMap((family) =>
				FONT_FACES[family].map((face) => ({ family, ...face }))
			);
			const rules = await Promise.all(
				faces.map(async (face) => {
					const response = await fetch(`${base}/fonts/${face.file}`);
					if (!response.ok) throw new Error(`font request failed: ${response.status}`);
					const bytes = new Uint8Array(await response.arrayBuffer());
					return `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:300 700;font-display:block;src:url(data:font/woff2;base64,${toBase64(bytes)}) format('woff2');}`;
				})
			);
			return rules.join('');
		} catch {
			// An export with fallback fonts still beats no export at all.
			fontCssCache.delete(cacheKey);
			return '';
		}
	})();

	fontCssCache.set(cacheKey, pending);
	return pending;
}

export interface SerializeOptions {
	/** Pixel width to stamp on the exported root, before any scale. */
	width: number;
	/** Pixel height to stamp on the exported root, before any scale. */
	height: number;
	/** Multiplier for the exported pixel size. Defaults to 1. */
	scale?: number;
	/** Inlined @font-face CSS from loadFontFaceCss. */
	fontCss?: string;
}

/**
 * Serialize a copy of a live SVG element for export: preview-only nodes marked
 * data-noexport are dropped, the fonts are inlined, and an explicit pixel size
 * is stamped on so the file opens at the intended resolution in any tool.
 *
 * @param element The SVG element rendered in the page.
 * @param options Output size, scale, and font CSS.
 * @return The serialized SVG markup.
 */
export function serializeSvg(element: SVGSVGElement, options: SerializeOptions): string {
	const { width, height, scale = 1, fontCss = '' } = options;
	const clone = element.cloneNode(true) as SVGSVGElement;

	clone.querySelectorAll('[data-noexport]').forEach((node) => node.remove());
	if (fontCss) {
		const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
		style.textContent = fontCss;
		clone.insertBefore(style, clone.firstChild);
	}
	clone.setAttribute('width', String(width * scale));
	clone.setAttribute('height', String(height * scale));

	return new XMLSerializer().serializeToString(clone);
}

/**
 * Hand a blob to the browser as a download.
 *
 * @param blob     The file contents.
 * @param filename The name to save it under.
 */
export function saveBlob(blob: Blob, filename: string): void {
	const anchor = document.createElement('a');
	const url = URL.createObjectURL(blob);
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterise serialized SVG markup to a PNG blob.
 *
 * @param xml    Serialized SVG markup.
 * @param width  Output width in pixels.
 * @param height Output height in pixels.
 * @return The PNG blob.
 * @throws When the markup cannot be decoded or the canvas cannot encode a PNG.
 */
export function rasterize(xml: string, width: number, height: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const source = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
		const image = new Image();

		image.onload = () => {
			URL.revokeObjectURL(source);
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			if (!context) {
				reject(new Error('canvas 2d context unavailable'));
				return;
			}
			context.drawImage(image, 0, 0, width, height);
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
				'image/png'
			);
		};

		image.onerror = () => {
			URL.revokeObjectURL(source);
			reject(new Error('SVG could not be decoded'));
		};

		image.src = source;
	});
}

export interface DownloadOptions extends SerializeOptions {
	/** Filename stem, without the extension. */
	filename: string;
	/** Families to inline. Defaults to the display face alone. */
	fonts?: readonly BrandFontFamily[];
}

/**
 * Export a live SVG element as an .svg file.
 *
 * @param element The SVG element rendered in the page.
 * @param options Output size, scale, filename, and fonts to inline.
 * @throws When serialization fails.
 */
export async function downloadSvg(element: SVGSVGElement, options: DownloadOptions): Promise<void> {
	const fontCss = await loadFontFaceCss(options.fonts ?? ['JetBrains Mono']);
	const xml = serializeSvg(element, { ...options, fontCss });
	saveBlob(
		new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], { type: 'image/svg+xml' }),
		`${options.filename}.svg`
	);
}

/**
 * Export a live SVG element as a .png file.
 *
 * @param element The SVG element rendered in the page.
 * @param options Output size, scale, filename, and fonts to inline.
 * @throws When the SVG cannot be rasterised.
 */
export async function downloadPng(element: SVGSVGElement, options: DownloadOptions): Promise<void> {
	const { width, height, scale = 1 } = options;
	const fontCss = await loadFontFaceCss(options.fonts ?? ['JetBrains Mono']);
	const xml = serializeSvg(element, { ...options, fontCss });
	const blob = await rasterize(xml, width * scale, height * scale);
	saveBlob(blob, `${options.filename}.png`);
}
