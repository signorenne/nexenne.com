import { getAllPostMeta } from '$lib/content/blog.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	posts: getAllPostMeta()
});
