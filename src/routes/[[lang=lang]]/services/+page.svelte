<script lang="ts">
	import { lgoto } from '$lib/paths';
	import { t } from '$lib/i18n';

	function go(path: string) {
		lgoto(path);
	}

	const services = ['01', '02', '03', '04', '05'] as const;
	const phases = ['w0', 'w1', 'w25', 'w6'] as const;
</script>

<div class="page-anim">
	<header class="page-title">
		<div><span class="meta">{$t('services.meta')}</span></div>
		<div>
			<h1 class="display">{$t('services.title')}</h1>
			<p class="lede">{$t('services.description')}</p>
		</div>
	</header>

	<section class="section">
		<div class="svc-grid">
			{#each services as num (num)}
				<div class="svc" data-hover>
					<span class="num">{num}</span>
					<div>
						<h3>{$t(`services.${num}.title`)}</h3>
						<p>{$t(`services.${num}.body`)}</p>
						<div class="row" style="margin-top: 14px; gap: 6px;">
							<span class="chip">{$t('services.chip.sla')}</span>
							<span class="chip">{$t('services.chip.remote')}</span>
							<span class="chip">{$t('services.chip.onsite')}</span>
						</div>
					</div>
					<span class="price">{$t(`services.${num}.price`)}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<div class="section-head">
			<div>
				<span class="eyebrow"><span class="dot"></span>{$t('services.process.eyebrow')}</span>
				<h2 style="margin-top: 8px;">{$t('services.process.title')}</h2>
			</div>
		</div>
		<div class="timeline">
			{#each phases as ph (ph)}
				<div class="item">
					<div class="time">{$t(`services.${ph}.time`)}</div>
					<div class="body">
						<h4>{$t(`services.${ph}.t`)}</h4>
						<p>{$t(`services.${ph}.b`)}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<div
			class="services-booking-grid"
			style="border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--sp-6); background: var(--bg-elev); display: grid; grid-template-columns: 1fr auto; gap: var(--sp-5); align-items: center;"
		>
			<div>
				<h3 class="display" style="margin-bottom: 6px;">{$t('services.booking.title')}</h3>
				<p style="color: var(--ink-2);">{$t('services.booking.body')}</p>
			</div>
			<button class="btn btn--primary" on:click={() => go('/contact/')} data-hover>
				{$t('services.start')} <span class="arrow">↗</span>
			</button>
		</div>
	</section>
</div>
