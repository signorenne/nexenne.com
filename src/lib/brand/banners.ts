/**
 * Banner presets and the pure layout maths behind the /brand asset library.
 *
 * A banner carries the mascot and the site motto and nothing else, so the only
 * real problem here is fitting those two elements inside each platform's safe
 * area. Every preset declares the canvas size, the fraction of it that stays
 * clear of platform chrome and crops, and which of the two compositions to use.
 * Everything in this module is pure, so the layouts are unit tested against the
 * real motto in both languages rather than eyeballed in a browser.
 */
import type { Box } from './geometry';
import { MASCOT_BBOX, MASCOT_VIEWBOX_SIZE } from './mascot';

export type BannerKey =
	| 'youtube'
	| 'github'
	| 'og'
	| 'linkedin'
	| 'x'
	| 'facebook'
	| 'instagram'
	| 'instagramSquare'
	| 'instagramStory';

/**
 * How the mascot and the motto sit together. Wide canvases put them side by
 * side, because stacking them in a 3:1 strip leaves the motto unreadably small;
 * square and portrait canvases stack them.
 */
export type Composition = 'split' | 'stacked';

/**
 * Where a split composition sits inside its safe area.
 *
 * Most banners centre, because their safe area is a symmetric margin. On the
 * profile covers the left edge is not a margin but an obstacle: the avatar sits
 * over it. Centring in what is left then pushes the lockup towards the right
 * edge and opens a void on the left that reads as misalignment, so those anchor
 * to the obstacle and let the slack fall on the outside.
 */
export type SplitAlign = 'center' | 'start';

