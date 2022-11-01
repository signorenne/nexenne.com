<script lang="ts">
	import { lgoto } from '$lib/paths';
	import Hero from '$lib/components/Hero.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import { SITE } from '$lib/data';
	import { lang, t } from '$lib/i18n';
	import { marqueeOverflow } from '$lib/actions/marqueeOverflow';
	import type { ContentLang } from '$lib/content/types';
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ posts, works, worksTotal, postsTotal } = data);

	$: sourcePosts = posts.map((b) => b.source);
	$: localizedWorks = works.map((b) => b.byLang[$lang as ContentLang] ?? b.source);

	function go(path: string) {
		lgoto(path);
	}
</script>

<div class="page-anim">
	<Hero />

	<Marquee items={$t('home.marquee.items').split('|')} />

	<section class="section" style="padding-top: var(--sp-7); padding-bottom: var(--sp-7);">
		<div class="stats">
			<div class="stat">
				<div class="v">5<span class="unit">{$t('home.stats.year.unit')}</span></div>
				<div class="k">{$t('home.stats.year.k')}</div>
			</div>
			<div class="stat">
				<div class="v">{worksTotal}</div>
				<div class="k">{$t('home.stats.projects.k')}</div>
			</div>
			<div class="stat">
				<div class="v">{postsTotal}</div>
				<div class="k">{$t('home.stats.writings.k')}</div>
			</div>
			<div class="stat">
				<div class="v">1<span class="unit">{$t('home.stats.award.unit')}</span></div>
				<div class="k">{$t('home.stats.award.k')}</div>
			</div>
		</div>
	</section>

	<section class="section">
		<div class="section-head">
			<div>
				<span class="eyebrow"><span class="dot"></span>{$t('home.work.eyebrow')}</span>
				<h2 style="margin-top: 8px;">{$t('home.work.title')}</h2>
			</div>
			<button class="btn btn--ghost" on:click={() => go('/work/')} data-hover>
				{$t('home.work.all')} <span class="arrow">↗</span>
			</button>
		</div>

		<div class="bento">
			{#each localizedWorks as w, i (w.slug)}
				<div
					class="bento-item b-{i + 1}"
					on:click={() => go(`/work/${w.slug}/`)}
					on:keydown={(e) => e.key === 'Enter' && go(`/work/${w.slug}/`)}
					role="button"
					tabindex="0"
					data-hover
				>
					<div>
						<div class="meta" use:marqueeOverflow>
							<div class="meta-track">
								<span>{String(i + 1).padStart(2, '0')} / {String(worksTotal).padStart(2, '0')}</span
								>
								<span>·</span>
								<span>{w.year}</span>
								<span>·</span>
								<span>{w.client}</span>
							</div>
						</div>
						<h3 style="margin-top: 12px;">{w.title}</h3>
						<div class="summary" use:marqueeOverflow={{ axis: 'y' }}>
							<p class="marquee-track-y">{w.summary}</p>
						</div>
					</div>
					<div class="tags">
						{#each w.tags.slice(0, 3) as t (t)}
							<span class="chip">{t}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<div class="section-head">
			<div>
				<span class="eyebrow"><span class="dot"></span>{$t('home.services.eyebrow')}</span>
				<h2 style="margin-top: 8px;">{$t('home.services.title')}</h2>
			</div>
			<button class="btn btn--ghost" on:click={() => go('/services/')} data-hover>
				{$t('home.services.details')} <span class="arrow">↗</span>
			</button>
		</div>
		<div class="svc-grid">
			{#each ['01', '02', '03', '04', '05'] as num (num)}
				<div
					class="svc"
					data-hover
					on:click={() => go('/services/')}
					on:keydown={(e) => e.key === 'Enter' && go('/services/')}
					role="button"
					tabindex="0"
				>
					<span class="num">{num}</span>
					<div>
						<h3>{$t(`services.${num}.title`)}</h3>
						<p>{$t(`services.${num}.body`)}</p>
					</div>
					<span class="price">{$t(`services.${num}.price`)}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<div class="section-head">
			<div>
				<span class="eyebrow"><span class="dot"></span>{$t('home.writing.eyebrow')}</span>
				<h2 style="margin-top: 8px;">{$t('home.writing.title')}</h2>
			</div>
			<button class="btn btn--ghost" on:click={() => go('/blog/')} data-hover>
				{$t('home.writing.archive')} <span class="arrow">↗</span>
			</button>
		</div>
		<div>
			{#each sourcePosts as p (p.slug)}
				<div
					class="post-row"
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
					</div>
					<div class="row" style="gap: 6px;">
						{#each p.tags.slice(0, 2) as t (t)}
							<span class="chip">{t}</span>
						{/each}
					</div>
					<span class="read">{p.read}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<div
			class="home-cta-grid"
			style="border: 1px solid var(--line); border-radius: var(--r-lg); padding: clamp(32px, 6vw, 72px); background: var(--bg-elev); display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--sp-6); align-items: center; position: relative; overflow: hidden;"
		>
			<div
				style="position: absolute; inset: 0; opacity: 0.4; background: radial-gradient(80% 60% at 100% 0, color-mix(in oklab, var(--accent), transparent 70%), transparent 70%); pointer-events: none;"
			></div>
			<div style="position: relative; min-width: 0;">
				<span class="eyebrow"><span class="dot"></span>{$t('home.cta.eyebrow')}</span>
				<h2
					class="display"
					style="margin-top: 14px; font-size: clamp(1.8rem, 3.4vw, 2.8rem); max-width: 24ch; text-wrap: balance;"
				>
					{$t('home.cta.title')}
				</h2>
			</div>
			<div class="col" style="position: relative; gap: var(--sp-4); min-width: 0;">
				<p class="lede" style="margin: 0;">{$t('home.cta.body')}</p>
				<div class="row" style="flex-wrap: wrap;">
					<button class="btn btn--primary" on:click={() => go('/contact/')} data-hover>
						{$t('home.cta.book')} <span class="arrow">↗</span>
					</button>
					<a class="btn" href={`mailto:${SITE.email}`} data-hover>{SITE.email}</a>
				</div>
			</div>
		</div>
	</section>
</div>
