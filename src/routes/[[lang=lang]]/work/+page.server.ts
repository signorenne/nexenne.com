import { getAllWorkMeta } from '$lib/content/work.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	works: getAllWorkMeta()
});
