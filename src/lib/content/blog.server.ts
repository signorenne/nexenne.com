/**
 * Blog content loader (server only).
 *
 * Eagerly imports every Markdown and Org file under content/blog, parses and
 * validates the frontmatter with zod, and groups the translations of an article
 * by slug into bilingual bundles. Drafts are skipped outside development. The
 * result is cached for the lifetime of the server process.
 */
import { z } from 'zod';
import { langFromPath, parseByPath, slugFromPath, SUPPORTED_LANGS } from './parser.server';
import type { ContentLang, Post, PostBundle, PostMeta, PostMetaBundle } from './types';

const blogFiles = import.meta.glob('/content/blog/*.{md,org}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function dateToIsoString(value: unknown): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value ?? '');
}

const LangSchema = z
	.enum(SUPPORTED_LANGS as unknown as [ContentLang, ...ContentLang[]])
	.optional();

const FrontmatterSchema = z.object({
	title: z.string(),
	date: z.preprocess(dateToIsoString, z.string()),
	lastmod: z.preprocess(dateToIsoString, z.string().optional().default('')),
	desc: z.string().optional().default(''),
	tags: z.array(z.string()).default([]),
	categories: z.array(z.string()).default([]),
	image: z.string().optional().default(''),
	read: z.string().optional().default(''),
	draft: z.coerce.boolean().optional().default(false),
	lang: LangSchema,
	translated_from: LangSchema,
	auto_translated: z.coerce.boolean().optional().default(false)
});

let cached: PostBundle[] | null = null;

function resolveLang(path: string, declared: ContentLang | undefined): ContentLang {
	return langFromPath(path) ?? declared ?? 'it';
}

function loadAll(): PostBundle[] {
	if (cached) return cached;
	const bySlug = new Map<string, PostBundle>();

	for (const [path, raw] of Object.entries(blogFiles)) {
		const { data, html, toc } = parseByPath(path, raw);
		const slug = String((data as Record<string, unknown>).slug ?? slugFromPath(path));
		const parsed = FrontmatterSchema.safeParse(data);
		if (!parsed.success) {
			console.warn(`[blog] ${path} - invalid frontmatter:`, parsed.error.message);
			continue;
		}
		if (parsed.data.draft && !import.meta.env.DEV) continue;

		const lang = resolveLang(path, parsed.data.lang);
		const translatedFrom = parsed.data.translated_from ?? null;
		const autoTranslated = parsed.data.auto_translated && translatedFrom !== null;

		const entry: Post = {
			slug,
			title: parsed.data.title,
			date: parsed.data.date,
			lastmod: parsed.data.lastmod,
			desc: parsed.data.desc,
			tags: parsed.data.tags,
			categories: parsed.data.categories,
			image: parsed.data.image,
			read: parsed.data.read,
			lang,
			translatedFrom,
			autoTranslated,
			html,
			toc
		};

		let bundle = bySlug.get(slug);
		if (!bundle) {
			bundle = { slug, source: entry, byLang: {} };
			bySlug.set(slug, bundle);
		}
		bundle.byLang[lang] = entry;

		
		if (!entry.translatedFrom && bundle.source.translatedFrom) bundle.source = entry;
	}

	const bundles = Array.from(bySlug.values());
	bundles.sort((a, b) => b.source.date.localeCompare(a.source.date));
	cached = bundles;
	return bundles;
}

export function getAllPosts(): PostBundle[] {
	return loadAll();
}

export function getAllPostMeta(): PostMetaBundle[] {
	return loadAll().map((bundle) => ({
		slug: bundle.slug,
		source: stripHtml(bundle.source),
		byLang: Object.fromEntries(
			Object.entries(bundle.byLang).map(([l, post]) => [l, stripHtml(post)])
		) as Partial<Record<ContentLang, PostMeta>>
	}));
}

export function getPost(slug: string): PostBundle | undefined {
	return loadAll().find((b) => b.slug === slug);
}

export function pickPost(bundle: PostBundle, lang: ContentLang): Post {
	return bundle.byLang[lang] ?? bundle.source;
}

function stripHtml(post: Post): PostMeta {
	const { html: _html, toc: _toc, ...meta } = post;
	void _html;
	void _toc;
	return meta;
}
