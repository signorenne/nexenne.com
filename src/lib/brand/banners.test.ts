import { describe, expect, it } from 'vitest';
import { DICT, type Lang } from '$lib/i18n';
import {
	BANNER_PRESETS,
	bannerFilename,
	carriesMotto,
	fitSlogan,
	isTransparent,
	layoutBanner,
	MARK_PAINT,
	MARK_VARIANTS,
	measureLine,
	safeBox,
	sloganBox,
	sweepBar,
	type BannerPreset
} from './banners';
import { MASCOT_BBOX, MASCOT_VIEWBOX_SIZE } from './mascot';

/** The motto exactly as the banner assembles it from the hero keys. */
function motto(lang: Lang): string[] {
	const dict = DICT[lang];
	return [
		dict['hero.motto.l1'],
		`${dict['hero.motto.l2.before']}${dict['hero.motto.l2.accent']}${dict['hero.motto.l2.after']}`,
		dict['hero.motto.l3'],
		`${dict['hero.motto.l4.before']}${dict['hero.motto.l4.sweep']}${dict['hero.motto.l4.after']}`
	];
}

const LANGS: Lang[] = ['en', 'it'];
/** Sub-pixel slack, so exact-fit layouts are not failed by float error. */
const EPSILON = 0.5;

/** The presets that draw the motto. Every text assertion below is about these. */
const MOTTO_PRESETS = BANNER_PRESETS.filter(carriesMotto);
/** The mascot-only presets: avatars, which carry no wording at any size. */
const MARK_PRESETS = BANNER_PRESETS.filter((preset) => !carriesMotto(preset));

function contains(outer: ReturnType<typeof safeBox>, inner: ReturnType<typeof safeBox>): boolean {
	return (
		inner.x >= outer.x - EPSILON &&
		inner.y >= outer.y - EPSILON &&
		inner.x + inner.width <= outer.x + outer.width + EPSILON &&
		inner.y + inner.height <= outer.y + outer.height + EPSILON
	);
}

/**
 * The mascot as drawn, not the square box around it. The drawing fills 68.9% of
 * that box horizontally and 87.3% vertically, so checking the box would fail
 * layouts that are correct and pass ones that clip.
 */
function mascotBox(preset: BannerPreset, lines: string[]) {
	const layout = layoutBanner(preset, lines);
	const width = layout.mascotSize * (MASCOT_BBOX.width / MASCOT_VIEWBOX_SIZE);
	const height = layout.mascotSize * (MASCOT_BBOX.height / MASCOT_VIEWBOX_SIZE);
	return {
		x: layout.mascotX + (layout.mascotSize - width) / 2,
		y: layout.mascotY + (layout.mascotSize - height) / 2,
		width,
		height
	};
}

describe('banner presets', () => {
	it('has unique keys and a note, label and group for both languages', () => {
		const keys = BANNER_PRESETS.map((preset) => preset.key);
		expect(keys).toEqual([...new Set(keys)]);

		const missing = BANNER_PRESETS.flatMap((preset) =>
			LANGS.flatMap((lang) =>
				[preset.labelKey, preset.groupKey, preset.noteKey]
					.filter((key) => !DICT[lang][key])
					.map((key) => `${lang}:${key}`)
			)
		);
		expect(missing).toEqual([]);
	});

	it('declares safe areas that sit inside the canvas and leave room to work', () => {
		for (const preset of BANNER_PRESETS) {
			const { safe } = preset;
			expect(safe.left).toBeGreaterThanOrEqual(0);
			expect(safe.top).toBeGreaterThanOrEqual(0);
			expect(safe.right).toBeLessThanOrEqual(1);
			expect(safe.bottom).toBeLessThanOrEqual(1);
			expect(safe.right - safe.left).toBeGreaterThan(0.5);
			expect(safe.bottom - safe.top).toBeGreaterThan(0.25);
		}
	});

	it('covers print, video, developer and social channels', () => {
		const groups = new Set(BANNER_PRESETS.map((preset) => preset.groupKey));
		expect(groups).toContain('brand.group.video');
		expect(groups).toContain('brand.group.developer');
		expect(groups).toContain('brand.group.social');
	});

	it('splits wide canvases and stacks square or portrait ones', () => {
		for (const preset of MOTTO_PRESETS) {
			const box = safeBox(preset);
			const ratio = box.width / box.height;
			expect(preset.composition).toBe(ratio >= 2 ? 'split' : 'stacked');
		}
	});

	it('offers a mascot-only asset for the avatars', () => {
		expect(MARK_PRESETS.map((preset) => preset.key)).toEqual(['githubOrg']);
	});
});

