<script lang="ts">
	import { lgoto } from '$lib/paths';
	import { t } from '$lib/i18n';
	import LogoMark from '$lib/components/LogoMark.svelte';

	function go(path: string) {
		lgoto(path);
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-anim notfound">
	<span class="eyebrow"><span class="dot"></span>{$t('404.eyebrow')}</span>
	<div class="big">404</div>
	<h2 class="display" style="max-width: 24ch; text-align: center;">{$t('404.title')}</h2>
	<p class="lede" style="text-align: center;">
		{$t('404.body')}
		(<span class="kbd">⌘</span> + <span class="kbd">K</span>)
	</p>
	<div class="row" style="margin-top: 8px;">
		<button class="btn btn--primary" on:click={() => go('/')} data-hover>{$t('404.home')}</button>
		<button class="btn" on:click={() => go('/work/')} data-hover>{$t('404.browse')}</button>
	</div>
	<div class="notfound-orb">
		<span class="core-halo" aria-hidden="true"></span>
		<div class="loading-cube" style="--cube-size: 110px" aria-hidden="true">
			<span><LogoMark /></span><span><LogoMark /></span><span><LogoMark /></span><span
				><LogoMark /></span
			><span><LogoMark /></span><span><LogoMark /></span>
		</div>
		<span class="core-orb-mark">404</span>
		<span class="core-orb-dots" aria-hidden="true">
			<span></span><span></span><span></span>
		</span>
	</div>
</div>
