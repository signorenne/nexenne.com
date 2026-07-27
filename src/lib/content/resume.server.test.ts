import { describe, expect, it } from 'vitest';
import { getResumes } from './resume.server';

describe('getResumes', () => {
	it('loads the updated English resume and its selected projects', () => {
		const { en } = getResumes();
		const normalizedQuote = en.quote.replace(/\s+/g, ' ');

		expect(en.labels.title).toBe('Resume');
		expect(en.labels.date).toBe('Period');
		expect(en.contact.location).toBe('Bergamo, Italy');
		expect(normalizedQuote).toMatch(/^I am a software architect based in Bergamo, Italy\./);
		expect(normalizedQuote).toContain('native and web applications');
		expect(normalizedQuote).toContain('hardware constraints');
		expect(en.experience).toHaveLength(6);
		expect(en.projects).toHaveLength(2);
		expect(en.skills.map((skill) => skill.title)).toEqual([
			'Software design and system architecture',
			'Languages',
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
				'Stable API design',
				'RAII and ownership',
				'OpenGL',
				'TinyUSB',
				'CAN/CAN FD',
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
		expect(en.experience[0].points.join(' ')).toContain('RPC calls');
		expect(en.projects.map((project) => project.name)).toEqual(['Nexenne Library', 'TrackOMatic']);
	});

	it('keeps both resume languages structurally complete', () => {
		const resumes = getResumes();

		expect(resumes.it.experience).toHaveLength(resumes.en.experience.length);
		expect(resumes.it.projects).toHaveLength(resumes.en.projects.length);
		expect(resumes.it.skills).toHaveLength(resumes.en.skills.length);
	});
});
