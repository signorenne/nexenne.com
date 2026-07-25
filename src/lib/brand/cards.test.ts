import { describe, expect, it } from 'vitest';
import { DICT, type Lang } from '$lib/i18n';
import {
	CARD_SAFE_MM,
	CARD_SIZES,
	cardLockup,
	cardMottoSegments,
	cardSafeBox,
	cardSizeLabel,
	mottoSweepBar,
	mottoText
} from './cards';
import { MASCOT_BBOX } from './mascot';

const LANGS: Lang[] = ['en', 'it'];

/** The motto exactly as the card assembles it from the hero keys. */
function segmentsFor(lang: Lang) {
	const dict = DICT[lang];
	return cardMottoSegments({
		l1: dict['hero.motto.l1'],
		l2Before: dict['hero.motto.l2.before'],
		l2Accent: dict['hero.motto.l2.accent'],
		l2After: dict['hero.motto.l2.after'],
		l3: dict['hero.motto.l3'],
		l4Before: dict['hero.motto.l4.before'],
		l4Sweep: dict['hero.motto.l4.sweep'],
		l4After: dict['hero.motto.l4.after']
	});
}

const mottoFor = (lang: Lang) => mottoText(segmentsFor(lang));

/** The padding the component passes in, mirrored so the tests see real values. */
function padFor(width: number, height: number): number {
	return Math.round(Math.min(width, height) * 0.085);
}

/** Where the mascot is actually drawn, after the translate and scale. */
function mascotBox(width: number, height: number, motto: string) {
	const { logoScale, logoX, logoY } = cardLockup(width, height, motto, padFor(width, height));
	const halfW = (MASCOT_BBOX.width / 2) * logoScale;
	const halfH = (MASCOT_BBOX.height / 2) * logoScale;
	const centerX = logoX + MASCOT_BBOX.centerX * logoScale;
	const centerY = logoY + MASCOT_BBOX.centerY * logoScale;
	return {
		centerX,
		centerY,
		left: centerX - halfW,
		right: centerX + halfW,
		top: centerY - halfH,
		bottom: centerY + halfH
	};
}

describe('CARD_SIZES', () => {
	it('has unique keys and a label in both languages', () => {
		const keys = CARD_SIZES.map((size) => size.key);
		expect(keys).toEqual([...new Set(keys)]);
		for (const size of CARD_SIZES) {
			for (const lang of LANGS) {
				expect(DICT[lang][`brand.card.size.${size.key}`], `${lang}:${size.key}`).toBeTruthy();
			}
		}
	});

	it('maps every physical size to a positive canvas', () => {
		for (const size of CARD_SIZES) {
			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toBeGreaterThan(0);
			expect(size.widthMm).toBeGreaterThan(0);
			expect(size.heightMm).toBeGreaterThan(0);
			// The pixel canvas must keep the physical proportions, or a print is skewed.
			expect(size.width / size.height).toBeCloseTo(size.widthMm / size.heightMm, 2);
			expect(cardSizeLabel(size)).toMatch(/^[\d.]+ × [\d.]+ mm$/);
		}
	});
});

describe('cardLockup', () => {
	const motto = mottoFor('en');

	// The reported symptom: switching format made the mascot appear to drop. It
	// never moved; the wordmark under it did, because its size is capped against
	// the card width and the square format is the only one that hits that cap.
	it('places the mascot identically in every format, relative to the card', () => {
		for (const size of CARD_SIZES) {
			const box = mascotBox(size.width, size.height, motto);
			const label = `${size.key} ${size.width}x${size.height}`;
			expect(box.centerX / size.width, `centre x ${label}`).toBeCloseTo(0.5, 6);
			expect(box.centerY / size.height, `centre y ${label}`).toBeCloseTo(0.4, 6);
			expect(box.top / size.height, `top ${label}`).toBeCloseTo(0.14, 6);
			expect(box.bottom / size.height, `bottom ${label}`).toBeCloseTo(0.66, 6);
		}
	});

	it('keeps the same clear space under the mascot in every format', () => {
		const gaps = CARD_SIZES.map((size) => {
			const { wordY, wordSize } = cardLockup(
				size.width,
				size.height,
				motto,
				padFor(size.width, size.height)
			);
			// Top of the wordmark's caps, less the bottom of the mascot.
			const capTop = wordY - wordSize * 0.72;
			return (capTop - mascotBox(size.width, size.height, motto).bottom) / size.height;
		});

		for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 2);
	});

	it('keeps the whole lockup inside the card, in both languages', () => {
		for (const size of CARD_SIZES) {
			for (const lang of LANGS) {
				const text = mottoFor(lang);
				const pad = padFor(size.width, size.height);
				const lockup = cardLockup(size.width, size.height, text, pad);
				const box = mascotBox(size.width, size.height, text);
				const label = `${size.key}/${lang}`;

				expect(box.top, `mascot top ${label}`).toBeGreaterThan(0);
				expect(box.left, `mascot left ${label}`).toBeGreaterThan(0);
				expect(box.right, `mascot right ${label}`).toBeLessThan(size.width);
				expect(lockup.wordY, `wordmark ${label}`).toBeGreaterThan(box.bottom);
				expect(lockup.mottoY, `motto ${label}`).toBeGreaterThan(lockup.wordY);
				expect(lockup.mottoY, `motto inside ${label}`).toBeLessThan(size.height);

				// The motto is one line and must not run past the padding.
				const mottoWidth = text.length * lockup.mottoSize * 0.55;
				expect(mottoWidth, `motto width ${label}`).toBeLessThanOrEqual(size.width - 2 * pad + 1);
			}
		}
	});

	it('orders the lockup top to bottom without overlap', () => {
		for (const size of CARD_SIZES) {
			const lockup = cardLockup(size.width, size.height, motto, padFor(size.width, size.height));
			expect(lockup.mottoY - lockup.wordY).toBeGreaterThan(lockup.mottoSize);
			expect(lockup.wordSize).toBeGreaterThan(0);
			expect(lockup.mottoSize).toBeGreaterThan(0);
		}
	});
});

