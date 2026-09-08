import { describe, expect, it } from 'vitest';
import { getResumes } from './resume.server';

describe('getResumes', () => {
	it('loads the updated English resume and its selected projects', () => {
		const { en } = getResumes();
		const normalizedQuote = en.quote.replace(/\s+/g, ' ');

		expect(en.labels.title).toBe('Resume');
		expect(en.labels.date).toBe('Period');
		expect(en.contact.location).toBe('Bergamo, Italy');
		expect(normalizedQuote).toMatch(/^I am a Software Architect\./);
		// The profile must not narrow to embedded work: the web, native, and library
		// side is real experience, and a summary that hides it costs applications.
		expect(normalizedQuote).toContain('native and web applications');
		expect(normalizedQuote).toContain('APIs, protocols, and system flows');
		expect(normalizedQuote).toContain('C/C++, Qt/QML, real-time systems, Embedded Linux');
		expect(en.experience).toHaveLength(6);
		expect(en.projects).toHaveLength(2);
		expect(en.skills.map((skill) => skill.title)).toEqual([
			'Software architecture and system design',
			'Programming languages',
			'Modern C++ and libraries',
			'Firmware and embedded systems',
			'HMI, graphics, and applications',
			'Interfaces and protocols',
			'Web, backend, and data',
			'Systems and networking',
			'Toolchain, testing, and quality',
			'Professional approach'
		]);
		expect(en.skills.flatMap((skill) => skill.items)).toEqual(
			expect.arrayContaining([
				'Abstraction and API design',
				'RAII and ownership',
				'OpenGL',
				'TinyUSB',
				'CAN FD',
				'CRC and error detection',
				'WireGuard',
				'AddressSanitizer',
				'Target hardware testing'
			])
		);
		expect(en.experience[0]).toMatchObject({
			company: 'Work Louder',
			current: true
		});
		expect(en.experience[0].points.join(' ')).toContain('RPC integration');
		expect(en.projects.map((project) => project.name)).toEqual(['Nexenne Library', 'TrackOMatic']);
	});

	it('keeps both resume languages structurally complete', () => {
		const resumes = getResumes();

		expect(resumes.it.experience).toHaveLength(resumes.en.experience.length);
		expect(resumes.it.projects).toHaveLength(resumes.en.projects.length);
		expect(resumes.it.skills).toHaveLength(resumes.en.skills.length);
	});

	// Applicant tracking systems map a resume section by the wording of its
	// heading, so /resume/ats/ must keep the conventional titles even though the
	// styled page is free to use a more personal voice.
	it('keeps the ATS headings on their conventional wording', () => {
		const { en, it: itResume } = getResumes();

		expect(en.labels.ats.summary).toBe('Professional Summary');
		expect(en.labels.ats.experience).toBe('Work Experience');
		expect(en.labels.ats.skills).toBe('Skills');
		expect(en.labels.ats.education).toBe('Education');
		expect(itResume.labels.ats.summary).toBe('Profilo professionale');
		expect(itResume.labels.ats.experience).toBe('Esperienza professionale');
		expect(itResume.labels.ats.skills).toBe('Competenze');
		expect(itResume.labels.ats.education).toBe('Formazione');
	});

	it('gives every ATS label a value in both languages', () => {
		const { en, it: itResume } = getResumes();

		expect(Object.keys(itResume.labels.ats).sort()).toEqual(Object.keys(en.labels.ats).sort());
		for (const labels of [en.labels.ats, itResume.labels.ats]) {
			for (const [key, value] of Object.entries(labels)) {
				expect(value, `empty ATS label: ${key}`).not.toBe('');
			}
		}
	});
});
