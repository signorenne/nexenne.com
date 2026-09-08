<script lang="ts">
	import { lgoto } from '$lib/paths';
	import { lang } from '$lib/i18n';
	import type { PageData } from './$types';

	export let data: PageData;
	$: resumes = data.resumes;
	$: resume = $lang === 'it' ? resumes.it : resumes.en;
	$: ats = resume.labels.ats;

	function printCV() {
		if (typeof window !== 'undefined') window.print();
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-anim ats-page">
	<!--
		The eyebrow is a paragraph, not a heading: the document below owns the only
		h1 on the page, and the toolbar disappears when printing anyway.
	-->
	<div class="ats-tools">
		<p class="meta">{ats.title}</p>
		<div class="row">
			<button class="btn btn--primary" on:click={printCV} data-hover>
				{resume.labels.download} <span class="arrow">↗</span>
			</button>
			<button class="btn btn--ghost" on:click={() => lgoto('/resume/')} data-hover>
				{ats.back}
			</button>
		</div>
	</div>

	<!--
		Everything below is deliberately plain: one column, normal flow, no photo,
		no tables, no chips and no icons. Applicant tracking systems read the
		document top to bottom and map sections by their heading text, so the shape
		of this markup is the feature. Keep it boring.
	-->
	<article class="ats-doc">
		<h1 class="ats-name">{resume.name}</h1>
		<p class="ats-role">{resume.role}</p>
		<ul class="ats-contact">
			<li>{resume.contact.email}</li>
			<li>{resume.contact.phone}</li>
			<li>{resume.contact.location}</li>
			<li>{resume.contact.website}</li>
			<li>{resume.contact.github}</li>
			<li>{resume.labels.born}: {resume.contact.born}</li>
		</ul>

		<h2>{ats.summary}</h2>
		{#each resume.quote.trim().split(/\n\s*\n/) as paragraph (paragraph)}
			<p>{paragraph}</p>
		{/each}

		<h2>{ats.experience}</h2>
		{#each resume.experience as e (e.company + e.date)}
			<h3>{e.role}</h3>
			<p class="ats-org">{e.company}</p>
			<p class="ats-meta">{e.date} | {e.location}</p>
			{#if e.headline}
				<p>{e.headline}</p>
			{/if}
			<ul>
				{#each e.points as p (p)}
					<li>{p}</li>
				{/each}
			</ul>
			{#if e.tags.length}
				<p class="ats-tags"><strong>{ats.tags}:</strong> {e.tags.join(', ')}</p>
			{/if}
		{/each}

		<h2>{ats.projects}</h2>
		{#each resume.projects as p (p.name)}
			<h3>{p.name}</h3>
			<p class="ats-org">{p.kind}</p>
			<p class="ats-meta">{p.date} | {p.location}</p>
			{#if p.headline}
				<p>{p.headline}</p>
			{/if}
			<ul>
				{#each p.points as pt (pt)}
					<li>{pt}</li>
				{/each}
			</ul>
			{#if p.link}
				<p class="ats-meta">{p.link}</p>
			{/if}
			{#if p.tags.length}
				<p class="ats-tags"><strong>{ats.tags}:</strong> {p.tags.join(', ')}</p>
			{/if}
		{/each}

		<h2>{ats.skills}</h2>
		{#each resume.skills as g (g.title)}
			<p class="ats-skill"><strong>{g.title}:</strong> {g.items.join(', ')}</p>
		{/each}

		<h2>{ats.education}</h2>
		{#each resume.education as ed (ed.degree)}
			<h3>{ed.degree}</h3>
			<p class="ats-meta">{ed.school} | {ed.date}</p>
		{/each}

		<h2>{ats.languages}</h2>
		<p>{resume.languages.map((l) => `${l.name}: ${l.level}`).join(' | ')}</p>

		<h2>{ats.awards}</h2>
		{#each resume.awards as a (a.title)}
			<h3>{a.title}{a.year ? `, ${a.year}` : ''}</h3>
			<p>{a.body}</p>
		{/each}

		{#if resume.consent}
			<p class="ats-consent">{resume.consent}</p>
		{/if}
	</article>
</div>
