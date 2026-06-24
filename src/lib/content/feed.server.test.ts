import { describe, it, expect, vi } from 'vitest';
import type { Post, PostBundle } from '$lib/content/types';

// Build a minimal Post with only the fields buildFeed reads.
function post(slug: string, lang: 'en' | 'it', over: Partial<Post> = {}): Post {
	return {
		slug,
		title: `${slug} (${lang})`,
		date: '2026-03-03',
		lastmod: '',
		desc: `desc ${lang}`,
		tags: ['tag1', 'tag2'],
		categories: [],
		image: '',
		read: '5 min',
		lang,
		translatedFrom: null,
		autoTranslated: false,
		html: `<p>body ${lang}</p>`,
		toc: [],
		...over
	} as Post;
}

const BUNDLES: PostBundle[] = [
	{ slug: 'alpha', source: post('alpha', 'en'), byLang: { en: post('alpha', 'en'), it: post('alpha', 'it') } },
	// 'beta' only exists in English, so the IT feed must fall back to the source.
	{ slug: 'beta', source: post('beta', 'en'), byLang: { en: post('beta', 'en') } }
];

vi.mock('$lib/content/blog.server', () => ({
	getAllPosts: () => BUNDLES
}));

const { buildFeed } = await import('$lib/content/feed.server');

describe('buildFeed (en)', () => {
	const xml = buildFeed('en');

	it('declares the English channel metadata', () => {
		expect(xml).toContain('<title>nexenne - Field notes</title>');
		expect(xml).toContain('<language>en</language>');
		expect(xml).toContain('<atom:link href="https://nexenne.com/feed.xml" rel="self"');
	});
	it('links items at the root (no /it prefix)', () => {
		expect(xml).toContain('<link>https://nexenne.com/blog/alpha/</link>');
		expect(xml).toContain('<link>https://nexenne.com/blog/beta/</link>');
	});
	it('uses the English title and body for each item', () => {
		expect(xml).toContain('<title>alpha (en)</title>');
		expect(xml).toContain('<![CDATA[<p>body en</p>]]>');
	});
	it('emits item categories', () => {
		expect(xml).toContain('<category>tag1</category>');
	});
});

describe('buildFeed (it)', () => {
	const xml = buildFeed('it');

	it('declares the Italian channel metadata', () => {
		expect(xml).toContain('<title>nexenne - Appunti dal campo</title>');
		expect(xml).toContain('<language>it</language>');
		expect(xml).toContain('<atom:link href="https://nexenne.com/it/feed.xml" rel="self"');
	});
	it('links items under /it/', () => {
		expect(xml).toContain('<link>https://nexenne.com/it/blog/alpha/</link>');
		expect(xml).toContain('<link>https://nexenne.com/it/blog/beta/</link>');
	});
	it('uses the Italian translation when present', () => {
		expect(xml).toContain('<title>alpha (it)</title>');
		expect(xml).toContain('<![CDATA[<p>body it</p>]]>');
	});
	it('falls back to the source language when a translation is missing', () => {
		// beta has no IT variant, so the source (en) is used.
		expect(xml).toContain('<title>beta (en)</title>');
	});
});

describe('buildFeed XML escaping', () => {
	it('escapes special characters in titles', () => {
		// getAllPosts() is read on each buildFeed call, so mutating the shared
		// fixture here is picked up. Done last so earlier suites are unaffected.
		BUNDLES.length = 0;
		BUNDLES.push({
			slug: 'x',
			source: post('x', 'en', { title: 'A & B <c> "d"' }),
			byLang: { en: post('x', 'en', { title: 'A & B <c> "d"' }) }
		});
		expect(buildFeed('en')).toContain('A &amp; B &lt;c&gt; &quot;d&quot;');
	});
});
