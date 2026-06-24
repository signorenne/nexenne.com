<script lang="ts">
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';

	const items = ['tw', 'wk', 'ev', 'rd', 'os'] as const;
</script>

<div class="page-anim">
	<header class="page-title">
		<div><span class="meta">{$t('now.meta')}</span></div>
		<div>
			<h1 class="display">{$t('now.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{$t('now.lede')}</p>
		</div>
	</header>

	<section class="section">
		<div class="timeline">
			{#each items as id (id)}
				<div class="item">
					<div class="time">{$t(`now.${id}.t`)}</div>
					<div class="body">
						<h4>{$t(`now.${id}.h`)}</h4>
						<p>{$t(`now.${id}.b`)}</p>
					</div>
				</div>
			{/each}
		</div>
		<p
			style="margin-top: var(--sp-5); font-family: var(--font-mono); font-size: 12px; color: var(--muted);"
		>
			{$t('now.updated')} <span style="color: var(--ink-2);">{SITE.updated}</span> · Bergamo
		</p>
	</section>
</div>
