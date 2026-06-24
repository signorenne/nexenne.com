/**
 * Shared content types for the blog and work loaders.
 *
 * The key idea is the "bundle". One article can exist in several languages, so
 * the loaders group those translations by slug into a bundle:
 *
 * - byLang holds the available translations, keyed by language.
 * - source is the original (non-translated) version, used as a fallback when the
 *   requested language is missing.
 *
 * The "Meta" variants drop the heavy html and toc fields. They are used for
 * lists and for the layout, so the full body is only sent for a single page.
 */

export type ContentLang = 'it' | 'en';

/**
 * A blog post without its rendered body, used for lists and metadata.
 */
export interface PostMeta {
	slug: string;
	title: string;
	date: string;
	lastmod: string;
	desc: string;
	tags: string[];
	categories: string[];
	image: string;
	read: string;
	lang: ContentLang;
	translatedFrom: ContentLang | null;
	autoTranslated: boolean;
}

export interface TocItem {
	level: 1 | 2 | 3;
	id: string;
	text: string;
}

/**
 * A blog post with its rendered HTML body and table of contents.
 */
export interface Post extends PostMeta {
	html: string;
	toc: TocItem[];
}

/**
 * All translations of one post, grouped by slug. See the file header for how
 * byLang and source work together.
 */
export interface PostBundle {
	slug: string;
	source: Post;
	byLang: Partial<Record<ContentLang, Post>>;
}

export interface PostMetaBundle {
	slug: string;
	source: PostMeta;
	byLang: Partial<Record<ContentLang, PostMeta>>;
}

export interface WorkMeta {
	slug: string;
	title: string;
	client: string;
	role: string;
	year: string;
	summary: string;
	tags: string[];
	color: string;
	accent: string;
	lang: ContentLang;
	translatedFrom: ContentLang | null;
	autoTranslated: boolean;
}

export interface Work extends WorkMeta {
	html: string;
	metrics: { k: string; v: string }[];
	toc: TocItem[];
}

export interface WorkBundle {
	slug: string;
	source: Work;
	byLang: Partial<Record<ContentLang, Work>>;
}

export interface WorkMetaBundle {
	slug: string;
	source: WorkMeta;
	byLang: Partial<Record<ContentLang, WorkMeta>>;
}
