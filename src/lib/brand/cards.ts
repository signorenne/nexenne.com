/**
 * Business card formats and the front lockup maths. Kept beside the banner
 * presets so the /brand route has one place that answers "what can this page
 * produce", and so the asset list can report the format count instead of
 * hard-coding it in a translated string.
 */
import type { Box } from './geometry';
import { MASCOT_BBOX } from './mascot';

export interface CardSize {
	key: string;
	/** Trim width in millimetres: the size the card is cut to. */
	widthMm: number;
	/** Trim height in millimetres. */
	heightMm: number;
	/** Canvas width in pixels, at the same ratio as the physical size. */
	width: number;
	/** Canvas height in pixels, at the same ratio as the physical size. */
	height: number;
}

/** Standard business-card sizes mapped to pixel canvases at the same ratio. */
export const CARD_SIZES: readonly CardSize[] = [
	{ key: 'standard', widthMm: 85, heightMm: 55, width: 1004, height: 650 },
	{ key: 'us', widthMm: 88.9, heightMm: 50.8, width: 1050, height: 600 },
	{ key: 'credit', widthMm: 85.6, heightMm: 54, width: 1020, height: 643 },
	{ key: 'square', widthMm: 55, heightMm: 55, width: 720, height: 720 },
	{ key: 'slim', widthMm: 85, heightMm: 40, width: 1020, height: 480 }
];

/**
 * The physical size, for the format tab. Derived rather than stored, so a size
 * cannot claim one thing and lay out as another.
 *
 * @param size A card format.
 * @return A label such as "85 × 55 mm".
 */
export function cardSizeLabel(size: CardSize): string {
	return `${size.widthMm} × ${size.heightMm} mm`;
}

/**
 * How much of the card a printer may lose to trimming tolerance. Content inside
 * this margin is what always survives the cut, so it is the print equivalent of
 * a banner's platform safe area.
 */
export const CARD_SAFE_MM = 3;

/**
 * The region that survives trimming, in canvas pixels.
 *
 * @param size A card format.
 * @return The safe box in canvas coordinates.
 */
export function cardSafeBox(size: CardSize): Box {
	const inset = CARD_SAFE_MM * (size.width / size.widthMm);
	return {
		x: inset,
		y: inset,
		width: size.width - inset * 2,
		height: size.height - inset * 2
	};
}

/**
 * Print exports are rendered oversized so they are always safe to print. The
 * base canvas is about 300 dpi at the real card size, so this lands near 1200 dpi.
 */
export const CARD_EXPORT_SCALE = 4;

/** Front lockup proportions, all as fractions of the card height. */
const MASCOT_HEIGHT = 0.52;
const MASCOT_CENTER_Y = 0.4;
/** Clear space between the bottom of the mascot and the top of the wordmark. */
const WORD_GAP = 0.0925;
/**
 * Clear space between the wordmark baseline and the motto baseline. Tuned so the
 * motto still clears the print safe margin on the shortest format (slim, 40 mm),
 * which is the one with the least room under the lockup; cards.test.ts holds it.
 */
const MOTTO_GAP = 0.04;
/** Cap height of the display face, as a multiple of its font size. */
const CAP_RATIO = 0.72;
/** JetBrains Mono is monospace: every glyph advances exactly 0.6em. */
const DISPLAY_ADVANCE = 0.6;

/**
 * The motto's underline, matching the hero exactly.
 *
 * Two rules in src/app.css style that span and both match the hero motto;
 * `.hero h1 .sweep::after` has the higher specificity and wins, so these are its
 * numbers: a 0.12em solid accent bar sitting 0.1em above the inline box bottom.
 * With JetBrains Mono (ascent 1.02em, descent 0.3em) at line-height 1.02 that
 * puts the baseline 0.15em above the box bottom, so the bar spans 0.07em above
 * the baseline to 0.05em below it.
 */
const SWEEP_HEIGHT = 0.12;
const SWEEP_RISE = 0.07;

/** How the hero marks a run of the motto. The card mirrors both marks. */
export type MottoMark = 'accent' | 'sweep' | null;

export interface MottoSegment {
	text: string;
	mark: MottoMark;
}

/** The eight hero motto strings, in reading order. */
export interface MottoParts {
	l1: string;
	l2Before: string;
	l2Accent: string;
	l2After: string;
	l3: string;
	l4Before: string;
	l4Sweep: string;
	l4After: string;
}

