import { describe, it, expect } from 'vitest';
import { match } from './lang';

describe('lang param matcher', () => {
	it('matches only the it prefix', () => {
		expect(match('it')).toBe(true);
	});
	it('does not match en (English lives at the root, no prefix)', () => {
		expect(match('en')).toBe(false);
	});
	it('does not match real page segments', () => {
		for (const seg of ['about', 'work', 'blog', 'services', 'italy', '']) {
			expect(match(seg)).toBe(false);
		}
	});
});
