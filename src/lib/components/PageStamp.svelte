<script lang="ts">
	import { SIDEMAP_ROUTES, SITE } from '$lib/data';
	import { t } from '$lib/i18n';

	export let route: string;
	export let slug: string | null = null;

	$: r = SIDEMAP_ROUTES.find((x) => x.id === route) ?? SIDEMAP_ROUTES[0];
	$: label = $t(r.labelKey).toUpperCase();
</script>

<div class="page-stamp" aria-hidden="true">
	<span class="ps-row"><span class="ps-k">FRAME</span><span class="ps-v">{r.hex}</span></span>
	<span class="ps-row"
		><span class="ps-k">ROUTE</span><span class="ps-v"
			>{route === 'home' ? '/' : `/${route}${slug ? `/${slug}` : ''}`}</span
		></span
	>
	<span class="ps-row"><span class="ps-k">PAGE</span><span class="ps-v">{label}</span></span>
	<span class="ps-row"><span class="ps-k">REV</span><span class="ps-v">{SITE.revision}</span></span>
</div>
