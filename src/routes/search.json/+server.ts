/**
 * Prerendered full-text search index consumed by the command palette.
 *
 * Emits one entry per page per language: static pages are assembled from their
 * i18n keys, the resume from its structured content, and blog and work entries
 * from their rendered HTML stripped to plain text. The palette fetches the
 * resulting search.json once and ranks matches client side.
 */
import { getAllPosts } from '$lib/content/blog.server';
import { getAllWork } from '$lib/content/work.server';
import { getResumes } from '$lib/content/resume.server';
import { DICT, type Lang } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const prerender = true;

export interface SearchEntry {
	// Unprefixed app path, for example /about/ or /blog/slug/.
	path: string;
	lang: string;
	title: string;
	text: string;
}

const LANGS: Lang[] = ['en', 'it'];

// Static pages are assembled from their i18n keys (keys are prefixed per page).
const PAGES: { path: string; prefixes: string[]; titleKey: string }[] = [
	{ path: '/', prefixes: ['hero.', 'home.'], titleKey: 'sidemap.home' },
	{ path: '/about/', prefixes: ['about.'], titleKey: 'sidemap.about' },
	{ path: '/services/', prefixes: ['services.'], titleKey: 'sidemap.services' },
	{ path: '/contact/', prefixes: ['contact.'], titleKey: 'sidemap.contact' },
	{ path: '/uses/', prefixes: ['uses.'], titleKey: 'sidemap.uses' },
	{ path: '/now/', prefixes: ['now.'], titleKey: 'sidemap.now' },
	{ path: '/colophon/', prefixes: ['colophon.'], titleKey: 'footer.colophon' }
];

/**
 * Strip rendered markup down to plain, searchable text.
 *
 * @param html The rendered HTML (or any markup) to flatten.
 * @param max  Maximum length to keep, to bound the index size.
 * @return Collapsed plain text, truncated to max characters.
 */
function toText(html: string, max = 2200): string {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}

function pageText(lang: Lang, prefixes: string[]): string {
	const dict = DICT[lang];
	const parts: string[] = [];
	for (const key of Object.keys(dict)) {
		if (prefixes.some((p) => key.startsWith(p))) parts.push(dict[key]);
	}
	return toText(parts.join(' '));
}

function resumeText(lang: Lang): string {
	const r = getResumes()[lang];
	// Skills/education first so these keyword-dense sections survive the cap,
	// then the longer prose of experience and projects.
	const parts: string[] = [r.name, r.role, r.quote, r.motto];
	for (const g of r.skills) parts.push(g.title, ...g.items);
	for (const ed of r.education) parts.push(ed.degree, ed.school);
	for (const e of r.experience) parts.push(e.role, e.company, e.headline, ...e.points, ...e.tags);
	for (const p of r.projects) parts.push(p.name, p.kind, p.headline, ...p.points, ...p.tags);
	return toText(parts.filter(Boolean).join(' '), 6000);
}

export const GET: RequestHandler = () => {
	const entries: SearchEntry[] = [];

	for (const lang of LANGS) {
		for (const page of PAGES) {
			entries.push({
				path: page.path,
				lang,
				title: DICT[lang][page.titleKey] ?? '',
				text: pageText(lang, page.prefixes)
			});
		}
		entries.push({
			path: '/resume/',
			lang,
			title: DICT[lang]['sidemap.resume'] ?? '',
			text: resumeText(lang)
		});
	}

	for (const bundle of getAllPosts()) {
		for (const [lang, post] of Object.entries(bundle.byLang)) {
			entries.push({
				path: `/blog/${bundle.slug}/`,
				lang,
				title: post.title,
				text: toText(post.html)
			});
		}
	}
	for (const bundle of getAllWork()) {
		for (const [lang, work] of Object.entries(bundle.byLang)) {
			entries.push({
				path: `/work/${bundle.slug}/`,
				lang,
				title: work.title,
				text: toText(work.html)
			});
		}
	}

	return new Response(JSON.stringify(entries), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