describe('layoutBanner', () => {
	// This is the failure the layout maths exists to prevent: the Italian motto is
	// noticeably longer than the English one, and a fixed size overflows on the
	// narrow strips (LinkedIn, X) long before it does on the square formats.
	it('keeps the mascot and the motto inside the safe area, in both languages', () => {
		for (const preset of MOTTO_PRESETS) {
			for (const lang of LANGS) {
				const lines = motto(lang);
				const layout = layoutBanner(preset, lines);
				const label = `${preset.key}/${lang}`;

				expect(contains(layout.safe, mascotBox(preset, lines)), `mascot ${label}`).toBe(true);
				expect(contains(layout.safe, sloganBox(layout, lines)), `motto ${label}`).toBe(true);
			}
		}
	});

	it('keeps the motto legible once the asset is scaled down', () => {
		for (const preset of MOTTO_PRESETS) {
			for (const lang of LANGS) {
				const layout = layoutBanner(preset, motto(lang));
				// At least 2% of the smaller edge, so the text survives a feed thumbnail.
				const floor = Math.min(preset.width, preset.height) * 0.02;
				expect(layout.sloganSize, `${preset.key}/${lang}`).toBeGreaterThan(floor);
			}
		}
	});

	it('centres a split layout as one block and a stacked layout on the axis', () => {
		for (const preset of MOTTO_PRESETS) {
			const lines = motto('en');
			const layout = layoutBanner(preset, lines);
			const box = layout.safe;

			if (preset.composition === 'split') {
				expect(layout.sloganAnchor).toBe('start');
				// Vertically centred: the drawing's midpoint matches the safe area's.
				const centred = mascotBox(preset, lines);
				expect(centred.y + centred.height / 2).toBeCloseTo(box.y + box.height / 2, 6);
				// The motto starts clear of the drawing, never overlapping it.
				const ink = mascotBox(preset, lines);
				expect(layout.sloganX).toBeGreaterThan(ink.x + ink.width);
			} else {
				expect(layout.sloganAnchor).toBe('middle');
				expect(layout.sloganX).toBeCloseTo(box.x + box.width / 2, 6);
				// The motto sits below the drawing.
				const stackedInk = mascotBox(preset, lines);
				expect(layout.sloganY).toBeGreaterThan(stackedInk.y + stackedInk.height);
			}
		}
	});

	it('shrinks the motto rather than overflowing when the text grows', () => {
		const preset = BANNER_PRESETS.find((item) => item.key === 'linkedin');
		expect(preset).toBeDefined();
		if (!preset) return;

		const normal = layoutBanner(preset, motto('en'));
		const long = layoutBanner(preset, [
			'a considerably longer first line than the motto',
			'and a second one that also runs long',
			'plus a third',
			'and a fourth'
		]);

		expect(long.sloganSize).toBeLessThan(normal.sloganSize);
		expect(
			contains(long.safe, sloganBox(long, ['a considerably longer first line than the motto']))
		).toBe(true);
	});
});

