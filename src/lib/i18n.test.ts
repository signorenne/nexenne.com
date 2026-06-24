import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { DICT, lang, t, currentLang, preferredLang, suggestLang } from '$lib/i18n';

beforeEach(() => lang.set('en'));

describe('translation dictionary parity', () => {
	const enKeys = Object.keys(DICT.en).sort();
	const itKeys = Object.keys(DICT.it).sort();

	it('has the exact same set of keys in both languages', () => {
		const missingInIt = enKeys.filter((k) => !(k in DICT.it));
		const missingInEn = itKeys.filter((k) => !(k in DICT.en));
		expect({ missingInIt, missingInEn }).toEqual({ missingInIt: [], missingInEn: [] });
	});

	// A few strings are intentionally empty (e.g. a motto-line prefix that only
	// exists in one language, or a stat with no unit). Everything else must be set.
	const INTENTIONALLY_EMPTY = new Set([
		'hero.motto.l2.before',
		'hero.motto.l4.before',
		'home.stats.year.unit'
	]);

	it('has no unexpected empty translations', () => {
		const emptyEn = enKeys.filter((k) => DICT.en[k].trim() === '' && !INTENTIONALLY_EMPTY.has(k));
		const emptyIt = itKeys.filter((k) => DICT.it[k].trim() === '' && !INTENTIONALLY_EMPTY.has(k));
		expect({ emptyEn, emptyIt }).toEqual({ emptyEn: [], emptyIt: [] });
	});

	it('ships a non-trivial number of keys', () => {
		expect(enKeys.length).toBeGreaterThan(50);
	});
});

describe('t store', () => {
	it('returns English strings when lang is en', () => {
		expect(get(t)('sidemap.home')).toBe(DICT.en['sidemap.home']);
	});

	it('returns Italian strings when lang is it', () => {
		lang.set('it');
		expect(get(t)('sidemap.home')).toBe(DICT.it['sidemap.home']);
	});

	it('reacts to language changes', () => {
		const en = get(t)('sidemap.home');
		lang.set('it');
		const itVal = get(t)('sidemap.home');
		expect(itVal).not.toBe(en);
	});

	it('returns the key itself when it is unknown in both languages', () => {
		expect(get(t)('does.not.exist')).toBe('does.not.exist');
	});
});

describe('currentLang', () => {
	it('reflects the store value', () => {
		expect(currentLang()).toBe('en');
		lang.set('it');
		expect(currentLang()).toBe('it');
	});
});

describe('preferredLang', () => {
	it('picks the first supported tag, ignoring region', () => {
		expect(preferredLang(['it-IT', 'en-US'])).toBe('it');
		expect(preferredLang(['en-GB'])).toBe('en');
		expect(preferredLang(['it'])).toBe('it');
	});
	it('skips unsupported languages until a supported one is found', () => {
		expect(preferredLang(['fr-FR', 'de', 'it'])).toBe('it');
	});
	it('returns null when no tag is supported', () => {
		expect(preferredLang(['fr', 'de', 'es'])).toBeNull();
		expect(preferredLang([])).toBeNull();
	});
});

describe('suggestLang', () => {
	it('suggests the browser language when it differs from the current page', () => {
		expect(suggestLang('en', ['it-IT'])).toBe('it');
		expect(suggestLang('it', ['en-US', 'it'])).toBe('en');
	});
	it('suggests nothing when the browser already matches the page', () => {
		expect(suggestLang('en', ['en-US'])).toBeNull();
		expect(suggestLang('it', ['it-IT'])).toBeNull();
	});
	it('suggests nothing when the browser language is unsupported', () => {
		expect(suggestLang('en', ['fr-FR', 'de'])).toBeNull();
	});
});
