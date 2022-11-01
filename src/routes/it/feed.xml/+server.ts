import { buildFeed } from '$lib/content/feed.server';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(buildFeed('it'), {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
