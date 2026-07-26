/**
 * Content index for the terminal's virtual filesystem.
 *
 * The terminal advertises work/ and blog/ as directories, so it needs to know
 * what is actually in them. Only the few fields `ls`, `find` and `cat` print are
 * sent: the full post bodies would dwarf the page for no benefit.
 */
import { getAllPostMeta } from '$lib/content/blog.server';
import { getAllWorkMeta } from '$lib/content/work.server';
import type { ContentLang } from '$lib/content/types';
import type { TerminalEntry } from '$lib/terminal';
import type { PageServerLoad } from './$types';

type ByLang = Partial<Record<ContentLang, TerminalEntry>>;

export const load: PageServerLoad = () => ({
	blog: getAllPostMeta().map((bundle) => ({
		slug: bundle.slug,
		byLang: Object.fromEntries(
			Object.entries(bundle.byLang).map(([lang, post]) => [
				lang,
				{ slug: bundle.slug, title: post.title, meta: post.date, summary: post.desc }
			])
		) as ByLang
	})),
	work: getAllWorkMeta().map((bundle) => ({
		slug: bundle.slug,
		byLang: Object.fromEntries(
			Object.entries(bundle.byLang).map(([lang, work]) => [
				lang,
				{
					slug: bundle.slug,
					title: work.title,
					meta: `${work.year} · ${work.client}`,
					summary: work.summary
				}
			])
		) as ByLang
	}))
});
