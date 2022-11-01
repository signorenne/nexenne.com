<script lang="ts">
	import { base } from '$app/paths';
	import { lgoto } from '$lib/paths';
	import { t, lang } from '$lib/i18n';
	import LogoMark from '$lib/components/LogoMark.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	$: resumes = data.resumes;
	$: resume = $lang === 'it' ? resumes.it : resumes.en;

	function go(path: string) {
		lgoto(path);
	}

	function printCV() {
		if (typeof window !== 'undefined') window.print();
	}
</script>

<div class="page-anim resume-page">
	<header class="page-title resume-head">
		<div>
			<span class="meta">{resume.labels.subtitle}</span>
		</div>
		<div class="resume-head-right">
			<h1 class="display">{resume.labels.title}.</h1>
			<div class="row" style="margin-top: 16px;">
				<button class="btn btn--primary" on:click={printCV} data-hover>
					{resume.labels.download} <span class="arrow">↗</span>
				</button>
				<button class="btn btn--ghost" on:click={() => go('/contact/')} data-hover>
					{$t('hero.cta.contact')}
				</button>
			</div>
		</div>
	</header>

	<!-- Accent follows the site's selected accent; soft tint derived from it. -->
	<article
		class="cv-sheet"
		style="--cv-accent: var(--accent); --cv-accent-soft: color-mix(in oklab, var(--accent) 12%, #fff);"
	>
		<header class="cv-header">
			<div class="cv-id">
				<h1 class="cv-name">{resume.name}</h1>
				<p class="cv-role">{resume.role}</p>
				<ul class="cv-contact">
					<li>
						<span class="cv-ic">@</span>
						<a href="mailto:{resume.contact.email}">{resume.contact.email}</a>
					</li>
					<li>
						<span class="cv-ic">↗</span>
						<a href="https://{resume.contact.website}" target="_blank" rel="noopener"
							>{resume.contact.website}</a
						>
					</li>
					<li>
						<span class="cv-ic">git</span>
						<a href="https://{resume.contact.github}" target="_blank" rel="noopener"
							>{resume.contact.github}</a
						>
					</li>
					<li><span class="cv-ic">☎</span> {resume.contact.phone}</li>
					<li><span class="cv-ic">◉</span> {resume.contact.location}</li>
					<li><span class="cv-ic">◷</span> {resume.labels.born}: {resume.contact.born}</li>
				</ul>
			</div>
			<img class="cv-photo" src="{base}{resume.photo}" alt={resume.name} />
		</header>

		<div class="cv-body">
			<main class="cv-main">
				<p class="cv-quote">{resume.quote}</p>

				<section class="cv-section">
					<h2 class="cv-h">
						{resume.labels.experience}
						<span class="cv-h-count">/ {String(resume.experience.length).padStart(2, '0')}</span>
					</h2>
					{#each resume.experience as e (e.company + e.date)}
						<article class="cv-entry">
							<div class="cv-entry-head">
								<h3 class="cv-entry-role">{e.role}</h3>
								<span class="cv-entry-co">@ {e.company}</span>
							</div>
							<div class="cv-entry-meta">
								<span class="cv-entry-meta-k">{resume.labels.date}</span>
								<span>{e.date}</span>
								<span class="cv-entry-meta-sep">·</span>
								<span class="cv-entry-meta-k">{resume.labels.location}</span>
								<span>{e.location}</span>
							</div>
							{#if e.headline}
								<p class="cv-headline">{e.headline}</p>
							{/if}
							<ul class="cv-list">
								{#each e.points as p (p)}
									<li>{p}</li>
								{/each}
							</ul>
							{#if e.tags.length}
								<ul class="cv-tags">
									{#each e.tags as tt (tt)}
										<li class="cv-tag">{tt}</li>
									{/each}
								</ul>
							{/if}
						</article>
					{/each}
				</section>

				<section class="cv-section">
					<h2 class="cv-h">
						{resume.labels.projects}
						<span class="cv-h-count">/ {String(resume.projects.length).padStart(2, '0')}</span>
					</h2>
					{#each resume.projects as p (p.name)}
						<article class="cv-entry">
							<div class="cv-entry-head">
								<h3 class="cv-entry-role">{p.name}</h3>
								<span class="cv-entry-co">{p.kind}</span>
							</div>
							<div class="cv-entry-meta">
								<span class="cv-entry-meta-k">{resume.labels.date}</span>
								<span>{p.date}</span>
								<span class="cv-entry-meta-sep">·</span>
								<span class="cv-entry-meta-k">{resume.labels.location}</span>
								<span>{p.location}</span>
							</div>
							{#if p.headline}
								<p class="cv-headline">{p.headline}</p>
							{/if}
							<ul class="cv-list">
								{#each p.points as pt (pt)}
									<li>{pt}</li>
								{/each}
								{#if p.link}
									<li class="cv-link">
										<a href="https://{p.link}" target="_blank" rel="noopener">{p.link}</a>
									</li>
								{/if}
							</ul>
							{#if p.tags.length}
								<ul class="cv-tags">
									{#each p.tags as tt (tt)}
										<li class="cv-tag">{tt}</li>
									{/each}
								</ul>
							{/if}
						</article>
					{/each}
				</section>
			</main>

			<aside class="cv-side">
				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.one_line}</h2>
					<p class="cv-motto">{resume.motto}</p>
				</section>

				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.skills}</h2>
					{#each resume.skills as g (g.title)}
						<div class="cv-skill-group">
							<div class="cv-skill-title">{g.title}</div>
							<ul class="cv-chips">
								{#each g.items as it (it)}
									<li class="cv-chip">{it}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</section>

				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.education}</h2>
					{#each resume.education as ed (ed.degree)}
						<div class="cv-edu">
							<strong>{ed.degree}</strong>
							<div class="cv-edu-school">{ed.school}</div>
							<div class="cv-edu-date">{ed.date}</div>
						</div>
					{/each}
				</section>

				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.languages}</h2>
					{#each resume.languages as l (l.name)}
						<div class="cv-lang">
							<span class="cv-lang-name">{l.name}</span>
							<strong>{l.level}</strong>
						</div>
					{/each}
				</section>

				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.awards}</h2>
					{#each resume.awards as a (a.title)}
						<div class="cv-award">
							<div class="cv-award-head">
								<strong>{a.title}</strong>
								{#if a.year}<span class="cv-award-year">{a.year}</span>{/if}
							</div>
							<p>{a.body}</p>
						</div>
					{/each}
				</section>

				<section class="cv-side-section">
					<h2 class="cv-h">{resume.labels.off_screen}</h2>
					<ul class="cv-hobbies">
						{#each resume.hobbies as h (h)}
							<li>{h}</li>
						{/each}
					</ul>
				</section>

				{#if resume.consent}
					<section class="cv-side-section">
						<h2 class="cv-h">{resume.labels.consent}</h2>
						<p class="cv-consent">{resume.consent}</p>
					</section>
				{/if}
			</aside>
		</div>
		<div class="cv-mascotte" aria-hidden="true"><LogoMark /></div>
	</article>
</div>
