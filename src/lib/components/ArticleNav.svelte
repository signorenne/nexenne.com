<script lang="ts">
	/**
	 * Article table-of-contents rail (the outline beside a post or case study).
	 *
	 * Positioning is driven by JavaScript on purpose. CSS position: sticky does
	 * not work here because the rail sits inside the flex .post-body layout, so
	 * instead we keep an in-flow placeholder (slotEl) and move the real rail
	 * (asideEl) through three states as the reader scrolls. See updatePin for
	 * those states. The reading-progress indicator and the active heading are
	 * recomputed on scroll, coalesced into one run per frame.
	 */
	import { onMount, tick } from 'svelte';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { t } from '$lib/i18n';
	import { sharePage } from '$lib/share';
	import type { TocItem } from '$lib/content/types';

	export let items: TocItem[] = [];
	// When set, a persistent Share control is shown at the foot of the rail.
	export let title = '';

	let activeId = items[0]?.id ?? '';
	// The rail expands on hover, or stays expanded when the reader locks it open
	// with the mark toggle. open is derived from both.
	let hovering = false;
	let lockedOpen = false;
	$: open = hovering || lockedOpen;
	let progressPx = 0;
	// Whole-article completion (0-100), independent of station spacing: answers
	// "how far to the end", which the section-to-section line alone cannot.
	let pct = 0;
	let bodyEl: HTMLElement;
	let slotEl: HTMLDivElement;
	let asideEl: HTMLElement;

	let pinned = false;
	let parked = false;
	let pinLeft = 0;
	let parkedTop = 0;

	const READING_LINE = 110;
	const PIN_TOP = 96;

	function jumpTo(id: string, e: Event) {
		e.preventDefault();
		const el = document.getElementById(id);
		if (!el) return;
		const top = el.getBoundingClientRect().top + window.scrollY - 96;
		window.scrollTo({ top, behavior: 'smooth' });
		// Update the hash through SvelteKit so its router/scroll-restoration state
		// survives. A raw history.replaceState(null, ...) wipes that state, which
		// left the reader stranded after navigating away and back.
		replaceState(`#${id}`, {});
	}

	function onPointerEnter() {
		hovering = true;
	}
	function onPointerLeave() {
		hovering = false;
	}
	function toggleLock() {
		lockedOpen = !lockedOpen;
	}

	function recomputeProgress() {
		if (!bodyEl || !items.length) {
			progressPx = 0;
			pct = 0;
			return;
		}
		const stations = bodyEl.querySelectorAll<HTMLElement>('.an-station');
		if (!stations.length) {
			progressPx = 0;
			pct = 0;
			return;
		}

		const heads = items.map((it) => {
			const el = document.getElementById(it.id);
			if (!el) return { id: it.id, y: Number.POSITIVE_INFINITY };
			return { id: it.id, y: el.getBoundingClientRect().top + window.scrollY };
		});
		if (!isFinite(heads[0].y) || !isFinite(heads[heads.length - 1].y)) {
			progressPx = 0;
			pct = 0;
			return;
		}

		const scrollLine = window.scrollY + READING_LINE;
		let nextActiveIdx = 0;
		for (let i = 0; i < heads.length; i++) {
			if (heads[i].y <= scrollLine) nextActiveIdx = i;
			else break;
		}
		activeId = heads[nextActiveIdx].id;

		// Whole-article completion: how far the reading line has travelled from the
		// first heading to the end of the article body. Falls back to the heading
		// span when the .prose container is not found.
		const prose = document.querySelector<HTMLElement>('.prose');
		const articleTop = heads[0].y;
		const articleBottom = prose
			? prose.getBoundingClientRect().top + window.scrollY + prose.offsetHeight
			: heads[heads.length - 1].y;
		const articleSpan = Math.max(1, articleBottom - articleTop);
		pct = Math.round(Math.min(1, Math.max(0, (scrollLine - articleTop) / articleSpan)) * 100);

		// Station centers are measured relative to the rail's scrollable content
		// origin (not its viewport), so adding scrollTop keeps them stable while
		// the rail scrolls internally. This matches how .an-progress is drawn.
		const bodyTop = bodyEl.getBoundingClientRect().top - bodyEl.scrollTop;
		const stationCenters: number[] = [];
		for (const s of stations) {
			const r = s.getBoundingClientRect();
			stationCenters.push(r.top + r.height / 2 - bodyTop);
		}

		let target: number;
		if (nextActiveIdx >= heads.length - 1) {
			target = stationCenters[stationCenters.length - 1] ?? 0;
		} else {
			const yA = heads[nextActiveIdx].y;
			const yB = heads[nextActiveIdx + 1].y;
			const span = Math.max(1, yB - yA);
			const t = Math.min(1, Math.max(0, (scrollLine - yA) / span));
			const cA = stationCenters[nextActiveIdx] ?? 0;
			const cB = stationCenters[nextActiveIdx + 1] ?? cA;
			target = cA + (cB - cA) * t;
		}
		progressPx = Math.max(0, target);

		followProgress();
	}

	/**
	 * Scroll the rail's own scroll area so the reading tip stays visible.
	 *
	 * When the outline is taller than the rail box it must scroll internally;
	 * otherwise the active heading and progress tip run off the bottom and the
	 * reader loses their place. The tip is kept inside a comfortable band rather
	 * than snapped to an edge, so short outlines never scroll.
	 */
	function followProgress() {
		if (!bodyEl) return;
		const view = bodyEl.clientHeight;
		const overflow = bodyEl.scrollHeight - view;
		if (overflow <= 0) return;
		const tip = 4 + progressPx;
		const margin = Math.min(64, view * 0.3);
		let next = bodyEl.scrollTop;
		if (tip < next + margin) next = tip - margin;
		else if (tip > next + view - margin) next = tip - view + margin;
		next = Math.max(0, Math.min(overflow, next));
		if (Math.abs(next - bodyEl.scrollTop) > 0.5) bodyEl.scrollTop = next;
	}

	/**
	 * Choose the rail's positioning state from the placeholder's position.
	 *
	 * Three states, based on the in-flow placeholder (slotEl):
	 * - flowing: the placeholder top is still below PIN_TOP, so the rail scrolls
	 *   normally with the page (neither pinned nor parked).
	 * - pinned: the placeholder has scrolled under PIN_TOP but the article is
	 *   still tall enough, so the rail is fixed at PIN_TOP while reading.
	 * - parked: the article is ending and a fixed rail would overflow past it, so
	 *   the rail is absolutely placed at the bottom of the placeholder instead.
	 *
	 * pinLeft mirrors the placeholder's left edge so a fixed rail stays aligned.
	 */
	function updatePin() {
		if (!slotEl || !asideEl) return;

		const slotRect = slotEl.getBoundingClientRect();
		const asideHeight = asideEl.offsetHeight;

		pinLeft = slotRect.left;

		if (slotRect.top >= PIN_TOP) {
			pinned = false;
			parked = false;
		} else if (slotRect.bottom - PIN_TOP < asideHeight) {
			pinned = false;
			parked = true;
			parkedTop = Math.max(0, slotEl.clientHeight - asideHeight);
		} else {
			pinned = true;
			parked = false;
		}
	}

	let rafId = 0;
	// Coalesce scroll/resize work into one run per frame so the layout reads
	// (getBoundingClientRect) can't thrash the main thread on heavy pages.
	function onScroll() {
		if (rafId) return;
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			recomputeProgress();
			updatePin();
		});
	}

	onMount(() => {
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		recomputeProgress();
		updatePin();
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (rafId) cancelAnimationFrame(rafId);
		};
	});

	afterNavigate(async () => {
		await tick();
		activeId = items[0]?.id ?? '';
		recomputeProgress();
		updatePin();
	});

	$: {
		items;
		open;
		if (typeof window !== 'undefined') {
			tick().then(() => {
				recomputeProgress();
				updatePin();
			});
		}
	}
