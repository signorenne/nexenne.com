<script lang="ts">
	import { toasts, dismissToast, type Toast } from '$lib/stores/toast';
	import { t } from '$lib/i18n';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	const GLYPH: Record<Toast['tone'], string> = {
		default: '',
		success: '✓',
		error: '!'
	};

	function runAction(toast: Toast) {
		toast.action?.run();
		dismissToast(toast.id);
	}
</script>

<div class="toaster" aria-live="polite" aria-atomic="false">
	{#each $toasts as toast (toast.id)}
		<div
			class="toast tone-{toast.tone}"
			role="status"
			animate:flip={{ duration: 200 }}
			in:fly={{ y: 14, duration: 220 }}
			out:fly={{ y: 8, duration: 160 }}
		>
			<span class="toast-mark" aria-hidden="true">{GLYPH[toast.tone] || ''}</span>
			<span class="toast-msg">{toast.message}</span>
			{#if toast.action}
				<button type="button" class="toast-action" on:click={() => runAction(toast)} data-hover>
					{toast.action.label}
				</button>
			{/if}
			<button
				type="button"
				class="toast-x"
				on:click={() => dismissToast(toast.id)}
				aria-label={$t('langsuggest.dismiss')}
				data-hover
			>
				×
			</button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		left: 50%;
		bottom: 18px;
		transform: translateX(-50%);
		z-index: 70;
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		gap: 8px;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px 8px 13px;
		border: 1px solid var(--line);
		border-left: 3px solid var(--tone, var(--accent));
		background: color-mix(in oklab, var(--bg, #0a0a0f) 86%, transparent);
		backdrop-filter: blur(8px);
		border-radius: 3px;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.02em;
		color: var(--ink);
		max-width: min(92vw, 460px);
	}

	.tone-default {
		--tone: var(--accent);
	}
	.tone-success {
		--tone: var(--accent);
	}
	.tone-error {
		--tone: #e5484d;
	}

	.toast-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		flex: none;
		font-weight: 700;
		font-size: 11px;
		color: var(--tone);
		border: 1px solid var(--tone);
		border-radius: 50%;
	}
	/* Default tone has no glyph, so render a small filled dot instead. */
	.tone-default .toast-mark {
		border: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--tone);
	}

	.toast-msg {
		flex: 1 1 auto;
	}

	.toast-action {
		appearance: none;
		background: transparent;
		border: 1px solid var(--line);
		color: var(--ink);
		padding: 3px 9px;
		font: inherit;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		flex: none;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.toast-action:hover {
		color: var(--tone);
		border-color: var(--tone);
	}

	.toast-x {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 16px;
		line-height: 1;
		padding: 0 2px;
		cursor: pointer;
		flex: none;
		transition: color 0.15s ease;
	}
	.toast-x:hover {
		color: var(--ink);
	}

	:global(.motion-off) .toast {
		transition: none;
	}
</style>
