<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { base } from '$app/paths';
	import { lgoto } from '$lib/paths';
	import { cycleTheme } from '$lib/tweaks';
	import { SITE } from '$lib/data';
	import { t, lang } from '$lib/i18n';
	import { showToast } from '$lib/stores/toast';
	import type { PostMeta, WorkMeta } from '$lib/content/types';

	export let open = false;
	export let onClose: () => void;
	export let posts: PostMeta[] = [];
	export let works: WorkMeta[] = [];

	interface Seg {
		t: string;
		hit: boolean;
	}
	interface Item {
		group: string;
		glyph: string;
		label: string;
		hint: string;
		run: () => void;
		// Page or article body text (original case), used to build snippets.
		search?: string;
		// Lowercased body text, precomputed once, for fast matching.
		searchLow?: string;
		// Label split into highlighted segments (when a query is active).
		labelSegs?: Seg[];
		// Contextual excerpt around a body match, highlighted.
		snippet?: Seg[];
	}

	interface IndexEntry {
		text: string;
		low: string;
	}

	/**
	 * Split text into highlighted and plain segments for every occurrence of the
	 * needle, so the template can wrap matches without using innerHTML.
	 *
	 * @param text   The text to split.
	 * @param needle The lowercased term to highlight.
	 * @return An ordered list of segments, each flagged as a hit or plain text.
	 */
	function toSegs(text: string, needle: string): Seg[] {
		if (!needle) return [{ t: text, hit: false }];
		const low = text.toLowerCase();
		const out: Seg[] = [];
		let i = 0;
		let idx = low.indexOf(needle);
		while (idx !== -1) {
			if (idx > i) out.push({ t: text.slice(i, idx), hit: false });
			out.push({ t: text.slice(idx, idx + needle.length), hit: true });
			i = idx + needle.length;
			idx = low.indexOf(needle, i);
		}
		if (i < text.length) out.push({ t: text.slice(i), hit: false });
		return out;
	}

	/**
	 * Build a short excerpt (about 100 characters) around the first body match,
	 * with the matched term highlighted, for display under a result.
	 *
	 * @param text   The full body text to excerpt from.
	 * @param needle The lowercased term to locate and highlight.
	 * @return Highlighted segments for the excerpt, or an empty array if no match.
	 */
	function toSnippet(text: string, needle: string): Seg[] {
		const i = text.toLowerCase().indexOf(needle);
		if (i === -1) return [];
		const R = 50;
		const s = Math.max(0, i - R);
		const e = Math.min(text.length, i + needle.length + R);
		let pre = text.slice(s, i);
		let post = text.slice(i + needle.length, e);
		if (s > 0) {
			const sp = pre.indexOf(' ');
			pre = '...' + (sp >= 0 ? pre.slice(sp + 1) : pre);
		}
		if (e < text.length) {
			const sp = post.lastIndexOf(' ');
			post = (sp >= 0 ? post.slice(0, sp) : post) + '...';
		}
		return toSegs(pre + text.slice(i, i + needle.length) + post, needle);
	}

	let q = '';
	let active = 0;
	let inputEl: HTMLInputElement;

	// Full-text index, keyed by "lang:path" and holding { text, low }. The
	// lowercase copy is precomputed once here so per-keystroke matching never
	// re-lowercases the bodies. Loaded lazily the first time the palette opens.
	let searchIndex: Record<string, IndexEntry> = {};
	let indexRequested = false;

	async function loadIndex() {
		if (indexRequested) return;
		indexRequested = true;
		try {
			const res = await fetch(`${base}/search.json`);
			if (res.ok) {
				const entries: Array<{ path: string; lang: string; title: string; text: string }> =
					await res.json();
				const map: Record<string, IndexEntry> = {};
				for (const e of entries) {
					map[`${e.lang}:${e.path}`] = { text: e.text, low: e.text.toLowerCase() };
				}
				searchIndex = map;
			}
		} catch {
			indexRequested = false; // allow a retry next open (e.g. transient offline)
		}
	}

	let panelEl: HTMLElement;
	let prevFocus: HTMLElement | null = null;
	let wasOpen = false;

	// On open: remember focus, reset, focus the input. On close: restore focus to
	// wherever the user was (e.g. the Nav search button) for keyboard/SR users.
	$: if (open !== wasOpen) {
		if (open) {
			prevFocus = typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
			q = '';
			active = 0;
			loadIndex();
			tick().then(() => inputEl?.focus());
		} else {
			prevFocus?.focus?.();
		}
		wasOpen = open;
	}

	function nav(path: string) {
		lgoto(path);
	}

	function copyEmail() {
		try {
			navigator.clipboard?.writeText(SITE.email);
			showToast(get(t)('toast.email'), { tone: 'success' });
		} catch {
			showToast(get(t)('toast.copyfail'), { tone: 'error' });
		}
	}

	$: items = computeItems(q, posts, works, $t, searchIndex, $lang);

	function computeItems(
		query: string,
		postsM: PostMeta[],
		worksM: WorkMeta[],
		tt: (k: string) => string,
		idx: Record<string, IndexEntry>,
		lng: string
	): Item[] {
		const GO = tt('cmd.group.go');
		const PROJ = tt('cmd.group.projects');
		const WRITING = tt('cmd.group.writing');
		const ACTIONS = tt('cmd.group.actions');

		// Carry the query so the destination scrolls to / highlights the match.
		const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
		// No hint here: the "G H"-style chords only work with the palette closed,
		// so showing them next to entries was misleading.
		const page = (label: string, path: string): Item => {
			const entry = idx[`${lng}:${path}`];
			return {
				group: GO,
				glyph: '→',
				label,
				hint: '',
				run: () => nav(`${path}${qs}`),
				search: entry?.text,
				searchLow: entry?.low
			};
		};
		const pages: Item[] = [
			page(tt('cmd.go.home'), '/'),
			page(tt('cmd.go.work'), '/work/'),
			page(tt('cmd.go.blog'), '/blog/'),
			page(tt('cmd.go.services'), '/services/'),
			page(tt('cmd.go.about'), '/about/'),
			page(tt('cmd.go.resume'), '/resume/'),
			page(tt('cmd.go.contact'), '/contact/'),
			page(tt('cmd.go.uses'), '/uses/'),
			page(tt('cmd.go.now'), '/now/'),
			page(tt('cmd.go.404'), '/404/')
		];
		const projects: Item[] = worksM.map((w) => {
			const entry = idx[`${lng}:/work/${w.slug}/`];
			return {
				group: PROJ,
				glyph: '◆',
				label: w.title,
				hint: w.year,
				run: () => nav(`/work/${w.slug}/${qs}`),
				search: entry?.text,
				searchLow: entry?.low
			};
		});
		const postItems: Item[] = postsM.map((p) => {
			const entry = idx[`${lng}:/blog/${p.slug}/`];
			return {
				group: WRITING,
				glyph: '✎',
				label: p.title,
				hint: p.date,
				run: () => nav(`/blog/${p.slug}/${qs}`),
				search: entry?.text,
				searchLow: entry?.low
			};
		});
		const actions: Item[] = [
			{ group: ACTIONS, glyph: '○', label: tt('cmd.action.theme'), hint: '⌘ J', run: cycleTheme },
			{ group: ACTIONS, glyph: '○', label: tt('cmd.action.email'), hint: '⌘ E', run: copyEmail }
		];
		const all = [...pages, ...projects, ...postItems, ...actions];
		if (!query.trim()) return all;
		const needle = query.trim().toLowerCase();

		const scored: { item: Item; score: number }[] = [];
		for (const x of all) {
			const label = x.label.toLowerCase();
			const labelMatch = label.includes(needle);
			const bodyMatch = !!x.searchLow && x.searchLow.includes(needle);
			const groupMatch = x.group.toLowerCase().includes(needle);
			if (!labelMatch && !bodyMatch && !groupMatch) continue;

			const score = label.startsWith(needle) ? 3 : labelMatch ? 2 : bodyMatch ? 1 : 0;
			scored.push({
				score,
				item: {
					...x,
					labelSegs: toSegs(x.label, needle),
					// Show context only when the title doesn't already explain the match.
					snippet: bodyMatch && !labelMatch ? toSnippet(x.search ?? '', needle) : undefined
				}
			});
		}
		// Most relevant first; stable within equal scores (preserves group order).
		scored.sort((a, b) => b.score - a.score);
		return scored.map((s) => s.item);
	}

	let listEl: HTMLElement;

	// Keep the active row visible as you arrow through a long, scrolling list.
	function scrollActiveIntoView() {
		tick().then(() => {
			listEl?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({
				block: 'nearest'
			});
		});
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Tab') {
			// Trap focus inside the panel.
			const f = panelEl?.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			if (f && f.length) {
				const first = f[0];
				const last = f[f.length - 1];
				const activeEl = document.activeElement;
				if (e.shiftKey && activeEl === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && activeEl === last) {
					e.preventDefault();
					first.focus();
				}
			}
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(active + 1, items.length - 1);
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(active - 1, 0);
			scrollActiveIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			items[active]?.run();
			onClose();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function buildGroups(list: Item[]) {
		const grouped: Record<string, (Item & { _idx: number })[]> = {};
		list.forEach((it, i) => {
			(grouped[it.group] ??= []).push({ ...it, _idx: i });
		});
		return Object.entries(grouped);
	}

	// While searching, show one flat ranked list (so arrow-keys follow the visual
	// order and the best match is on top); when idle, show grouped shortcuts.
	$: groups = q.trim()
		? [['', items.map((it, i) => ({ ...it, _idx: i }))] as [string, (Item & { _idx: number })[]]]
		: buildGroups(items);
</script>

{#if open}
	<div
		class="cmd-overlay"
		on:click={onClose}
		on:keydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="cmd-panel" on:click|stopPropagation role="none" bind:this={panelEl}>
			<input
				bind:this={inputEl}
				class="cmd-input"
				placeholder={$t('cmd.placeholder')}
				bind:value={q}
				on:input={() => (active = 0)}
			/>
			<div class="cmd-list" bind:this={listEl}>
				{#if groups.length === 0}
					<div
						style="padding: 22px; font-family: var(--font-mono); color: var(--muted); font-size: 13px;"
					>
						{$t('cmd.empty')} "{q}". {$t('cmd.empty.hint')}
					</div>
				{:else}
					{#each groups as [group, list] (group)}
						<div>
							{#if group}<div class="cmd-group-title">{group}</div>{/if}
							{#each list as it (it.label)}
								<div
									class="cmd-item"
									data-idx={it._idx}
									class:is-active={it._idx === active}
									on:mouseenter={() => (active = it._idx)}
									on:click={() => {
										it.run();
										onClose();
									}}
									role="button"
									tabindex="0"
									on:keydown={(e) => {
										if (e.key === 'Enter') {
											it.run();
											onClose();
										}
									}}
								>
									<span class="glyph">{it.glyph}</span>
									<span class="cmd-main">
										<span class="cmd-label">
											{#if it.labelSegs}{#each it.labelSegs as s}{#if s.hit}<mark>{s.t}</mark
														>{:else}{s.t}{/if}{/each}{:else}{it.label}{/if}
										</span>
										{#if it.snippet && it.snippet.length}
											<span class="cmd-snippet"
												>{#each it.snippet as s}{#if s.hit}<mark>{s.t}</mark
														>{:else}{s.t}{/if}{/each}</span
											>
										{/if}
									</span>
									{#if it.hint}<span class="hint">{it.hint}</span>{/if}
								</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
			<div class="cmd-footer">
				<span
					><kbd>↑</kbd><kbd>↓</kbd>
					{$t('cmd.foot.nav')} · <kbd>↵</kbd>
					{$t('cmd.foot.select')} ·
					<kbd>esc</kbd>
					{$t('cmd.foot.close')}</span
				>
				<span>nexenne · {SITE.revision}</span>
			</div>
		</div>
	</div>
{/if}
