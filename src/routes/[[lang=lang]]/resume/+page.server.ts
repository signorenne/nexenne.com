import { getResumes } from '$lib/content/resume.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	resumes: getResumes()
});
