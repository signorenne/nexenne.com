<script lang="ts">
	/**
	 * Root layout: the shared shell around every page (nav, side map, footer,
	 * tools).
	 *
	 * It also wires three cross-cutting systems, each documented at its source:
	 * - Language: the lang store is set from the route param. See $lib/paths.ts
	 *   and src/hooks.server.ts for the rest of the bilingual routing.
	 * - In-page search highlight: reads ?q= on navigation and calls
	 *   $lib/highlight.ts. The term comes from the command palette.
	 * - View Transitions and the JSON-LD head metadata for SEO.
	 */
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onNavigate, afterNavigate } from '$app/navigation';
	import { highlightIn, clearHighlights } from '$lib/highlight';
	import SideMap from '$lib/components/SideMap.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PageStamp from '$lib/components/PageStamp.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import LeaderMenu from '$lib/components/LeaderMenu.svelte';
	import CursorDot from '$lib/components/CursorDot.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import Tweaks from '$lib/components/Tweaks.svelte';
	import NavGuide from '$lib/components/NavGuide.svelte';
	import ResizeHud from '$lib/components/ResizeHud.svelte';
	import LangSuggest from '$lib/components/LangSuggest.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import { get } from 'svelte/store';
	import { cycleTheme } from '$lib/tweaks';
	import { lang, t } from '$lib/i18n';
	import { showToast } from '$lib/stores/toast';
	import { langFromPath, stripLang } from '$lib/paths';
	import { SITE, SITE_URL, DEFAULT_OG_IMAGE } from '$lib/data';
	import type { ContentLang } from '$lib/content/types';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
	$: ({ posts, works } = data);

	// The URL is the source of truth for language: `/` is English, `/it/` is Italian.
	// Derive it from the pathname (not just the route param) so it's also correct
	// on the 404 fallback, where no route matched and $page.params.lang is absent —
	// otherwise an unknown /it/… URL would render the error page in English.
	$: lang.set(langFromPath($page.url.pathname));

	$: sourcePosts = posts.map((b) => b.byLang[$lang as ContentLang] ?? b.source);
	$: localizedWorks = works.map((b) => b.byLang[$lang as ContentLang] ?? b.source);

	let paletteOpen = false;
	let leaderOpen = false;

	$: pathParts = stripLang($page.url.pathname)
		.replace(/^\/+|\/+$/g, '')
		.split('/');
	$: route = derivePageRoute(pathParts);
	$: slug = pathParts.length >= 2 ? pathParts[1] : null;

	function derivePageRoute(parts: string[]): string {
		if (parts.length === 0 || parts[0] === '') return 'home';
		const seg = parts[0];
		if (seg === 'work' && parts.length > 1) return 'case';
		if (seg === 'blog' && parts.length > 1) return 'post';
		if (seg === '404') return 'notfound';
		return seg;
	}

	const SECTION_KEY: Record<string, string> = {
		home: 'sidemap.home',
		work: 'sidemap.work',
		case: 'sidemap.case',
		blog: 'sidemap.blog',
		post: 'sidemap.post',
		services: 'sidemap.services',
		about: 'sidemap.about',
		resume: 'sidemap.resume',
		now: 'sidemap.now',
		uses: 'sidemap.uses',
		contact: 'sidemap.contact',
		card: 'sidemap.card',
		colophon: 'footer.colophon',
		notfound: '404.eyebrow'
	};

	$: pageTitle = (() => {
		if (route === 'post' && slug) {
			const meta = sourcePosts.find((p) => p.slug === slug);
			if (meta) return meta.title;
		}
		if (route === 'case' && slug) {
			const meta = localizedWorks.find((w) => w.slug === slug);
			if (meta) return meta.title;
		}
		const key = SECTION_KEY[route];
		return key ? $t(key) : '';
	})();

	$: documentTitle = pageTitle ? `nexenne · ${pageTitle.toLowerCase()}` : 'nexenne';

	$: pageDescription = (() => {
		if (route === 'post' && slug) {
			const meta = sourcePosts.find((p) => p.slug === slug);
			if (meta?.desc) return meta.desc;
		}
		if (route === 'case' && slug) {
			const meta = localizedWorks.find((w) => w.slug === slug);
			if (meta?.summary) return meta.summary;
		}
		return SITE.blurb;
	})();

	$: pageImage = (() => {
		// Articles and case studies get a branded, per-item generated OG card.
		if ((route === 'post' || route === 'case') && slug) return `/og/${slug}.png`;
		return DEFAULT_OG_IMAGE;
	})();

	$: canonicalUrl = `${SITE_URL}${$page.url.pathname}`;
	$: absoluteImage = pageImage.startsWith('http') ? pageImage : `${SITE_URL}${pageImage}`;
	$: ogType = route === 'post' ? 'article' : 'website';

	// hreflang alternates: every page exists in both languages (English at the
	// root, Italian under /it/). x-default points at the English (canonical) URL.
	$: enPath = (() => {
		const p: string = $page.url.pathname;
		return p === '/it' || p.startsWith('/it/') ? p.slice(3) || '/' : p;
	})();
	$: itPath = enPath === '/' ? '/it/' : `/it${enPath}`;
	$: altEnUrl = `${SITE_URL}${enPath}`;
	$: altItUrl = `${SITE_URL}${itPath}`;

	// schema.org graph: Person + WebSite always; plus BlogPosting/CreativeWork +
	// BreadcrumbList on article/case pages for richer search results.
	$: jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': (() => {
			const locale = $lang === 'it' ? 'it-IT' : 'en-US';
			const prefix = $lang === 'it' ? '/it' : '';
			const personRef = { '@id': `${SITE_URL}/#person` };
			const graph: Record<string, unknown>[] = [
				{
					'@type': 'Person',
					...personRef,
					name: SITE.name,
					url: SITE_URL,
					email: SITE.email,
					jobTitle: SITE.role,
					image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
					address: SITE.location,
					sameAs: SITE.socials.filter((s) => s.href.startsWith('http')).map((s) => s.href)
				},
				{
					'@type': 'WebSite',
					'@id': `${SITE_URL}/#website`,
					url: SITE_URL,
					name: 'nexenne',
					description: SITE.blurb,
					inLanguage: locale,
					publisher: personRef
				}
			];

			const crumbs = (items: [string, string][]) => ({
				'@type': 'BreadcrumbList',
				itemListElement: items.map(([name, item], i) => ({
					'@type': 'ListItem',
					position: i + 1,
					name,
					item
				}))
			});

			if (route === 'post' && slug) {
				const m = sourcePosts.find((p) => p.slug === slug);
				if (m) {
					graph.push({
						'@type': 'BlogPosting',
						'@id': `${canonicalUrl}#article`,
						headline: m.title,
						description: m.desc || SITE.blurb,
						datePublished: m.date,
						dateModified: m.lastmod || m.date,
						image: absoluteImage,
						url: canonicalUrl,
						mainEntityOfPage: canonicalUrl,
						inLanguage: locale,
						author: personRef,
						publisher: personRef,
						...(m.tags.length ? { keywords: m.tags.join(', ') } : {})
					});
					graph.push(
						crumbs([
							[$t('sidemap.home'), `${SITE_URL}${prefix}/`],
							[$t('sidemap.blog'), `${SITE_URL}${prefix}/blog/`],
							[m.title, canonicalUrl]
						])
					);
				}
			} else if (route === 'case' && slug) {
				const m = localizedWorks.find((w) => w.slug === slug);
				if (m) {
					graph.push({
						'@type': 'CreativeWork',
						'@id': `${canonicalUrl}#work`,
						name: m.title,
						description: m.summary || SITE.blurb,
						image: absoluteImage,
						url: canonicalUrl,
						inLanguage: locale,
						author: personRef,
						...(m.tags.length ? { keywords: m.tags.join(', ') } : {})
					});
					graph.push(
						crumbs([
							[$t('sidemap.home'), `${SITE_URL}${prefix}/`],
							[$t('sidemap.work'), `${SITE_URL}${prefix}/work/`],
							[m.title, canonicalUrl]
						])
					);
				}
			}
			return graph;
		})()
	}).replace(/</g, '\\u003c');

	function copyEmail() {
		try {
			navigator.clipboard?.writeText(SITE.email);
			showToast(get(t)('toast.email'), { tone: 'success' });
		} catch {
			showToast(get(t)('toast.copyfail'), { tone: 'error' });
		}
	}

	function onKey(e: KeyboardEvent) {
		const meta = e.metaKey || e.ctrlKey;
		if (meta && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}
		if (meta && e.key.toLowerCase() === 'j') {
			e.preventDefault();
			cycleTheme();
			return;
		}
		if (meta && e.key.toLowerCase() === 'e') {
			e.preventDefault();
			copyEmail();
			return;
		}
	}

	// Smooth cross-page morphs via the View Transitions API, where supported.
	// Skipped when the visitor prefers reduced motion (the `motion-off` class).
	onNavigate((navigation) => {
		if (typeof document === 'undefined') return;
		const doc = document as Document & {
			startViewTransition?: (cb: () => Promise<void> | void) => void;
		};
		if (!doc.startViewTransition) return;
		if (document.documentElement.classList.contains('motion-off')) return;

		return new Promise<void>((resolve) => {
			doc.startViewTransition!(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	let mainEl: HTMLElement;
	let disarm: (() => void) | null = null;

	// Remove the search highlight and drop `?q=` from the URL so it won't reapply.
	function dismissHighlight() {
		clearHighlights();
		if (disarm) {
			disarm();
			disarm = null;
		}
		const url = new URL(location.href);
		if (url.searchParams.has('q')) {
			url.searchParams.delete('q');
			history.replaceState(history.state, '', url.pathname + url.search + url.hash);
		}
	}

	// Once a highlight is shown, clear it on the first real interaction (Esc,
	// click, wheel, or touch). A programmatic smooth-scroll fires none of these,
	// so the highlight will not dismiss itself or linger forever.
	function armDismiss() {
		if (disarm) disarm();
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dismissHighlight();
		};
		const onInteract = () => dismissHighlight();
		window.addEventListener('keydown', onKeydown);
		window.addEventListener('pointerdown', onInteract);
		window.addEventListener('wheel', onInteract, { passive: true });
		window.addEventListener('touchstart', onInteract, { passive: true });
		disarm = () => {
			window.removeEventListener('keydown', onKeydown);
			window.removeEventListener('pointerdown', onInteract);
			window.removeEventListener('wheel', onInteract);
			window.removeEventListener('touchstart', onInteract);
		};
	}

	// Highlight + scroll to a `?q=` term anywhere on the page (deep-link from
	// the command palette search). searchParams is read on the client only.
	function runHighlight() {
		if (!browser) return;
		if (disarm) {
			disarm();
			disarm = null;
		}
		clearHighlights();
		const q = new URLSearchParams(location.search).get('q') ?? '';
		if (!q) return;
		requestAnimationFrame(() => {
			if (highlightIn(mainEl, q)) armDismiss();
		});
	}

	afterNavigate(runHighlight);

	onMount(() => {
		runHighlight();
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			if (disarm) disarm();
		};
	});
</script>

<svelte:head>
	<title>{documentTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href={altEnUrl} />
	<link rel="alternate" hreflang="it" href={altItUrl} />
	<link rel="alternate" hreflang="x-default" href={altEnUrl} />
	<link
		rel="alternate"
		type="application/rss+xml"
		title="nexenne"
		href={`${SITE_URL}${$lang === 'it' ? '/it' : ''}/feed.xml`}
	/>
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content="nexenne" />
	<meta property="og:title" content={documentTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:locale" content={$lang === 'it' ? 'it_IT' : 'en_US'} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={documentTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={absoluteImage} />
	{@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
</svelte:head>

<CursorDot />
<PageTransition />
<a href="#main-content" class="skip-link">{$t('a11y.skip')}</a>
<div class="app" data-page={route}>
	<SideMap />
	<Nav on:openPalette={() => (paletteOpen = true)} />
	<main id="main-content" data-page={route} bind:this={mainEl}>
		<PageStamp {route} {slug} />
		<slot />
	</main>
	<Footer />
	<CommandPalette
		open={paletteOpen}
		onClose={() => (paletteOpen = false)}
		posts={sourcePosts}
		works={localizedWorks}
	/>
	<LeaderMenu bind:open={leaderOpen} {paletteOpen} onOpenPalette={() => (paletteOpen = true)} />
	<Tweaks />
	<NavGuide />
	<ResizeHud />
	<LangSuggest />
	<Toaster />
</div>
