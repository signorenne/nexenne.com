<script lang="ts">
	import { t } from '$lib/i18n';
	import { switchLanguage } from '$lib/stores/pageFlash';
	import type { ContentLang } from '$lib/content/types';

	export let originalLang: ContentLang;

	$: originalName = $t(`autotr.lang.${originalLang}`);
</script>

<aside class="autotr" aria-label={$t('a11y.autotr')}>
	<span class="autotr-flag">
		<span class="dot" aria-hidden="true"></span>{$t('autotr.flag')}
	</span>
	<span class="autotr-body">
		{$t('autotr.body')} <strong>{originalName}</strong>.
	</span>
	<button type="button" class="autotr-cta" on:click={switchLanguage} data-hover>
		{$t('autotr.read')} <span aria-hidden="true">→</span>
	</button>
</aside>

<style>
	.autotr {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		padding: 10px 14px;
		margin: 0 0 var(--sp-5);
		border: 1px dashed var(--line);
		border-left: 3px solid var(--accent);
		background: color-mix(in oklab, var(--accent) 4%, transparent);
		border-radius: 2px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--ink-2);
	}

	.autotr-flag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.autotr-flag .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		display: inline-block;
	}

	.autotr-body {
		flex: 1 1 auto;
		min-width: 12ch;
		font-family: var(--font-sans, inherit);
		font-size: 13px;
	}

	.autotr-body strong {
		color: var(--ink);
		font-weight: 600;
	}

	.autotr-cta {
		appearance: none;
		background: transparent;
		border: 1px solid var(--line);
		color: var(--ink);
		padding: 5px 10px;
		font: inherit;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.autotr-cta:hover {
		color: var(--accent);
		border-color: var(--accent);
		transform: translateX(2px);
	}
</style>
