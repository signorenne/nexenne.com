<script lang="ts">
	import { lgoto } from '$lib/paths';
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';

	function go(path: string) {
		lgoto(path);
	}
</script>

<div class="page-anim">
	<header class="page-title">
		<div>
			<span class="meta">{$t('about.meta')}</span>
		</div>
		<div>
			<h1 class="display">{$t('about.title')}</h1>
		</div>
	</header>

	<section class="section" style="padding-top: var(--sp-7);">
		<div class="about-grid">
			<div class="prose" style="margin: 0;">
				<p>{$t('about.p1')}</p>
				<p>{$t('about.p2')}</p>
				<p>{@html $t('about.p3.html')}</p>
				<h2>{$t('about.h2.good')}</h2>
				<p>{$t('about.good.p')}</p>
				<h2>{$t('about.h2.useful')}</h2>
				<p>{$t('about.useful.p')}</p>
			</div>

			<aside class="col" style="gap: 18px;">
				<div class="uses-box">
					<h3>{$t('about.glance')}</h3>
					<ul style="list-style: none; padding: 0;">
						<li><span class="k">{$t('about.glance.based')}</span> · {$t('about.location')}</li>
						<li>
							<span class="k">{$t('about.glance.years')}</span> · {$t('about.glance.years.v')}
						</li>
						<li>
							<span class="k">{$t('about.glance.domains')}</span> · {$t('about.glance.domains.v')}
						</li>
						<li><span class="k">{$t('about.glance.langs')}</span> · IT / EN</li>
						<li><span class="k">{$t('about.glance.off')}</span> · {$t('about.glance.off.v')}</li>
					</ul>
				</div>
				<div class="uses-box">
					<h3>{$t('about.stack')}</h3>
					<div class="chip-cloud" style="display: flex; flex-wrap: wrap; gap: 6px;">
						{#each SITE.stack as t (t)}
							<span class="chip">{t}</span>
						{/each}
						<span class="chip">Emacs · Org-mode</span>
						<span class="chip">Tmux</span>
						<span class="chip">Git · GitHub Actions</span>
					</div>
				</div>
				<div class="uses-box">
					<h3>{$t('about.clients')}</h3>
					<ul style="list-style: none; padding: 0;">
						<li>
							<span class="k">{$t('about.clients.sdf.period')}</span> · {$t('about.clients.sdf')}
						</li>
						<li>
							<span class="k">{$t('about.clients.worklouder.period')}</span> · {$t(
								'about.clients.worklouder'
							)}
						</li>
					</ul>
				</div>
				<div class="row cta-actions">
					<button class="btn btn--primary" on:click={() => go('/contact/')} data-hover
						>{$t('about.book_call')} <span class="arrow">↗</span></button
					>
					<button class="btn" on:click={() => go('/uses/')} data-hover
						>{$t('about.what_use')}</button
					>
				</div>
			</aside>
		</div>
	</section>
</div>
