/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker for offline support and faster repeat visits.
 *
 * On install it precaches the hashed build assets and the static files. At
 * runtime it serves versioned assets cache-first, and pages network-first with
 * a cache fallback, so the site keeps working offline.
 */
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `nexenne-cache-${version}`;

// build holds the hashed, immutable app assets; files holds everything in static.
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== location.origin) return;

	// Versioned build assets never change, so serve them straight from cache.
	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	// Pages & everything else: network-first, falling back to cache when offline.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(request);
				if (response.ok && response.type === 'basic') {
					cache.put(request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(request);
				if (cached) return cached;
				// Last resort for navigations: the cached home page.
				if (request.mode === 'navigate') {
					const fallback = await cache.match('/');
					if (fallback) return fallback;
				}
				throw new Error('offline and not cached');
			}
		})()
	);
});
