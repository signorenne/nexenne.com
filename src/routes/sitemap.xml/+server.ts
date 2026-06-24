import { getAllPosts } from '$lib/content/blog.server';
import { getAllWork } from '$lib/content/work.server';
import { SITE_URL } from '$lib/data';
import type { RequestHandler } from './$types';

export const prerender = true;

const STATIC_ROUTES = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/work/', priority: '0.9', changefreq: 'weekly' },
	{ path: '/blog/', priority: '0.9', changefreq: 'weekly' },
	{ path: '/services/', priority: '0.8', changefreq: 'monthly' },
	{ path: '/about/', priority: '0.7', changefreq: 'monthly' },
	{ path: '/resume/', priority: '0.7', changefreq: 'monthly' },
	{ path: '/contact/', priority: '0.6', changefreq: 'monthly' },
	{ path: '/now/', priority: '0.5', changefreq: 'weekly' },
	{ path: '/uses/', priority: '0.4', changefreq: 'monthly' },
	{ path: '/card/', priority: '0.4', changefreq: 'yearly' },
	{ path: '/colophon/', priority: '0.3', changefreq: 'yearly' }
];

const enLoc = (path: string) => `${SITE_URL}${path}`;
const itLoc = (path: string) => `${SITE_URL}${path === '/' ? '/it/' : `/it${path}`}`;

/**
 * Emit one url element per language for a path, each declaring the full set of
 * hreflang alternates (en, it, x-default) so search engines pair the versions.
 *
 * @param path       Unprefixed app path, for example /about/.
 * @param lastmod    Last-modified date in YYYY-MM-DD form.
 * @param priority   Sitemap priority value.
 * @param changefreq Sitemap change-frequency value.
 * @return The two url elements (English and Italian) as an XML string.
 */
function urlEntries(path: string, lastmod: string, priority: string, changefreq: string): string {
	const en = enLoc(path);
	const it = itLoc(path);
	const alternates = `    <xhtml:link rel="alternate" hreflang="en" href="${en}" />
    <xhtml:link rel="alternate" hreflang="it" href="${it}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}" />`;
	return [en, it]
		.map(
			(loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternates}
  </url>`
		)
		.join('\n');
}

export const GET: RequestHandler = () => {
	const today = new Date().toISOString().slice(0, 10);
	const posts = getAllPosts();
	const works = getAllWork();

	const staticEntries = STATIC_ROUTES.map((r) =>
		urlEntries(r.path, today, r.priority, r.changefreq)
	);

	const postEntries = posts.map((b) =>
		urlEntries(`/blog/${b.slug}/`, b.source.lastmod || b.source.date, '0.8', 'monthly')
	);

	const workEntries = works.map((b) => urlEntries(`/work/${b.slug}/`, today, '0.8', 'monthly'));

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...staticEntries, ...workEntries, ...postEntries].join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
