/**
 * Content parsing pipeline (server only).
 *
 * Converts a raw Markdown or Org file into sanitized HTML plus a table of
 * contents. Two unified processors are built once and reused: one for Markdown
 * (remark and rehype) and one for Org (uniorg). Both run small custom rehype
 * plugins:
 *
 * - rehypeArticleToc assigns stable heading ids and collects the table of
 *   contents.
 * - rehypeCodeLines wraps each code line in a span so the stylesheet can number
 *   it.
 * - rehypeInternalLinkReload rewrites in-site links to use the SvelteKit base
 *   path and forces a full reload, because the rendered HTML is injected outside
 *   the router.
 * - rehypeOrgCodeNormalize makes Org code blocks match the Markdown structure.
 *
 * It also derives the slug and language from a filename. For example foo.en.md
 * gives slug "foo" and language "en", while foo.md gives slug "foo" and a null
 * language.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';
import uniorgParse from 'uniorg-parse';
import uniorgRehype from 'uniorg-rehype';
import matter from 'gray-matter';
import type { Plugin } from 'unified';
import type { Root, Element, Text } from 'hast';
import { base } from '$app/paths';

export interface TocEntry {
	level: 1 | 2 | 3;
	id: string;
	text: string;
}

export interface ParsedFile {
	data: Record<string, unknown>;
	html: string;
	toc: TocEntry[];
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

function textOf(node: Element): string {
	let out = '';
	for (const c of node.children) {
		if (c.type === 'text') out += (c as Text).value;
		else if (c.type === 'element') out += textOf(c as Element);
	}
	return out;
}

/**
 * Split highlighted code nodes into one node list per source line.
 *
 * The highlighter (highlight.js) wraps multi-line constructs, such as a function
 * signature, in a single element that contains newlines. Splitting the rendered
 * HTML string on "\n" would tear those elements apart and produce invalid,
 * mis-numbered lines. Instead this walks the HAST tree: text nodes split on
 * newlines, and an element that spans several lines is cloned once per line so
 * each line stays a valid, self-contained subtree.
 *
 * @param nodes The children of the code element.
 * @return One array of nodes per line, in order.
 */
function splitIntoLines(nodes: Element['children']): Element['children'][] {
	const lines: Element['children'][] = [[]];
	const current = () => lines[lines.length - 1];

	const appendNode = (node: Element['children'][number]) => {
		if (node.type === 'text') {
			const parts = (node as Text).value.split('\n');
			parts.forEach((part, i) => {
				if (i > 0) lines.push([]);
				if (part) current().push({ type: 'text', value: part } as Text);
			});
		} else if (node.type === 'element') {
			const el = node as Element;
			const sub = splitIntoLines(el.children);
			sub.forEach((group, i) => {
				if (i > 0) lines.push([]);
				current().push({ ...el, children: group } as Element);
			});
		} else {
			current().push(node);
		}
	};

	for (const n of nodes) appendNode(n);
	return lines;
}

const rehypeOrgCodeNormalize: Plugin<[], Root> = () => (tree) => {
	const visit = (node: Root | Element) => {
		const children = (node as Element).children ?? (tree as Root).children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.type !== 'element') continue;
			const el = child as Element;
			if (el.tagName === 'pre') {
				const classes = (el.properties?.className as string[]) ?? [];
				const isOrgSrc = classes.includes('src');
				const hasInnerCode = el.children.some(
					(c) => c.type === 'element' && (c as Element).tagName === 'code'
				);
				if (isOrgSrc && !hasInnerCode) {
					const lang = classes
						.map((c) => c.replace(/^src-/, ''))
						.find((c) => c && c !== 'src');
					const codeClasses = lang ? [`language-${lang}`] : [];
					el.children = [
						{
							type: 'element',
							tagName: 'code',
							properties: { className: codeClasses },
							children: el.children as Element['children']
						}
					] as Element['children'];
					el.properties = {
						...el.properties,
						className: classes.filter((c) => c !== 'src' && !c.startsWith('src-'))
					};
				}
			} else {
				visit(el);
			}
		}
	};
	visit(tree as unknown as Element);
};

const rehypeCodeLines: Plugin<[], Root> = () => (tree) => {
	const walk = (node: Root | Element) => {
		const children = (node as Element).children ?? (tree as Root).children;
		for (const child of children) {
			if (child.type !== 'element') continue;
			const el = child as Element;
			if (el.tagName === 'pre') {
				const code = el.children.find(
					(c): c is Element => c.type === 'element' && (c as Element).tagName === 'code'
				);
				if (code) {
					const classes = (code.properties?.className as string[]) ?? [];
					const lang = classes
						.map((c) => c.replace(/^language-/, ''))
						.find((c) => c && c !== 'hljs');
					if (lang) {
						const preClasses = (el.properties?.className as string[]) ?? [];
						el.properties = {
							...el.properties,
							className: [...preClasses, 'has-lang'],
							'data-lang': lang
						};
					}
					const lines = splitIntoLines(code.children);
					if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
					code.children = lines.map((nodes, i) => ({
						type: 'element',
						tagName: 'span',
						properties: { className: ['ln'], 'data-line': String(i + 1) },
						children: nodes
					})) as Element['children'];
				}
			} else {
				walk(el);
			}
		}
	};
	walk(tree as unknown as Element);
};

