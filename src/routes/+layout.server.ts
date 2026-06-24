import { getAllPostMeta } from '$lib/content/blog.server';
import { getAllWorkMeta } from '$lib/content/work.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	posts: getAllPostMeta(),
	works: getAllWorkMeta()
});
