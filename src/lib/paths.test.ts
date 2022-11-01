import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { lang } from '$lib/i18n';
import { lpath, lhref, lgoto, mirrorPath, langFromParam, stripLang } from '$lib/paths';
import { goto } from '$app/navigation';

// base is '' in the stub, matching production (custom domain at root).

beforeEach(() => {
	lang.set('en');
	(goto as unknown as { calls: unknown[] }).calls.length = 0;
});

describe('langFromParam', () => {
	it('maps the it param to it', () => {
		expect(langFromParam('it')).toBe('it');
	});
	it('treats undefined (no prefix) as en', () => {
		expect(langFromParam(undefined)).toBe('en');
	});
	it('treats any other value as en', () => {
		expect(langFromParam('en')).toBe('en');
		expect(langFromParam('about')).toBe('en');
		expect(langFromParam('')).toBe('en');
	});
});

describe('lpath', () => {
	it('returns the plain path for English', () => {
		expect(lpath('/about/', 'en')).toBe('/about/');
		expect(lpath('/', 'en')).toBe('/');
	});
	it('prefixes /it for Italian', () => {
		expect(lpath('/about/', 'it')).toBe('/it/about/');
		expect(lpath('/', 'it')).toBe('/it/');
		expect(lpath('/blog/strong-type/', 'it')).toBe('/it/blog/strong-type/');
	});
	it('defaults to the current language store', () => {
		expect(lpath('/work/')).toBe('/work/');
		lang.set('it');
		expect(lpath('/work/')).toBe('/it/work/');
	});
});

describe('lhref (reactive)', () => {
	it('produces English hrefs when lang is en', () => {
		const href = get(lhref);
		expect(href('/about/')).toBe('/about/');
	});
	it('reacts to language changes', () => {
		lang.set('it');
		const href = get(lhref);
		expect(href('/about/')).toBe('/it/about/');
		expect(href('/')).toBe('/it/');
	});
});

describe('lgoto', () => {
	it('navigates using the current language prefix', () => {
		lgoto('/contact/');
		expect((goto as unknown as { calls: string[] }).calls).toEqual(['/contact/']);
	});
	it('prefixes /it when the language is Italian', () => {
		lang.set('it');
		lgoto('/contact/');
		expect((goto as unknown as { calls: string[] }).calls).toEqual(['/it/contact/']);
	});
});

describe('stripLang', () => {
	it('leaves English paths unchanged', () => {
		expect(stripLang('/about/')).toBe('/about/');
		expect(stripLang('/')).toBe('/');
		expect(stripLang('/blog/x/')).toBe('/blog/x/');
	});
	it('removes the /it prefix', () => {
		expect(stripLang('/it/about/')).toBe('/about/');
		expect(stripLang('/it/blog/x/')).toBe('/blog/x/');
	});
	it('handles the bare /it and /it/ as home', () => {
		expect(stripLang('/it')).toBe('/');
		expect(stripLang('/it/')).toBe('/');
	});
	it('does not strip routes that merely start with "it"', () => {
		expect(stripLang('/italy/')).toBe('/italy/');
		expect(stripLang('/items/')).toBe('/items/');
	});
});

describe('mirrorPath', () => {
	it('adds /it going from English to Italian', () => {
		expect(mirrorPath('/about/')).toBe('/it/about/');
		expect(mirrorPath('/')).toBe('/it/');
		expect(mirrorPath('/blog/x/')).toBe('/it/blog/x/');
	});
	it('removes /it going from Italian to English', () => {
		expect(mirrorPath('/it/about/')).toBe('/about/');
		expect(mirrorPath('/it/')).toBe('/');
		expect(mirrorPath('/it')).toBe('/');
	});
	it('round-trips back to the original path', () => {
		for (const p of ['/', '/about/', '/blog/strong-type/', '/work/knob1/']) {
			expect(mirrorPath(mirrorPath(p))).toBe(p);
		}
	});
});
