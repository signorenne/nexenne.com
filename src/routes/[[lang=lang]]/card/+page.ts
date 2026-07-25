import type { EntryGenerator } from './$types';

// The compatibility route is intentionally absent from navigation and the
// sitemap, so list both languages explicitly instead of relying on crawl links.
export const entries: EntryGenerator = () => [{ lang: '' }, { lang: 'it' }];