const rehypeInternalLinkReload: Plugin<[], Root> = () => (tree) => {
	const walk = (node: Root | Element) => {
		const children = (node as Element).children ?? (tree as Root).children;
		for (const child of children) {
			if (child.type !== 'element') continue;
			const el = child as Element;
			if (el.tagName === 'a') {
				const href = (el.properties?.href as string | undefined) ?? '';
				const isExternal = /^(?:[a-z]+:|\/\/)/i.test(href);
				const isAnchorOnly = href.startsWith('#') || href === '';
				if (!isExternal && !isAnchorOnly) {
					const baseHref =
						base && href.startsWith('/') && !href.startsWith(`${base}/`) ? `${base}${href}` : href;
					el.properties = {
						...el.properties,
						href: baseHref,
						'data-sveltekit-reload': true
					};
				}
			}
			if (el.tagName === 'img') {
				const src = (el.properties?.src as string | undefined) ?? '';
				const isExternal = /^(?:[a-z]+:|\/\/)/i.test(src);
				if (base && src.startsWith('/') && !isExternal && !src.startsWith(`${base}/`)) {
					el.properties = { ...el.properties, src: `${base}${src}` };
				}
			}
			walk(el);
		}
	};
	walk(tree as unknown as Element);
};

const HEADING_ID_RE = /\s*\{#([^}\s]+)\}\s*$/;

function extractExplicitId(el: Element): string | null {
	for (let i = el.children.length - 1; i >= 0; i--) {
		const child = el.children[i];
		if (child.type === 'text') {
			const value = (child as Text).value;
			const m = value.match(HEADING_ID_RE);
			if (!m) {
				if (value.trim() === '') continue;
				return null;
			}
			const stripped = value.replace(HEADING_ID_RE, '');
			if (stripped === '') el.children.splice(i, 1);
			else (child as Text).value = stripped.replace(/\s+$/, '');
			return m[1];
		}
		if (child.type === 'element') return null;
	}
	return null;
}

const rehypeArticleToc: Plugin<[], Root> = () => (tree, file) => {
	const toc: TocEntry[] = [];
	const seen = new Map<string, number>();
	for (const child of (tree as Root).children) {
		if (child.type !== 'element') continue;
		const el = child as Element;
		const m = el.tagName.match(/^h([1-3])$/);
		if (!m) continue;
		const level = Number(m[1]) as 1 | 2 | 3;
		const explicitId = extractExplicitId(el);
		const text = textOf(el).trim();
		if (!text) continue;
		let id = explicitId || slugify(text) || `section-${toc.length + 1}`;
		const n = seen.get(id) ?? 0;
		seen.set(id, n + 1);
		if (n > 0) id = `${id}-${n + 1}`;
		el.properties = { ...el.properties, id };
		toc.push({ level, id, text });
	}
	(file.data as { toc?: TocEntry[] }).toc = toc;
};

const mdProcessor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeHighlight, { detect: true, ignoreMissing: true })
	.use(rehypeArticleToc)
	.use(rehypeInternalLinkReload)
	.use(rehypeCodeLines)
	.use(rehypeStringify, { allowDangerousHtml: true });

const orgProcessor = unified()
	.use(uniorgParse)
	.use(uniorgRehype)
	.use(rehypeOrgCodeNormalize)
	.use(rehypeHighlight, { detect: true, ignoreMissing: true })
	.use(rehypeArticleToc)
	.use(rehypeInternalLinkReload)
	.use(rehypeCodeLines)
	.use(rehypeStringify, { allowDangerousHtml: true });

function extractOrgFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	const lines = raw.split('\n');
	const data: Record<string, string> = {};
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const m = line.match(/^#\+([A-Za-z_]+):\s*(.*)$/);
		if (m) {
			data[m[1].toLowerCase()] = m[2].trim();
			i++;
			continue;
		}
		if (line.trim() === '') {
			i++;
			continue;
		}
		break;
	}
	return { data, body: lines.slice(i).join('\n') };
}

function normalizeArrayField(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

function normalizeBooleanField(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	if (value.toLowerCase() === 'true') return true;
	if (value.toLowerCase() === 'false') return false;
	return value;
}

export function parseMarkdown(raw: string): ParsedFile {
	const { data, content } = matter(raw);
	const file = mdProcessor.processSync(content);
	const html = String(file);
	const toc = ((file.data as { toc?: TocEntry[] }).toc ?? []) as TocEntry[];
	return {
		data: {
			...data,
			tags: normalizeArrayField((data as Record<string, unknown>).tags),
			categories: normalizeArrayField((data as Record<string, unknown>).categories)
		},
		html,
		toc
	};
}

export function parseOrg(raw: string): ParsedFile {
	const { data, body } = extractOrgFrontmatter(raw);
	const file = orgProcessor.processSync(body);
	const html = String(file);
	const toc = ((file.data as { toc?: TocEntry[] }).toc ?? []) as TocEntry[];
	return {
		data: {
			...data,
			tags: normalizeArrayField(data.tags),
			categories: normalizeArrayField(data.categories),
			draft: normalizeBooleanField(data.draft),
			auto_translated: normalizeBooleanField(data.auto_translated)
		},
		html,
		toc
	};
}

export function parseByPath(path: string, raw: string): ParsedFile {
	return path.endsWith('.org') ? parseOrg(raw) : parseMarkdown(raw);
}

export const SUPPORTED_LANGS = ['it', 'en'] as const;
export type ContentLang = (typeof SUPPORTED_LANGS)[number];

const LANG_SUFFIX_RE = new RegExp(`\\.(${SUPPORTED_LANGS.join('|')})$`, 'i');

export function slugFromPath(path: string): string {
	const base = (path.split('/').pop() ?? '').replace(/\.(md|org)$/i, '');
	return base.replace(LANG_SUFFIX_RE, '');
}

export function langFromPath(path: string): ContentLang | null {
	const base = (path.split('/').pop() ?? '').replace(/\.(md|org)$/i, '');
	const m = base.match(LANG_SUFFIX_RE);
	if (!m) return null;
	const lang = m[1].toLowerCase();
	return (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as ContentLang) : null;
}
