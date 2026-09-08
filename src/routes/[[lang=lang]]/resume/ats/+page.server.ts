import { getResumes } from '$lib/content/resume.server';
import type { EntryGenerator, PageServerLoad } from './$types';

// The ATS variant is noindex and absent from navigation and the sitemap, so
// nothing links to it from a crawled page. List both languages explicitly or
// the prerenderer never reaches them.
export const entries: EntryGenerator = () => [{ lang: '' }, { lang: 'it' }];

export const load: PageServerLoad = () => ({
	resumes: getResumes()
});
