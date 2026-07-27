import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
	getAllPosts,
	getAllPostMeta,
	getPost,
	pickPost
} from '$lib/content/blog.server';

// These run against the real /content/blog files via import.meta.glob.

describe('getAllPosts (real content)', () => {
	const posts = getAllPosts();

	it('loads at least one post bundle', () => {
		expect(posts.length).toBeGreaterThan(0);
	});

	it('gives every bundle a source entry with html and a slug', () => {
		for (const b of posts) {
			expect(b.slug).toBeTruthy();
			expect(b.source).toBeTruthy();
			expect(typeof b.source.html).toBe('string');
			expect(b.source.html.length).toBeGreaterThan(0);
		}
	});

	it('has no duplicate slugs', () => {
		const slugs = posts.map((b) => b.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('sorts bundles by source date, newest first', () => {
		const dates = posts.map((b) => b.source.date);
		const sorted = [...dates].sort((a, b) => b.localeCompare(a));
		expect(dates).toEqual(sorted);
	});

	it('provides at least one fully bilingual post (en + it)', () => {
		const bilingual = posts.filter((b) => b.byLang.en && b.byLang.it);
		expect(bilingual.length).toBeGreaterThan(0);
	});
});

describe('pickPost', () => {
	const bilingual = getAllPosts().find((b) => b.byLang.en && b.byLang.it)!;

	it('returns the requested language when available', () => {
		expect(pickPost(bilingual, 'it')).toBe(bilingual.byLang.it);
		expect(pickPost(bilingual, 'en')).toBe(bilingual.byLang.en);
	});

	it('falls back to the source when the language is missing', () => {
		const single: typeof bilingual = {
			slug: bilingual.slug,
			source: bilingual.source,
			byLang: { [bilingual.source.lang]: bilingual.source }
		};
		const other = bilingual.source.lang === 'en' ? 'it' : 'en';
		expect(pickPost(single, other)).toBe(single.source);
	});
});

describe('getPost / getAllPostMeta', () => {
	it('finds a bundle by slug', () => {
		const slug = getAllPosts()[0].slug;
		expect(getPost(slug)?.slug).toBe(slug);
		expect(getPost('does-not-exist')).toBeUndefined();
	});

	it('strips html/toc from the meta projection', () => {
		const meta = getAllPostMeta()[0];
		expect('html' in meta.source).toBe(false);
		expect('toc' in meta.source).toBe(false);
		expect(meta.source.title).toBeTruthy();
	});

	it('wires the USB routing article to its cover and PlantUML diagrams', () => {
		const bundle = getPost('usb_vbus_enumerazione_routing');
		const englishArticle = bundle?.byLang.en;
		const italianArticle = bundle?.byLang.it;

		expect(englishArticle?.date).toBe('2026-07-27');
		expect(italianArticle?.date).toBe('2026-07-27');
		expect(englishArticle?.image).toBe('/blog/covers/usb_vbus_enumerazione_routing.webp');
		expect(italianArticle?.image).toBe('/blog/covers/usb_vbus_enumerazione_routing.webp');
		expect(
			existsSync(resolve(process.cwd(), 'static/blog/covers/usb_vbus_enumerazione_routing.webp'))
		).toBe(true);
		expect(englishArticle?.html).toContain(
			'/blog/images/usb_vbus_enumerazione_routing/probe-then-commit-en.svg'
		);
		expect(italianArticle?.html).toContain(
			'/blog/images/usb_vbus_enumerazione_routing/probe-then-commit.svg'
		);
		expect(englishArticle?.html).toContain(
			'https://commons.wikimedia.org/wiki/File:USB_Type-C_plug_20170626.jpg'
		);
		expect(italianArticle?.html).toContain(
			'https://commons.wikimedia.org/wiki/File:USB_Type-C_plug_20170626.jpg'
		);
		expect(englishArticle?.html).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
		expect(italianArticle?.html).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
		expect(
			englishArticle?.toc.some((item) => item.text === 'The mechanism: probe, then commit')
		).toBe(true);
		expect(
			italianArticle?.toc.some((item) => item.text === 'Il meccanismo: probe, poi commit')
		).toBe(true);
		expect(englishArticle?.toc.some((item) => item.text === 'Notes')).toBe(true);
		expect(italianArticle?.toc.some((item) => item.text === 'Note')).toBe(true);
		const englishHtml = englishArticle?.html ?? '';
		const italianHtml = italianArticle?.html ?? '';
		expect(englishHtml.indexOf('id="notes"')).toBeGreaterThan(
			englishHtml.indexOf('id="image-credits"')
		);
		expect(englishHtml.indexOf('data-footnotes')).toBeGreaterThan(
			englishHtml.indexOf('id="notes"')
		);
		expect(italianHtml.indexOf('id="note"')).toBeGreaterThan(
			italianHtml.indexOf('id="crediti-immagine"')
		);
		expect(italianHtml.indexOf('data-footnotes')).toBeGreaterThan(
			italianHtml.indexOf('id="note"')
		);
		expect(englishArticle?.toc.every((item) => !item.text.includes('{#'))).toBe(true);
		expect(italianArticle?.toc.every((item) => !item.text.includes('{#'))).toBe(true);
		expect(pickPost(bundle!, 'en')).toBe(englishArticle);
		expect(pickPost(bundle!, 'it')).toBe(italianArticle);
		expect(englishArticle?.translatedFrom).toBe('it');
		expect(englishArticle?.autoTranslated).toBe(false);
	});
});
