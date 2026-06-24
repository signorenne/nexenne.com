<script lang="ts">
	import { onMount } from 'svelte';
	import { tweaks, type Tweaks } from '$lib/tweaks';
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';

	let open = false;
	let panelEl: HTMLDivElement;

	const THEMES = [
		{ value: 'system' as const, labelKey: 'tweaks.theme.auto' },
		{ value: 'dark' as const, labelKey: 'tweaks.theme.dark' },
		{ value: 'light' as const, labelKey: 'tweaks.theme.light' }
	];

	const ACCENTS: { value: Tweaks['accent']; hex: string; label: string }[] = [
		{ value: 'violet', hex: '#7c5cff', label: 'Violet' },
		{ value: 'cyan', hex: '#5ad8ff', label: 'Cyan' },
		{ value: 'coral', hex: '#ff5b3a', label: 'Coral' },
		{ value: 'lime', hex: '#b6ff3a', label: 'Lime' },
		{ value: 'amber', hex: '#f3a635', label: 'Amber' }
	];

	const FONTS: { value: Tweaks['font']; labelKey: string; hintKey: string }[] = [
		{ value: 'mono-sans', labelKey: 'tweaks.font.mono-sans', hintKey: 'tweaks.font.default' },
		{ value: 'serif-sans', labelKey: 'tweaks.font.serif-sans', hintKey: 'tweaks.font.editorial' },
		{ value: 'all-sans', labelKey: 'tweaks.font.all-sans', hintKey: 'tweaks.font.technical' },
		{ value: 'serif-mono', labelKey: 'tweaks.font.serif-mono', hintKey: 'tweaks.font.literary' }
	];

	function set<K extends keyof Tweaks>(key: K, value: Tweaks[K]) {
		tweaks.update((t) => ({ ...t, [key]: value }));
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function onClickOutside(e: MouseEvent) {
		if (!open || !panelEl) return;
		const target = e.target as Node | null;
		if (target && !panelEl.contains(target)) open = false;
	}
</script>

<svelte:window on:click={onClickOutside} />

<button
	class="tweaks-fab"
	class:is-open={open}
	on:click|stopPropagation={() => (open = !open)}
	aria-label={$t('a11y.tweaksOpen')}
	aria-expanded={open}
	data-hover
>
	<svg
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<line x1="4" y1="6" x2="11" y2="6" />
		<line x1="15" y1="6" x2="20" y2="6" />
		<line x1="4" y1="12" x2="6" y2="12" />
		<line x1="10" y1="12" x2="20" y2="12" />
		<line x1="4" y1="18" x2="14" y2="18" />
		<line x1="18" y1="18" x2="20" y2="18" />
		<circle cx="13" cy="6" r="2" />
		<circle cx="8" cy="12" r="2" />
		<circle cx="16" cy="18" r="2" />
	</svg>
</button>

{#if open}
	<div
		bind:this={panelEl}
		class="tweaks-panel"
		role="dialog"
		aria-modal="false"
		aria-label={$t('a11y.tweaks')}
	>
		<header class="tw-head">
			<span class="eyebrow"><span class="dot"></span>{$t('tweaks.title')} · {SITE.revision}</span>
			<button class="tw-close" on:click={() => (open = false)} aria-label={$t('a11y.close')}
				>×</button
			>
		</header>

		<section class="tw-section">
			<div class="tw-label">{$t('tweaks.theme')}</div>
			<div class="tw-row">
				{#each THEMES as opt (opt.value)}
					<button
						class="tw-chip"
						class:is-on={$tweaks.theme === opt.value}
						on:click={() => set('theme', opt.value)}
						data-hover
					>
						{$t(opt.labelKey)}
					</button>
				{/each}
			</div>
		</section>

		<section class="tw-section">
			<div class="tw-label">{$t('tweaks.accent')}</div>
			<div class="tw-row">
				{#each ACCENTS as a (a.value)}
					<button
						class="tw-swatch"
						class:is-on={$tweaks.accent === a.value}
						style="background: {a.hex};"
						on:click={() => set('accent', a.value)}
						aria-label={a.label}
						title={a.label}
						data-hover
					>
						<span class="tw-swatch-ring" aria-hidden="true"></span>
					</button>
				{/each}
			</div>
		</section>

		<section class="tw-section">
			<div class="tw-label">{$t('tweaks.font')}</div>
			<div class="tw-col">
				{#each FONTS as f (f.value)}
					<button
						class="tw-row-item"
						class:is-on={$tweaks.font === f.value}
						on:click={() => set('font', f.value)}
						data-hover
					>
						<span>{$t(f.labelKey)}</span>
						<span class="tw-hint">{$t(f.hintKey)}</span>
					</button>
				{/each}
			</div>
		</section>

		<section class="tw-section">
			<div class="tw-label">{$t('tweaks.motion')}</div>
			<button
				class="tw-toggle"
				class:is-on={$tweaks.motion}
				on:click={() => set('motion', !$tweaks.motion)}
				data-hover
				aria-pressed={$tweaks.motion}
			>
				<span class="tw-toggle-track"><span class="tw-toggle-knob"></span></span>
				<span>{$tweaks.motion ? $t('tweaks.motion.on') : $t('tweaks.motion.off')}</span>
			</button>
		</section>

		<section class="tw-section">
			<div class="tw-label">{$t('tweaks.resizehud')}</div>
			<button
				class="tw-toggle"
				class:is-on={$tweaks.resizeHud}
				on:click={() => set('resizeHud', !$tweaks.resizeHud)}
				data-hover
				aria-pressed={$tweaks.resizeHud}
			>
				<span class="tw-toggle-track"><span class="tw-toggle-knob"></span></span>
				<span>{$tweaks.resizeHud ? $t('tweaks.motion.on') : $t('tweaks.motion.off')}</span>
			</button>
		</section>

		<footer class="tw-foot">
			<span class="mono small muted">{$t('tweaks.foot')}</span>
		</footer>
	</div>
{/if}