describe('cardMottoSegments', () => {
	it('folds the hero motto into one line without losing a word', () => {
		expect(mottoFor('en')).toBe('Do a thing well, or do not do it at all.');
		expect(mottoFor('it')).toBe('Una cosa deve essere fatta bene, altrimenti è meglio non farla.');
	});

	it('marks exactly one accent run and one sweep run, matching the hero', () => {
		for (const lang of LANGS) {
			const segments = segmentsFor(lang);
			const accent = segments.filter((part) => part.mark === 'accent');
			const sweep = segments.filter((part) => part.mark === 'sweep');
			expect(accent, `accent ${lang}`).toHaveLength(1);
			expect(sweep, `sweep ${lang}`).toHaveLength(1);
			expect(accent[0].text).toBe(DICT[lang]['hero.motto.l2.accent']);
			expect(sweep[0].text).toBe(DICT[lang]['hero.motto.l4.sweep']);
		}
	});

	it('drops empty segments so no stray tspan is rendered', () => {
		for (const lang of LANGS) {
			for (const part of segmentsFor(lang)) expect(part.text.length).toBeGreaterThan(0);
		}
	});
});

describe('mottoSweepBar', () => {
	it('underlines the sweep run inside the safe area, in both formats and languages', () => {
		for (const size of CARD_SIZES) {
			for (const lang of LANGS) {
				const segments = segmentsFor(lang);
				const lockup = cardLockup(
					size.width,
					size.height,
					mottoText(segments),
					padFor(size.width, size.height)
				);
				const bar = mottoSweepBar(segments, lockup, size.width / 2);
				const safe = cardSafeBox(size);
				const label = `${size.key}/${lang}`;

				expect(bar, `bar ${label}`).not.toBeNull();
				if (!bar) continue;
				expect(bar.x, `left ${label}`).toBeGreaterThanOrEqual(safe.x);
				expect(bar.x + bar.width, `right ${label}`).toBeLessThanOrEqual(safe.x + safe.width);
				// Straddles the baseline, at the hero's proportions.
				expect(bar.y).toBeLessThan(lockup.mottoY);
				expect(bar.y + bar.height).toBeGreaterThan(lockup.mottoY);
				expect(bar.height / lockup.mottoSize).toBeCloseTo(0.12, 6);
			}
		}
	});

	it('returns nothing when the motto has no sweep run', () => {
		const lockup = cardLockup(1004, 650, 'plain', 55);
		expect(mottoSweepBar([{ text: 'plain', mark: null }], lockup, 502)).toBeNull();
	});
});

describe('cardSafeBox', () => {
	it('insets by the print safe margin on every edge', () => {
		for (const size of CARD_SIZES) {
			const safe = cardSafeBox(size);
			const perMm = size.width / size.widthMm;
			expect(safe.x).toBeCloseTo(CARD_SAFE_MM * perMm, 6);
			expect(safe.y).toBeCloseTo(CARD_SAFE_MM * perMm, 6);
			expect(safe.x + safe.width).toBeCloseTo(size.width - CARD_SAFE_MM * perMm, 6);
			expect(safe.y + safe.height).toBeCloseTo(size.height - CARD_SAFE_MM * perMm, 6);
		}
	});

	it('keeps the whole front lockup inside the safe margin', () => {
		for (const size of CARD_SIZES) {
			for (const lang of LANGS) {
				const safe = cardSafeBox(size);
				const text = mottoFor(lang);
				const lockup = cardLockup(size.width, size.height, text, padFor(size.width, size.height));
				const box = mascotBox(size.width, size.height, text);
				const label = `${size.key}/${lang}`;

				expect(box.top, `mascot ${label}`).toBeGreaterThanOrEqual(safe.y);
				expect(box.bottom, `mascot ${label}`).toBeLessThanOrEqual(safe.y + safe.height);
				expect(box.left, `mascot ${label}`).toBeGreaterThanOrEqual(safe.x);
				expect(box.right, `mascot ${label}`).toBeLessThanOrEqual(safe.x + safe.width);
				expect(lockup.mottoY, `motto ${label}`).toBeLessThanOrEqual(safe.y + safe.height);
			}
		}
	});
});
