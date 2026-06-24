<script lang="ts">
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import LogoMark from './LogoMark.svelte';
	import { pageFlash } from '$lib/stores/pageFlash';

	let active = false;
	let outgoing = false;
	let target = '';
	let frame = '0x00';
	let isPopstate = false;
	let outTimer: ReturnType<typeof setTimeout> | null = null;
	let clearTimer: ReturnType<typeof setTimeout> | null = null;
	let safetyTimer: ReturnType<typeof setTimeout> | null = null;
	let midTimer: ReturnType<typeof setTimeout> | null = null;
	let lastFlashId = 0;

	function randHex(): string {
		const v = Math.floor(Math.random() * 0xffff);
		return '0x' + v.toString(16).toUpperCase().padStart(4, '0');
	}

	function motionEnabled(): boolean {
		if (typeof document === 'undefined') return false;
		return !document.documentElement.classList.contains('motion-off');
	}

	function dismiss() {
		active = false;
		outgoing = false;
		document.documentElement.classList.remove('is-transitioning');
	}

	function reset() {
		if (outTimer) {
			clearTimeout(outTimer);
			outTimer = null;
		}
		if (clearTimer) {
			clearTimeout(clearTimer);
			clearTimer = null;
		}
		if (safetyTimer) {
			clearTimeout(safetyTimer);
			safetyTimer = null;
		}
		if (midTimer) {
			clearTimeout(midTimer);
			midTimer = null;
		}
	}

	// Manual flash with no navigation, e.g. a language switch hidden behind the loader.
	function startFlash(midAction?: () => void) {
		// No navigation, so run the swap immediately when motion is disabled.
		if (!motionEnabled()) {
			midAction?.();
			return;
		}
		reset();
		frame = randHex();
		target = '·';
		outgoing = false;
		active = true;
		document.documentElement.classList.add('is-transitioning');
		midTimer = setTimeout(() => {
			midAction?.(); // runs while the overlay fully covers the screen
			outTimer = setTimeout(() => {
				outgoing = true;
				clearTimer = setTimeout(dismiss, 520);
			}, 200);
		}, 300);
	}

	onMount(() => {
		const unsub = pageFlash.subscribe((req) => {
			if (!req || req.id === lastFlashId) return;
			lastFlashId = req.id;
			startFlash(req.midAction);
		});
		return unsub;
	});

	function snapToTop() {
		const prev = document.documentElement.style.scrollBehavior;
		document.documentElement.style.scrollBehavior = 'auto';
		window.scrollTo(0, 0);
		document.documentElement.style.scrollBehavior = prev;
	}

	beforeNavigate(({ type, to, from }) => {
		const sameDoc =
			!!from && !!to && from.url.pathname === to.url.pathname && from.url.search === to.url.search;
		if (sameDoc) return;
		if (type !== 'link' && type !== 'goto' && type !== 'popstate') return;
		reset();
		target = to?.url?.pathname ?? '/';
		frame = randHex();
		isPopstate = type === 'popstate';
		outgoing = false;
		active = true;
		if (motionEnabled()) {
			document.documentElement.classList.add('is-transitioning');
		}
		// The loader is normally dismissed by afterNavigate, once the destination
		// has actually loaded. This is only a last-resort fallback so the overlay
		// can't get stuck forever if a navigation never completes. Kept long so
		// slow connections still see the loader until the new page is ready.
		safetyTimer = setTimeout(dismiss, 20000);
	});

	afterNavigate(() => {
		if (!active) return;
		if (!isPopstate) snapToTop();
		outTimer = setTimeout(() => {
			outgoing = true;
			clearTimer = setTimeout(dismiss, 520);
		}, 240);
	});
</script>

{#if active}
	<div class="page-transition" class:is-out={outgoing} aria-hidden="true">
		<span class="pt-scrim"></span>
		<span class="pt-grid"></span>
		<div class="pt-stage">
			<span class="pt-ring r1"></span>
			<span class="pt-ring r2"></span>
			<span class="pt-ring r3"></span>
			<div class="pt-cube">
				<span class="pt-face f1"><LogoMark /></span>
				<span class="pt-face f2"><LogoMark /></span>
				<span class="pt-face f3"><LogoMark /></span>
				<span class="pt-face f4"><LogoMark /></span>
				<span class="pt-face f5"><LogoMark /></span>
				<span class="pt-face f6"><LogoMark /></span>
			</div>
		</div>
		<div class="pt-readout">
			<span class="pt-k">FRAME</span>
			<span class="pt-v pt-hex">{frame}</span>
			<span class="pt-sep">·</span>
			<span class="pt-k">→</span>
			<span class="pt-v pt-target">{target}</span>
		</div>
		<div class="pt-bar"><span class="pt-bar-fill"></span></div>
		<span class="pt-corner tl"></span>
		<span class="pt-corner tr"></span>
		<span class="pt-corner bl"></span>
		<span class="pt-corner br"></span>
	</div>
{/if}
