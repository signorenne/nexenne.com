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
});
