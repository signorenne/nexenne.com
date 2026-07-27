import { describe, expect, it } from 'vitest';
import { getResumes } from './resume.server';

describe('getResumes', () => {
	it('loads the updated English resume and its professional projects', () => {
		const { en } = getResumes();

		expect(en.labels.title).toBe('Resume');
		expect(en.labels.date).toBe('Period');
		expect(en.contact.location).toBe('Bergamo, Italy');
		expect(en.experience).toHaveLength(6);
		expect(en.projects).toHaveLength(4);
		expect(en.experience[0]).toMatchObject({
			company: 'Work Louder',
			current: true
		});
		expect(en.experience[0].points.join(' ')).toContain('RPC calls');
		expect(en.projects.map((project) => project.name)).toEqual([
			'Codex Micro',
			'Framer F1',
			'Nexenne Library',
			'TrackOMatic'
		]);
		expect(en.projects.find((project) => project.name === 'Codex Micro')?.link).toBe(
			'nexenne.com/work/codex-micro'
		);
		expect(en.projects.find((project) => project.name === 'Framer F1')?.link).toBe(
			'nexenne.com/work/framer-f1'
		);
	});

	it('keeps both resume languages structurally complete', () => {
		const resumes = getResumes();

		expect(resumes.it.experience).toHaveLength(resumes.en.experience.length);
		expect(resumes.it.projects).toHaveLength(resumes.en.projects.length);
		expect(resumes.it.skills).toHaveLength(resumes.en.skills.length);
	});
});
