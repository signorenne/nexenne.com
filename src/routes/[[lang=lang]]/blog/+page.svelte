<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { lhref, lgoto } from '$lib/paths';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ posts } = data);

	$: localized = posts.map((b) => b.source);

	let q = '';
	let activeTag: string | null = null;

	onMount(() => {
		const params = new URL(window.location.href).searchParams;
		const t = params.get('tag');
		activeTag = t && t.trim() ? t : null;
	});

	$: tagCounts = (() => {
		const m = new Map<string, number>();
		for (const p of localized) for (const tag of p.tags) m.set(tag, (m.get(tag) ?? 0) + 1);
		return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	})();

	$: filtered = localized.filter((p) => {
		if (activeTag && !p.tags.includes(activeTag)) return false;
		if (!q.trim()) return true;
		const needle = q.toLowerCase();
		return (
			p.title.toLowerCase().includes(needle) ||
			p.desc.toLowerCase().includes(needle) ||
			p.tags.some((tg) => tg.toLowerCase().includes(needle))
		);
	});

	function go(path: string) {
		lgoto(path);
	}

	function setTag(tag: string | null, e?: Event) {
		e?.preventDefault?.();
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
		<div><span class="meta">{$t('blog.meta')}</span></div>
		<div>
			<h1 class="display">{$t('blog.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{@html $t('blog.lede.html')}</p>
		</div>
	</header>

	<section class="section" style="padding-top: var(--sp-6);">
		<div class="row" style="margin-bottom: var(--sp-5); justify-content: space-between;">
			<span class="eyebrow"
				><span class="dot"></span>{filtered.length}/{localized.length}
				{$t('blog.entries')} · {localized.at(-1)?.date.slice(0, 4) ??
					'2025'}-{localized[0]?.date.slice(0, 4) ?? '2026'}</span
			>
			<a
				href={$lhref('/feed.xml')}
				target="_blank"
				rel="noopener"
				class="mono"
				style="font-size: 12px; color: var(--accent);"
				data-hover>{$t('blog.rss')} ↗</a
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

		<div>
			{#each filtered as p (p.slug)}
				<div
					class="post-row"
					class:has-cover={!!p.image}
					data-hover
					on:click={() => go(`/blog/${p.slug}/`)}
					on:keydown={(e) => e.key === 'Enter' && go(`/blog/${p.slug}/`)}
					role="button"
					tabindex="0"
				>
					<span class="date">{p.date}</span>
					<div>
						<div class="title">{p.title}</div>
						<p class="desc" style="margin-top: 6px;">{p.desc}</p>
						<div class="row" style="gap: 6px; margin-top: 10px; flex-wrap: wrap;">
							{#each p.tags as tag (tag)}
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
					{#if p.image}
						<div class="post-thumb">
							<img src="{base}{p.image}" alt="" aria-hidden="true" loading="lazy" />
						</div>
					{:else}
						<div></div>
					{/if}
					<span class="read">{p.read}</span>
				</div>
			{:else}
				<div class="bf-empty">
					<p>{$t('blog.filter.empty')}</p>
					<button type="button" class="btn" on:click={clearAll} data-hover
						>{$t('blog.filter.reset')}</button
					>
				</div>
			{/each}
		</div>
	</section>
</div>
