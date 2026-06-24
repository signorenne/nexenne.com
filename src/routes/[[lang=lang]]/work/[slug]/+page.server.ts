import { error } from '@sveltejs/kit';
import { getAllWork, getWork } from '$lib/content/work.server';
import type { PageServerLoad, EntryGenerator } from './$types';

// Prerender each case study in both languages: `/work/x/` and `/it/work/x/`.
export const entries: EntryGenerator = () =>
	getAllWork().flatMap((b) => [
		{ lang: '', slug: b.slug },
		{ lang: 'it', slug: b.slug }
	]);

export const load: PageServerLoad = ({ params }) => {
	const lang = params.lang === 'it' ? 'it' : 'en';
	const all = getAllWork();
	const bundle = getWork(params.slug);
	if (!bundle) throw error(404, 'Case study not found');
	const idx = all.findIndex((b) => b.slug === bundle.slug);
	const nextBundle = all[(idx + 1) % all.length];

	const next = {
		slug: nextBundle.slug,
		byLang: Object.fromEntries(
			Object.entries(nextBundle.byLang).map(([lang, w]) => [
				lang,
				{ title: w.title, client: w.client, year: w.year }
			])
		),
		sourceLang: nextBundle.source.lang
	};

	// Related case studies: most shared tags first, then most recent.
	const tags = new Set(bundle.source.tags);
	const related = all
		.filter((b) => b.slug !== bundle.slug)
		.map((b) => ({ b, shared: b.source.tags.filter((t) => tags.has(t)).length }))
		.filter((x) => x.shared > 0)
		.sort((a, b) => b.shared - a.shared || b.b.source.year.localeCompare(a.b.source.year))
		.slice(0, 3)
		.map(({ b }) => ({
			slug: b.slug,
			byLang: Object.fromEntries(
				Object.entries(b.byLang).map(([l, w]) => [l, { title: w.title, client: w.client }])
			),
			sourceLang: b.source.lang
		}));

	return { bundle, next, lang, related };
};
