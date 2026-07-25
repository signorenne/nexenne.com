/**
 * Resolving theme colors to a concrete value.
 *
 * The palette is authored in oklch, which neither a canvas nor a standalone SVG
 * viewer can be relied on to parse. Anything drawing outside the DOM has to ask
 * the browser what a token actually is first.
 */
import { browser } from '$app/environment';

/**
 * Resolve any CSS color to a plain sRGB rgb() string.
 *
 * @param input    The CSS color to resolve, for example a custom property value.
 * @param fallback Returned when the value is empty or the browser cannot parse it.
 * @return An rgb() string, or the fallback.
 */
export function resolveCssColor(input: string, fallback: string): string {
	if (!input) return fallback;
	try {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return fallback;
		// Seed with a known value: an unparseable fillStyle is ignored, not thrown,
		// so without this an invalid input would silently read back as black.
		context.fillStyle = '#000000';
		context.fillStyle = input;
		context.fillRect(0, 0, 1, 1);
		const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
		return `rgb(${red}, ${green}, ${blue})`;
	} catch {
		return fallback;
	}
}

/**
 * Read a CSS custom property from the document root and resolve it to sRGB.
 *
 * @param name     Custom property name, for example --accent.
 * @param fallback Returned when the property is unset or unreadable.
 * @return An rgb() string, or the fallback.
 */
export function readThemeColor(name: string, fallback: string): string {
	if (!browser) return fallback;
	return resolveCssColor(
		getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
		fallback
	);
}
