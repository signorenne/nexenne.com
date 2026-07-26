<script lang="ts">
	import { base } from '$app/paths';
	import { lang, t } from '$lib/i18n';
	import { lhref } from '$lib/paths';
	import { proseEnhance } from '$lib/actions/proseEnhance';
	import ArticleNav from '$lib/components/ArticleNav.svelte';
	import TranslatedBanner from '$lib/components/TranslatedBanner.svelte';
	import type { ContentLang } from '$lib/content/types';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ bundle, next } = data);

	$: current = bundle.byLang[$lang as ContentLang] ?? bundle.source;
	$: nextMeta = next.byLang[$lang as ContentLang] ?? next.byLang[next.sourceLang];
	$: related = data.related.map((r) => {
		const m = r.byLang[$lang as ContentLang] ?? r.byLang[r.sourceLang];
		return { slug: r.slug, title: m?.title ?? '', client: m?.client ?? '' };
	});
</script>

<div class="page-anim">
	<header class="page-title" style="border-bottom: 0; padding-bottom: 0;">
		<div><span class="meta">/work/{current.slug}</span></div>
		<div>
			<span class="eyebrow"
				><span class="dot"></span>{current.year} · {current.client} · {current.role}</span
			>
			<h1 class="display" style="margin-top: 14px;">{current.title}</h1>
			<p class="lede" style="margin-top: 16px;">{current.summary}</p>
		</div>
	</header>

	<section class="section" style="padding-top: var(--sp-6);">
		<figure
			class="case-cover accent-{current.color}"
			class:is-contain={current.coverFit === 'contain'}
		>
			{#if current.cover}
				<img src="{base}{current.cover}" alt="" aria-hidden="true" />
			{/if}
			<figcaption class="cc-readout" aria-hidden="true">
				<span><span class="k">CASE</span><span class="v">/{current.slug}</span></span>
				<span><span class="k">YEAR</span><span class="v">{current.year}</span></span>
				<span><span class="k">CLIENT</span><span class="v">{current.client}</span></span>
				<span><span class="k">ROLE</span><span class="v">{current.role}</span></span>
			</figcaption>
		</figure>

		<div class="case-body" style="margin-top: var(--sp-6);">
			<ArticleNav items={current.toc} title={current.title} />
			<div class="case-body-grid">
				<div class="prose" style="margin: 0;" use:proseEnhance={current.html}>
					{#if current.autoTranslated && current.translatedFrom}
						<TranslatedBanner originalLang={current.translatedFrom} />
					{/if}
					{@html current.html}
				</div>

				<aside class="col" style="gap: 16px;">
					<div class="uses-box">
						<h3>{$t('case.facts')}</h3>
						<ul style="list-style: none; padding: 0;">
							<li><span class="k">{$t('case.facts.client')}</span> · {current.client}</li>
							<li><span class="k">{$t('case.facts.role')}</span> · {current.role}</li>
							<li><span class="k">{$t('case.facts.year')}</span> · {current.year}</li>
							{#each current.metrics as m (m.k)}
								<li><span class="k">{m.k}</span> · {m.v}</li>
							{/each}
						</ul>
					</div>
					<div class="uses-box">
						<h3>{$t('case.stack')}</h3>
						<div class="row" style="gap: 6px; flex-wrap: wrap;">
							{#each current.tags as tag (tag)}
								<a class="chip" href={$lhref(`/work/?tag=${encodeURIComponent(tag)}`)} data-hover
									>{tag}</a
								>
							{/each}
						</div>
					</div>
				</aside>
			</div>
		</div>
	</section>

	<section class="section" style="padding-top: var(--sp-6);">
		<div class="case-next">
			<a class="case-next-link" href={$lhref(`/work/${next.slug}/`)} data-hover>
				<span class="eyebrow"><span class="dot"></span>{$t('case.next')}</span>
				<h3 style="margin-top: 8px;">{nextMeta?.title}</h3>
				<p style="color: var(--ink-2); font-size: 13px; margin-top: 4px;">
					{nextMeta?.client} · {nextMeta?.year}
				</p>
			</a>
			<div class="row">
				<a class="btn btn--ghost" href={$lhref('/work/')} data-hover>{$t('case.all')}</a>
				<a class="btn btn--primary" href={$lhref(`/work/${next.slug}/`)} data-hover
					>{$t('case.read')} {nextMeta?.title} <span class="arrow">↗</span></a
				>
			</div>
		</div>
	</section>

	{#if related.length}
		<section class="section" style="padding-top: 0;">
			<h2 class="related-h">{$t('case.related')}</h2>
			<div class="related-grid">
				{#each related as r (r.slug)}
					<a class="uses-box uses-box--link" href={$lhref(`/work/${r.slug}/`)} data-hover>
						<div class="mono muted" style="font-size: 11px; margin-bottom: 4px;">{r.client}</div>
						<div style="font-family: var(--font-display); letter-spacing: -0.02em;">{r.title}</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
