/**
 * Work (case study) content loader (server only).
 *
 * Mirrors the blog loader: imports every file under content/work, validates the
 * frontmatter with zod, and groups translations by slug into bilingual bundles.
 * Bundles are sorted most-recent first using the recency helper.
 */
import { z } from 'zod';
import { langFromPath, parseByPath, slugFromPath, SUPPORTED_LANGS } from './parser.server';
import { recencyKey } from './recency';
import type { ContentLang, Work, WorkBundle, WorkMeta, WorkMetaBundle } from './types';

const workFiles = import.meta.glob('/content/work/*.{md,org}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const MetricSchema = z.object({ k: z.string(), v: z.string() });

const LangSchema = z
	.enum(SUPPORTED_LANGS as unknown as [ContentLang, ...ContentLang[]])
	.optional();

const FrontmatterSchema = z.object({
	title: z.string(),
	client: z.string(),
	role: z.string(),
	year: z.string(),
	summary: z.string().default(''),
	tags: z.array(z.string()).default([]),
	color: z.string().default('violet'),
	accent: z.string().default(''),
	metrics: z.array(MetricSchema).default([]),
	order: z.coerce.number().optional(),
	draft: z.coerce.boolean().optional().default(false),
	lang: LangSchema,
	translated_from: LangSchema,
	auto_translated: z.coerce.boolean().optional().default(false)
});

function normalizeMetrics(value: unknown): { k: string; v: string }[] {
	if (Array.isArray(value)) {
		return value
			.map((m) => {
				if (typeof m === 'string') {
					const parts = m.split('::').map((s) => s.trim());
					return parts.length >= 2 ? { k: parts[0], v: parts.slice(1).join('::') } : null;
				}
				if (m && typeof m === 'object') {
					const o = m as Record<string, unknown>;
					if (typeof o.k === 'string' && typeof o.v === 'string') return { k: o.k, v: o.v };
				}
				return null;
			})
			.filter((m): m is { k: string; v: string } => m !== null);
	}
	if (typeof value === 'string') {
		return value
			.split(';')
			.map((pair) => pair.trim())
			.filter(Boolean)
			.map((pair) => {
				const [k, ...rest] = pair.split('::');
				return { k: k.trim(), v: rest.join('::').trim() };
			})
			.filter((m) => m.k && m.v);
	}
	return [];
}

let cached: WorkBundle[] | null = null;

function resolveLang(path: string, declared: ContentLang | undefined): ContentLang {
	return langFromPath(path) ?? declared ?? 'it';
}

function loadAll(): WorkBundle[] {
	if (cached) return cached;
	const bySlug = new Map<string, WorkBundle>();

	for (const [path, raw] of Object.entries(workFiles)) {
		const { data, html, toc } = parseByPath(path, raw);
		const slug = String((data as Record<string, unknown>).slug ?? slugFromPath(path));
		const normalised = {
			...data,
			metrics: normalizeMetrics((data as Record<string, unknown>).metrics)
		};
		const parsed = FrontmatterSchema.safeParse(normalised);
		if (!parsed.success) {
			console.error(`[work] Invalid frontmatter in ${path}:`, parsed.error.message);
			throw parsed.error;
		}
		if (parsed.data.draft && !import.meta.env.DEV) continue;

		const lang = resolveLang(path, parsed.data.lang);
		const translatedFrom = parsed.data.translated_from ?? null;
		const autoTranslated = parsed.data.auto_translated && translatedFrom !== null;

		const entry: Work = {
			slug,
			title: parsed.data.title,
			client: parsed.data.client,
			role: parsed.data.role,
			year: parsed.data.year,
			summary: parsed.data.summary,
			tags: parsed.data.tags,
			color: parsed.data.color,
			accent: parsed.data.accent,
			metrics: parsed.data.metrics,
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
	// Most recent first; fall back to slug for stable ordering within the same date.
	bundles.sort(
		(a, b) =>
			recencyKey(b.source.year) - recencyKey(a.source.year) || a.slug.localeCompare(b.slug)
	);
	cached = bundles;
	return bundles;
}

export function getAllWork(): WorkBundle[] {
	return loadAll();
}

export function getAllWorkMeta(): WorkMetaBundle[] {
	return loadAll().map((bundle) => ({
		slug: bundle.slug,
		source: stripBody(bundle.source),
		byLang: Object.fromEntries(
			Object.entries(bundle.byLang).map(([l, work]) => [l, stripBody(work)])
		) as Partial<Record<ContentLang, WorkMeta>>
	}));
}

export function getWork(slug: string): WorkBundle | undefined {
	return loadAll().find((b) => b.slug === slug);
}

export function pickWork(bundle: WorkBundle, lang: ContentLang): Work {
	return bundle.byLang[lang] ?? bundle.source;
}

function stripBody(work: Work): WorkMeta {
	const { html: _html, metrics: _metrics, toc: _toc, ...meta } = work;
	return meta;
}
