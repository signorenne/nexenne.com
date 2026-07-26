import { getAllPostMeta } from '$lib/content/blog.server';
import { getAllWorkMeta, getSpotlightWorkMeta } from '$lib/content/work.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	posts: getAllPostMeta().slice(0, 3),
	works: getSpotlightWorkMeta(),
	worksTotal: getAllWorkMeta().length,
	postsTotal: getAllPostMeta().length
});
