<script lang="ts">
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';
	import { lgoto } from '$lib/paths';
	import OrbitConstellation from './OrbitConstellation.svelte';
	import GlitchRotator from './GlitchRotator.svelte';

	function go(path: string) {
		lgoto(path);
	}

	$: iAmWords = $t('hero.iam.words').split('|');
	$: heroChips = $t('hero.chips').split('|');
</script>

<section class="hero hero-pro">
	<div class="hero-left stagger">
		<div class="hero-tags">
			<span class="status-pill">
				{$t('hero.available')}
			</span>

			<div class="eyebrow eyebrow-lg">
				<span class="dot"></span>
				{$t('hero.role')}
			</div>
		</div>

		<h1 class="display hero-display hero-motto">
			<span class="line">{$t('hero.motto.l1')}</span>
			<span class="line"
				>{$t('hero.motto.l2.before')}<span class="accent-word">{$t('hero.motto.l2.accent')}</span
				>{$t('hero.motto.l2.after')}</span
			>
			<span class="line">{$t('hero.motto.l3')}</span>
			<span class="line"
				>{$t('hero.motto.l4.before')}<span class="sweep">{$t('hero.motto.l4.sweep')}</span>{$t(
					'hero.motto.l4.after'
				)}</span
			>
		</h1>
		<p class="hero-attribution">- {$t('hero.motto.author')}</p>

		<div class="hero-iam">
			<span class="iam-pre">{$t('hero.io_sono')}</span>
			<GlitchRotator words={iAmWords} />
		</div>

		<p class="lede">
			{@html $t('hero.lede.html')}
		</p>

		<div class="hero-cta">
			<button class="btn btn--primary" on:click={() => go('/work/')} data-hover>
				{$t('hero.cta.work')} <span class="arrow">↗</span>
			</button>
			<button class="btn" on:click={() => go('/contact/')} data-hover
				>{$t('hero.cta.contact')}</button
			>
			<a class="btn btn--ghost" href={`mailto:${SITE.email}`} data-hover>
				{SITE.email}
			</a>
		</div>

		<div class="hero-meta">
			{#each heroChips as chip (chip)}
				<span class="chip">{chip}</span>
			{/each}
		</div>
	</div>

	<div class="hero-right">
		<OrbitConstellation />
		<div class="telemetry">
			<div class="row">
				<span>{$t('hero.tele.firmware')}</span>
				<span style="color: var(--accent);">{$t('hero.tele.ok')}</span>
			</div>

			<div class="bar" style="--w: 82%;"></div>
			<div class="row">
				<span>{$t('hero.tele.bond')}</span>
				<span style="color: var(--accent);">{$t('hero.tele.synced')}</span>
			</div>
			<div class="bar" style="--w: 100%;"></div>
			<div class="row">
				<span>{$t('hero.tele.can')}</span>
				<span style="color: var(--muted);">{$t('hero.tele.live')}</span>
			</div>
			<div class="bar" style="--w: 63%;"></div>
		</div>

		<div class="hero-decor" aria-hidden="true">
			<span class="decor-portal decor-portal--top" aria-hidden="true"></span>
			<span class="decor-portal decor-portal--bot" aria-hidden="true"></span>
			{#each Array(128) as _, i (i)}
				{@const CODE = '01ABCDEF#&|;<>{}()[]=*+-/?$_~^%'}
				{@const ch = CODE[(i * 7) % CODE.length]}
				{@const x = (i * 23 + 5) % 100}
				{@const dur = 6 + ((i * 17) % 110) / 10}
				{@const delay = -((i * 13) % 180) / 10}
				{@const op = 0.55 + ((i * 11) % 45) / 100}
				{@const size = 11 + ((i * 5) % 6)}
				<span
					class="decor-char"
					style={`left:${x}%;animation-duration:${dur.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s;opacity:${op.toFixed(2)};font-size:${size}px;`}
					>{ch}</span
				>
			{/each}
		</div>
	</div>
</section>
