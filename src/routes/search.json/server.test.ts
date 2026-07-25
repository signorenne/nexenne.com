import { describe, it, expect, vi } from 'vitest';
import { DICT } from '$lib/i18n';

vi.mock('$lib/content/blog.server', () => ({
	getAllPosts: () => [
		{
			slug: 'post-one',
			byLang: {
				en: {
					title: 'Strong Types',
					html: '<h2>Intro</h2><p>about <strong>types</strong> &amp; safety</p>'
				},
				it: { title: 'Tipi Forti', html: '<p>sui tipi</p>' }
			}
		}
	]
}));

vi.mock('$lib/content/work.server', () => ({
	getAllWork: () => [
		{ slug: 'work-one', byLang: { en: { title: 'Cluster', html: '<p>render farm</p>' } } }
	]
}));

const { GET } = await import('./+server');

async function entries(): Promise<
	Array<{ path: string; lang: string; title: string; text: string }>
> {
	const res = (GET as () => Response)();
	return JSON.parse(await res.text());
}

describe('search.json', () => {
	it('indexes static pages from i18n (both languages)', async () => {
		const list = await entries();
		const aboutEn = list.find((e) => e.path === '/about/' && e.lang === 'en');
		const aboutIt = list.find((e) => e.path === '/about/' && e.lang === 'it');
		expect(aboutEn?.text.length).toBeGreaterThan(0);
		expect(aboutIt?.text.length).toBeGreaterThan(0);
		// Main static pages and the renamed brand assets route are all present.
		for (const p of [
			'/',
			'/services/',
			'/contact/',
			'/uses/',
			'/now/',
			'/brand/',
			'/colophon/',
			'/resume/'
		]) {
			expect(list.some((e) => e.path === p)).toBe(true);
		}
		expect(list.some((e) => e.path === '/card/')).toBe(false);
	});

	it('indexes posts and work by path, per language', async () => {
		const list = await entries();
		expect(list).toContainEqual(
			expect.objectContaining({ path: '/blog/post-one/', lang: 'it', title: 'Tipi Forti' })
		);
		expect(list).toContainEqual(
			expect.objectContaining({ path: '/work/work-one/', lang: 'en', title: 'Cluster' })
		);
	});

	it('strips HTML to plain text and decodes entities', async () => {
		const list = await entries();
		const en = list.find((e) => e.path === '/blog/post-one/' && e.lang === 'en');
		expect(en?.text).toBe('Intro about types & safety');
		expect(en?.text).not.toContain('<');
	});

	it('indexes the terminal page without leaking its easter eggs', async () => {
		const list = await entries();
		for (const lang of ['en', 'it']) {
			const terminal = list.find((e) => e.path === '/terminal/' && e.lang === lang);
			expect(terminal?.text).toContain(DICT[lang as 'en' | 'it']['terminal.lede']);
			// Hidden commands and runtime chatter must stay out of the public index,
			// so they can only be found by using the terminal.
			expect(terminal?.text).not.toContain('xyzzy');
			expect(terminal?.text).not.toContain(DICT[lang as 'en' | 'it']['terminal.easter.sudo']);
			expect(terminal?.text).not.toContain(DICT[lang as 'en' | 'it']['terminal.fortunes']);
		}
	});

	it('résumé text includes experience/skills content', async () => {
		const list = await entries();
		const resumeEn = list.find((e) => e.path === '/resume/' && e.lang === 'en');
		expect(resumeEn?.text.toLowerCase()).toContain('problem solving');
	});
});
