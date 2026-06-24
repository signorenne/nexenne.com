import { describe, it, expect } from 'vitest';
import {
	slugFromPath,
	langFromPath,
	parseByPath,
	parseMarkdown,
	parseOrg,
	SUPPORTED_LANGS
} from '$lib/content/parser.server';

describe('slugFromPath', () => {
	it('strips directory, language suffix and extension', () => {
		expect(slugFromPath('/content/blog/foo.en.md')).toBe('foo');
		expect(slugFromPath('/content/blog/foo.md')).toBe('foo');
		expect(slugFromPath('/content/work/bar.en.org')).toBe('bar');
		expect(slugFromPath('baz.it.md')).toBe('baz');
	});
	it('keeps the slug when there is no language suffix', () => {
		expect(slugFromPath('/content/blog/cpp20_concepts.md')).toBe('cpp20_concepts');
	});
});

describe('langFromPath', () => {
	it('detects the language suffix', () => {
		expect(langFromPath('/content/blog/foo.en.md')).toBe('en');
		expect(langFromPath('/content/blog/foo.it.md')).toBe('it');
		expect(langFromPath('bar.en.org')).toBe('en');
	});
	it('returns null when no language suffix is present', () => {
		expect(langFromPath('/content/blog/foo.md')).toBeNull();
		expect(langFromPath('/content/blog/foo.org')).toBeNull();
	});
	it('only knows the supported languages', () => {
		expect(SUPPORTED_LANGS).toEqual(['it', 'en']);
		expect(langFromPath('foo.de.md')).toBeNull();
	});
});

describe('parseMarkdown', () => {
	const raw = `---
title: Hello World
date: 2026-01-01
tags: [cpp, linux]
---

# First Heading

Some prose with a [link](/blog/other/) and an ![img](/cover.png).

## Second Heading

\`\`\`c
int main() { return 0; }
\`\`\`
`;

	const out = parseMarkdown(raw);

	it('parses frontmatter into data', () => {
		expect(out.data.title).toBe('Hello World');
		expect(out.data.tags).toEqual(['cpp', 'linux']);
	});

	it('builds a table of contents from headings', () => {
		expect(out.toc.map((t) => t.text)).toEqual(['First Heading', 'Second Heading']);
		expect(out.toc[0].level).toBe(1);
		expect(out.toc[1].level).toBe(2);
		// ids are slugified and stable
		expect(out.toc[0].id).toBe('first-heading');
	});

	it('gives headings matching id attributes', () => {
		expect(out.html).toContain('id="first-heading"');
		expect(out.html).toContain('id="second-heading"');
	});

	it('marks internal links for full reload and leaves them resolvable', () => {
		expect(out.html).toContain('data-sveltekit-reload');
		expect(out.html).toContain('href="/blog/other/"');
	});

	it('highlights fenced code blocks', () => {
		expect(out.html).toContain('<pre');
		expect(out.html).toContain('data-lang="c"');
	});

	it('numbers every line of a multi-line highlighted construct (no torn spans)', () => {
		const code = parseMarkdown(
			'```c\nint main(\n  int argc\n) {\n  return 0;\n}\n```\n'
		);
		// Five source lines -> five numbered .ln spans.
		expect((code.html.match(/data-line=/g) ?? []).length).toBe(5);
		// A .ln must never contain another .ln (that means a span was torn across lines).
		expect(/class="ln"[^>]*>(?:(?!<\/span>)[\s\S])*?class="ln"/.test(code.html)).toBe(false);
	});

	it('normalizes a comma-separated tags string', () => {
		const csv = parseMarkdown('---\ntitle: T\ntags: a, b, c\ncategories: x, y\n---\n\nbody\n');
		expect(csv.data.tags).toEqual(['a', 'b', 'c']);
		expect(csv.data.categories).toEqual(['x', 'y']);
	});
});

describe('parseOrg', () => {
	const raw = `#+TITLE: Org Doc
#+DATE: 2026-02-02
#+TAGS: emacs, lisp
#+CATEGORIES: Notes, Tools

* A Section

Body text.
`;
	const out = parseOrg(raw);

	it('extracts org keyword frontmatter (lower-cased)', () => {
		expect(out.data.title).toBe('Org Doc');
		expect(out.data.tags).toEqual(['emacs', 'lisp']);
		expect(out.data.categories).toEqual(['Notes', 'Tools']);
	});

	it('produces a table of contents', () => {
		expect(out.toc.length).toBeGreaterThanOrEqual(1);
		expect(out.toc[0].text).toBe('A Section');
	});
});

describe('parseByPath', () => {
	it('routes .org files to the org parser', () => {
		const out = parseByPath('/content/work/x.org', '#+TITLE: T\n\n* H\n\nbody\n');
		expect(out.data.title).toBe('T');
	});
	it('routes other files to the markdown parser', () => {
		const out = parseByPath('/content/blog/x.md', '---\ntitle: M\n---\n\nbody\n');
		expect(out.data.title).toBe('M');
	});
});
