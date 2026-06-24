import { error } from '@sveltejs/kit';
import { getAllPosts, getPost } from '$lib/content/blog.server';
import { getAllWork, getWork } from '$lib/content/work.server';
import { renderOg } from '$lib/og/render.server';
import type { RequestHandler, EntryGenerator } from './$types';

export const prerender = true;

// One OG card per article (keyed by slug; the source-language title is used).
export const entries: EntryGenerator = () => [
	...getAllPosts().map((b) => ({ slug: b.slug })),
	...getAllWork().map((b) => ({ slug: b.slug }))
];

export const GET: RequestHandler = async ({ params }) => {
	const post = getPost(params.slug);
	const work = post ? undefined : getWork(params.slug);

	let title: string;
	let kicker: string;
	if (post) {
		title = post.source.title;
		kicker = 'Article';
	} else if (work) {
		title = work.source.title;
		kicker = work.source.client || 'Case study';
	} else {
		throw error(404, 'Not found');
	}

	const png = await renderOg({ title, kicker });
	return new Response(png as BodyInit, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
