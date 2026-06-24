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
	import { onMount, onDestroy, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { t } from '$lib/i18n';
	import { sharePage } from '$lib/share';
	import type { TocItem } from '$lib/content/types';

	export let items: TocItem[] = [];
	// When set, a persistent Share control is shown at the foot of the rail.
	export let title = '';

	let activeId = items[0]?.id ?? '';
	let open = false;
	let progressPx = 0;
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
		history.replaceState(null, '', `#${id}`);
	}

	function onPointerEnter() {
		open = true;
	}
	function onPointerLeave() {
		open = false;
	}

	function recomputeProgress() {
		if (!bodyEl || !items.length) {
			progressPx = 0;
			return;
		}
		const stations = bodyEl.querySelectorAll<HTMLElement>('.an-station');
		if (!stations.length) {
			progressPx = 0;
			return;
		}

		const heads = items.map((it) => {
			const el = document.getElementById(it.id);
			if (!el) return { id: it.id, y: Number.POSITIVE_INFINITY };
			return { id: it.id, y: el.getBoundingClientRect().top + window.scrollY };
		});
		if (!isFinite(heads[0].y) || !isFinite(heads[heads.length - 1].y)) {
			progressPx = 0;
			return;
		}

		const scrollLine = window.scrollY + READING_LINE;
		let nextActiveIdx = 0;
		for (let i = 0; i < heads.length; i++) {
			if (heads[i].y <= scrollLine) nextActiveIdx = i;
			else break;
		}
		activeId = heads[nextActiveIdx].id;

		const bodyTop = bodyEl.getBoundingClientRect().top;
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

	onDestroy(() => {});
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
						<span class="an-mark" aria-hidden="true">¶</span>
						<span class="an-title">{$t('article.outline.title')}</span>
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
								<span class="an-num">{String(i + 1).padStart(2, '0')}</span>
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
