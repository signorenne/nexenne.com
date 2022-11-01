import { getAllPosts } from './blog.server';
import { SITE_URL } from '$lib/data';
import type { ContentLang } from './types';

const META: Record<ContentLang, { title: string; desc: string; lang: string }> = {
	en: {
		title: 'nexenne — Field notes',
		desc: 'Technical notes on automotive HMI, embedded firmware, Android and field work.',
		lang: 'en'
	},
	it: {
		title: 'nexenne — Appunti dal campo',
		desc: 'Note tecniche su HMI automotive, firmware embedded, Android e lavoro sul campo.',
		lang: 'it'
	}
};

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function toRfc822(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	return d.toUTCString();
}

/**
 * Build the RSS feed for a single language, picking each post's matching
 * translation and falling back to the source language when none exists.
 *
 * @param lang The feed language, "en" or "it".
 * @return The complete RSS XML document as a string.
 */
export function buildFeed(lang: ContentLang): string {
	const meta = META[lang];
	const prefix = lang === 'it' ? '/it' : '';
	const feedUrl = `${SITE_URL}${prefix}/feed.xml`;

	const bundles = getAllPosts();
	const posts = bundles.map((b) => b.byLang[lang] ?? b.source);
	const lastBuild = posts[0] ? toRfc822(posts[0].date) : new Date().toUTCString();

	const items = posts
		.map((p) => {
			const url = `${SITE_URL}${prefix}/blog/${p.slug}/`;
			const tags = p.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join('\n');
			return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${toRfc822(p.date)}</pubDate>
      <description><![CDATA[${p.desc}]]></description>
${tags ? tags + '\n' : ''}      <content:encoded><![CDATA[${p.html}]]></content:encoded>
    </item>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${SITE_URL}${prefix}/</link>
    <description>${escapeXml(meta.desc)}</description>
    <language>${meta.lang}</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
