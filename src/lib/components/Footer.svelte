<script lang="ts">
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';
	import { lhref, lgoto, lpath } from '$lib/paths';
	import LogoMark from './LogoMark.svelte';

	const year = new Date().getFullYear();

	function go(path: string) {
		lgoto(path);
	}
</script>

<footer class="foot">
	<div class="foot-inner">
		<div>
			<div class="brand" style="margin-bottom: 14px;">
				<div class="brand-mark"><LogoMark /></div>
				<span>Nicolò Plebani</span>
			</div>
			<p
				class="muted"
				style="max-width: 38ch; font-size: 13px; font-family: var(--font-mono); line-height: 1.6;"
			>
				{$t('footer.bio')}
			</p>
			<div style="margin-top: 16px;" class="row">
				<a class="chip" href={`mailto:${SITE.email}`} data-hover>{SITE.email}</a>
				<span class="chip">{$t('footer.location')}</span>
			</div>
		</div>
		<div class="foot-cols">
			<div>
				<h4>{$t('footer.sitemap')}</h4>
				<a href={$lhref('/')} on:click|preventDefault={() => go('/')} data-hover
					>{$t('sidemap.home')}</a
				>
				<a href={$lhref('/work/')} on:click|preventDefault={() => go('/work/')} data-hover
					>{$t('sidemap.work')}</a
				>
				<a href={$lhref('/services/')} on:click|preventDefault={() => go('/services/')} data-hover
					>{$t('sidemap.services')}</a
				>
				<a href={$lhref('/about/')} on:click|preventDefault={() => go('/about/')} data-hover
					>{$t('sidemap.about')}</a
				>
				<a href={$lhref('/resume/')} on:click|preventDefault={() => go('/resume/')} data-hover
					>{$t('sidemap.resume')}</a
				>
				<a href={$lhref('/blog/')} on:click|preventDefault={() => go('/blog/')} data-hover
					>{$t('footer.l.writing')}</a
				>
				<a href={$lhref('/contact/')} on:click|preventDefault={() => go('/contact/')} data-hover
					>{$t('sidemap.contact')}</a
				>
			</div>
			<div>
				<h4>{$t('footer.pages')}</h4>
				<a href={$lhref('/now/')} on:click|preventDefault={() => go('/now/')} data-hover>/now</a>
				<a href={$lhref('/uses/')} on:click|preventDefault={() => go('/uses/')} data-hover>/uses</a>
				<a href={$lhref('/card/')} on:click|preventDefault={() => go('/card/')} data-hover>/card</a>
				<!-- href stays the real /404/ route (so the prerender crawler and no-JS
				     users get a valid page); the click navigates language-aware, so on
				     Italian it goes to /it/404/ and renders the localized error page. -->
				<a href={lpath('/404/', 'en')} on:click|preventDefault={() => go('/404/')} data-hover
					>/404</a
				>
				<a href={$lhref('/feed.xml')} target="_blank" rel="noopener" data-hover>RSS · /feed.xml ↗</a
				>
				<a href={$lhref('/colophon/')} on:click|preventDefault={() => go('/colophon/')} data-hover
					>{$t('footer.colophon')}</a
				>
			</div>
		</div>
		<div>
			<h4>{$t('footer.channels')}</h4>
			{#each SITE.socials as s}
				<a href={s.href} data-hover
					>{s.label} · <span style="color: var(--muted);">{s.handle}</span></a
				>
			{/each}
		</div>
	</div>
	<div class="foot-bottom">
		<span>{$t('footer.copy').replace('{year}', String(year))}</span>
		<span
			>{SITE.revision}{#if SITE.commit}
				· {SITE.commit}{/if} · {$t('footer.updated')}
			{SITE.updated}</span
		>
	</div>
</footer>
