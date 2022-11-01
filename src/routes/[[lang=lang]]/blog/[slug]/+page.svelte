<script lang="ts">
	import { base } from '$app/paths';
	import { t } from '$lib/i18n';
	import { lpath, lgoto } from '$lib/paths';
	import { proseEnhance } from '$lib/actions/proseEnhance';
	import ArticleNav from '$lib/components/ArticleNav.svelte';
	import TranslatedBanner from '$lib/components/TranslatedBanner.svelte';
	import type { ContentLang } from '$lib/content/types';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ bundle, next } = data);
	$: lang = data.lang as ContentLang;

	$: current = bundle.byLang[lang] ?? bundle.source;
	$: nextMeta = next.byLang[lang] ?? next.byLang[next.sourceLang];
	$: related = data.related.map((r) => {
		const m = r.byLang[lang] ?? r.byLang[r.sourceLang];
		return { slug: r.slug, title: m?.title ?? '', date: m?.date ?? '' };
	});

	function go(path: string) {
		lgoto(path);
	}
</script>

<div class="page-anim">
	<header class="page-title" style="border-bottom: 0;">
		<div><span class="meta">/blog/{current.slug}</span></div>
		<div>
			<span class="eyebrow">
				<span class="dot"></span>{current.date} · {current.read}
				{#if current.categories.length}
					· {current.categories.join(' · ')}
				{/if}
				{#if current.tags.length}
					· {$t('post.tags')} · {current.tags.join(' · ')}
				{/if}
			</span>
			<h1
				class="display"
				style="margin-top: 14px; font-size: clamp(2rem, 4.8vw, 4rem); max-width: 26ch;"
			>
				{current.title}
			</h1>
		</div>
	</header>

	{#if current.image}
		<figure class="post-cover" style="margin: var(--sp-6) auto 0; max-width: min(100%, 1080px);">
			<img src="{base}{current.image}" alt="" aria-hidden="true" loading="lazy" />
		</figure>
	{/if}

	<section class="section post-body" style="padding-top: var(--sp-6);">
		<ArticleNav items={current.toc} title={current.title} />
		<div class="prose" use:proseEnhance={current.html}>
			{#if current.autoTranslated && current.translatedFrom}
				<TranslatedBanner originalLang={current.translatedFrom} />
			{/if}

			{@html current.html}

			<div class="divider"></div>
			{#if current.tags.length}
				<nav class="post-tags" aria-label={$t('post.tags')}>
					{#each current.tags as tag (tag)}
						<a class="chip" href={lpath(`/blog/?tag=${encodeURIComponent(tag)}`, lang)} data-hover
							>#{tag}</a
						>
					{/each}
				</nav>
			{/if}
			<p
				style="font-size: 13px; color: var(--muted); font-family: var(--font-mono); margin-top: 16px;"
			>
				{$t('post.updated')}
				{current.date}.
				<br />{$t('post.path')}
				<span class="mono">content/blog/{current.slug}</span>.
			</p>
		</div>
	</section>

	{#if related.length}
		<section class="section" style="padding-top: 0;">
			<h2 class="related-h">{$t('post.related')}</h2>
			<div class="related-grid">
				{#each related as r (r.slug)}
					<a class="uses-box uses-box--link" href={lpath(`/blog/${r.slug}/`, lang)} data-hover>
						<div class="mono muted" style="font-size: 11px; margin-bottom: 4px;">{r.date}</div>
						<div style="font-family: var(--font-display); letter-spacing: -0.02em;">{r.title}</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<section class="section" style="padding-top: 0;">
		<div class="post-foot-grid">
			<div class="uses-box">
				<h3>{$t('post.author')}</h3>
				<p style="font-size: 13px; color: var(--ink-2);">{$t('post.author.body')}</p>
				<div class="row" style="margin-top: 12px;">
					<button class="btn" on:click={() => go('/about/')} data-hover
						>{$t('post.author.about')}</button
					>
					<button class="btn btn--ghost" on:click={() => go('/contact/')} data-hover
						>{$t('post.author.contact')}</button
					>
				</div>
			</div>
			<a class="uses-box uses-box--link" href={lpath(`/blog/${next.slug}/`, lang)} data-hover>
				<h3>{$t('post.next')}</h3>
				<div class="mono muted" style="font-size: 11px; margin-bottom: 4px;">{nextMeta?.date}</div>
				<div
					style="font-family: var(--font-display); font-size: var(--fs-lg); letter-spacing: -0.02em;"
				>
					{nextMeta?.title}
				</div>
				<p style="font-size: 13px; color: var(--ink-2); margin-top: 8px;">{nextMeta?.desc}</p>
			</a>
		</div>
	</section>
</div>
