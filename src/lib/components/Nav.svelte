<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { SIDEMAP_ROUTES } from '$lib/data';
	import { lpath, stripLang } from '$lib/paths';
	import { t, lang } from '$lib/i18n';
	import { theme, cycleTheme } from '$lib/tweaks';
	import { mobileNavOpen } from '$lib/stores/mobileNav';
	import { switchLanguage } from '$lib/stores/pageFlash';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ openPalette: void }>();

	function go(path: string) {
		goto(lpath(path));
	}

	$: parts = stripLang($page.url.pathname)
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean);
	$: routePath = parts.length === 0 ? '/' : '/' + parts.join('/');
	$: routeId = deriveRouteId(parts);
	$: frame = SIDEMAP_ROUTES.find((r) => r.id === routeId)?.hex ?? '0x??';

	function deriveRouteId(p: string[]): string {
		if (p.length === 0) return 'home';
		const seg = p[0];
		if (seg === 'work' && p.length > 1) return 'case';
		if (seg === 'blog' && p.length > 1) return 'post';
		return seg;
	}

	let bgmTime = '';
	let bgmDate = '';
	let bgmTz = 'CET';
	let usrTime = '';
	let usrDate = '';
	let usrTz = '';
	let usrCity = '';
	let sameZone = false;

	function formatZone(zone: string, now: Date) {
		const ps = new Intl.DateTimeFormat('en-GB', {
			timeZone: zone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZoneName: 'short'
		}).formatToParts(now);
		const hh = ps.find((x) => x.type === 'hour')?.value ?? '';
		const mm = ps.find((x) => x.type === 'minute')?.value ?? '';
		const ss = ps.find((x) => x.type === 'second')?.value ?? '';
		const tz = ps.find((x) => x.type === 'timeZoneName')?.value ?? '';

		const dps = new Intl.DateTimeFormat('en-GB', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(now);
		const yy = dps.find((x) => x.type === 'year')?.value ?? '';
		const mo = dps.find((x) => x.type === 'month')?.value ?? '';
		const dd = dps.find((x) => x.type === 'day')?.value ?? '';

		return { time: `${hh}:${mm}:${ss}`, date: `${yy}-${mo}-${dd}`, tz };
	}

	function cityFromZone(zone: string): string {
		const part = zone.split('/').pop() ?? zone;
		return part.replace(/_/g, ' ').toUpperCase();
	}

	function tick() {
		try {
			const now = new Date();
			const bgm = formatZone('Europe/Rome', now);
			bgmTime = bgm.time;
			bgmDate = bgm.date;
			bgmTz = bgm.tz || 'CET';

			const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';
			usrCity = cityFromZone(localZone);
			sameZone = localZone === 'Europe/Rome';

			const usr = formatZone(localZone, now);
			usrTime = usr.time;
			usrDate = usr.date;
			usrTz = usr.tz;
		} catch {
			bgmTime = bgmDate = '';
			usrTime = usrDate = '';
		}
	}

	// The header is sticky at the top; the mobile nav drawer (SideMap) needs to
	// start just below it so its contents aren't hidden behind the header. Publish
	// the live header height as --nav-h so the CSS can offset the drawer.
	let headerEl: HTMLElement;

	onMount(() => {
		tick();

		const ms = 1000 - (Date.now() % 1000);
		let interval: ReturnType<typeof setInterval> | null = null;
		const boundary = setTimeout(() => {
			tick();
			interval = setInterval(tick, 1000);
		}, ms);

		// Publish the header height as --nav-h (used to offset the mobile drawer).
		// Measure in a rAF so layout has settled, and re-measure on every event that
		// can change it or leave a stale value — resize, orientation, font load, and
		// crucially when the page is restored from the bfcache (lock/unlock, tab
		// switch) where onMount does NOT run again. A wrong value here is what made
		// the drawer drift below/over the header after returning to the page.
		const setNavH = () => {
			requestAnimationFrame(() => {
				const h = headerEl?.offsetHeight ?? 0;
				if (h) document.documentElement.style.setProperty('--nav-h', `${h}px`);
			});
		};
		setNavH();

		const ro = new ResizeObserver(setNavH);
		if (headerEl) ro.observe(headerEl);

		const onVisible = () => {
			if (document.visibilityState === 'visible') setNavH();
		};
		window.addEventListener('resize', setNavH);
		window.addEventListener('orientationchange', setNavH);
		window.addEventListener('pageshow', setNavH);
		document.addEventListener('visibilitychange', onVisible);
		// Self-hosted fonts change the header height once they load.
		document.fonts?.ready?.then(setNavH).catch(() => {});

		// Always re-measure the instant the drawer opens, so its offset is correct
		// even if some earlier value went stale.
		const unsubNav = mobileNavOpen.subscribe((open) => {
			if (open) setNavH();
		});

		return () => {
			clearTimeout(boundary);
			if (interval) clearInterval(interval);
			ro.disconnect();
			window.removeEventListener('resize', setNavH);
			window.removeEventListener('orientationchange', setNavH);
			window.removeEventListener('pageshow', setNavH);
			document.removeEventListener('visibilitychange', onVisible);
			unsubNav();
		};
	});
</script>

<header class="nav nav--slim" bind:this={headerEl}>
	<div class="nav-inner">
		<button
			class="nav-burger"
			on:click={() => mobileNavOpen.update((v) => !v)}
			aria-label={$t('a11y.navToggle')}
			aria-expanded={$mobileNavOpen}
			data-hover
		>
			<span aria-hidden="true"></span>
			<span aria-hidden="true"></span>
			<span aria-hidden="true"></span>
		</button>
		<button class="brand-block" on:click={() => go('/')} data-hover aria-label={$t('a11y.home')}>
			<span class="brand-studio">nexenne</span>
			<span class="brand-wordmark">Nicolò · Plebani</span>
			<span class="brand-tag">{$t('topbar.tag')}</span>
		</button>

		<div class="nav-context" aria-hidden="true">
			<div class="ctx-col ctx-col--now">
				<span class="ctx-row">
					<span class="ctx-v ctx-path" title={routePath}>{routePath}</span>
					<span class="ctx-sep">·</span>
					<span class="ctx-v ctx-frame">{frame}</span>
				</span>
			</div>

			<div class="ctx-col ctx-col--clocks">
				<span class="ctx-row">
					<span class="ctx-k">ITALY</span>
					<span class="ctx-v ctx-date">{bgmDate}</span>
					<span class="ctx-sep">·</span>
					<span class="ctx-v">{bgmTime}</span>
					<span class="ctx-sep">·</span>
					<span class="ctx-v ctx-tz">{bgmTz}</span>
				</span>
				<span class="ctx-row" class:is-mirror={sameZone}>
					<span class="ctx-k" title={usrCity}>YOU</span>
					<span class="ctx-v ctx-date">{usrDate}</span>
					<span class="ctx-sep">·</span>
					<span class="ctx-v">{usrTime}</span>
					<span class="ctx-sep">·</span>
					<span class="ctx-v ctx-tz">{usrTz}</span>
				</span>
			</div>
		</div>

		<div class="nav-tools">
			<button class="btn btn--ghost btn--sm" on:click={() => go('/contact/')} data-hover>
				<span class="pulse" style="width:6px; height:6px;"></span>
				{$t('nav.thread')}
			</button>
			<button class="k-trigger" on:click={() => dispatch('openPalette')} data-hover>
				<span>{$t('nav.search')}</span>
				<kbd>⌘</kbd><kbd>K</kbd>
			</button>
			<button
				class="theme-btn lang-btn"
				on:click={switchLanguage}
				aria-label={$t('a11y.lang')}
				data-hover
				title={$lang === 'en' ? "Passa all'italiano" : 'Switch to English'}
			>
				<span
					style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; font-weight: 700;"
				>
					{$lang === 'en' ? 'EN' : 'IT'}
				</span>
			</button>
			<button class="theme-btn" on:click={cycleTheme} aria-label={$t('a11y.theme')} data-hover>
				{#if $theme === 'dark'}
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
					</svg>
				{:else}
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="4" />
						<path
							d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>
</header>
