import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	getAllWork,
	getAllWorkMeta,
	getWork,
	pickWork
} from '$lib/content/work.server';

// These tests run against the real /content/work files via import.meta.glob.

const STATIC_ROOT = join(process.cwd(), 'static');

describe('work content loader', () => {
	const projects = getAllWork();

	it('loads bilingual project bundles with cover metadata', () => {
		const codex = getWork('codex-micro');

		expect(codex?.byLang.it).toBeTruthy();
		expect(codex?.byLang.en).toBeTruthy();
		expect(codex?.source.cover).toBe('/work/codex-micro/product.webp');
	});

	it('requires every translation to share one existing static cover', () => {
		for (const project of projects) {
			const cover = project.source.cover;

			expect(cover, `${project.slug} has no cover`).toMatch(/^\//);
			expect(
				existsSync(resolve(process.cwd(), 'static', cover.slice(1))),
				`${project.slug} cover does not resolve: ${cover}`
			).toBe(true);

			for (const translation of Object.values(project.byLang)) {
				expect(translation?.cover, `${project.slug} translations use different covers`).toBe(cover);
			}
		}
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

// Reading the real pixel dimensions is the only way to catch a cover that will
// be cropped to an unusable sliver. It is exactly the mistake that shipped once:
// a 1080x2280 portrait screenshot in a 3:1 card frame shows 16% of itself.
function imageRatio(file: string): number | null {
	const data = readFileSync(join(STATIC_ROOT, file));
	if (data.subarray(0, 4).toString('binary') === '\x89PNG') {
		return data.readUInt32BE(16) / data.readUInt32BE(20);
	}
	if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(12, 16).toString('ascii') === 'VP8 ') {
		return (data.readUInt16LE(26) & 0x3fff) / (data.readUInt16LE(28) & 0x3fff);
	}
	// Vector and other formats scale without a meaningful intrinsic crop.
	return null;
}

describe('cover framing', () => {
	const bundles = getAllWork();

	it('declares a fit mode the layout understands', () => {
		for (const bundle of bundles) {
			for (const [lang, work] of Object.entries(bundle.byLang)) {
				expect(['cover', 'contain'], `${bundle.slug}/${lang}`).toContain(work.coverFit);
			}
		}
	});

	// The narrowest frame a cover is drawn in is the index card, at about 3:1.
	it('contains any cover too tall to survive the card crop', () => {
		const cropped = bundles
			.map((bundle) => ({ slug: bundle.slug, work: bundle.source }))
			.filter(({ work }) => {
				const ratio = imageRatio(work.cover);
				if (ratio === null) return false;
				// Below 1.2 the card frame would discard more than half the height.
				return ratio < 1.2 && work.coverFit !== 'contain';
			})
			.map(({ slug, work }) => `${slug}: ${work.cover}`);
		expect(cropped).toEqual([]);
	});

	it('keeps a vector cover contained, since cropping a diagram cuts its content', () => {
		for (const bundle of bundles) {
			if (!bundle.source.cover.endsWith('.svg')) continue;
			expect(bundle.source.coverFit, bundle.slug).toBe('contain');
		}
	});
});