describe('the mark layout', () => {
	it('centres the mascot in the safe area and draws no motto', () => {
		for (const preset of MARK_PRESETS) {
			const lines = motto('en');
			const layout = layoutBanner(preset, lines);
			const box = layout.safe;
			const ink = mascotBox(preset, lines);

			expect(contains(box, ink), preset.key).toBe(true);
			// Sub-pixel slack: the measured centre of the outline and the middle of
			// its viewBox differ by a thousandth of a pixel at this size.
			expect(Math.abs(ink.x + ink.width / 2 - (box.x + box.width / 2))).toBeLessThan(EPSILON);
			expect(Math.abs(ink.y + ink.height / 2 - (box.y + box.height / 2))).toBeLessThan(EPSILON);
			// Nothing is written on it, so every box derived from the motto is empty.
			expect(layout.sloganSize).toBe(0);
			expect(sloganBox(layout, lines).width).toBe(0);
			expect(sweepBar(layout, lines[3], '', 'do it', 3).width).toBe(0);
		}
	});

	it('ignores the motto, so both languages export the same file', () => {
		for (const preset of MARK_PRESETS) {
			expect(layoutBanner(preset, motto('it'))).toEqual(layoutBanner(preset, motto('en')));
		}
	});

	it('fills the safe area rather than floating a small mark in it', () => {
		for (const preset of MARK_PRESETS) {
			const ink = mascotBox(preset, motto('en'));
			expect(ink.height / safeBox(preset).height).toBeGreaterThan(0.8);
		}
	});
});

describe('fitSlogan', () => {
	it('never returns more than the desired size', () => {
		expect(fitSlogan(['short'], 10000, 10000, 42)).toBe(42);
	});

	it('is bounded by width and by height independently', () => {
		const byWidth = fitSlogan(['a'.repeat(100)], 100, 10000, 500);
		const byHeight = fitSlogan(['a', 'b', 'c', 'd'], 10000, 100, 500);
		expect(byWidth).toBeLessThan(500);
		expect(byHeight).toBeLessThan(500);
	});

	it('never drops below the legibility floor', () => {
		expect(fitSlogan(['a'.repeat(500)], 1, 1, 500)).toBe(12);
	});
});

describe('measureLine', () => {
	it('scales with both the line length and the font size', () => {
		expect(measureLine('abcd', 10)).toBeCloseTo(measureLine('ab', 10) * 2, 6);
		expect(measureLine('ab', 20)).toBeCloseTo(measureLine('ab', 10) * 2, 6);
		expect(measureLine('', 10)).toBe(0);
	});
});

describe('sweepBar', () => {
	/** The hero underlines the sweep run on the last motto line. */
	function sweepFor(preset: BannerPreset, lang: Lang) {
		const dict = DICT[lang];
		const before = dict['hero.motto.l4.before'];
		const run = dict['hero.motto.l4.sweep'];
		const line = `${before}${run}${dict['hero.motto.l4.after']}`;
		const layout = layoutBanner(preset, motto(lang));
		return { bar: sweepBar(layout, line, before, run, 3), layout, line, before, run };
	}

	it('underlines a run that is inside the safe area on every preset', () => {
		for (const preset of MOTTO_PRESETS) {
			for (const lang of LANGS) {
				const { bar, layout } = sweepFor(preset, lang);
				const label = `${preset.key}/${lang}`;
				expect(bar.width, `width ${label}`).toBeGreaterThan(0);
				expect(bar.x, `left ${label}`).toBeGreaterThanOrEqual(layout.safe.x - EPSILON);
				expect(bar.x + bar.width, `right ${label}`).toBeLessThanOrEqual(
					layout.safe.x + layout.safe.width + EPSILON
				);
			}
		}
	});

	it('sits on the last line and straddles its baseline, as the hero bar does', () => {
		for (const preset of MOTTO_PRESETS) {
			const { bar, layout } = sweepFor(preset, 'en');
			const baseline = layout.sloganY + layout.sloganStep * 3;
			expect(bar.y).toBeLessThan(baseline);
			expect(bar.y + bar.height).toBeGreaterThan(baseline);
			// Same proportions as the winning .hero h1 .sweep::after in src/app.css.
			expect(bar.height / layout.sloganSize).toBeCloseTo(0.12, 6);
		}
	});

	it('offsets the bar by the text before the run', () => {
		const preset = BANNER_PRESETS[0];
		const layout = layoutBanner(preset, motto('en'));
		const atStart = sweepBar(layout, 'do it at all.', '', 'do it', 3);
		const offset = sweepBar(layout, 'non farla.', 'non ', 'farla', 3);

		expect(atStart.x).toBeCloseTo(layout.sloganX, 6);
		expect(offset.x).toBeCloseTo(layout.sloganX + measureLine('non ', layout.sloganSize), 6);
		expect(offset.width).toBeCloseTo(measureLine('farla', layout.sloganSize), 6);
	});

	it('centres the offset on a stacked layout, where the line is centred', () => {
		const stacked = BANNER_PRESETS.find((item) => item.composition === 'stacked');
		expect(stacked).toBeDefined();
		if (!stacked) return;

		const layout = layoutBanner(stacked, motto('en'));
		const line = 'do it at all.';
		const bar = sweepBar(layout, line, '', 'do it', 3);
		expect(bar.x).toBeCloseTo(layout.sloganX - measureLine(line, layout.sloganSize) / 2, 6);
	});
});

