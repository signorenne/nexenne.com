<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { DICT, suggestLang, type Lang } from '$lib/i18n';
	import { lpath, stripLang, langFromParam } from '$lib/paths';

	// Set once the user acts (switch or dismiss), or whenever they use the
	// language toggle (see switchLanguage), so we never nag twice.
	const STORAGE_KEY = 'nexenne.langPrompt';

	let suggested: Lang | null = null;

	// Render the prompt in the language we're suggesting, so a reader who can't
	// read the current page can still understand it.
	$: text = suggested ? DICT[suggested] : null;

	onMount(() => {
		try {
			if (localStorage.getItem(STORAGE_KEY)) return;
		} catch {
			// localStorage blocked (private mode), so just skip the prompt.
			return;
		}
		const current = langFromParam($page.params.lang);
		const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
		suggested = suggestLang(current, tags);
	});

	function remember() {
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// ignore
		}
	}

	function accept() {
		if (!suggested) return;
		remember();
		const target = lpath(stripLang($page.url.pathname), suggested);
		suggested = null;
		goto(target);
	}

	function dismiss() {
		remember();
		suggested = null;
	}
</script>

{#if suggested && text}
	<aside
		class="langsuggest"
		aria-live="polite"
		aria-label={text['langsuggest.body']}
		lang={suggested}
	>
		<span class="langsuggest-flag">
			<span class="dot" aria-hidden="true"></span>{text['langsuggest.flag']}
		</span>
		<span class="langsuggest-body">{text['langsuggest.body']}</span>
		<button type="button" class="langsuggest-cta" on:click={accept} data-hover>
			{text['langsuggest.cta']} <span aria-hidden="true">→</span>
		</button>
		<button
			type="button"
			class="langsuggest-x"
			on:click={dismiss}
			data-hover
			aria-label={text['langsuggest.dismiss']}
		>
			×
		</button>
	</aside>
{/if}

<style>
	.langsuggest {
		position: fixed;
		left: 50%;
		bottom: 18px;
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		max-width: min(92vw, 540px);
		padding: 10px 12px 10px 14px;
		border: 1px solid var(--line);
		border-left: 3px solid var(--accent);
		background: color-mix(in oklab, var(--bg, #0a0b0f) 88%, transparent);
		backdrop-filter: blur(8px);
		border-radius: 3px;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--ink-2);
		animation: langsuggest-in 0.28s ease both;
	}

	@keyframes langsuggest-in {
		from {
			opacity: 0;
			transform: translate(-50%, 12px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	.langsuggest-flag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.langsuggest-flag .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		display: inline-block;
	}

	.langsuggest-body {
		flex: 1 1 12ch;
		min-width: 12ch;
		font-family: var(--font-sans, inherit);
		font-size: 13px;
		color: var(--ink);
	}

	.langsuggest-cta {
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

	.langsuggest-cta:hover {
		color: var(--accent);
		border-color: var(--accent);
		transform: translateX(2px);
	}

	.langsuggest-x {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 18px;
		line-height: 1;
		padding: 0 4px;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.langsuggest-x:hover {
		color: var(--ink);
	}

	:global(.motion-off) .langsuggest {
		animation: none;
	}
</style>