/**
 * Fold the hero's four-line motto into the single line a card prints, keeping
 * the two marked runs intact.
 *
 * The card used to carry its own copy of this sentence in the dictionary, which
 * meant the same motto existed twice and could be edited in one place only. It
 * now comes from the same keys as the hero and the banners.
 *
 * @param parts The hero motto strings.
 * @return Ordered segments, each flagged with the mark it carries.
 */
export function cardMottoSegments(parts: MottoParts): MottoSegment[] {
	return (
		[
			{ text: `${parts.l1} ${parts.l2Before}`, mark: null },
			{ text: parts.l2Accent, mark: 'accent' },
			{ text: `${parts.l2After} ${parts.l3} ${parts.l4Before}`, mark: null },
			{ text: parts.l4Sweep, mark: 'sweep' },
			{ text: parts.l4After, mark: null }
		] satisfies MottoSegment[]
	).filter((segment) => segment.text.length > 0);
}

/**
 * The whole motto as one string.
 *
 * @param segments Segments from cardMottoSegments.
 * @return The joined line.
 */
export function mottoText(segments: readonly MottoSegment[]): string {
	return segments.map((segment) => segment.text).join('');
}

/**
 * Place the highlight bar under the motto's sweep run, matching the hero.
 *
 * As on a banner, the width here is a character-count estimate that renders
 * correctly before any font loads; the page refines it from the drawn text.
 *
 * @param segments Segments from cardMottoSegments.
 * @param lockup   The computed front lockup.
 * @param centerX  Horizontal centre the motto is anchored to.
 * @return The bar in canvas coordinates, or null when there is no sweep run.
 */
export function mottoSweepBar(
	segments: readonly MottoSegment[],
	lockup: CardLockup,
	centerX: number
): Box | null {
	const index = segments.findIndex((segment) => segment.mark === 'sweep');
	if (index < 0) return null;

	const size = lockup.mottoSize;
	const advance = size * DISPLAY_ADVANCE;
	const before = mottoText(segments.slice(0, index));
	const lineStart = centerX - (mottoText(segments).length * advance) / 2;

	return {
		x: lineStart + before.length * advance,
		y: lockup.mottoY - size * SWEEP_RISE,
		width: segments[index].text.length * advance,
		height: size * SWEEP_HEIGHT
	};
}

export interface CardLockup {
	/** Uniform scale applied to the mascot path. */
	logoScale: number;
	logoX: number;
	logoY: number;
	wordSize: number;
	wordY: number;
	mottoSize: number;
	mottoY: number;
}

/**
 * Lay out the front of a card: mascot, wordmark, motto.
 *
 * Everything is a fraction of the card height so the lockup keeps identical
 * proportions in every format. The wordmark is the piece that used to break
 * that: its size is capped against the card width so it cannot overflow a
 * narrow card, and on the square format the width wins and makes it about a
 * third smaller. Anchoring its baseline to a flat 0.84 of the height then left
 * a visibly larger gap under the mascot on that one format, which reads as the
 * mascot having dropped when you switch to it. Measuring the gap down from the
 * mascot instead keeps the type and the spacing shrinking together.
 *
 * @param width  Card canvas width in pixels.
 * @param height Card canvas height in pixels.
 * @param motto  The motto line, used to cap its own size against the width.
 * @param pad    Horizontal padding the motto must stay inside.
 * @return Positions and sizes in canvas coordinates.
 */
export function cardLockup(width: number, height: number, motto: string, pad: number): CardLockup {
	const logoScale = (height * MASCOT_HEIGHT) / MASCOT_BBOX.height;
	const logoBottom = height * (MASCOT_CENTER_Y + MASCOT_HEIGHT / 2);

	const wordSize = Math.round(Math.min(height * 0.122, width * 0.083));
	const wordY = Math.round(logoBottom + height * WORD_GAP + wordSize * CAP_RATIO);

	// Grow the motto for legibility, but cap it so even the longer Italian line
	// stays inside the card. Floor rather than round: this is a cap, and rounding
	// a fitted size up puts the line back over the padding it was fitted to.
	const mottoDesired = Math.min(height * 0.04, width * 0.026);
	const mottoFits = motto ? (width - 2 * pad) / (motto.length * DISPLAY_ADVANCE) : mottoDesired;
	const mottoSize = Math.max(1, Math.floor(Math.min(mottoDesired, mottoFits)));

	return {
		logoScale,
		logoX: width / 2 - MASCOT_BBOX.centerX * logoScale,
		logoY: height * MASCOT_CENTER_Y - MASCOT_BBOX.centerY * logoScale,
		wordSize,
		wordY,
		mottoSize,
		mottoY: Math.round(wordY + mottoSize + height * MOTTO_GAP)
	};
}
