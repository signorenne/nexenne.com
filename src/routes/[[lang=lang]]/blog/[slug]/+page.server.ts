import { error } from '@sveltejs/kit';
import { getAllPosts, getPost } from '$lib/content/blog.server';
import type { PageServerLoad, EntryGenerator } from './$types';

// Prerender each post in both languages: `/blog/x/` and `/it/blog/x/`.
export const entries: EntryGenerator = () =>
	getAllPosts().flatMap((b) => [
		{ lang: '', slug: b.slug },
		{ lang: 'it', slug: b.slug }
	]);

export const load: PageServerLoad = ({ params }) => {
	const lang = params.lang === 'it' ? 'it' : 'en';
	const all = getAllPosts();
	const bundle = getPost(params.slug);
	if (!bundle) throw error(404, 'Post not found');
	const idx = all.findIndex((b) => b.slug === bundle.slug);
	const nextBundle = all[(idx + 1) % all.length];

	const next = {
		slug: nextBundle.slug,
		byLang: Object.fromEntries(
			Object.entries(nextBundle.byLang).map(([lang, p]) => [
				lang,
				{ title: p.title, date: p.date, desc: p.desc }
			])
		),
		sourceLang: nextBundle.source.lang
	};

	// Related posts: most shared tags first, then most recent. Computed at build
	// time and trimmed to lightweight per-language meta.
	const tags = new Set(bundle.source.tags);
	const related = all
		.filter((b) => b.slug !== bundle.slug)
		.map((b) => ({ b, shared: b.source.tags.filter((t) => tags.has(t)).length }))
		.filter((x) => x.shared > 0)
		.sort((a, b) => b.shared - a.shared || b.b.source.date.localeCompare(a.b.source.date))
		.slice(0, 3)
		.map(({ b }) => ({
			slug: b.slug,
			byLang: Object.fromEntries(
				Object.entries(b.byLang).map(([l, p]) => [l, { title: p.title, date: p.date }])
			),
			sourceLang: b.source.lang
		}));

	return { bundle, next, lang, related };
};
