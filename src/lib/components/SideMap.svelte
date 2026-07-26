<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { beforeNavigate, goto } from '$app/navigation';
	import { lpath, stripLang } from '$lib/paths';
	import { SIDEMAP_ROUTES } from '$lib/data';
	import { t } from '$lib/i18n';
	import { mobileNavOpen } from '$lib/stores/mobileNav';
	import { get } from 'svelte/store';
	import LogoMark from './LogoMark.svelte';

	let scrollPct = 0;

	$: route = routeFromPath($page.url.pathname);

	function routeFromPath(path: string): string {
		const p = stripLang(path).replace(/^\/+|\/+$/g, '');
		if (!p) return 'home';
		const route = p.split('/')[0];
		return route === 'card' ? 'brand' : route;
	}

	function routeToPath(id: string): string {
		return id === 'home' ? lpath('/') : lpath(`/${id}/`);
	}

	/**
	 * The rail expands on hover, so after a route change it stays open while the
	 * pointer is still resting on it, and the station just clicked keeps focus,
	 * which holds it open through :focus-within as well. Collapse it explicitly
	 * and let the next deliberate gesture reopen it.
	 */
	let collapsed = false;

	function close() {
		mobileNavOpen.set(false);
	}

	function collapse() {
		collapsed = true;
		// Focus alone keeps the rail expanded, so give it up too.
		if (asideEl?.contains(document.activeElement)) {
			(document.activeElement as HTMLElement | null)?.blur?.();
		}
	}

	function release() {
		collapsed = false;
	}

	function navTo(id: string, e: Event) {
		e.preventDefault();
		// Closed here as well as in beforeNavigate: tapping the route you are
		// already on does not navigate, so nothing else would close the drawer.
		close();
		goto(routeToPath(id));
	}

	/**
	 * Any navigation closes the drawer, wherever it came from: the top bar, the
	 * footer, the command palette, a link inside the page, or the browser's back
	 * button. Closing before the navigation runs means the drawer is gone during
	 * the page transition rather than lingering into the next route.
	 */
	beforeNavigate(() => {
		close();
		collapse();
	});

	let asideEl: HTMLElement;

	onMount(() => {
		const onScroll = () => {
			const h = document.documentElement;
			const max = h.scrollHeight - h.clientHeight;
			scrollPct = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
			// Scrolling the page dismisses the open mobile drawer immediately.
			if (get(mobileNavOpen)) close();
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		// Any pointer press outside the drawer (and outside the burger that opens
		// it) closes it at once. pointerdown fires before click for an instant feel.
		const onOutside = (e: PointerEvent) => {
			if (!get(mobileNavOpen)) return;
			const target = e.target as Element | null;
			if (!target) return;
			if (asideEl && asideEl.contains(target)) return;
			if (target.closest('.nav-burger')) return;
			close();
		};
		document.addEventListener('pointerdown', onOutside, true);

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		document.addEventListener('keydown', onKey);

		return () => {
			window.removeEventListener('scroll', onScroll);
			document.removeEventListener('pointerdown', onOutside, true);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

{#if $mobileNavOpen}
	<button class="sidemap-backdrop" aria-label={$t('a11y.closeMenu')} on:click={close}></button>
{/if}
<aside
	bind:this={asideEl}
	class="sidemap"
	class:is-open={$mobileNavOpen}
	class:is-collapsed={collapsed}
	on:pointerleave={release}
	on:pointerdown={release}
	aria-label={$t('a11y.sitemap')}
>
	<div class="sm-head">
		<button
			class="sm-mark"
			on:click={(e) => navTo('home', e)}
			data-hover
			aria-label={$t('a11y.home')}
		>
			<LogoMark />
		</button>
		<span class="sm-rail" aria-hidden="true"></span>
	</div>
	<div class="sm-body">
		<span class="sm-line" aria-hidden="true"></span>
		<span class="sm-progress" aria-hidden="true" style="height: calc((100% - 24px) * {scrollPct})"
		></span>
		{#each SIDEMAP_ROUTES as it, i}
			{@const active = it.id === route}
			<button
				class="sm-station"
				class:is-active={active}
				on:click={(e) => navTo(it.id, e)}
				data-hover
				aria-current={active ? 'page' : undefined}
			>
				<span class="sm-node" aria-hidden="true">
					<span class="sm-node-inner"></span>
				</span>
				<span class="sm-code">{it.hex}</span>
				<span class="sm-label">
					<span class="sm-label-num">{String(i + 1).padStart(2, '0')}</span>
					{$t(it.labelKey)}
				</span>
			</button>
		{/each}
	</div>
	<div class="sm-foot">
		<span class="sm-tick" aria-hidden="true"></span>
		<span class="sm-meta">CAN · 500 kbps</span>
	</div>
</aside>
