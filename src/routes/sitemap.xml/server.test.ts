import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/content/blog.server', () => ({
	getAllPosts: () => [
		{ slug: 'post-one', source: { date: '2026-01-01', lastmod: '2026-02-01' } },
		{ slug: 'post-two', source: { date: '2026-01-02', lastmod: '' } }
	]
}));

vi.mock('$lib/content/work.server', () => ({
	getAllWork: () => [{ slug: 'work-one' }]
}));

const { GET } = await import('./+server');

async function body(): Promise<string> {
	const res = (GET as () => Response)();
	return await res.text();
}

describe('sitemap.xml', () => {
	it('emits both languages for every static route', async () => {
		const xml = await body();
		expect(xml).toContain('<loc>https://nexenne.com/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/it/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/about/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/it/about/</loc>');
	});

	it('emits both languages for posts and work', async () => {
		const xml = await body();
		expect(xml).toContain('<loc>https://nexenne.com/blog/post-one/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/it/blog/post-one/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/work/work-one/</loc>');
		expect(xml).toContain('<loc>https://nexenne.com/it/work/work-one/</loc>');
	});

	it('declares hreflang alternates linking the two language versions', async () => {
		const xml = await body();
		expect(xml).toContain(
			'<xhtml:link rel="alternate" hreflang="en" href="https://nexenne.com/about/" />'
		);
		expect(xml).toContain(
			'<xhtml:link rel="alternate" hreflang="it" href="https://nexenne.com/it/about/" />'
		);
		expect(xml).toContain('hreflang="x-default" href="https://nexenne.com/about/"');
	});

	it('uses the post lastmod when available, falling back to the date', async () => {
		const xml = await body();
		expect(xml).toContain('<lastmod>2026-02-01</lastmod>'); // post-one lastmod
		expect(xml).toContain('<lastmod>2026-01-02</lastmod>'); // post-two falls back to date
	});

	it('produces exactly two <url> entries per path', async () => {
		const xml = await body();
		const urlCount = (xml.match(/<url>/g) ?? []).length;
		const locs = Array.from(
			xml.matchAll(/<loc>(https:\/\/nexenne\.com[^<]+)<\/loc>/g),
			(match) => match[1]
		);
		const counts = new Map<string, number>();

		for (const loc of locs) {
			const path = loc.replace('https://nexenne.com', '').replace(/^\/it(?=\/|$)/, '') || '/';
			counts.set(path, (counts.get(path) ?? 0) + 1);
		}

		expect(urlCount).toBe(locs.length);
		for (const count of counts.values()) expect(count).toBe(2);
	});

	it('declares the xhtml namespace', async () => {
		const xml = await body();
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
	});
});
