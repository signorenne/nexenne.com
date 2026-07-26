import { describe, expect, it } from 'vitest';
import {
	getAllWork,
	getAllWorkMeta,
	getWork,
	pickWork
} from '$lib/content/work.server';

// These tests run against the real /content/work files via import.meta.glob.

describe('work content loader', () => {
	const projects = getAllWork();

	it('loads bilingual project bundles with cover metadata', () => {
		const codex = getWork('codex-micro');

		expect(codex?.byLang.it).toBeTruthy();
		expect(codex?.byLang.en).toBeTruthy();
		expect(codex?.source.cover).toBe('/work/codex-micro/product.webp');
	});

	it('keeps cover metadata in list projections while stripping full content', () => {
		const meta = getAllWorkMeta().find((project) => project.slug === 'codex-micro');

		expect(meta?.source.cover).toBe('/work/codex-micro/product.webp');
		expect('html' in (meta?.source ?? {})).toBe(false);
		expect('toc' in (meta?.source ?? {})).toBe(false);
		expect('metrics' in (meta?.source ?? {})).toBe(false);
	});

	it('returns the requested translation and falls back to the source', () => {
		const bilingual = projects.find((project) => project.byLang.en && project.byLang.it)!;
		const sourceOnly = {
			slug: bilingual.slug,
			source: bilingual.source,
			byLang: { [bilingual.source.lang]: bilingual.source }
		};
		const missingLang = bilingual.source.lang === 'en' ? 'it' : 'en';

		expect(pickWork(bilingual, 'en')).toBe(bilingual.byLang.en);
		expect(pickWork(sourceOnly, missingLang)).toBe(sourceOnly.source);
	});
});
