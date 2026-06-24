<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import { lgoto } from '$lib/paths';
	import { lang, t } from '$lib/i18n';
	import { marqueeOverflow } from '$lib/actions/marqueeOverflow';
	import type { ContentLang } from '$lib/content/types';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ works } = data);

	$: localized = works.map((b) => b.byLang[$lang as ContentLang] ?? b.source);

	let q = '';
	let activeTag: string | null = null;

	onMount(() => {
		const params = new URL(window.location.href).searchParams;
		const t = params.get('tag');
		activeTag = t && t.trim() ? t : null;
	});

	$: tagCounts = (() => {
		const m = new Map<string, number>();
		for (const w of localized) for (const tag of w.tags) m.set(tag, (m.get(tag) ?? 0) + 1);
		return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	})();

	$: filtered = localized.filter((w) => {
		if (activeTag && !w.tags.includes(activeTag)) return false;
		if (!q.trim()) return true;
		const needle = q.toLowerCase();
		return (
			w.title.toLowerCase().includes(needle) ||
			w.summary.toLowerCase().includes(needle) ||
			w.client.toLowerCase().includes(needle) ||
			w.role.toLowerCase().includes(needle) ||
			w.tags.some((tg) => tg.toLowerCase().includes(needle))
		);
	});

	function go(path: string) {
		lgoto(path);
	}

	function setTag(tag: string | null) {
		activeTag = tag;
		const url = new URL(window.location.href);
		if (tag) url.searchParams.set('tag', tag);
		else url.searchParams.delete('tag');
		replaceState(url, {});
	}

	function clearAll() {
		q = '';
		setTag(null);
	}
</script>

<div class="page-anim blog-index">
	<header class="page-title">
		<div><span class="meta">{$t('work.meta')}</span></div>
		<div>
			<h1 class="display">{$t('work.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{$t('work.lede')}</p>
		</div>
	</header>

	<section class="section" style="padding-top: var(--sp-6);">
		<div class="row" style="margin-bottom: var(--sp-5); justify-content: space-between;">
			<span class="eyebrow"
				><span class="dot"></span>{filtered.length}/{localized.length}
				{filtered.length === 1 ? $t('work.project') : $t('work.projects')}</span
			>
		</div>

		<div class="blog-filter">
			<div class="bf-search">
				<span class="bf-search-icon" aria-hidden="true">⌕</span>
				<input
					type="search"
					bind:value={q}
					placeholder={$t('blog.search.placeholder')}
					aria-label={$t('blog.search.placeholder')}
				/>
				{#if q || activeTag}
					<button
						type="button"
						class="bf-clear"
						on:click={clearAll}
						aria-label={$t('blog.filter.reset')}
						data-hover>×</button
					>
				{/if}
			</div>
			<div class="bf-tags">
				<button
					type="button"
					class="bf-tag"
					class:is-active={activeTag === null}
					on:click={() => setTag(null)}
					data-hover
					>{$t('blog.filter.all')} <span class="bf-count">{localized.length}</span></button
				>
				{#each tagCounts as [tag, count] (tag)}
					<button
						type="button"
						class="bf-tag"
						class:is-active={activeTag === tag}
						on:click={() => setTag(tag)}
						data-hover>{tag} <span class="bf-count">{count}</span></button
					>
				{/each}
			</div>
		</div>

		<div class="bento">
			{#each filtered as w, i (w.slug)}
				<div
					class="bento-item b-{(i % 7) + 1}"
					on:click={() => go(`/work/${w.slug}/`)}
					on:keydown={(e) => e.key === 'Enter' && go(`/work/${w.slug}/`)}
					role="button"
					tabindex="0"
					data-hover
				>
					<div>
						<div class="meta" use:marqueeOverflow>
							<div class="meta-track">
								<span>{String(i + 1).padStart(2, '0')}</span>
								<span>·</span>
								<span>{w.year}</span>
								<span>·</span>
								<span>{w.client}</span>
							</div>
						</div>
						<h3 style="margin-top: 10px;">{w.title}</h3>
						<div class="summary" use:marqueeOverflow={{ axis: 'y' }}>
							<p class="marquee-track-y">{w.summary}</p>
						</div>
					</div>
					<div class="tags">
						{#each w.tags.slice(0, 3) as tag (tag)}
							<button
								type="button"
								class="chip chip--clickable"
								class:is-active={activeTag === tag}
								on:click|stopPropagation={() => setTag(tag)}
								data-hover>{tag}</button
							>
						{/each}
					</div>
				</div>
			{:else}
				<div class="bf-empty" style="grid-column: 1 / -1;">
					<p>{$t('blog.filter.empty')}</p>
					<button type="button" class="btn" on:click={clearAll} data-hover
						>{$t('blog.filter.reset')}</button
					>
				</div>
			{/each}
		</div>
	</section>
</div>
