import { describe, it, expect } from 'vitest';
import { recencyKey } from '$lib/content/recency';

describe('recencyKey', () => {
	it('reads year + month from Italian strings', () => {
		expect(recencyKey('Da marzo 2026')).toBe(202603);
		expect(recencyKey('Da gennaio 2026')).toBe(202601);
		expect(recencyKey('Da dicembre 2025')).toBe(202512);
	});

	it('reads year + month from English strings', () => {
		expect(recencyKey('Since March 2026')).toBe(202603);
		expect(recencyKey('Since December 2025')).toBe(202512);
	});

	it('uses the latest year and the range-end month', () => {
		expect(recencyKey('Nov 2022–Feb 2023')).toBe(202302);
		expect(recencyKey('Novembre 2022–febbraio 2023')).toBe(202302);
	});

	it('handles a year with no month', () => {
		expect(recencyKey('2026 → in corso')).toBe(202600);
		expect(recencyKey('2026 → ongoing')).toBe(202600);
	});

	it('returns 0 when there is no year', () => {
		expect(recencyKey('in corso')).toBe(0);
		expect(recencyKey('')).toBe(0);
	});

	it('orders a realistic set most-recent first', () => {
		const items = ['Nov 2022–Feb 2023', 'Da dicembre 2025', 'Da gennaio 2026', 'Da marzo 2026'];
		const sorted = [...items].sort((a, b) => recencyKey(b) - recencyKey(a));
		expect(sorted).toEqual([
			'Da marzo 2026',
			'Da gennaio 2026',
			'Da dicembre 2025',
			'Nov 2022–Feb 2023'
		]);
	});
});
