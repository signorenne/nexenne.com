import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Route param matcher for the optional language segment.
 *
 * Matches only "it", so English stays at the root with no prefix and Italian
 * lives under /it/. Any other first segment (for example "about") is treated as
 * the page rather than the language, because the [[lang=lang]] param is optional.
 *
 * @param param The candidate first path segment.
 * @return True only when the segment is the Italian language code.
 */
export const match: ParamMatcher = (param) => param === 'it';
