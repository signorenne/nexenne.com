<script lang="ts">
	import { t } from '$lib/i18n';
</script>

<div class="page-anim">
	<header class="page-title">
		<div><span class="meta">{$t('colophon.meta')}</span></div>
		<div>
			<h1 class="display">{$t('colophon.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{$t('colophon.lede')}</p>
		</div>
	</header>

	<section class="section">
		<div class="uses-grid">
			<div class="uses-box">
				<h3>{$t('colophon.h.framework')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li>
						<span class="k">{$t('colophon.k.framework')}</span> · SvelteKit 2 · adapter-static
					</li>
					<li><span class="k">{$t('colophon.k.runtime')}</span> · Svelte 5</li>
					<li><span class="k">{$t('colophon.k.bundler')}</span> · Vite 8</li>
					<li><span class="k">{$t('colophon.k.language')}</span> · TypeScript 5</li>
					<li><span class="k">{$t('colophon.k.output')}</span> · {$t('colophon.v.output')}</li>
				</ul>
			</div>

			<div class="uses-box">
				<h3>{$t('colophon.h.content')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li>
						<span class="k">{$t('colophon.k.authoring')}</span> · <span class="mono">.md</span> +
						<span class="mono">.org</span>
						{$t('colophon.v.authoring')} <span class="mono">content/</span>
					</li>
					<li>
						<span class="k">{$t('colophon.k.discovery')}</span> · {$t('colophon.v.discovery')}
					</li>
					<li><span class="k">Markdown</span> · unified · remark-parse · remark-rehype</li>
					<li><span class="k">Org-mode</span> · uniorg-parse · uniorg-rehype</li>
					<li><span class="k">Frontmatter</span> · gray-matter · zod-validated</li>
					<li><span class="k">RSS</span> · {$t('colophon.v.rss')}</li>
				</ul>
			</div>

			<div class="uses-box">
				<h3>{$t('colophon.h.typography')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li><span class="k">{$t('colophon.k.display_body')}</span> · Inter Tight</li>
					<li><span class="k">{$t('colophon.k.monospace')}</span> · JetBrains Mono</li>
					<li><span class="k">{$t('colophon.k.editorial_alt')}</span> · Fraunces</li>
					<li><span class="k">{$t('colophon.k.source')}</span> · Google Fonts</li>
					<li><span class="k">{$t('colophon.k.sizing')}</span> · {$t('colophon.v.sizing')}</li>
				</ul>
			</div>

			<div class="uses-box">
				<h3>{$t('colophon.h.design')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li>
						<span class="k">{$t('colophon.k.vocabulary')}</span> · {$t('colophon.v.vocabulary')}
					</li>
					<li>
						<span class="k">{$t('colophon.k.side_rail')}</span> · {$t('colophon.v.side_rail')}
					</li>
					<li><span class="k">{$t('colophon.k.color_tokens')}</span> · oklch + color-mix()</li>
					<li><span class="k">{$t('colophon.k.accents')}</span> · {$t('colophon.v.accents')}</li>
					<li><span class="k">{$t('colophon.k.themes')}</span> · {$t('colophon.v.themes')}</li>
					<li><span class="k">{$t('colophon.k.resume')}</span> · AltaCV layout (Liantze Lim)</li>
				</ul>
			</div>

			<div class="uses-box">
				<h3>{$t('colophon.h.hosting')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li><span class="k">{$t('colophon.k.host')}</span> · {$t('colophon.v.host')}</li>
					<li><span class="k">{$t('colophon.k.build')}</span> · {$t('colophon.v.build')}</li>
				</ul>
			</div>

			<div class="uses-box">
				<h3>{$t('colophon.h.thanks')}</h3>
				<ul style="list-style: none; padding: 0;">
					<li>{$t('colophon.thanks.sveltekit')}</li>
					<li>{$t('colophon.thanks.uniorg')}</li>
					<li>{$t('colophon.thanks.altacv')}</li>
					<li>{$t('colophon.thanks.hugo')}</li>
				</ul>
			</div>
		</div>

		<p class="mono muted" style="margin-top: var(--sp-6); text-align: center; font-size: 12px;">
			{$t('colophon.foot')}
		</p>
	</section>
</div>