describe('bannerFilename', () => {
	it('names the file after the channel and its pixel size', () => {
		const preset = BANNER_PRESETS.find((item) => item.key === 'youtube');
		expect(preset && bannerFilename(preset)).toBe('nexenne-youtube-2560x1440');
	});

	it('produces a unique filename per preset', () => {
		const names = BANNER_PRESETS.map((preset) => bannerFilename(preset));
		expect(names).toEqual([...new Set(names)]);
	});

	it('names the variant only when it is transparent', () => {
		for (const preset of MARK_PRESETS) {
			const stem = bannerFilename(preset);
			expect(bannerFilename(preset, 'gradient')).toBe(stem);
			expect(bannerFilename(preset, 'light')).toBe(`${stem}-transparent-light`);
			expect(bannerFilename(preset, 'dark')).toBe(`${stem}-transparent-dark`);
		}
	});
});

describe('mark variants', () => {
	it('offers the gradient plus a light and a dark transparent mark', () => {
		expect(MARK_VARIANTS.map((variant) => variant.key)).toEqual(['gradient', 'light', 'dark']);
	});

	it('labels every variant in both languages', () => {
		const missing = MARK_VARIANTS.flatMap((variant) =>
			LANGS.filter((lang) => !DICT[lang][variant.labelKey]).map((lang) => `${lang}:${variant.key}`)
		);
		expect(missing).toEqual([]);
	});

	it('drops the background for every variant but the gradient', () => {
		expect(isTransparent('gradient')).toBe(false);
		expect(isTransparent('light')).toBe(true);
		expect(isTransparent('dark')).toBe(true);
	});

	it('paints the transparent marks in opposite inks, so one suits any surface', () => {
		// Literals, never theme colours: an export cannot depend on who is looking.
		expect(MARK_PAINT.gradient).toBe('#ffffff');
		expect(MARK_PAINT.light).toBe('#ffffff');
		expect(MARK_PAINT.dark).toBe('#0d0e12');
		expect(MARK_PAINT.light).not.toBe(MARK_PAINT.dark);
	});
});

