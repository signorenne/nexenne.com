import { describe, it, expect, vi } from 'vitest';

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
		// home, services, contact, uses, now, colophon, resume all present
		for (const p of ['/', '/services/', '/contact/', '/uses/', '/now/', '/colophon/', '/resume/']) {
			expect(list.some((e) => e.path === p)).toBe(true);
		}
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

	it('résumé text includes experience/skills content', async () => {
		const list = await entries();
		const resumeEn = list.find((e) => e.path === '/resume/' && e.lang === 'en');
		expect(resumeEn?.text.toLowerCase()).toContain('problem solving');
	});
});