/** The usable region, as fractions of the canvas from each edge. */
export interface SafeArea {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface BannerPreset {
	key: BannerKey;
	labelKey: string;
	groupKey: string;
	noteKey: string;
	width: number;
	height: number;
	safe: SafeArea;
	composition: Composition;
	/** Split alignment inside the safe area. Defaults to 'center'. */
	align?: SplitAlign;
}

export type { Box };

export interface BannerLayout {
	mascotX: number;
	mascotY: number;
	mascotSize: number;
	sloganX: number;
	sloganY: number;
	sloganSize: number;
	sloganStep: number;
	sloganAnchor: 'start' | 'middle';
	/** The resolved safe area, drawn as a preview-only guide. */
	safe: Box;
}

/**
 * Where the drawing's centre sits inside the mascot box, as a fraction of the
 * box width. Measured from the path, which is symmetric about its viewBox, so
 * this is exactly the middle: the business card centres the same outline the
 * same way. A hand-picked value here would drift the two apart.
 */
export const LOGO_CENTER_X = MASCOT_BBOX.centerX / MASCOT_VIEWBOX_SIZE;

/**
 * Advance per glyph as a fraction of the font size. JetBrains Mono is monospace
 * at 0.6em, and the banner text is tracked in by 0.04em, so this is exact rather
 * than an estimate: a line's width is its character count times this.
 */
const DISPLAY_ADVANCE = 0.56;

/** Baseline-to-baseline distance as a multiple of the font size. */
const LINE_STEP = 1.02;

/** Distance from a line's top to its baseline, as a multiple of the size. */
const CAP_OFFSET = 0.82;

/** Below this the motto stops being legible once the asset is scaled down. */
const MIN_SLOGAN_SIZE = 12;

export const BANNER_PRESETS: readonly BannerPreset[] = [
	{
		key: 'youtube',
		labelKey: 'brand.asset.youtube',
		groupKey: 'brand.group.video',
		noteKey: 'brand.note.youtube',
		width: 2560,
		height: 1440,
		// YouTube shows the full 2560x1440 on TV only. Every other device crops to
		// the central 1546x423 "safe" strip, so all content lives inside it.
		safe: { left: 0.198, right: 0.802, top: 0.353, bottom: 0.647 },
		composition: 'split'
	},
	{
		key: 'github',
		labelKey: 'brand.asset.github',
		groupKey: 'brand.group.developer',
		noteKey: 'brand.note.github',
		width: 1280,
		height: 640,
		// GitHub crops the card to 2:1 and asks for 50px of clearance from any
		// edge; this is comfortably inside that.
		safe: { left: 0.07, right: 0.93, top: 0.1, bottom: 0.9 },
		composition: 'split'
	},
	{
		key: 'og',
		labelKey: 'brand.asset.og',
		groupKey: 'brand.group.developer',
		noteKey: 'brand.note.og',
		width: 1200,
		height: 630,
		// Link unfurlers crop towards 1.91:1 and some square-crop the centre, so
		// the margin here is generous on every side.
		safe: { left: 0.09, right: 0.91, top: 0.12, bottom: 0.88 },
		composition: 'split'
	},
	{
		key: 'linkedin',
		labelKey: 'brand.asset.linkedin',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.linkedin',
		width: 1584,
		height: 396,
		// The profile photo overlaps the lower left. Measured off a real profile it
		// covers about the left 24% and the bottom half; published guides claim as
		// much as 36%, so the lockup starts at 27% to keep clearance either way.
		safe: { left: 0.27, right: 0.96, top: 0.08, bottom: 0.92 },
		composition: 'split',
		align: 'start'
	},
	{
		key: 'x',
		labelKey: 'brand.asset.x',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.x',
		width: 1500,
		height: 500,
		// The avatar covers the bottom-left 250x250, guidance is to keep out of the
		// lower-left 20% (300px) and 50px clear of the top. This is both.
		safe: { left: 0.2, right: 0.96, top: 0.1, bottom: 0.82 },
		composition: 'split',
		align: 'start'
	},
	{
		key: 'facebook',
		labelKey: 'brand.asset.facebook',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.facebook',
		width: 1702,
		height: 630,
		// Canvas is 2x the 851x315 upload size. Desktop shows 820x312 and mobile
		// 640x360, so only the centre (about 78% wide, 87% tall) survives both.
		safe: { left: 0.14, right: 0.86, top: 0.1, bottom: 0.9 },
		composition: 'split'
	},
	{
		key: 'instagram',
		labelKey: 'brand.asset.instagram',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.instagram',
		width: 1080,
		height: 1350,
		// The profile grid square-crops a 4:5 post to its central 1080x1080, so the
		// safe band is exactly that square: 135px is trimmed top and bottom.
		safe: { left: 0.08, right: 0.92, top: 135 / 1350, bottom: 1215 / 1350 },
		composition: 'stacked'
	},
	{
		key: 'instagramSquare',
		labelKey: 'brand.asset.instagramSquare',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.instagramSquare',
		width: 1080,
		height: 1080,
		safe: { left: 0.08, right: 0.92, top: 0.09, bottom: 0.91 },
		composition: 'stacked'
	},
	{
		key: 'instagramStory',
		labelKey: 'brand.asset.instagramStory',
		groupKey: 'brand.group.social',
		noteKey: 'brand.note.instagramStory',
		width: 1080,
		height: 1920,
		// Story UI reserves the top and bottom 250px: profile row and timestamp
		// above, message bar and link sticker below. Everything else is usable.
		safe: { left: 0.1, right: 0.9, top: 250 / 1920, bottom: 1670 / 1920 },
		composition: 'stacked'
	}
];

/**
 * Resolve a preset's safe area to absolute pixels.
 *
 * @param preset The banner preset.
 * @return The usable box in canvas coordinates.
 */
export function safeBox(preset: BannerPreset): Box {
	const { width, height, safe } = preset;
	return {
		x: width * safe.left,
		y: height * safe.top,
		width: width * (safe.right - safe.left),
		height: height * (safe.bottom - safe.top)
	};
}

/**
 * Estimate the drawn width of a text line at a given size.
 *
 * @param line The text.
 * @param size The font size in canvas units.
 * @return The approximate width in canvas units.
 */
export function measureLine(line: string, size: number): number {
	return line.length * size * DISPLAY_ADVANCE;
}

function longestLine(lines: readonly string[]): string {
	return lines.reduce((longest, line) => (line.length > longest.length ? line : longest), '');
}

/** Total height of the motto block, from the first line's top to the last baseline. */
function textBlockHeight(size: number, lineCount: number): number {
	return size + size * LINE_STEP * Math.max(0, lineCount - 1);
}

/**
 * Pick the largest motto size that fits both the available width and height.
 *
 * @param lines     The motto lines.
 * @param maxWidth  Width the longest line may occupy.
 * @param maxHeight Height the whole block may occupy.
 * @param desired   Preferred size before any constraint applies.
 * @return The chosen font size in canvas units.
 */
export function fitSlogan(
	lines: readonly string[],
	maxWidth: number,
	maxHeight: number,
	desired: number
): number {
	const longest = longestLine(lines);
	const byWidth = longest.length
		? maxWidth / (longest.length * DISPLAY_ADVANCE)
		: Number.POSITIVE_INFINITY;
	const byHeight = maxHeight / (1 + LINE_STEP * Math.max(0, lines.length - 1));
	return Math.max(MIN_SLOGAN_SIZE, Math.min(desired, byWidth, byHeight));
}

/**
 * The mascot drawing fills only part of its square box: 68.9% of the width and
 * 87.3% of the height. Laying out on the box rather than the ink leaves that
 * difference as invisible padding, which reads as the mascot floating away from
 * the motto and the pair sitting off-centre. Every measurement below is on the
 * ink; the box is positioned around it at the end.
 */
const INK_WIDTH = MASCOT_BBOX.width / MASCOT_VIEWBOX_SIZE;
const INK_HEIGHT = MASCOT_BBOX.height / MASCOT_VIEWBOX_SIZE;

/** Gap between the mascot and the motto, as a fraction of the mascot's ink width. */
const SPLIT_GAP = 0.36;

/** Target mascot height as a fraction of the motto block height. */
const SPLIT_BALANCE = 0.92;

/** How far the mascot may shrink from its full size to give the motto room. */
const MASCOT_MIN_RATIO = 0.55;

/**
 * Size the mascot so it ends up about as tall as the motto block once the motto
 * has taken whatever width the mascot leaves it.
 *
 * Sizing the two independently pulls them apart in opposite directions: a short
 * motto (English) leaves a small mascot beside a tall column of text, and a long
 * one (Italian runs about 75% wider) leaves a full-height mascot beside text too
 * small to read. Solving for the balance point keeps both languages looking like
 * the same asset.
 */
function balancedMascotSize(box: Box, lines: readonly string[], maxMascot: number): number {
	const advance = longestLine(lines).length * DISPLAY_ADVANCE;
	if (advance <= 0) return maxMascot;

	// Solve, in ink terms, for the box size m where the mascot's ink height equals
	// BALANCE times the motto block height, given the motto takes whatever width
	// the ink and the gap leave it:
	//   m*INK_H = BALANCE * blockFactor * (width - m*INK_W*(1 + GAP)) / advance
	const blockFactor = 1 + LINE_STEP * Math.max(0, lines.length - 1);
	const pull = SPLIT_BALANCE * blockFactor;
	const balanced = (pull * box.width) / (INK_HEIGHT * advance + pull * INK_WIDTH * (1 + SPLIT_GAP));

	return Math.min(maxMascot, Math.max(maxMascot * MASCOT_MIN_RATIO, balanced));
}

/** Mascot beside the motto, the pair centred as one block in the safe area. */
function splitLayout(preset: BannerPreset, lines: readonly string[]): BannerLayout {
	const box = safeBox(preset);
	// Caps are on the ink, so the drawing really is 86% of the safe height.
	const maxMascot = Math.min((box.height * 0.86) / INK_HEIGHT, (box.width * 0.3) / INK_WIDTH);
	const mascotSize = balancedMascotSize(box, lines, maxMascot);
	const inkWidth = mascotSize * INK_WIDTH;
	const gap = inkWidth * SPLIT_GAP;
	const sloganSize = fitSlogan(
		lines,
		box.width - inkWidth - gap,
		box.height * 0.96,
		box.height * 0.26
	);
	const textHeight = textBlockHeight(sloganSize, lines.length);

	// Centre on the text that is actually drawn, not on the column it was allowed
	// to use, otherwise a short motto leaves the pair sitting left of centre.
	const contentWidth = inkWidth + gap + measureLine(longestLine(lines), sloganSize);
	const slack = Math.max(0, box.width - contentWidth);
	const inkLeft = box.x + (preset.align === 'start' ? 0 : slack / 2);
	const centerY = box.y + box.height / 2;

	return {
		// Back the box out from where the ink has to start.
		mascotX: inkLeft - (mascotSize - inkWidth) / 2,
		mascotY: centerY - mascotSize / 2,
		mascotSize,
		sloganX: inkLeft + inkWidth + gap,
		sloganY: centerY - textHeight / 2 + sloganSize * CAP_OFFSET,
		sloganSize,
		sloganStep: sloganSize * LINE_STEP,
		sloganAnchor: 'start',
		safe: box
	};
}

/** Mascot above the motto, both centred in the safe area. */
function stackedLayout(preset: BannerPreset, lines: readonly string[]): BannerLayout {
	const box = safeBox(preset);
	// As in the split layout, the caps and the gap are on the ink, not the box.
	const mascotSize = Math.min((box.height * 0.4) / INK_HEIGHT, (box.width * 0.52) / INK_WIDTH);
	const inkHeight = mascotSize * INK_HEIGHT;
	const gap = box.height * 0.055;
	const sloganSize = fitSlogan(
		lines,
		box.width * 0.96,
		box.height - inkHeight - gap,
		box.height * 0.1
	);
	const textHeight = textBlockHeight(sloganSize, lines.length);
	const contentHeight = inkHeight + gap + textHeight;
	const inkTop = box.y + Math.max(0, box.height - contentHeight) / 2;
	const centerX = box.x + box.width / 2;

	return {
		mascotX: centerX - mascotSize * LOGO_CENTER_X,
		// Back the box out from where the ink has to start.
		mascotY: inkTop - (mascotSize - inkHeight) / 2,
		mascotSize,
		sloganX: centerX,
		sloganY: inkTop + inkHeight + gap + sloganSize * CAP_OFFSET,
		sloganSize,
		sloganStep: sloganSize * LINE_STEP,
		sloganAnchor: 'start',
		safe: box
	};
}

/**
 * Lay out one banner for a motto.
 *
 * @param preset The banner preset.
 * @param lines  The motto lines, longest-first order irrelevant.
 * @return Positions and sizes in canvas coordinates.
 */
export function layoutBanner(preset: BannerPreset, lines: readonly string[]): BannerLayout {
	const layout =
		preset.composition === 'split' ? splitLayout(preset, lines) : stackedLayout(preset, lines);
	return preset.composition === 'stacked' ? { ...layout, sloganAnchor: 'middle' } : layout;
}

/**
 * Bounding box of the drawn motto, used by tests and by the preview guides to
 * confirm the text stays inside the safe area.
 *
 * @param layout A computed layout.
 * @param lines  The motto lines it was computed from.
 * @return The box the text occupies in canvas coordinates.
 */
export function sloganBox(layout: BannerLayout, lines: readonly string[]): Box {
	const width = measureLine(longestLine(lines), layout.sloganSize);
	const height = textBlockHeight(layout.sloganSize, lines.length);
	return {
		x: layout.sloganAnchor === 'middle' ? layout.sloganX - width / 2 : layout.sloganX,
		y: layout.sloganY - layout.sloganSize * CAP_OFFSET,
		width,
		height
	};
}

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

/**
 * Place the highlight bar that sits behind one run of the motto.
 *
 * The x and width returned here come from the same estimate the layout uses, so
 * they are correct before any font has loaded. The page refines them from the
 * rendered text once it can measure, which is what ends up in an export.
 *
 * @param layout    The computed layout.
 * @param line      Full text of the line the run belongs to.
 * @param before    Text preceding the run on that line.
 * @param run       The highlighted text.
 * @param lineIndex Zero-based index of the line within the motto.
 * @return The bar in canvas coordinates.
 */
export function sweepBar(
	layout: BannerLayout,
	line: string,
	before: string,
	run: string,
	lineIndex: number
): Box {
	const size = layout.sloganSize;
	const baseline = layout.sloganY + layout.sloganStep * lineIndex;
	const lineStart =
		layout.sloganAnchor === 'middle'
			? layout.sloganX - measureLine(line, size) / 2
			: layout.sloganX;

	return {
		x: lineStart + measureLine(before, size),
		y: baseline - size * SWEEP_RISE,
		width: measureLine(run, size),
		height: size * SWEEP_HEIGHT
	};
}

/**
 * Build the export filename for a banner.
 *
 * @param preset The banner preset.
 * @return A filename stem such as nexenne-youtube-2560x1440.
 */
export function bannerFilename(preset: BannerPreset): string {
	return `nexenne-${preset.key.toLowerCase()}-${preset.width}x${preset.height}`;
}