// Each platform's published requirements, pinned so a future tweak to a safe
// area cannot silently violate the spec it was derived from. Sources are listed
// beside the presets in banners.ts.
describe('platform specs', () => {
	const preset = (key: string) => {
		const found = BANNER_PRESETS.find((item) => item.key === key);
		if (!found) throw new Error(`missing preset: ${key}`);
		return found;
	};

	it('YouTube composes inside the 1546x423 cross-device safe strip', () => {
		const p = preset('youtube');
		const box = safeBox(p);
		expect([p.width, p.height]).toEqual([2560, 1440]);
		expect(box.width).toBeCloseTo(1546, 0);
		expect(box.height).toBeCloseTo(423, 0);
		// Centred: the strip is the middle of the canvas on both axes.
		expect(box.x + box.width / 2).toBeCloseTo(p.width / 2, 0);
		expect(box.y + box.height / 2).toBeCloseTo(p.height / 2, 0);
	});

	it('GitHub keeps 50px clear of every edge of the 2:1 card', () => {
		const p = preset('github');
		const box = safeBox(p);
		expect([p.width, p.height]).toEqual([1280, 640]);
		expect(box.x).toBeGreaterThanOrEqual(50);
		expect(box.y).toBeGreaterThanOrEqual(50);
		expect(p.width - (box.x + box.width)).toBeGreaterThanOrEqual(50);
		expect(p.height - (box.y + box.height)).toBeGreaterThanOrEqual(50);
	});

	it('the GitHub organization avatar is square and survives a round crop', () => {
		const p = preset('githubOrg');
		expect([p.width, p.height]).toEqual([1024, 1024]);
		// GitHub asks for at least 500x500 and never enlarges what it is given.
		expect(p.width).toBeGreaterThanOrEqual(500);

		// Every corner of the drawing stays inside the circle a round crop leaves.
		const ink = mascotBox(p, motto('en'));
		const radius = p.width / 2;
		const corners = [
			[ink.x, ink.y],
			[ink.x + ink.width, ink.y],
			[ink.x, ink.y + ink.height],
			[ink.x + ink.width, ink.y + ink.height]
		];
		for (const [x, y] of corners) {
			expect(Math.hypot(x - p.width / 2, y - p.height / 2)).toBeLessThanOrEqual(radius);
		}
	});

	it('the link preview keeps the 1.91:1 ratio unfurlers crop to', () => {
		const p = preset('og');
		expect(p.width / p.height).toBeCloseTo(1.91, 1);
	});

	it('LinkedIn starts clear of the profile photo', () => {
		const p = preset('linkedin');
		expect([p.width, p.height]).toEqual([1584, 396]);
		// The photo covers about the left 24% of a personal cover.
		expect(safeBox(p).x / p.width).toBeGreaterThanOrEqual(0.24);
		// Anchored to that edge rather than centred in what is left.
		expect(p.align).toBe('start');
	});

	it('X clears the avatar and the top edge', () => {
		const p = preset('x');
		const box = safeBox(p);
		expect([p.width, p.height]).toEqual([1500, 500]);
		// Avatar sits over the bottom-left 250x250; guidance says avoid the
		// lower-left 20% of the width and keep 50px off the top.
		expect(box.x).toBeGreaterThanOrEqual(p.width * 0.2);
		expect(box.y).toBeGreaterThanOrEqual(50);
		expect(p.align).toBe('start');
	});

	it('Facebook survives both the desktop and the mobile crop', () => {
		const p = preset('facebook');
		const box = safeBox(p);
		// Only the centre ~78% of width and ~87% of height shows on both.
		expect(box.width / p.width).toBeLessThanOrEqual(0.78);
		expect(box.height / p.height).toBeLessThanOrEqual(0.87);
		expect(box.x + box.width / 2).toBeCloseTo(p.width / 2, 0);
	});

	it('the Instagram portrait survives the square profile-grid crop', () => {
		const p = preset('instagram');
		const box = safeBox(p);
		expect([p.width, p.height]).toEqual([1080, 1350]);
		// The grid crops to the central 1080x1080.
		expect(box.y).toBeGreaterThanOrEqual((p.height - 1080) / 2);
		expect(box.y + box.height).toBeLessThanOrEqual((p.height + 1080) / 2);
	});

	it('the Instagram story clears the 250px of chrome top and bottom', () => {
		const p = preset('instagramStory');
		const box = safeBox(p);
		expect([p.width, p.height]).toEqual([1080, 1920]);
		expect(box.y).toBeGreaterThanOrEqual(250);
		expect(box.y + box.height).toBeLessThanOrEqual(1670);
		// ...and uses that room rather than leaving it idle.
		expect(box.height).toBeGreaterThan((1670 - 250) * 0.9);
	});

	it('the Instagram square is square', () => {
		const p = preset('instagramSquare');
		expect([p.width, p.height]).toEqual([1080, 1080]);
	});
});