</script>

{#if items.length || title}
	<div class="article-nav-slot" class:is-open={open} bind:this={slotEl}>
		<aside
			bind:this={asideEl}
			class="article-nav"
			class:is-open={open}
			class:is-pinned={pinned}
			class:is-parked={parked}
			style:left={pinned ? `${pinLeft}px` : null}
			style:top={parked ? `${parkedTop}px` : null}
			aria-label={$t('article.outline.aria')}
		>
			<div
				class="an-shell"
				on:mouseenter={onPointerEnter}
				on:mouseleave={onPointerLeave}
				on:focusin={onPointerEnter}
				on:focusout={onPointerLeave}
				role="presentation"
			>
				{#if items.length}
					<div class="an-head">
						<button
							type="button"
							class="an-mark"
							class:is-locked={lockedOpen}
							style="--an-p: {pct}"
							on:click={toggleLock}
							aria-pressed={lockedOpen}
							aria-label={$t('article.outline.toggle')}
							data-hover
						>
							<span class="an-mark-glyph" aria-hidden="true">¶</span>
						</button>
						<span class="an-title">{$t('article.outline.title')}</span>
						<span
							class="an-pct"
							role="progressbar"
							aria-valuemin="0"
							aria-valuemax="100"
							aria-valuenow={pct}
							aria-label={$t('article.progress')}>{pct}%</span
						>
					</div>
					<div class="an-body" bind:this={bodyEl}>
						<span class="an-line" aria-hidden="true"></span>
						<span class="an-progress" aria-hidden="true" style="height: {progressPx}px"></span>
						{#each items as it, i (it.id)}
							<a
								class="an-station"
								class:is-active={activeId === it.id}
								class:is-l2={it.level === 2}
								class:is-l3={it.level === 3}
								href="#{it.id}"
								on:click={(e) => jumpTo(it.id, e)}
								data-hover
								aria-current={activeId === it.id ? 'true' : undefined}
							>
								<span class="an-node" aria-hidden="true"><span class="an-node-inner"></span></span>
								<span class="an-label">{it.text}</span>
							</a>
						{/each}
					</div>
				{/if}
				{#if title}
					<button
						type="button"
						class="an-share"
						on:click={() => sharePage(title)}
						data-hover
						aria-label={$t('share.label')}
					>
						<span class="an-share-icon" aria-hidden="true">
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
							>
								<circle cx="18" cy="5" r="3" />
								<circle cx="6" cy="12" r="3" />
								<circle cx="18" cy="19" r="3" />
								<path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
							</svg>
						</span>
						<span class="an-share-label">{$t('share.label')}</span>
					</button>
				{/if}
			</div>
		</aside>
	</div>
{/if}
